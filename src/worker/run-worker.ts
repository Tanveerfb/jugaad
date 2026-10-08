import type { WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import { log } from "@/lib/log";
import { handlerFor, type JobHandler } from "./job-handlers";

export type WorkerOptions = {
  store: WorkbenchStore;
  ai: WorkbenchAi;
  /** How often to look for a queued job when idle. */
  pollMs?: number;
  /** How often to write the heartbeat the app reads. */
  beatMs?: number;
  /** Overrides the registry — tests only. */
  handlers?: (job: Parameters<typeof handlerFor>[0]) => JobHandler | undefined;
};

export type RunningWorker = {
  /** Resolves once the current job (if any) has stopped and the heartbeat is cleared. */
  stop(): Promise<void>;
};

/**
 * The worker loop: recover jobs a crash left running, then claim queued jobs one at a time
 * (spec: batch by model, never fight over VRAM — one at a time is the phase 0 floor) and
 * beat so the app can tell it is alive. All state goes through the store (SQLite) — the
 * channel the owner chose.
 */
export function startWorker({ store, ai, pollMs = 1000, beatMs = 2000, handlers = handlerFor }: WorkerOptions): RunningWorker {
  const startedAt = new Date().toISOString();
  const stopping = new AbortController();

  const requeued = store.requeueInterruptedJobs();
  if (requeued) log("worker.requeued", { jobs: requeued });

  const beat = () => store.recordWorkerBeat({ pid: process.pid, startedAt });
  beat();
  const beatTimer = setInterval(beat, beatMs);
  log("worker.started", { pid: process.pid, provider: ai.provider });

  const loop = (async () => {
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
      try {
        await handler({ job, store, ai, signal: stopping.signal });
        if (stopping.signal.aborted) {
          // shutting down mid-job: leave it running; the next start requeues it
          break;
        }
        if (store.getJob(job.id)?.status === "running") store.transitionJob(job.id, "done");
        log("job.done", { id: job.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (store.getJob(job.id)?.status === "running") store.transitionJob(job.id, "failed", message);
        log("job.failed", { id: job.id, reason: message });
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
