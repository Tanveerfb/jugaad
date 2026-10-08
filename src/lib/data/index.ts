import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { dataDir } from "@/lib/data-dir";
import { openSqliteStore } from "./sqlite";
import type { WorkbenchStore } from "./types";

export type { WorkbenchStore } from "./types";

/** The database file inside the app's data folder. */
export function databasePath(): string {
  return join(dataDir(), "jugaad.db");
}

let store: WorkbenchStore | undefined;

/** The active store — one per process (the app and the worker each have their own). */
export function getStore(): WorkbenchStore {
  if (!store) {
    mkdirSync(dataDir(), { recursive: true });
    store = openSqliteStore(databasePath());
  }
  return store;
}
