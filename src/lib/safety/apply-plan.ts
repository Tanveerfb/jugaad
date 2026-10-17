import { mkdir, realpath, rmdir } from "node:fs/promises";
import path from "node:path";
import type { WorkbenchStore } from "@/lib/data";
import { isInside, isProtected, resolveInside } from "@/lib/domain/path-guard";
import { log } from "@/lib/log";
import type { AllowedFolder } from "@/schemas/allowed-folder-schema";
import type { Plan, PlanMove } from "@/schemas/plan-schema";
import { MoveError, explain, missingFolders, moveFile, moveFolder, statOrNull } from "./move-file";

export type SafetyOptions = {
  /** System, program and Jugaad's own folders — never touched, even inside an allowed folder. */
  protectedPaths: readonly string[];
  signal?: AbortSignal;
  /** Called after each move, for the job's progress line. */
  onProgress?: (done: number, total: number) => void;
};

/**
 * Applies an approved plan (spec: proposed → approved → **journalled** → undoable). Each move is
 * re-checked against the allow-list, journalled before it happens and closed after. A move that
 * fails is recorded with its reason and left for a retry; the rest carry on. Resumes a plan a
 * crash left `applying`.
 */
export async function applyPlan(store: WorkbenchStore, planId: string, options: SafetyOptions): Promise<Plan> {
  const { plan, folder } = startRun(store, planId, ["approved", "incomplete"], "applying");
  const todo = store.listPlanMoves(plan.id).filter((m) => m.included && m.status === "pending");

  for (const [i, move] of todo.entries()) {
    if (options.signal?.aborted) return plan; // left `applying`; the requeued job resumes it
    await applyMove(store, plan, folder, move, options);
    options.onProgress?.(i + 1, todo.length);
  }

  const unfinished = store.listPlanMoves(plan.id).some((m) => m.included && m.status === "pending");
  return store.transitionPlan(plan.id, unfinished ? "incomplete" : "applied");
}

/**
 * Puts every moved file back, newest move first, then removes the folders this plan created if
 * they are empty. A file changed since it was moved is left where it is, with the reason.
 */
export async function undoPlan(store: WorkbenchStore, planId: string, options: SafetyOptions): Promise<Plan> {
  const { plan, folder } = startRun(store, planId, ["applied", "incomplete", "undo-incomplete"], "undoing");
  const todo = store
    .listPlanMoves(plan.id)
    .filter((m) => m.status === "moved")
    .reverse();

  for (const [i, move] of todo.entries()) {
    if (options.signal?.aborted) return plan;
    await undoMove(store, plan, folder, move, options);
    options.onProgress?.(i + 1, todo.length);
  }

  const stillMoved = store.listPlanMoves(plan.id).some((m) => m.status === "moved");
  if (!stillMoved) await removeCreatedFolders(store, plan, folder, options);
  return store.transitionPlan(plan.id, stillMoved ? "undo-incomplete" : "undone");
}

function startRun(
  store: WorkbenchStore,
  planId: string,
  from: readonly Plan["status"][],
  to: "applying" | "undoing",
): { plan: Plan; folder: AllowedFolder } {
  const plan = store.getPlan(planId);
  if (!plan) throw new Error(`No plan ${planId}`);
  const folder = store.getAllowedFolder(plan.folderId);
  if (!folder) throw new Error("That folder is no longer on the allow-list, so nothing in it is touched.");
  if (plan.status === to) return { plan, folder }; // resuming after a restart
  if (!from.includes(plan.status)) throw new Error(`Plan is ${plan.status}; it can't be ${to === "applying" ? "applied" : "undone"} now`);
  return { plan: store.transitionPlan(plan.id, to), folder };
}

async function applyMove(
  store: WorkbenchStore,
  plan: Plan,
  folder: AllowedFolder,
  move: PlanMove,
  { protectedPaths }: SafetyOptions,
): Promise<void> {
  let from: string;
  let to: string;
  try {
    from = await guardedPath(folder, move.fromPath, protectedPaths, true);
    to = await guardedPath(folder, move.toPath, protectedPaths, false);
  } catch (error) {
    store.failMove(move.id, explain(error).message);
    return;
  }

  try {
    await makeFoldersJournalled(store, plan, folder, path.dirname(to));
  } catch (error) {
    store.failMove(move.id, explain(error).message);
    return;
  }

  const entry = store.openJournalEntry({ planId: plan.id, moveId: move.id, action: "move", fromPath: from, toPath: to });
  try {
    // a project folder moves as one; everything else file by file
    const moved = await (move.isFolder ? moveFolder : moveFile)(from, to);
    store.closeJournalEntry(entry.id, { outcome: "done", ...moved });
    store.completeMove(move.id, "moved");
    followInIndex(store, folder, move.fromPath, move.toPath, move.isFolder);
  } catch (error) {
    const reason = explain(error).message;
    store.closeJournalEntry(entry.id, { outcome: "failed", error: reason });
    store.failMove(move.id, reason);
  }
}

