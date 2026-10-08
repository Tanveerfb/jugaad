import type { Job, JobStatus, NewJob, WorkerStatus } from "@/schemas/job-schema";

/**
 * Everything the app and the worker read or write, in domain terms (project-rules §DATA).
 * The worker and the app share it through the SQLite file — the owner's choice of channel
 * (decisions.md, 2026-10-08). Nothing outside `lib/data/` touches SQL.
 */
export type WorkbenchStore = {
  /** Adds a job to the queue. */
  enqueueJob(job: NewJob): Job;
  /** Atomically takes the oldest queued job and marks it running; null when the queue is empty. */
  claimNextJob(): Job | null;
  /** Updates a running job's progress line. */
  reportProgress(id: string, progress: number | null, detail: string | null): void;
  /** Moves a job to a new status through the lifecycle; throws on an illegal move. */
  transitionJob(id: string, to: JobStatus, error?: string): Job;
  /** One job, or null. */
  getJob(id: string): Job | null;
  /** Jobs not yet finished (queued, running, paused), oldest first. */
  listActiveJobs(): Job[];
  /** After a worker restart: jobs left "running" go back to the queue. Returns how many. */
  requeueInterruptedJobs(): number;

  /** The worker's heartbeat — written every few seconds while it runs. */
  recordWorkerBeat(beat: { pid: number; startedAt: string }): void;
  /** The worker counts as online if it beat within `staleAfterMs`. */
  getWorkerStatus(now?: Date, staleAfterMs?: number): WorkerStatus;
  /** Marks the worker as stopped (clean shutdown). */
  clearWorkerBeat(): void;

  close(): void;
};
