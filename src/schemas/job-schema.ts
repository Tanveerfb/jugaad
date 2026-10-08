import { z } from "zod";
import { moduleIdSchema } from "./module-schema";

/** Where a job is in its life. Transitions are declared once in `lib/domain/job-lifecycle.ts`. */
export const jobStatusSchema = z.enum(["queued", "running", "paused", "done", "failed", "cancelled"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/** A unit of long work the worker runs: a scan, an extraction pass, an embedding batch. */
export const jobSchema = z.object({
  id: z.string().min(1),
  /** The module that asked for it. */
  module: moduleIdSchema,
  /** What the job does, within its module — e.g. "scan-folder". */
  kind: z.string().min(1),
  status: jobStatusSchema,
  /** 0…1, or null while the size of the work is unknown. */
  progress: z.number().min(0).max(1).nullable(),
  /** A short line for the rotor panel — "4,812 of 7,760 files". */
  detail: z.string().nullable(),
  /** Module-specific input, stored as JSON; each job kind parses its own. */
  payload: z.unknown(),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Job = z.infer<typeof jobSchema>;

export const newJobSchema = jobSchema.pick({ module: true, kind: true, payload: true });
export type NewJob = z.infer<typeof newJobSchema>;

/** Is the worker process alive? Derived from its heartbeat. */
export const workerStatusSchema = z.object({
  online: z.boolean(),
  pid: z.number().int().nullable(),
  startedAt: z.iso.datetime().nullable(),
  lastBeatAt: z.iso.datetime().nullable(),
});
export type WorkerStatus = z.infer<typeof workerStatusSchema>;
