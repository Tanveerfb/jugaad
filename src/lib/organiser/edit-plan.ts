import type { WorkbenchStore } from "@/lib/data";
import { describeFile } from "@/lib/domain/describe-file";
import { REVIEW_FOLDER, uniquePath, withName } from "@/lib/domain/plan-rules";
import type { PlanMove } from "@/schemas/plan-schema";

/**
 * Edits to a draft plan that change where a file goes. Every new destination is kept unique
 * against the plan's other destinations and the folder's existing files, so editing can never
 * aim two files at one name.
 */

/**
 * Ticks or unticks a move's suggested name (owner's choice, 2026-10-17: the model may suggest,
 * the owner decides per file). The destination folder stays; only the name changes.
 */
export function setRename(store: WorkbenchStore, moveId: string, rename: boolean): PlanMove {
  const move = mustGet(store, moveId);
  if (rename && !move.suggestedName) throw new Error("This file has no suggested name.");
  const name = rename ? move.suggestedName! : originalName(move);
  return store.setMoveTarget(move.id, {
    toPath: uniquePath(withName(move.toPath, name), usedPaths(store, move)),
    rename,
    category: move.category,
  });
}

/**
 * "Send to…" on a doubtful file (locked design): gives it an approved category, so it goes to
 * that folder instead of `_review` — or sends it back to `_review` with `null`. The model's
 * guess and confidence stay on the move as they were.
 */
export function sendTo(store: WorkbenchStore, moveId: string, category: string | null): PlanMove {
  const move = mustGet(store, moveId);
  const plan = store.getPlan(move.planId)!;
  if (category !== null) {
    const approved = store.listCategories(plan.folderId).some((c) => c.state === "approved" && c.name === category);
    if (!approved) throw new Error(`"${category}" isn't an approved category.`);
  }
  const name = move.rename && move.suggestedName ? move.suggestedName : originalName(move);
  const folder = category ?? REVIEW_FOLDER;
  if (category !== null) rememberDecision(store, plan.folderId, move.fromPath, category);
  return store.setMoveTarget(move.id, {
    toPath: uniquePath(`${folder}\\${name}`, usedPaths(store, move)),
    rename: move.rename,
    category: category ?? move.category,
  });
}

/**
 * The owner's "Send to…" is a filing decision worth learning from: the file goes there again on
 * later plans, and similar files are shown it as an example (2026-10-17).
 */
function rememberDecision(store: WorkbenchStore, folderId: string, filePath: string, category: string): void {
  const file = store.listIndexedFiles(folderId).find((f) => f.path.toLowerCase() === filePath.toLowerCase());
  if (!file?.hash) return;
  const description = describeFile(file, store.listFileSignals(folderId).get(file.id));
  store.recordFilingExample(folderId, { fileId: file.id, hash: file.hash, description, category });
}

function mustGet(store: WorkbenchStore, moveId: string): PlanMove {
  const move = store.getPlanMove(moveId);
  if (!move) throw new Error(`No move ${moveId}`);
  return move;
}

function originalName(move: PlanMove): string {
  return move.fromPath.split(/[\\/]/).at(-1)!;
}

/** Every destination in the plan but this move's, and every file in the folder but this one. */
function usedPaths(store: WorkbenchStore, move: PlanMove): Set<string> {
  const plan = store.getPlan(move.planId)!;
  const others = store
    .listPlanMoves(plan.id)
    .filter((m) => m.id !== move.id)
    .map((m) => m.toPath);
  const existing = store
    .listIndexedFiles(plan.folderId)
    .map((f) => f.path)
    .filter((p) => p.toLowerCase() !== move.fromPath.toLowerCase());
  return new Set([...others, ...existing].map((p) => p.toLowerCase()));
}
