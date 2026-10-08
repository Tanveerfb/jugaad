import { z } from "zod";

/**
 * What the Organiser tells a model about one file (spec, Organiser step 4). Only signals code
 * already extracted — never the file itself.
 */
export const classifyFileInputSchema = z.object({
  fileName: z.string().min(1),
  /** Lower-case, without the dot; empty for files with no extension. */
  extension: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  modifiedAt: z.iso.datetime(),
  /** First-page text or photo metadata, already trimmed by the extractor. */
  excerpt: z.string().max(2000).optional(),
  /** The categories the owner approved. The model must pick one of these. */
  categories: z.array(z.string().min(1)).min(1),
});
export type ClassifyFileInput = z.infer<typeof classifyFileInputSchema>;

/** The shape a model must return, before checking the category against the approved list. */
export const fileClassificationSchema = z.object({
  category: z.string().min(1),
  /** A tidier file name, extension included. */
  suggestedName: z.string().min(1).max(180),
  /** 0…1. Below the review threshold, the file is marked "needs review". */
  confidence: z.number().min(0).max(1),
});
export type FileClassification = z.infer<typeof fileClassificationSchema>;

/**
 * The same schema, tightened for one call: the category must be one the owner approved. A
 * model that invents a category fails validation (and is retried once) rather than creating
 * a folder nobody approved.
 */
export function fileClassificationSchemaFor(categories: readonly string[]) {
  return fileClassificationSchema.extend({
    category: z.enum(categories as [string, ...string[]]),
  });
}
