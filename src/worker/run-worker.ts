import type { WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import { log } from "@/lib/log";
import { reconcileJournal } from "@/lib/safety/reconcile-journal";
import { handlerFor, type JobHandler } from "./job-handlers";

export type WorkerOptions = {
  store: WorkbenchStore;
  /** The model adapter, or a function giving the one to use for each job (the owner's current choices). */
  ai: WorkbenchAi | (() => WorkbenchAi);
  /** How often to look for a queued job when idle. */
  pollMs?: number;
  /** How often to write the heartbeat the app reads. */
  beatMs?: number;
  /** How often a running job checks whether the owner stopped it. */
  cancelPollMs?: number;
  /** Overrides the registry — tests only. */
  handlers?: (job: Parameters<typeof handlerFor>[0]) => JobHandler | undefined;
};

export type RunningWorker = {
  /** Resolves once the current job (if any) has stopped and the heartbeat is cleared. */
  stop(): Promise<void>;
};

/**
 * The worker loop: recover jobs a crash left running, settle its half-recorded disk changes,
 * then claim queued jobs one at a time (spec: batch by model, never fight over VRAM) and beat
 * so the app can tell it is alive. A job the owner stops is aborted within `cancelPollMs`.
 * All state goes through the store (SQLite) — the channel the owner chose.
 */
export function startWorker({ store, ai, pollMs = 1000, beatMs = 2000, cancelPollMs = 1000, handlers = handlerFor }: WorkerOptions): RunningWorker {
  const startedAt = new Date().toISOString();
  const stopping = new AbortController();

  const requeued = store.requeueInterruptedJobs();
  if (requeued) log("worker.requeued", { jobs: requeued });

  const beat = () => store.recordWorkerBeat({ pid: process.pid, startedAt });
  beat();
  const beatTimer = setInterval(beat, beatMs);
  const aiForJob = typeof ai === "function" ? ai : () => ai;
  log("worker.started", { pid: process.pid, provider: aiForJob().provider });

  const loop = (async () => {
    // before any job resumes: settle disk changes a crash left half-recorded
    const reconciled = await reconcileJournal(store);
    if (reconciled) log("worker.reconciled", { entries: reconciled });
    while (!stopping.signal.aborted) {
      const job = store.claimNextJob();
      if (!job) {
        await sleep(pollMs, stopping.signal);
        continue;
      }
      const handler = handlers(job);
      if (!handler) {
        store.transitionJob(job.id, "failed", `No handler for ${job.module}/${job.kind}`);
        log("job.failed", { id: job.id, reason: "no-handler" });
        continue;
      }
      log("job.started", { id: job.id, kind: `${job.module}/${job.kind}` });
      // the owner's Stop cancels the job in the store; the worker notices and aborts the handler
      const cancelled = new AbortController();
      const watch = setInterval(() => {
        if (store.getJob(job.id)?.status === "cancelled") cancelled.abort();
      }, cancelPollMs);
      try {
        await handler({ job, store, ai: aiForJob(), signal: AbortSignal.any([stopping.signal, cancelled.signal]) });
        if (stopping.signal.aborted) {
          // shutting down mid-job: leave it running; the next start requeues it
          break;
        }
        if (store.getJob(job.id)?.status === "running") store.transitionJob(job.id, "done");
        log(cancelled.signal.aborted ? "job.cancelled" : "job.done", { id: job.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = store.getJob(job.id)?.status;
        if (status === "running") store.transitionJob(job.id, "failed", message);
        log(status === "cancelled" ? "job.cancelled" : "job.failed", { id: job.id, reason: message });
      } finally {
        clearInterval(watch);
      }
    }
  })();

  return {
    async stop() {
      stopping.abort();
      clearInterval(beatTimer);
      await loop;
      store.clearWorkerBeat();
      log("worker.stopped");
    },
  };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
