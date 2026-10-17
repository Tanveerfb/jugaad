import type { PlanMove } from "@/schemas/plan-schema";
import { DUPLICATES_FOLDER, REVIEW_FOLDER } from "./plan-rules";

/**
 * A plan's moves grouped by where they go — one destination bay per folder (the locked
 * signature plan review). Category bays come first in the order the owner approved them,
 * then files to review, then duplicate copies.
 */
export type BayKind = "category" | "review" | "duplicates";

export type Bay = {
  /** The destination folder, relative to the allowed folder: `Invoices`, `_review`. */
  folder: string;
  kind: BayKind;
  /** The heading: the category's name, "To review" or "Duplicate copies". */
  title: string;
  moves: PlanMove[];
};

export function groupIntoBays(moves: readonly PlanMove[], categoryOrder: readonly string[]): Bay[] {
  const bays = new Map<string, Bay>();
  for (const move of moves) {
    const folder = destinationFolder(move.toPath);
    const key = folder.toLowerCase();
    if (!bays.has(key)) bays.set(key, { folder, kind: kindOf(folder), title: titleOf(folder), moves: [] });
    bays.get(key)!.moves.push(move);
  }
  const rank = (bay: Bay) => {
    if (bay.kind === "review") return 10_000;
    if (bay.kind === "duplicates") return 10_001;
    const i = categoryOrder.findIndex((c) => c.toLowerCase() === bay.folder.toLowerCase());
    return i < 0 ? 9_999 : i;
  };
  return [...bays.values()].sort((a, b) => rank(a) - rank(b) || a.folder.localeCompare(b.folder));
}

/** Counts for the plan's header and its approve bar. */
export function planCounts(moves: readonly PlanMove[]) {
  return {
    moves: moves.length,
    included: moves.filter((m) => m.included).length,
    toReview: moves.filter((m) => kindOf(destinationFolder(m.toPath)) === "review").length,
    duplicates: moves.filter((m) => kindOf(destinationFolder(m.toPath)) === "duplicates").length,
    renames: moves.filter((m) => m.rename).length,
  };
}

function destinationFolder(toPath: string): string {
  const parts = toPath.split(/[\\/]/);
  return parts.slice(0, -1).join("\\");
}

function kindOf(folder: string): BayKind {
  const f = folder.toLowerCase();
  if (f === DUPLICATES_FOLDER.toLowerCase()) return "duplicates";
  if (f === REVIEW_FOLDER.toLowerCase()) return "review";
  return "category";
}

function titleOf(folder: string): string {
  const kind = kindOf(folder);
  return kind === "review" ? "To review" : kind === "duplicates" ? "Duplicate copies" : folder;
}
