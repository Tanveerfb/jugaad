import { constants } from "node:fs";
import { copyFile, lstat, rename, stat, unlink, utimes } from "node:fs/promises";
import path from "node:path";
import { differsOnlyInCase } from "@/lib/domain/path-guard";
import { hashFile } from "@/lib/files/hash-file";
import type { MoveMethod } from "@/schemas/journal-schema";

export type MovedFile = { method: MoveMethod; size: number; modifiedMs: number };

/** A move that could not happen, with a reason the owner can act on. Nothing was changed. */
export class MoveError extends Error {
  constructor(
    message: string,
    readonly code: "in-use" | "name-taken" | "missing" | "changed" | "copy-mismatch" | "other",
  ) {
    super(message);
    this.name = "MoveError";
  }
}

/** Suffix of the stop-over name a capitals-only rename passes through. Reconciliation looks for it. */
export const CASE_RENAME_SUFFIX = ".jugaad-case";

/**
 * Moves one file, never overwriting anything (spec: no module deletes). On the same drive it is
 * a rename; across drives it is copy, verify by hash, then remove the original — so a failure at
 * any point leaves the original in place. Modified time is kept, so undo can tell whether the
 * file changed since. A capitals-only rename goes through a stop-over name, because Windows
 * sees `invoice.pdf` and `Invoice.pdf` as one file.
 *
 * The destination's folder must already exist — creating it is journalled separately
 * (`missingFolders`).
 */
export async function moveFile(from: string, to: string): Promise<MovedFile> {
  const source = await statOrNull(from);
  if (!source) throw new MoveError("The file is no longer there.", "missing");
  if (!source.isFile()) throw new MoveError("Only files are moved, not folders or links.", "other");

  if (differsOnlyInCase(from, to)) {
    const stopOver = to + CASE_RENAME_SUFFIX;
    if (await statOrNull(stopOver)) throw new MoveError("A leftover stop-over file is in the way.", "name-taken");
    await renameOrExplain(from, stopOver);
    await renameOrExplain(stopOver, to);
    return landed(to, "rename");
  }

  // Windows' rename replaces an existing file; check first so it never does
  if (await statOrNull(to)) throw new MoveError("A file with that name is already there.", "name-taken");

  try {
    await rename(from, to);
    return landed(to, "rename");
  } catch (error) {
    if (codeOf(error) !== "EXDEV") throw explain(error);
  }
  return copyAcross(from, to, source.mtime);
}

/**
 * Moves a whole project folder as one (kept whole — 2026-10-17): a single rename on the same
 * drive, never overwriting, so it is all-or-nothing. Across drives a folder doesn't move: the
 * copy-verify-remove a file gets would mean removing the owner's folder afterwards.
 */
export async function moveFolder(from: string, to: string): Promise<MovedFile> {
  const source = await statOrNull(from);
  if (!source) throw new MoveError("The folder is no longer there.", "missing");
  if (!source.isDirectory()) throw new MoveError("That's not a folder.", "other");

  if (differsOnlyInCase(from, to)) {
    const stopOver = to + CASE_RENAME_SUFFIX;
    if (await statOrNull(stopOver)) throw new MoveError("A leftover stop-over folder is in the way.", "name-taken");
    await renameOrExplain(from, stopOver);
    await renameOrExplain(stopOver, to);
    return { method: "rename", size: 0, modifiedMs: source.mtimeMs };
  }

  if (await statOrNull(to)) throw new MoveError("A folder with that name is already there.", "name-taken");
  try {
    await rename(from, to);
  } catch (error) {
    if (codeOf(error) === "EXDEV") throw new MoveError("A folder moves only within one drive.", "other");
    throw explain(error);
  }
  return { method: "rename", size: 0, modifiedMs: source.mtimeMs };
}

/** Across drives: copy (refusing to overwrite), verify, keep the modified time, then remove the original. */
async function copyAcross(from: string, to: string, mtime: Date): Promise<MovedFile> {
  try {
    await copyFile(from, to, constants.COPYFILE_EXCL);
  } catch (error) {
    await removeOwnCopy(to, error);
    throw explain(error);
  }
  const [a, b] = await Promise.all([hashFile(from), hashFile(to)]);
  if (a !== b) {
    await unlink(to); // our own copy, and a bad one — the original is untouched
    throw new MoveError("The copy did not match the original, so the original was left in place.", "copy-mismatch");
  }
  await utimes(to, new Date(), mtime);
  try {
    await unlink(from);
  } catch (error) {
    // the original is open somewhere: take back our copy so there are not two
    await unlink(to);
    throw explain(error);
  }
  return landed(to, "copy");
}

/** The folders that would have to be created for `dir` to exist, outermost first. */
export async function missingFolders(dir: string): Promise<string[]> {
  const missing: string[] = [];
  let current = path.resolve(dir);
  while (!(await statOrNull(current))) {
    missing.unshift(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return missing;
}

async function landed(to: string, method: MoveMethod): Promise<MovedFile> {
  const s = await stat(to);
  return { method, size: s.size, modifiedMs: s.mtimeMs };
}

async function renameOrExplain(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
  } catch (error) {
    throw explain(error);
  }
}

async function removeOwnCopy(to: string, cause: unknown): Promise<void> {
  // only when the copy itself started: EEXIST means the file there is someone else's
  if (codeOf(cause) === "EEXIST") return;
  await unlink(to).catch(() => undefined);
}

export async function statOrNull(p: string) {
  try {
    return await lstat(p);
  } catch (error) {
    if (codeOf(error) === "ENOENT" || codeOf(error) === "ENOTDIR") return null;
    throw error;
  }
}

function codeOf(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

/** Turns a file-system error into a reason the owner can act on. */
export function explain(error: unknown): MoveError {
  if (error instanceof MoveError) return error;
  switch (codeOf(error)) {
    case "EBUSY":
    case "EPERM":
    case "EACCES":
      return new MoveError("The file is open in another program or protected. Close it and try again.", "in-use");
    case "EEXIST":
      return new MoveError("A file with that name is already there.", "name-taken");
    case "ENOENT":
      return new MoveError("The file is no longer there.", "missing");
    default:
      return new MoveError(error instanceof Error ? error.message : String(error), "other");
  }
}
