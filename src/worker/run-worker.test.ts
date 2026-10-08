import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockAi } from "@/lib/ai/mock";
import { openSqliteStore } from "@/lib/data/sqlite";
import type { WorkbenchStore } from "@/lib/data/types";
import type { JobHandler } from "./job-handlers";
import { startWorker } from "./run-worker";

let store: WorkbenchStore;
beforeEach(() => {
  store = openSqliteStore(":memory:");
});
afterEach(() => store.close());

/** Waits until `check` passes or 2 s elapse. */
async function until(check: () => boolean) {
  const end = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}

const job = { module: "organiser", kind: "scan-folder", payload: null } as const;

describe("startWorker", () => {
  it("beats on start and clears the beat on a clean stop", async () => {
    const worker = startWorker({ store, ai: createMockAi(), pollMs: 10 });
    expect(store.getWorkerStatus()).toMatchObject({ online: true, pid: process.pid });
    await worker.stop();
    expect(store.getWorkerStatus().online).toBe(false);
  });

  it("runs a queued job to done, with its progress recorded", async () => {
    const handler: JobHandler = async ({ job: j, store: s }) => s.reportProgress(j.id, 1, "all done");
    const { id } = store.enqueueJob(job);
    const worker = startWorker({ store, ai: createMockAi(), pollMs: 10, handlers: () => handler });
    await until(() => store.getJob(id)?.status === "done");
    expect(store.getJob(id)).toMatchObject({ progress: 1, detail: "all done" });
    await worker.stop();
  });

  it("fails a job whose handler throws, keeping the reason", async () => {
    const { id } = store.enqueueJob(job);
    const worker = startWorker({
      store,
      ai: createMockAi(),
      pollMs: 10,
      handlers: () => async () => {
        throw new Error("folder vanished");
      },
    });
    await until(() => store.getJob(id)?.status === "failed");
    expect(store.getJob(id)?.error).toBe("folder vanished");
    await worker.stop();
  });

  it("fails a job kind it has no handler for (phase 0 registers none)", async () => {
    const { id } = store.enqueueJob(job);
    const worker = startWorker({ store, ai: createMockAi(), pollMs: 10 });
    await until(() => store.getJob(id)?.status === "failed");
    expect(store.getJob(id)?.error).toMatch(/No handler for organiser\/scan-folder/);
    await worker.stop();
  });

  it("requeues jobs a previous run left running", async () => {
    const { id } = store.enqueueJob(job);
    store.claimNextJob(); // the "crashed" run
    let seen = 0;
    const worker = startWorker({
      store,
      ai: createMockAi(),
      pollMs: 10,
      handlers: () => async () => {
        seen++;
      },
    });
    await until(() => store.getJob(id)?.status === "done");
    expect(seen).toBe(1);
    await worker.stop();
  });
});
