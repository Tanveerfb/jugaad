import type { DatabaseSync } from "node:sqlite";
import type { ExamplesStore } from "./types";

/** The owner's filing decisions, kept as examples for the classifier, on the shared database. */
export function sqliteExamples(db: DatabaseSync): ExamplesStore {
  return {
    recordFilingExample(folderId, example) {
      db.prepare(
        `INSERT INTO filing_examples (folder_id, file_id, hash, description, category, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (folder_id, file_id) DO UPDATE SET hash = excluded.hash, description = excluded.description,
           category = excluded.category, created_at = excluded.created_at`,
      ).run(folderId, example.fileId, example.hash, example.description, example.category, new Date().toISOString());
    },

    listFilingExamples(folderId) {
      const rows = db
        .prepare("SELECT file_id, hash, description, category FROM filing_examples WHERE folder_id = ? ORDER BY created_at DESC")
        .all(folderId) as unknown as { file_id: string; hash: string; description: string; category: string }[];
      return rows.map((r) => ({ fileId: r.file_id, hash: r.hash, description: r.description, category: r.category }));
    },
  };
}
