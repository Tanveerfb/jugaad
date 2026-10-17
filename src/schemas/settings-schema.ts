import { z } from "zod";

const modelName = z.string().trim().min(1).max(200);

/**
 * The owner's model per job, chosen on the settings page. A job left out uses the default
 * (`.env.local`, then `DEFAULT_MODELS`). `describeImage: null` means "don't look at images".
 */
export const modelChoicesSchema = z.object({
  classifyFile: modelName.optional(),
  nameCategories: modelName.optional(),
  describeImage: modelName.nullable().optional(),
  embed: modelName.optional(),
});
export type ModelChoices = z.infer<typeof modelChoicesSchema>;

/** The jobs a model can be chosen for, in the order the settings page lists them. */
export const MODEL_JOBS = ["classifyFile", "nameCategories", "describeImage", "embed"] as const;
export type ModelJob = (typeof MODEL_JOBS)[number];
