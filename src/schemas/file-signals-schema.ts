import { z } from "zod";

/**
 * What code can tell about a file without a model (spec, Organiser step 2: "first-page text of
 * documents, photo metadata, names"). Tied to the content hash it was read from, so an unchanged
 * file is never read twice. The excerpt is untrusted — it is text from the owner's files and may
 * say anything; prompts delimit it as data.
 */
export const fileSignalsSchema = z.object({
  fileId: z.string().min(1),
  /** The content hash these signals were read from. */
  hash: z.string().min(1),
  /** How the contents were read: which extractor ran. */
  kind: z.enum(["pdf", "docx", "text", "image", "video", "archive", "program", "none"]),
  /** The opening text, whitespace collapsed, capped in length. Null when there is none. */
  excerpt: z.string().nullable(),
  pageCount: z.number().int().nullable(),
  /** Photo capture time from EXIF, ISO. */
  takenAt: z.iso.datetime().nullable(),
  /** Camera or phone that took a photo, e.g. "Google Pixel 8". */
  camera: z.string().nullable(),
  /** Whether a photo carries a location — only the fact, not the place. */
  hasLocation: z.boolean().nullable(),
  /** Why reading failed (damaged, password-protected), if it did. */
  error: z.string().nullable(),
  /** For an image: what it shows, in one line from the local vision model. Null until seen. */
  caption: z.string().nullable(),
});
export type FileSignals = z.infer<typeof fileSignalsSchema>;

export type NewFileSignals = Omit<FileSignals, "fileId" | "hash" | "caption">;