async function undoMove(
  store: WorkbenchStore,
  plan: Plan,
  folder: AllowedFolder,
  move: PlanMove,
  { protectedPaths }: SafetyOptions,
): Promise<void> {
  const landedAt = lastDoneMove(store, plan.id, move.id);
  let current: string;
  let original: string;
  try {
    current = await guardedPath(folder, move.toPath, protectedPaths, true);
    original = await guardedPath(folder, move.fromPath, protectedPaths, false);
    const now = await statOrNull(current);
    if (!now) throw new MoveError("The file is no longer where it was moved to.", "missing");
    // a folder's own size and time say nothing about its files; it goes back as it is
    if (!move.isFolder && landedAt && (now.size !== landedAt.size || Math.abs(now.mtimeMs - (landedAt.modifiedMs ?? 0)) > 1)) {
      throw new MoveError("The file was changed after it was moved, so it was left where it is.", "changed");
    }
    await makeFoldersJournalled(store, plan, folder, path.dirname(original));
  } catch (error) {
    store.failMove(move.id, explain(error).message);
    return;
  }

  const entry = store.openJournalEntry({ planId: plan.id, moveId: move.id, action: "undo", fromPath: current, toPath: original });
  try {
    const moved = await (move.isFolder ? moveFolder : moveFile)(current, original);
    store.closeJournalEntry(entry.id, { outcome: "done", ...moved });
    store.completeMove(move.id, "undone");
    followInIndex(store, folder, move.toPath, move.fromPath, move.isFolder);
  } catch (error) {
    const reason = explain(error).message;
    store.closeJournalEntry(entry.id, { outcome: "failed", error: reason });
    store.failMove(move.id, reason);
  }
}

/**
 * The index follows a moved file, so it stays right without a rescan — hash, text and embedding
 * are kept. The file has already moved by now, so a clash in the index (a stale row at the
 * destination) must not fail the move: it is logged and the next scan settles it.
 */
function followInIndex(store: WorkbenchStore, folder: AllowedFolder, fromPath: string, toPath: string, isFolder: boolean): void {
  try {
    if (isFolder) store.relocateFolder(folder.id, fromPath, toPath);
    else store.relocateFile(folder.id, fromPath, toPath);
  } catch (error) {
    log("index.relocate-skipped", { reason: error instanceof Error ? error.message : String(error) });
  }
}

/** The journal record of where a move's file landed — what undo compares against. */
function lastDoneMove(store: WorkbenchStore, planId: string, moveId: string) {
  return store
    .listJournal(planId)
    .filter((e) => e.moveId === moveId && e.action === "move" && e.outcome === "done")
    .at(-1);
}

/**
 * Resolves a move's path inside its folder and refuses anything outside the allow-list or in a
 * protected folder. An existing file is followed through junctions and links before checking,
 * so a link inside the folder can't lead a move somewhere else.
 */
async function guardedPath(
  folder: AllowedFolder,
  relative: string,
  protectedPaths: readonly string[],
  mustExist: boolean,
): Promise<string> {
  const absolute = resolveInside(folder.path, relative);
  if (isProtected(absolute, protectedPaths)) throw new MoveError("That path is in a protected folder.", "other");
  const real = mustExist ? await realpath(absolute) : await realParent(absolute);
  if (!isInside(folder.path, real) || isProtected(real, protectedPaths)) {
    throw new MoveError("That path leads outside the allowed folder.", "other");
  }
  return absolute;
}

/** For a path that doesn't exist yet: the real path of its nearest existing parent, plus the rest. */
async function realParent(absolute: string): Promise<string> {
  let existing = path.dirname(absolute);
  const rest = [path.basename(absolute)];
  while (!(await statOrNull(existing))) {
    rest.unshift(path.basename(existing));
    const up = path.dirname(existing);
    if (up === existing) break;
    existing = up;
  }
  return path.join(await realpath(existing), ...rest);
}

/** Creates any missing folders up to `dir`, outermost first, journalling each one before it is made. */
async function makeFoldersJournalled(store: WorkbenchStore, plan: Plan, folder: AllowedFolder, dir: string): Promise<void> {
  if (!isInside(folder.path, dir)) throw new MoveError("That folder is outside the allowed folder.", "other");
  for (const missing of await missingFolders(dir)) {
    const entry = store.openJournalEntry({ planId: plan.id, moveId: null, action: "make-folder", fromPath: null, toPath: missing });
    try {
      await mkdir(missing);
      store.closeJournalEntry(entry.id, { outcome: "done" });
    } catch (error) {
      store.closeJournalEntry(entry.id, { outcome: "failed", error: explain(error).message });
      throw error;
    }
  }
}

/** Folders this plan created, removed innermost first — and only when empty. Files are never removed. */
async function removeCreatedFolders(
  store: WorkbenchStore,
  plan: Plan,
  folder: AllowedFolder,
  { protectedPaths }: SafetyOptions,
): Promise<void> {
  const created = store
    .listJournal(plan.id)
    .filter((e) => e.action === "make-folder" && e.outcome === "done")
    .map((e) => e.toPath)
    .sort((a, b) => b.length - a.length);
  for (const dir of new Set(created)) {
    if (!isInside(folder.path, dir) || isProtected(dir, protectedPaths) || !(await statOrNull(dir))) continue;
    const entry = store.openJournalEntry({ planId: plan.id, moveId: null, action: "remove-empty-folder", fromPath: null, toPath: dir });
    try {
      await rmdir(dir); // rmdir refuses a folder that is not empty
      store.closeJournalEntry(entry.id, { outcome: "done" });
    } catch (error) {
      store.closeJournalEntry(entry.id, { outcome: "failed", error: explain(error).message });
    }
  }
}
