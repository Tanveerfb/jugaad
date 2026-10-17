import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrations";
import { sqliteCategories } from "./sqlite-categories";
import { sqliteClassifications } from "./sqlite-classifications";
import { sqliteExamples } from "./sqlite-examples";
import { sqliteFiles } from "./sqlite-files";
import { sqliteFolders } from "./sqlite-folders";
import { sqliteJobs } from "./sqlite-jobs";
import { sqliteJournal } from "./sqlite-journal";
import { sqlitePlans } from "./sqlite-plans";
import { sqliteSettings } from "./sqlite-settings";
import type { WorkbenchStore } from "./types";

/**
 * The store on Node's built-in SQLite (`node:sqlite` — no native build, which matters on a
 * PC without C++ build tools). The app and the worker each open the same file; WAL mode lets
 * one write while the other reads. Each part of the store lives in its own `sqlite-*.ts`.
 */
export function openSqliteStore(path: string): WorkbenchStore {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  migrate(db);

  return {
    ...sqliteJobs(db),
    ...sqliteFolders(db),
    ...sqliteFiles(db),
    ...sqliteCategories(db),
    ...sqliteClassifications(db),
    ...sqliteExamples(db),
    ...sqlitePlans(db),
    ...sqliteJournal(db),
    ...sqliteSettings(db),
    close() {
      db.close();
    },
  };
}
