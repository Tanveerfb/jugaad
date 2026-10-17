import type { DatabaseSync } from "node:sqlite";
import { journalEntrySchema, type JournalEntry } from "@/schemas/journal-schema";
import type { JournalStore } from "./types";

/** The append-only journal of disk changes, on the shared database. Triggers enforce append-only. */
export function sqliteJournal(db: DatabaseSync): JournalStore {
  const getRow = db.prepare("SELECT * FROM journal WHERE id = ?");

  function mustGet(id: number): JournalEntry {
    const row = getRow.get(id) as JournalRow | undefined;
    if (!row) throw new Error(`No journal entry ${id}`);
    return toEntry(row);
  }

  return {
    openJournalEntry(entry) {
      const result = db
        .prepare(
          `INSERT INTO journal (plan_id, move_id, action, from_path, to_path, started_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(entry.planId, entry.moveId, entry.action, entry.fromPath, entry.toPath, new Date().toISOString());
      return mustGet(Number(result.lastInsertRowid));
    },

    closeJournalEntry(id, { outcome, method, size, modifiedMs, error }) {
      // the close_once trigger refuses a second close
      db.prepare(
        `UPDATE journal SET outcome = ?, method = ?, size = ?, modified_ms = ?, error = ?, finished_at = ?
         WHERE id = ?`,
      ).run(outcome, method ?? null, size ?? null, modifiedMs ?? null, error ?? null, new Date().toISOString(), id);
      return mustGet(id);
    },

    listOpenJournalEntries() {
      const rows = db.prepare("SELECT * FROM journal WHERE outcome IS NULL ORDER BY id").all() as unknown as JournalRow[];
      return rows.map(toEntry);
    },

    listJournal(planId) {
      const rows = db.prepare("SELECT * FROM journal WHERE plan_id = ? ORDER BY id").all(planId) as unknown as JournalRow[];
      return rows.map(toEntry);
    },
  };
}

type JournalRow = {
  id: number;
  plan_id: string;
  move_id: string | null;
  action: string;
  from_path: string | null;
  to_path: string;
  method: string | null;
  size: number | null;
  modified_ms: number | null;
  started_at: string;
  finished_at: string | null;
  outcome: string | null;
  error: string | null;
};

function toEntry(row: JournalRow): JournalEntry {
  return journalEntrySchema.parse({
    id: row.id,
    planId: row.plan_id,
    moveId: row.move_id,
    action: row.action,
    fromPath: row.from_path,
    toPath: row.to_path,
    method: row.method,
    size: row.size,
    modifiedMs: row.modified_ms,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    outcome: row.outcome,
    error: row.error,
  });
}
