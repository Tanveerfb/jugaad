import { z } from "zod";

/**
 * Where a category stands (spec, Organiser step 3: "the owner edits and approves the list").
 * Transitions are declared in `lib/domain/category-rules.ts`.
 * - `suggested` — proposed by clustering, or added by the owner and not yet approved
 * - `approved`  — files may be sorted into it
 * - `rejected`  — the owner turned it down; kept so a re-suggestion doesn't bring it back unasked
 */
export const categoryStateSchema = z.enum(["suggested", "approved", "rejected"]);
export type CategoryState = z.infer<typeof categoryStateSchema>;

/** A category of one allowed folder — becomes a subfolder of it when files are moved. */
export const categorySchema = z.object({
  id: z.string().min(1),
  folderId: z.string().min(1),
  /** Also the subfolder's name, so it must be a valid Windows folder name (`category-rules.ts`). */
  name: z.string().min(1).max(40),
  state: categoryStateSchema,
  /** Who proposed it: clustering, the owner, or an existing subfolder of the owner's. */
  source: z.enum(["suggested", "owner", "folder"]),
  /** Files in the cluster it came from — 0 for categories the owner added. */
  fileCount: z.number().int().min(0),
  /** A few file paths from the cluster, so the owner can see what it means. */
  examples: z.array(z.string()),
});
export type Category = z.infer<typeof categorySchema>;

export const newCategorySchema = categorySchema
  .pick({ name: true, source: true, fileCount: true, examples: true })
  // an existing folder no group belongs in is offered unticked
  .extend({ state: z.enum(["suggested", "rejected"]).optional() });
export type NewCategory = z.infer<typeof newCategorySchema>;

/**
 * What a model sees to name the clusters: a sample of each, all at once — so it can give each
 * group a name that sets it apart from the others. Named one at a time, groups of phone photos
 * and of screenshots came back "Photos" and "Images" (Downloads audit, 2026-10-17).
 */
export const nameCategoriesInputSchema = z.object({
  groups: z
    .array(
      z.object({
        files: z
          .array(z.object({ name: z.string().min(1), excerpt: z.string().max(400).optional() }))
          .min(1)
          .max(8),
      }),
    )
    .min(1)
    .max(16),
  /** The owner's existing subfolders: a group that belongs in one is given that exact name. */
  existing: z.array(z.string().min(1)).max(60).default([]),
});
export type NameCategoriesInput = z.input<typeof nameCategoriesInputSchema>;
export type ParsedNameCategories = z.infer<typeof nameCategoriesInputSchema>;

/** The model's answer for `count` groups: one short, plain name each, in group order. */
export function categoryNamesSchemaFor(count: number) {
  return z.object({ names: z.array(z.string().min(1).max(40)).length(count) });
}
export type CategoryNames = { names: string[] };

/** Payload of the `organiser/suggest-categories` job. */
export const suggestCategoriesPayloadSchema = z.object({ folderId: z.string().min(1) });
