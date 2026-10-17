import { z } from "zod";

/**
 * Where a file stands in the shared index.
 * - `indexed`     — on disk and readable; `hash` is set once the hashing pass reaches it
 * - `online-only` — a OneDrive placeholder; reading it would download it, so it is listed, never read
 * - `locked`      — open in another program when last tried; the next scan retries, never forces
 * - `gone`        — not found by the latest scan (moved or removed outside Jugaad)
 */
export const fileStateSchema = z.enum(["indexed", "online-only", "locked", "gone"]);
export type FileState = z.infer<typeof fileStateSchema>;

/** One file in an allowed folder, as the shared index knows it (spec: "Shared index"). */
export const indexedFileSchema = z.object({
  id: z.string().min(1),
  folderId: z.string().min(1),
  /** Relative to the allowed folder. */
  path: z.string().min(1),
  /** Lower-case extension without the dot, or "" for none. */
  extension: z.string(),
  size: z.number().int().min(0),
  modifiedMs: z.number(),
  createdMs: z.number(),
  /** SHA-256 of the contents, hex; null until hashed (and always for online-only files). */
  hash: z.string().nullable(),
  state: fileStateSchema,
  /** When a scan last saw it. */
  seenAt: z.iso.datetime(),
});
export type IndexedFile = z.infer<typeof indexedFileSchema>;

/** What the folder walk reports for each file it finds. */
export const scannedFileSchema = indexedFileSchema
  .pick({ path: true, size: true, modifiedMs: true, createdMs: true })
  .extend({ onlineOnly: z.boolean() });
export type ScannedFile = z.infer<typeof scannedFileSchema>;

/** Files with identical contents in one folder — the hash and every copy. */
export const duplicateGroupSchema = z.object({
  hash: z.string(),
  size: z.number().int(),
  files: z.array(indexedFileSchema).min(2),
});
export type DuplicateGroup = z.infer<typeof duplicateGroupSchema>;

/** Counts for a folder's index — what the scan panel shows. */
export const indexSummarySchema = z.object({
  files: z.number().int(),
  bytes: z.number().int(),
  hashed: z.number().int(),
  onlineOnly: z.number().int(),
  locked: z.number().int(),
  duplicateFiles: z.number().int(),
});
export type IndexSummary = z.infer<typeof indexSummarySchema>;

/** Payload of the `organiser/scan-folder` job. */
export const scanJobPayloadSchema = z.object({ folderId: z.string().min(1) });
export type ScanJobPayload = z.infer<typeof scanJobPayloadSchema>;
