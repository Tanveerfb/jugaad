import { randomUUID } from "node:crypto";
import path from "node:path";
import type { WorkbenchStore } from "@/lib/data";
import type { IndexSummary, ScannedFile } from "@/schemas/indexed-file-schema";
import { hashFile, isQuickFingerprint, quickFingerprint } from "./hash-file";
import { listOnlineOnlyFiles } from "./online-only";
import { hasReadableSignals, isLockError, readSignals } from "./read-signals";
import { walkFolder } from "./walk-folder";

export type ScanOptions = {
  protectedPaths: readonly string[];
  signal?: AbortSignal;
  /** Progress 0…1 (null while the amount of work is unknown) and a short line for the job panel. */
  onProgress?: (progress: number | null, detail: string) => void;
  /** Replaces the PowerShell placeholder lookup — tests only. */
  listOnlineOnly?: typeof listOnlineOnlyFiles;
};

export type ScanResult = { summary: IndexSummary; gone: number; unreadable: string[] } | { stopped: true };

const BATCH = 1000;
const NO_SIGNALS = { kind: "none", excerpt: null, pageCount: null, takenAt: null, camera: null, hasLocation: null, error: null } as const;
const PROGRESS_EVERY_MS = 250;

/**
 * Scans one allowed folder into the shared index (spec, Organiser steps 1–2): list every file by
 * metadata, mark cloud placeholders, hash what is new or changed so duplicates can be found by
 * content, then read signals — document text, photo metadata — from files that have them. Files
 * already hashed and read, and unchanged, are not read again. A locked file is skipped
 * and retried next scan, never forced. Stopping leaves the index consistent; the next run
 * carries on with what is still unhashed.
 */
export async function scanFolder(store: WorkbenchStore, folderId: string, options: ScanOptions): Promise<ScanResult> {
  const { signal, onProgress = () => {}, listOnlineOnly = listOnlineOnlyFiles } = options;
  const folder = store.getAllowedFolder(folderId);
  if (!folder) throw new Error("That folder is no longer on the allow-list.");
  const scanId = randomUUID();

  const report = throttle(onProgress);
  report(null, "Listing files…");
  const walk = await walkFolder(folder.path, options.protectedPaths, {
    signal,
    onBatch: (found) => report(null, `Found ${found.toLocaleString("en")} files`),
  });
  if (signal?.aborted) return { stopped: true };

  report(null, "Checking for online-only files…");
  const online = await listOnlineOnly(walk.folders);
  if (!online) {
    throw new Error("Couldn't check for OneDrive online-only files, so nothing was read. Try the scan again.");
  }

  const scanned: ScannedFile[] = walk.files.map((f) => ({
    ...f,
    onlineOnly: online.has(path.join(folder.path, f.path).toLowerCase()),
  }));
  for (let i = 0; i < scanned.length; i += BATCH) store.recordScannedFiles(folderId, scanId, scanned.slice(i, i + BATCH));
  const gone = store.markUnseenGone(folderId, scanId);

  // only files of the same size can be duplicates: they get a full hash, every other file a
  // quick fingerprint — and a file fingerprinted earlier is hashed in full once a twin appears
  const sizeCount = new Map<number, number>();
  for (const f of store.listIndexedFiles(folderId)) sizeCount.set(f.size, (sizeCount.get(f.size) ?? 0) + 1);
  const shared = (size: number) => (sizeCount.get(size) ?? 0) > 1;
  const toHash = [
    ...store.listFilesToHash(folderId),
    ...store.listIndexedFiles(folderId).filter((f) => f.state === "indexed" && isQuickFingerprint(f.hash) && shared(f.size)),
  ];
  const readBytes = (f: { size: number }) => (shared(f.size) ? f.size : Math.min(f.size, 2 * 1024 * 1024));
  const totalBytes = toHash.reduce((sum, f) => sum + readBytes(f), 0) || 1;
  let doneBytes = 0;
  for (const [i, file] of toHash.entries()) {
    if (signal?.aborted) return { stopped: true };
    report(doneBytes / totalBytes, `Reading ${(i + 1).toLocaleString("en")} of ${toHash.length.toLocaleString("en")} files`);
    try {
      const full = path.join(folder.path, file.path);
      store.recordFileHash(file.id, shared(file.size) ? await hashFile(full, signal) : await quickFingerprint(full, file.size, signal));
    } catch (error) {
      if (signal?.aborted) return { stopped: true };
      if (isLockError(error)) store.markFileLocked(file.id);
      // ENOENT: removed since the walk — the next scan marks it gone
    }
    doneBytes += readBytes(file);
  }

  const toRead = store.listFilesWithoutSignals(folderId);
  for (const [i, file] of toRead.entries()) {
    if (signal?.aborted) return { stopped: true };
    if (!hasReadableSignals(file.extension)) {
      store.recordFileSignals(file.id, file.hash!, NO_SIGNALS);
      continue;
    }
    report(i / toRead.length, `Reading contents: ${(i + 1).toLocaleString("en")} of ${toRead.length.toLocaleString("en")}`);
    try {
      store.recordFileSignals(file.id, file.hash!, await readSignals(path.join(folder.path, file.path), file.extension, file.size));
    } catch (error) {
      if (isLockError(error)) store.markFileLocked(file.id);
    }
  }

  const summary = store.getIndexSummary(folderId);
  onProgress(1, `${summary.files.toLocaleString("en")} files indexed`);
  return { summary, gone, unreadable: walk.unreadable };
}

/** At most one progress write every 250 ms — a scan of 50,000 small files shouldn't mean 50,000 writes. */
function throttle(fn: (progress: number | null, detail: string) => void) {
  let last = 0;
  return (progress: number | null, detail: string) => {
    const now = Date.now();
    if (now - last < PROGRESS_EVERY_MS) return;
    last = now;
    fn(progress, detail);
  };
}
