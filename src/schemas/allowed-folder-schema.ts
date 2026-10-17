import { z } from "zod";

/**
 * A folder the owner added to the allow-list — the only places any module may read or change
 * (spec: "Only folders the owner adds"). `path` is absolute and resolved (junctions followed),
 * so every containment check compares like with like.
 */
export const allowedFolderSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  addedAt: z.iso.datetime(),
  /**
   * The owner's tick on the folder: sort files inside subfolders too. Off, only the folder's
   * own files. Suggestions and plans both follow it, so categories fit the files being sorted.
   */
  includeSubfolders: z.boolean(),
});
export type AllowedFolder = z.infer<typeof allowedFolderSchema>;
