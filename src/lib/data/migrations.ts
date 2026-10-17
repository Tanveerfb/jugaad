import type { DatabaseSync } from "node:sqlite";

/**
 * Schema versions, applied in order and tracked with SQLite's user_version. **Append only** —
 * a released migration is never edited; a change is a new entry (data-model.md).
 */
const MIGRATIONS: readonly string[] = [
  // 1 — the job queue and the worker heartbeat (phase 0)
  `CREATE TABLE jobs (
     id TEXT PRIMARY KEY,
     module TEXT NOT NULL,
     kind TEXT NOT NULL,
     status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'paused', 'done', 'failed', 'cancelled')),
     progress REAL CHECK (progress IS NULL OR (progress >= 0 AND progress <= 1)),
     detail TEXT,
     payload TEXT NOT NULL DEFAULT 'null',
     error TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX jobs_status_created ON jobs (status, created_at);
   CREATE TABLE worker_beat (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     pid INTEGER NOT NULL,
     started_at TEXT NOT NULL,
     beat_at TEXT NOT NULL
   );`,

  // 2 — the safety layer: allowed folders, plans and their moves, the journal (phase 1)
  `CREATE TABLE allowed_folders (
     id TEXT PRIMARY KEY,
     path TEXT NOT NULL,
     added_at TEXT NOT NULL,
     removed_at TEXT
   );
   -- one row per folder, compared without letter case (Windows)
   CREATE UNIQUE INDEX allowed_folders_path ON allowed_folders (path COLLATE NOCASE);
   CREATE TABLE plans (
     id TEXT PRIMARY KEY,
     folder_id TEXT NOT NULL REFERENCES allowed_folders (id),
     status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'discarded', 'applying', 'applied',
       'incomplete', 'undoing', 'undone', 'undo-incomplete')),
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX plans_folder ON plans (folder_id, created_at);
   CREATE TABLE plan_moves (
     id TEXT PRIMARY KEY,
     plan_id TEXT NOT NULL REFERENCES plans (id),
     position INTEGER NOT NULL,
     from_path TEXT NOT NULL,
     to_path TEXT NOT NULL,
     included INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
     category TEXT,
     confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
     suggested_name TEXT,
     rename INTEGER NOT NULL DEFAULT 0 CHECK (rename IN (0, 1)),
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'moved', 'undone')),
     error TEXT
   );
   CREATE INDEX plan_moves_plan ON plan_moves (plan_id, position);
   CREATE TABLE journal (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     plan_id TEXT NOT NULL REFERENCES plans (id),
     move_id TEXT REFERENCES plan_moves (id),
     action TEXT NOT NULL CHECK (action IN ('move', 'undo', 'make-folder', 'remove-empty-folder')),
     from_path TEXT,
     to_path TEXT NOT NULL,
     method TEXT CHECK (method IS NULL OR method IN ('rename', 'copy')),
     size INTEGER,
     modified_ms REAL,
     started_at TEXT NOT NULL,
     finished_at TEXT,
     outcome TEXT CHECK (outcome IS NULL OR outcome IN ('done', 'failed')),
     error TEXT
   );
   CREATE INDEX journal_plan ON journal (plan_id, id);
   CREATE INDEX journal_open ON journal (outcome) WHERE outcome IS NULL;
   -- the journal is append-only: entries are closed once, never rewritten or removed
   CREATE TRIGGER journal_no_delete BEFORE DELETE ON journal
     BEGIN SELECT RAISE(ABORT, 'journal is append-only'); END;
   CREATE TRIGGER journal_close_once BEFORE UPDATE ON journal WHEN OLD.outcome IS NOT NULL
     BEGIN SELECT RAISE(ABORT, 'journal entry already closed'); END;`,

  // 3 — the shared file index (phase 1)
  `CREATE TABLE files (
     id TEXT PRIMARY KEY,
     folder_id TEXT NOT NULL REFERENCES allowed_folders (id),
     path TEXT NOT NULL,
     extension TEXT NOT NULL,
     size INTEGER NOT NULL,
     modified_ms REAL NOT NULL,
     created_ms REAL NOT NULL,
     hash TEXT,
     state TEXT NOT NULL CHECK (state IN ('indexed', 'online-only', 'locked', 'gone')),
     seen_at TEXT NOT NULL,
     scan_id TEXT NOT NULL
   );
   CREATE UNIQUE INDEX files_folder_path ON files (folder_id, path COLLATE NOCASE);
   CREATE INDEX files_hash ON files (folder_id, hash) WHERE hash IS NOT NULL;
   CREATE INDEX files_to_hash ON files (folder_id) WHERE hash IS NULL AND state = 'indexed';`,

  // 4 — signals code reads from each file: text excerpts and photo metadata (phase 1)
  `CREATE TABLE file_signals (
     file_id TEXT PRIMARY KEY REFERENCES files (id),
     hash TEXT NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('pdf', 'docx', 'text', 'image', 'none')),
     excerpt TEXT,
     page_count INTEGER,
     taken_at TEXT,
     camera TEXT,
     has_location INTEGER CHECK (has_location IS NULL OR has_location IN (0, 1)),
     error TEXT,
     read_at TEXT NOT NULL
   );`,

  // 5 — embeddings and categories (phase 1)
  `CREATE TABLE file_embeddings (
     file_id TEXT PRIMARY KEY REFERENCES files (id),
     hash TEXT NOT NULL,
     model TEXT NOT NULL,
     vector BLOB NOT NULL
   );
   CREATE TABLE categories (
     id TEXT PRIMARY KEY,
     folder_id TEXT NOT NULL REFERENCES allowed_folders (id),
     name TEXT NOT NULL,
     state TEXT NOT NULL CHECK (state IN ('suggested', 'approved', 'rejected')),
     source TEXT NOT NULL CHECK (source IN ('suggested', 'owner')),
     file_count INTEGER NOT NULL DEFAULT 0,
     examples TEXT NOT NULL DEFAULT '[]',
     position INTEGER NOT NULL,
     updated_at TEXT NOT NULL
   );
   -- one category per name in a folder: two would be the same subfolder on Windows
   CREATE UNIQUE INDEX categories_folder_name ON categories (folder_id, name COLLATE NOCASE);`,

  // 6 — remembered classifications, so rebuilding a plan doesn't ask the model again (phase 1)
  `CREATE TABLE file_classifications (
     file_id TEXT NOT NULL REFERENCES files (id),
     hash TEXT NOT NULL,
     model TEXT NOT NULL,
     categories_key TEXT NOT NULL,
     category TEXT NOT NULL,
     confidence REAL NOT NULL,
     suggested_name TEXT NOT NULL,
     classified_at TEXT NOT NULL,
     PRIMARY KEY (file_id, model, categories_key)
   );`,

  // 7 — what an image shows, in the vision model's words (phase 1)
  `ALTER TABLE file_signals ADD COLUMN caption TEXT;
   ALTER TABLE file_signals ADD COLUMN caption_model TEXT;`,

  // 8 — the owner's "Include subfolders" choice, per folder (phase 1)
  `ALTER TABLE allowed_folders ADD COLUMN include_subfolders INTEGER NOT NULL DEFAULT 0;`,

  // 9 — a category can be one of the owner's existing subfolders (phase 1). SQLite can't widen a
  // CHECK in place, so the table is rebuilt with the same rows.
  `CREATE TABLE categories_new (
     id TEXT PRIMARY KEY,
     folder_id TEXT NOT NULL REFERENCES allowed_folders (id),
     name TEXT NOT NULL,
     state TEXT NOT NULL CHECK (state IN ('suggested', 'approved', 'rejected')),
     source TEXT NOT NULL CHECK (source IN ('suggested', 'owner', 'folder')),
     file_count INTEGER NOT NULL DEFAULT 0,
     examples TEXT NOT NULL DEFAULT '[]',
     position INTEGER NOT NULL,
     updated_at TEXT NOT NULL
   );
   INSERT INTO categories_new SELECT id, folder_id, name, state, source, file_count, examples, position, updated_at FROM categories;
   DROP TABLE categories;
   ALTER TABLE categories_new RENAME TO categories;
   CREATE UNIQUE INDEX categories_folder_name ON categories (folder_id, name COLLATE NOCASE);`,

  // 10 — signals from videos, archives and programs (phase 1); the kind CHECK widens, so the
  // table is rebuilt with the same rows
  `CREATE TABLE file_signals_new (
     file_id TEXT PRIMARY KEY REFERENCES files (id),
     hash TEXT NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('pdf', 'docx', 'text', 'image', 'video', 'archive', 'program', 'none')),
     excerpt TEXT,
     page_count INTEGER,
     taken_at TEXT,
     camera TEXT,
     has_location INTEGER CHECK (has_location IS NULL OR has_location IN (0, 1)),
     error TEXT,
     read_at TEXT NOT NULL,
     caption TEXT,
     caption_model TEXT
   );
   INSERT INTO file_signals_new SELECT file_id, hash, kind, excerpt, page_count, taken_at, camera, has_location, error,
     read_at, caption, caption_model FROM file_signals;
   DROP TABLE file_signals;
   ALTER TABLE file_signals_new RENAME TO file_signals;`,

  // 11 — the owner's own filing decisions, kept as examples for the classifier (phase 1)
  `CREATE TABLE filing_examples (
     folder_id TEXT NOT NULL REFERENCES allowed_folders (id),
     file_id TEXT NOT NULL REFERENCES files (id),
     hash TEXT NOT NULL,
     description TEXT NOT NULL,
     category TEXT NOT NULL,
     created_at TEXT NOT NULL,
     PRIMARY KEY (folder_id, file_id)
   );`,

  // 12 — a move can carry a whole project folder (phase 1)
  `ALTER TABLE plan_moves ADD COLUMN is_folder INTEGER NOT NULL DEFAULT 0;`,
];

/** Brings the database up to the latest schema version, one transaction per version. */
export function migrate(db: DatabaseSync): void {
  const { user_version: version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
