import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileSignalsSchema, type FileSignals } from "@/schemas/file-signals-schema";
import {
  duplicateGroupSchema,
  indexSummarySchema,
  indexedFileSchema,
  type DuplicateGroup,
  type IndexedFile,
} from "@/schemas/indexed-file-schema";
import type { FilesStore } from "./types";

/** Larger images are judged on their name and metadata: sending 20 MB to the model costs more than it tells. */
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** The shared file index, on the shared database. */
export function sqliteFiles(db: DatabaseSync): FilesStore {
  const now = () => new Date().toISOString();

  // a file whose size and modified time are unchanged keeps its hash — nothing is re-read
  // that the index already knows (spec)
  const upsert = db.prepare(
    `INSERT INTO files (id, folder_id, path, extension, size, modified_ms, created_ms, hash, state, seen_at, scan_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
     ON CONFLICT (folder_id, path COLLATE NOCASE) DO UPDATE SET
       hash = CASE WHEN files.size = excluded.size AND files.modified_ms = excluded.modified_ms THEN files.hash ELSE NULL END,
       path = excluded.path,
       extension = excluded.extension,
       size = excluded.size,
       modified_ms = excluded.modified_ms,
       created_ms = excluded.created_ms,
       state = excluded.state,
       seen_at = excluded.seen_at,
       scan_id = excluded.scan_id`,
  );

  return {
    recordScannedFiles(folderId, scanId, files) {
      const at = now();
      db.exec("BEGIN");
      try {
        for (const f of files) {
          const extension = path.extname(f.path).slice(1).toLowerCase();
          const state = f.onlineOnly ? "online-only" : "indexed";
          upsert.run(randomUUID(), folderId, f.path, extension, f.size, f.modifiedMs, f.createdMs, state, at, scanId);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },

    markUnseenGone(folderId, scanId) {
      const result = db
        .prepare("UPDATE files SET state = 'gone' WHERE folder_id = ? AND scan_id <> ? AND state <> 'gone'")
        .run(folderId, scanId);
      return Number(result.changes);
    },

    listFilesToHash(folderId) {
      const rows = db
        .prepare("SELECT * FROM files WHERE folder_id = ? AND hash IS NULL AND state = 'indexed' ORDER BY path COLLATE NOCASE")
        .all(folderId) as unknown as FileRow[];
      return rows.map(toFile);
    },

    recordFileHash(fileId, hash) {
      db.prepare("UPDATE files SET hash = ? WHERE id = ?").run(hash, fileId);
    },

    markFileLocked(fileId) {
      db.prepare("UPDATE files SET state = 'locked' WHERE id = ? AND state = 'indexed'").run(fileId);
    },

    relocateFolder(folderId, fromDir, toDir) {
      // every path under fromDir\ swaps that prefix for toDir\ (compared without letter case)
      const from = `${fromDir}\\`;
      db.prepare(
        `UPDATE files SET path = ? || substr(path, ?)
         WHERE folder_id = ? AND lower(substr(path, 1, ?)) = lower(?)`,
      ).run(`${toDir}\\`, from.length + 1, folderId, from.length, from);
    },

    relocateFile(folderId, fromPath, toPath) {
      const extension = path.extname(toPath).slice(1).toLowerCase();
      db.prepare("UPDATE files SET path = ?, extension = ? WHERE folder_id = ? AND path = ? COLLATE NOCASE").run(
        toPath,
        extension,
        folderId,
        fromPath,
      );
    },

    listIndexedFiles(folderId) {
      const rows = db
        .prepare("SELECT * FROM files WHERE folder_id = ? AND state <> 'gone' ORDER BY path COLLATE NOCASE")
        .all(folderId) as unknown as FileRow[];
      return rows.map(toFile);
    },

    listDuplicateGroups(folderId) {
      const rows = db
        .prepare(
          `SELECT * FROM files WHERE folder_id = ? AND state <> 'gone' AND hash IN (
             SELECT hash FROM files WHERE folder_id = ? AND state <> 'gone' AND hash IS NOT NULL
             GROUP BY hash HAVING COUNT(*) > 1)
           ORDER BY size DESC, hash, created_ms, path`,
        )
        .all(folderId, folderId) as unknown as FileRow[];
      const groups = new Map<string, IndexedFile[]>();
      for (const file of rows.map(toFile)) groups.set(file.hash!, [...(groups.get(file.hash!) ?? []), file]);
      return [...groups].map(([hash, files]): DuplicateGroup =>
        duplicateGroupSchema.parse({ hash, size: files[0].size, files }),
      );
    },

    getIndexSummary(folderId) {
      const row = db
        .prepare(
          `SELECT COUNT(*) AS files,
                  COALESCE(SUM(size), 0) AS bytes,
                  COUNT(hash) AS hashed,
                  SUM(state = 'online-only') AS online_only,
                  SUM(state = 'locked') AS locked
           FROM files WHERE folder_id = ? AND state <> 'gone'`,
        )
        .get(folderId) as { files: number; bytes: number; hashed: number; online_only: number | null; locked: number | null };
      const dup = db
        .prepare(
          `SELECT COALESCE(SUM(n), 0) AS duplicate_files FROM (
             SELECT COUNT(*) AS n FROM files WHERE folder_id = ? AND state <> 'gone' AND hash IS NOT NULL
             GROUP BY hash HAVING COUNT(*) > 1)`,
        )
        .get(folderId) as { duplicate_files: number };
      return indexSummarySchema.parse({
        files: row.files,
        bytes: row.bytes,
        hashed: row.hashed,
        onlineOnly: row.online_only ?? 0,
        locked: row.locked ?? 0,
        duplicateFiles: dup.duplicate_files,
      });
    },

    listFilesWithoutSignals(folderId) {
      const rows = db
        .prepare(
          `SELECT f.* FROM files f LEFT JOIN file_signals s ON s.file_id = f.id
           WHERE f.folder_id = ? AND f.state = 'indexed' AND f.hash IS NOT NULL
             AND (s.file_id IS NULL OR s.hash <> f.hash)
           ORDER BY f.path COLLATE NOCASE`,
        )
        .all(folderId) as unknown as FileRow[];
      return rows.map(toFile);
    },

    recordFileSignals(fileId, hash, s) {
      db.prepare(
        `INSERT INTO file_signals (file_id, hash, kind, excerpt, page_count, taken_at, camera, has_location, error, read_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (file_id) DO UPDATE SET hash = excluded.hash, kind = excluded.kind, excerpt = excluded.excerpt,
           page_count = excluded.page_count, taken_at = excluded.taken_at, camera = excluded.camera,
           has_location = excluded.has_location, error = excluded.error, read_at = excluded.read_at,
           caption = NULL, caption_model = NULL`,
      ).run(
        fileId,
        hash,
        s.kind,
        s.excerpt,
        s.pageCount,
        s.takenAt,
        s.camera,
        s.hasLocation === null ? null : s.hasLocation ? 1 : 0,
        s.error,
        now(),
      );
    },

    listImagesToDescribe(folderId, model) {
      const rows = db
        .prepare(
          `SELECT f.* FROM files f JOIN file_signals s ON s.file_id = f.id AND s.hash = f.hash
           WHERE f.folder_id = ? AND f.state = 'indexed' AND f.size <= ?
             AND (f.extension IN ('jpg', 'jpeg', 'png', 'webp') OR (f.extension = 'pdf' AND s.excerpt IS NULL))
             AND (s.caption IS NULL OR s.caption_model <> ?)
           ORDER BY f.path COLLATE NOCASE`,
        )
        .all(folderId, MAX_IMAGE_BYTES, model) as unknown as FileRow[];
      return rows.map(toFile);
    },

    recordCaption(fileId, hash, model, caption) {
      db.prepare("UPDATE file_signals SET caption = ?, caption_model = ? WHERE file_id = ? AND hash = ?").run(caption, model, fileId, hash);
    },

    listFileSignals(folderId) {
      const rows = db
        .prepare(
          `SELECT s.* FROM file_signals s JOIN files f ON f.id = s.file_id
           WHERE f.folder_id = ? AND f.state <> 'gone' AND s.hash = f.hash`,
        )
        .all(folderId) as unknown as SignalsRow[];
      return new Map(rows.map((r) => [r.file_id, toSignals(r)]));
    },
  };
}

type SignalsRow = {
  file_id: string;
  hash: string;
  kind: string;
  excerpt: string | null;
  page_count: number | null;
  taken_at: string | null;
  camera: string | null;
  has_location: number | null;
  error: string | null;
  caption: string | null;
};

function toSignals(row: SignalsRow): FileSignals {
  return fileSignalsSchema.parse({
    fileId: row.file_id,
    hash: row.hash,
    kind: row.kind,
    excerpt: row.excerpt,
    pageCount: row.page_count,
    takenAt: row.taken_at,
    camera: row.camera,
    hasLocation: row.has_location === null ? null : row.has_location === 1,
    error: row.error,
    caption: row.caption,
  });
}

type FileRow = {
  id: string;
  folder_id: string;
  path: string;
  extension: string;
  size: number;
  modified_ms: number;
  created_ms: number;
  hash: string | null;
  state: string;
  seen_at: string;
};

function toFile(row: FileRow): IndexedFile {
  return indexedFileSchema.parse({
    id: row.id,
    folderId: row.folder_id,
    path: row.path,
    extension: row.extension,
    size: row.size,
    modifiedMs: row.modified_ms,
    createdMs: row.created_ms,
    hash: row.hash,
    state: row.state,
    seenAt: row.seen_at,
  });
}
