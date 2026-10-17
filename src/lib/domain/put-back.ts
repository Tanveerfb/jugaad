import { topFolder } from "./plan-rules";

type MoveLike = { fromPath: string; toPath: string; status: string };

/**
 * A move that took a file out of a folder the owner already had — a subfolder sorted with
 * "Include subfolders" while it wasn't ticked as a category. The owner's first real run moved
 * 288 such files (2026-10-17); these are what "Put back" undoes, leaving the loose files sorted.
 */
export function leftOwnFolder(move: MoveLike): boolean {
  const from = topFolder(move.fromPath);
  return move.status === "moved" && from !== null && from.toLowerCase() !== topFolder(move.toPath)?.toLowerCase();
}

export type PutBackGroup = { folder: string; files: number; wentTo: string[] };

/** The owner's folders files left, most first, each with where its files went (most first). */
export function putBackGroups(moves: readonly MoveLike[]): PutBackGroup[] {
  const byFolder = new Map<string, Map<string, number>>();
  for (const move of moves.filter(leftOwnFolder)) {
    const from = topFolder(move.fromPath)!;
    const to = topFolder(move.toPath) ?? "(loose)";
    const row = byFolder.get(from) ?? new Map<string, number>();
    row.set(to, (row.get(to) ?? 0) + 1);
    byFolder.set(from, row);
  }
  return [...byFolder]
    .map(([folder, row]) => ({
      folder,
      files: [...row.values()].reduce((sum, n) => sum + n, 0),
      wentTo: [...row].sort((a, b) => b[1] - a[1]).map(([to]) => to),
    }))
    .sort((a, b) => b.files - a.files);
}
