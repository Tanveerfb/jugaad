import type { WorkbenchStore } from "@/lib/data";
import type { JournalEntry } from "@/schemas/journal-schema";
import { CASE_RENAME_SUFFIX, statOrNull } from "./move-file";

/**
 * After a crash: closes every journal entry left open, by looking at the disk. It never moves or
 * removes anything — it only records what actually happened, so the plan's resumed run (or the
 * owner) carries on from the truth. Returns how many entries it closed.
 */
export async function reconcileJournal(store: WorkbenchStore): Promise<number> {
  const open = store.listOpenJournalEntries();
  for (const entry of open) await reconcile(store, entry);
  return open.length;
}

async function reconcile(store: WorkbenchStore, entry: JournalEntry): Promise<void> {
  const exists = async (p: string | null) => (p ? (await statOrNull(p)) !== null : false);

  if (entry.action === "make-folder") {
    const ok = await exists(entry.toPath);
    store.closeJournalEntry(entry.id, ok ? { outcome: "done" } : { outcome: "failed", error: "Interrupted before the folder was made." });
    return;
  }
  if (entry.action === "remove-empty-folder") {
    const gone = !(await exists(entry.toPath));
    store.closeJournalEntry(entry.id, gone ? { outcome: "done" } : { outcome: "failed", error: "Interrupted; the folder is still there." });
    return;
  }

  // a move or an undo
  const atFrom = await exists(entry.fromPath);
  const landed = await statOrNull(entry.toPath);
  if (landed && !atFrom) {
    store.closeJournalEntry(entry.id, { outcome: "done", size: landed.size, modifiedMs: landed.mtimeMs });
    if (entry.moveId) completeIfBehind(store, entry);
    return;
  }

  let reason: string;
  if (atFrom && !landed) reason = "Interrupted before the file moved; it is still where it was.";
  else if (atFrom && landed) reason = `Interrupted mid-copy; both ${entry.fromPath} and ${entry.toPath} were kept — check the copy before removing either.`;
  else if (await exists(entry.toPath + CASE_RENAME_SUFFIX)) reason = `Interrupted mid-rename; the file is at ${entry.toPath + CASE_RENAME_SUFFIX}.`;
  else reason = "Interrupted, and the file is at neither place — it was moved or removed outside Jugaad.";
  store.closeJournalEntry(entry.id, { outcome: "failed", error: reason });
  if (entry.moveId) store.failMove(entry.moveId, reason);
}

/** The disk change happened but the crash came before the move's status was written. */
function completeIfBehind(store: WorkbenchStore, entry: JournalEntry): void {
  const plan = store.getPlan(entry.planId);
  const move = plan && store.listPlanMoves(plan.id).find((m) => m.id === entry.moveId);
  if (!move) return;
  if (entry.action === "move" && move.status === "pending") store.completeMove(move.id, "moved");
  if (entry.action === "undo" && move.status === "moved") store.completeMove(move.id, "undone");
}
