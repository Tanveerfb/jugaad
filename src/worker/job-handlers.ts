import type { WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import { prepareModel } from "@/lib/ai/model-manager";
import { embedModel, modelFor } from "@/lib/ai/models";
import { scanFolder } from "@/lib/files/scan-folder";
import { buildPlan } from "@/lib/organiser/build-plan";
import { suggestCategories } from "@/lib/organiser/suggest-categories";
import { leftOwnFolder } from "@/lib/domain/put-back";
import { applyPlan, undoPlan } from "@/lib/safety/apply-plan";
import { machineProtectedPaths } from "@/lib/safety/protected-paths";
import { suggestCategoriesPayloadSchema } from "@/schemas/category-schema";
import { scanJobPayloadSchema } from "@/schemas/indexed-file-schema";
import type { Job } from "@/schemas/job-schema";
import { buildPlanPayloadSchema, planJobPayloadSchema } from "@/schemas/plan-schema";

/** What a job handler gets: its job, the store to report progress, the model adapter, and a stop signal. */
export type JobContext = {
  job: Job;
  store: WorkbenchStore;
  ai: WorkbenchAi;
  signal: AbortSignal;
};

export type JobHandler = (ctx: JobContext) => Promise<void>;

/** Applying and undoing share one shape: parse the plan id, run, report "n of m files". */
function planRunner(run: typeof applyPlan): JobHandler {
  return async ({ job, store, signal }) => {
    const { planId } = planJobPayloadSchema.parse(job.payload);
    await run(store, planId, {
      protectedPaths: machineProtectedPaths(),
      signal,
      onProgress: (done, total) => store.reportProgress(job.id, done / total, `${done} of ${total} files`),
    });
  };
}

/**
 * Job kinds the worker can run, keyed `<module>/<kind>`. Phase 1 adds the Organiser's scan,
 * extraction, embedding and classification kinds here as they are built.
 */
export const JOB_HANDLERS: Readonly<Record<string, JobHandler>> = {
  "organiser/scan-folder": async ({ job, store, signal }) => {
    const { folderId } = scanJobPayloadSchema.parse(job.payload);
    await scanFolder(store, folderId, {
      protectedPaths: machineProtectedPaths(),
      signal,
      onProgress: (progress, detail) => store.reportProgress(job.id, progress, detail),
    });
  },
  "organiser/suggest-categories": async ({ job, store, ai, signal }) => {
    const { folderId } = suggestCategoriesPayloadSchema.parse(job.payload);
    const choices = store.getModelChoices();
    await suggestCategories(store, ai, folderId, {
      // on the mock the ids only key the embedding cache
      embedModel: embedModel(choices)?.modelId ?? "mock",
      nameModel: modelFor("nameCategories", choices)?.modelId ?? "mock",
      // the owner can turn looking at images off on the settings page
      describeModel: choices.describeImage === null ? undefined : (modelFor("describeImage", choices)?.modelId ?? "mock"),
      prepareModel: (model) => prepareModel(model, store),
      signal,
      onProgress: (progress, detail) => store.reportProgress(job.id, progress, detail),
    });
  },
  "organiser/build-plan": async ({ job, store, ai, signal }) => {
    const { folderId } = buildPlanPayloadSchema.parse(job.payload);
    await buildPlan(store, ai, folderId, {
      classifyModel: modelFor("classifyFile", store.getModelChoices())?.modelId ?? "mock",
      prepareModel: (model) => prepareModel(model, store),
      signal,
      onProgress: (progress, detail) => store.reportProgress(job.id, progress, detail),
    });
  },
  "organiser/apply-plan": planRunner(applyPlan),
  "organiser/undo-plan": planRunner(undoPlan),
  // undo only the files that left the owner's own folders; the loose files stay sorted
  "organiser/put-back": planRunner((store, planId, options) => undoPlan(store, planId, options, leftOwnFolder)),
};

export function handlerFor(job: Job): JobHandler | undefined {
  return JOB_HANDLERS[`${job.module}/${job.kind}`];
}
