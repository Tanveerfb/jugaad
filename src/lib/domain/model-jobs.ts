import type { ModelChoices, ModelJob } from "@/schemas/settings-schema";

/** An installed model and what it can do, as Ollama reports it. */
export type InstalledModel = { name: string; sizeBytes: number; capabilities: readonly string[] };

/** The resolved model per job; `describeImage` is null when images are not looked at. */
export type ResolvedModels = { classifyFile: string; nameCategories: string; describeImage: string | null; embed: string };

/** What a model must be able to do for each job. */
const NEEDS: Record<ModelJob, string> = {
  classifyFile: "completion",
  nameCategories: "completion",
  describeImage: "vision",
  embed: "embedding",
};

/** How each job is named on the settings page and in the VRAM panel. */
export const JOB_LABELS: Record<ModelJob, string> = {
  classifyFile: "Sorting files",
  nameCategories: "Naming groups",
  describeImage: "Looking at images",
  embed: "Grouping",
};

/** The installed models that can do a job, smallest first. */
export function modelsForJob(job: ModelJob, installed: readonly InstalledModel[]): InstalledModel[] {
  return installed.filter((m) => m.capabilities.includes(NEEDS[job])).sort((a, b) => a.sizeBytes - b.sizeBytes);
}

/** Whether a model can do a job — the server checks every saved choice with this. */
export function canDo(job: ModelJob, model: InstalledModel | undefined): boolean {
  return !!model && model.capabilities.includes(NEEDS[job]);
}

/** The jobs a loaded model is doing for Jugaad, lower case, for "Jugaad · sorting files, naming groups". */
export function jobsUsing(model: string, resolved: ResolvedModels): string[] {
  return (Object.keys(JOB_LABELS) as ModelJob[]).filter((job) => resolved[job] === model).map((job) => JOB_LABELS[job].toLowerCase());
}

/**
 * The distinct models the choices load, each once: naming and sorting on one model load it
 * once. With images off, the vision model doesn't count.
 */
export function modelsToLoad(resolved: ResolvedModels): string[] {
  return [...new Set([resolved.classifyFile, resolved.nameCategories, resolved.describeImage, resolved.embed].filter((m): m is string => !!m))];
}

/**
 * What changing each job's model costs the owner, said before they save — answers and vectors
 * are remembered per model, so a new model redoes that work once.
 */
export function changeNotes(before: ResolvedModels, after: ResolvedModels): Partial<Record<ModelJob, string>> {
  const notes: Partial<Record<ModelJob, string>> = {};
  if (before.classifyFile !== after.classifyFile) {
    notes.classifyFile = "Answers are remembered per model, so the next plan asks this model about every file again.";
  }
  if (before.embed !== after.embed) {
    notes.embed = "Groups are worked out again: the next suggestion reads every file with this model once.";
  }
  if (before.describeImage !== after.describeImage && after.describeImage !== null) {
    notes.describeImage = "Images are looked at again by this model on the next suggestion.";
  }
  if (before.describeImage !== null && after.describeImage === null) {
    notes.describeImage = "Pictures are then grouped by their names and dates only — quicker, but less sure.";
  }
  return notes;
}

/** The choices to store: only jobs that differ from the default, so a changed default still applies to the rest. */
export function toChoices(picked: ResolvedModels, defaults: ResolvedModels): ModelChoices {
  const choices: ModelChoices = {};
  if (picked.classifyFile !== defaults.classifyFile) choices.classifyFile = picked.classifyFile;
  if (picked.nameCategories !== defaults.nameCategories) choices.nameCategories = picked.nameCategories;
  if (picked.describeImage !== defaults.describeImage) choices.describeImage = picked.describeImage;
  if (picked.embed !== defaults.embed) choices.embed = picked.embed;
  return choices;
}
