import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";

/** SHA-256 of a file's contents, streamed so a large video never sits in memory. Hex string. */
export async function hashFile(path: string, signal?: AbortSignal): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path, { signal })) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

/** How much of each end a quick fingerprint reads. */
const EDGE_BYTES = 1024 * 1024;

/** Quick fingerprints start with this, so they never compare equal to a full hash. */
export const QUICK_PREFIX = "q:";

/**
 * A content fingerprint without reading the whole file: SHA-256 of its size, its first MB and
 * its last MB. Used for files whose size no other file shares — they can't be duplicates, so
 * reading all of a 10 GB recording would only cost time (a 384 GB folder of Twitch VODs on a
 * spinning disk, 2026-10-17). It still changes when the file does, so the caches keyed on it
 * stay honest. Small files are cheaper to hash in full, and are.
 */
export async function quickFingerprint(path: string, size: number, signal?: AbortSignal): Promise<string> {
  if (size <= 2 * EDGE_BYTES) return hashFile(path, signal);
  const handle = await open(path, "r");
  try {
    const head = Buffer.alloc(EDGE_BYTES);
    const tail = Buffer.alloc(EDGE_BYTES);
    await handle.read(head, 0, EDGE_BYTES, 0);
    await handle.read(tail, 0, EDGE_BYTES, size - EDGE_BYTES);
    return QUICK_PREFIX + createHash("sha256").update(`${size}|`).update(head).update(tail).digest("hex");
  } finally {
    await handle.close();
  }
}

export function isQuickFingerprint(hash: string | null): boolean {
  return hash?.startsWith(QUICK_PREFIX) ?? false;
}
