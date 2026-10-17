import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { allowedFolderSchema, type AllowedFolder } from "@/schemas/allowed-folder-schema";
import type { FoldersStore } from "./types";

/** The allow-list, on the shared database. */
export function sqliteFolders(db: DatabaseSync): FoldersStore {
  const getActive = db.prepare("SELECT * FROM allowed_folders WHERE id = ? AND removed_at IS NULL");

  function getAllowedFolder(id: string): AllowedFolder | null {
    const row = getActive.get(id) as FolderRow | undefined;
    return row ? toFolder(row) : null;
  }

  return {
    allowFolder(path) {
      const at = new Date().toISOString();
      const existing = db.prepare("SELECT * FROM allowed_folders WHERE path = ? COLLATE NOCASE").get(path) as
        | FolderRow
        | undefined;
      if (existing) {
        // added back: same id, so its old plans and journal still belong to it
        db.prepare("UPDATE allowed_folders SET removed_at = NULL, path = ?, added_at = ? WHERE id = ?").run(path, at, existing.id);
        return getAllowedFolder(existing.id)!;
      }
      const id = randomUUID();
      db.prepare("INSERT INTO allowed_folders (id, path, added_at) VALUES (?, ?, ?)").run(id, path, at);
      return getAllowedFolder(id)!;
    },

    listAllowedFolders() {
      const rows = db
        .prepare("SELECT * FROM allowed_folders WHERE removed_at IS NULL ORDER BY added_at, rowid")
        .all() as unknown as FolderRow[];
      return rows.map(toFolder);
    },

    getAllowedFolder,

    setIncludeSubfolders(id, include) {
      db.prepare("UPDATE allowed_folders SET include_subfolders = ? WHERE id = ?").run(include ? 1 : 0, id);
      const folder = getAllowedFolder(id);
      if (!folder) throw new Error("That folder is no longer on the list.");
      return folder;
    },

    removeAllowedFolder(id) {
      db.prepare("UPDATE allowed_folders SET removed_at = ? WHERE id = ? AND removed_at IS NULL").run(new Date().toISOString(), id);
    },
  };
}

type FolderRow = { id: string; path: string; added_at: string; removed_at: string | null; include_subfolders: number };

function toFolder(row: FolderRow): AllowedFolder {
  return allowedFolderSchema.parse({
    id: row.id,
    path: row.path,
    addedAt: row.added_at,
    includeSubfolders: row.include_subfolders === 1,
  });
}
