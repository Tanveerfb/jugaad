import type { WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import type { Job } from "@/schemas/job-schema";

/** What a job handler gets: its job, the store to report progress, the model adapter, and a stop signal. */
export type JobContext = {
  job: Job;
  store: WorkbenchStore;
  ai: WorkbenchAi;
  signal: AbortSignal;
};

export type JobHandler = (ctx: JobContext) => Promise<void>;

/**
 * Job kinds the worker can run, keyed `<module>/<kind>`. Phase 0 registers none — the queue,
 * heartbeat and restart recovery run with nothing to do. Phase 1 adds the Organiser's
 * scan, extraction, embedding and classification kinds here.
 */
export const JOB_HANDLERS: Readonly<Record<string, JobHandler>> = {};

export function handlerFor(job: Job): JobHandler | undefined {
  return JOB_HANDLERS[`${job.module}/${job.kind}`];
}
