import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { assertCategoryTransition } from "@/lib/domain/category-rules";
import { categorySchema, type Category } from "@/schemas/category-schema";
import type { CategoriesStore } from "./types";

/** Categories and the embedding cache, on the shared database. */
export function sqliteCategories(db: DatabaseSync): CategoriesStore {
  const now = () => new Date().toISOString();
  const getRow = db.prepare("SELECT * FROM categories WHERE id = ?");

  function mustGet(id: string): Category {
    const row = getRow.get(id) as CategoryRow | undefined;
    if (!row) throw new Error(`No category ${id}`);
    return toCategory(row);
  }

  function listCategories(folderId: string): Category[] {
    const rows = db
      .prepare("SELECT * FROM categories WHERE folder_id = ? ORDER BY position")
      .all(folderId) as unknown as CategoryRow[];
    return rows.map(toCategory);
  }

  function nextPosition(folderId: string): number {
    const row = db
      .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM categories WHERE folder_id = ?")
      .get(folderId) as { p: number };
    return row.p;
  }

  return {
    listCategories,

    replaceSuggestions(folderId, suggestions) {
      db.exec("BEGIN");
      try {
        // fresh suggestions replace old ones the owner never acted on; approved, rejected and
        // owner-added categories stay, and a suggestion matching one of them is dropped
        // an unticked existing folder was Jugaad's default, not the owner's no: it is offered afresh
        db.prepare(
          `DELETE FROM categories WHERE folder_id = ? AND (
             (source = 'suggested' AND state = 'suggested') OR (source = 'folder' AND state IN ('suggested', 'rejected')))`,
        ).run(folderId);
        const exists = db.prepare("SELECT 1 FROM categories WHERE folder_id = ? AND name = ? COLLATE NOCASE");
        const insert = db.prepare(
          `INSERT INTO categories (id, folder_id, name, state, source, file_count, examples, position, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        let position = nextPosition(folderId);
        for (const s of suggestions) {
          if (exists.get(folderId, s.name)) continue;
          insert.run(randomUUID(), folderId, s.name, s.state ?? "suggested", s.source, s.fileCount, JSON.stringify(s.examples), position++, now());
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return listCategories(folderId);
    },

    addCategory(folderId, name) {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO categories (id, folder_id, name, state, source, file_count, examples, position, updated_at)
         VALUES (?, ?, ?, 'suggested', 'owner', 0, '[]', ?, ?)`,
      ).run(id, folderId, name, nextPosition(folderId), now());
      return mustGet(id);
    },

    renameCategory(id, name) {
      db.prepare("UPDATE categories SET name = ?, updated_at = ? WHERE id = ?").run(name, now(), id);
      return mustGet(id);
    },

    setCategoryState(id, state) {
      const category = mustGet(id);
      assertCategoryTransition(category.state, state);
      db.prepare("UPDATE categories SET state = ?, updated_at = ? WHERE id = ?").run(state, now(), id);
      return mustGet(id);
    },

    listEmbeddings(folderId, model) {
      const rows = db
        .prepare(
          `SELECT e.file_id, e.vector FROM file_embeddings e JOIN files f ON f.id = e.file_id
           WHERE f.folder_id = ? AND f.state <> 'gone' AND e.model = ? AND e.hash = f.hash`,
        )
        .all(folderId, model) as unknown as { file_id: string; vector: Uint8Array }[];
      return new Map(rows.map((r) => [r.file_id, fromBlob(r.vector)]));
    },

    recordEmbeddings(model, entries) {
      const upsert = db.prepare(
        `INSERT INTO file_embeddings (file_id, hash, model, vector) VALUES (?, ?, ?, ?)
         ON CONFLICT (file_id) DO UPDATE SET hash = excluded.hash, model = excluded.model, vector = excluded.vector`,
      );
      db.exec("BEGIN");
      try {
        for (const e of entries) upsert.run(e.fileId, e.hash, model, toBlob(e.vector));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

type CategoryRow = {
  id: string;
  folder_id: string;
  name: string;
  state: string;
  source: string;
  file_count: number;
  examples: string;
};

function toCategory(row: CategoryRow): Category {
  return categorySchema.parse({
    id: row.id,
    folderId: row.folder_id,
    name: row.name,
    state: row.state,
    source: row.source,
    fileCount: row.file_count,
    examples: JSON.parse(row.examples),
  });
}

/** Vectors are stored as float32 — half the size of doubles, more precision than embeddings carry. */
function toBlob(vector: readonly number[]): Uint8Array {
  return new Uint8Array(Float32Array.from(vector).buffer);
}

function fromBlob(blob: Uint8Array): number[] {
  // copied into a fresh buffer: SQLite's bytes may not start on a 4-byte boundary
  return Array.from(new Float32Array(blob.slice().buffer));
}
