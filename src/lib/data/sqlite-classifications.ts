import type { DatabaseSync } from "node:sqlite";
import { fileClassificationSchema } from "@/schemas/file-classification-schema";
import type { ClassificationsStore } from "./types";

/**
 * Remembered classifications, on the shared database. An answer is reused only for the same
 * file contents (hash), the same model and the same approved category list — change any of
 * them and the model is asked again.
 */
export function sqliteClassifications(db: DatabaseSync): ClassificationsStore {
  return {
    getClassification(fileId, hash, model, categoriesKey) {
      const row = db
        .prepare(
          `SELECT category, confidence, suggested_name FROM file_classifications
           WHERE file_id = ? AND model = ? AND categories_key = ? AND hash = ?`,
        )
        .get(fileId, model, categoriesKey, hash) as { category: string; confidence: number; suggested_name: string } | undefined;
      return row
        ? fileClassificationSchema.parse({ category: row.category, confidence: row.confidence, suggestedName: row.suggested_name })
        : null;
    },

    recordClassification(fileId, hash, model, categoriesKey, result) {
      db.prepare(
        `INSERT INTO file_classifications (file_id, hash, model, categories_key, category, confidence, suggested_name, classified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (file_id, model, categories_key) DO UPDATE SET hash = excluded.hash, category = excluded.category,
           confidence = excluded.confidence, suggested_name = excluded.suggested_name, classified_at = excluded.classified_at`,
      ).run(fileId, hash, model, categoriesKey, result.category, result.confidence, result.suggestedName, new Date().toISOString());
    },
  };
}
