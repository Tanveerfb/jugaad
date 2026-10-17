import { opendir, lstat } from "node:fs/promises";
import path from "node:path";
import { isProtected } from "@/lib/domain/path-guard";

/** Folders whose insides belong to a tool, not to the owner's filing — never descended into. */
const TOOL_FOLDERS = new Set([".git", "node_modules", ".jugaad"]);

export type WalkedFile = { path: string; size: number; modifiedMs: number; createdMs: number };

export type WalkResult = {
  files: WalkedFile[];
  /** Every folder the walk looked inside, absolute — the only places anything else may look. */
  folders: string[];
  /** Folders it could not open (permissions), relative — reported, not retried. */
  unreadable: string[];
};

/**
 * Lists every file under an allowed folder by metadata alone — nothing is opened or read.
 * Skips junctions and symbolic links (they can lead outside the allow-list), protected folders
 * (AppData under a user folder, Jugaad's own data), and tool folders such as `.git`.
 * Paths in the result are relative to `root`. Long paths work: Node passes them through.
 */
export async function walkFolder(
  root: string,
  protectedPaths: readonly string[],
  options: { signal?: AbortSignal; onBatch?: (found: number) => void } = {},
): Promise<WalkResult> {
  const result: WalkResult = { files: [], folders: [], unreadable: [] };
  const pending = [root];

  while (pending.length) {
    if (options.signal?.aborted) break;
    const dir = pending.pop()!;
    let handle;
    try {
      handle = await opendir(dir);
    } catch {
      result.unreadable.push(path.relative(root, dir) || ".");
      continue;
    }
    result.folders.push(dir);
    for await (const entry of handle) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue; // junctions report as links on Windows
      if (entry.isDirectory()) {
        if (!TOOL_FOLDERS.has(entry.name.toLowerCase()) && !isProtected(full, protectedPaths)) pending.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        const s = await lstat(full);
        result.files.push({
          path: path.relative(root, full),
          size: s.size,
          modifiedMs: s.mtimeMs,
          createdMs: s.birthtimeMs,
        });
      } catch {
        // vanished between listing and stat — the next scan sees the truth
      }
    }
    options.onBatch?.(result.files.length);
  }
  return result;
}
