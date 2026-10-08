import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqliteStore } from "./sqlite";
import type { WorkbenchStore } from "./types";

let store: WorkbenchStore;
beforeEach(() => {
  store = openSqliteStore(":memory:");
});
afterEach(() => store.close());

const scan = { module: "organiser", kind: "scan-folder", payload: { folder: "C:\\Downloads" } } as const;

describe("jobs", () => {
  it("enqueues a job as queued, with its payload round-tripped", () => {
    const job = store.enqueueJob(scan);
    expect(job).toMatchObject({ status: "queued", progress: null, module: "organiser", kind: "scan-folder" });
    expect(job.payload).toEqual({ folder: "C:\\Downloads" });
  });

  it("claims the oldest queued job first and marks it running", () => {
    const first = store.enqueueJob(scan);
    store.enqueueJob(scan);
    const claimed = store.claimNextJob();
    expect(claimed?.id).toBe(first.id);
    expect(claimed?.status).toBe("running");
  });

  it("returns null when nothing is queued", () => {
    expect(store.claimNextJob()).toBeNull();
  });

  it("never hands the same job out twice", () => {
    store.enqueueJob(scan);
    expect(store.claimNextJob()).not.toBeNull();
    expect(store.claimNextJob()).toBeNull();
  });

  it("records progress on a running job", () => {
    const { id } = store.enqueueJob(scan);
    store.claimNextJob();
    store.reportProgress(id, 0.62, "4,812 of 7,760 files");
    expect(store.getJob(id)).toMatchObject({ progress: 0.62, detail: "4,812 of 7,760 files" });
  });

  it("refuses progress on a job that is not running", () => {
    const { id } = store.enqueueJob(scan);
    expect(() => store.reportProgress(id, 0.5, null)).toThrow(/not running/);
  });

  it("goes through the lifecycle and refuses illegal moves", () => {
    const { id } = store.enqueueJob(scan);
    expect(() => store.transitionJob(id, "done")).toThrow(/Illegal job transition: queued → done/);
    store.claimNextJob();
    expect(store.transitionJob(id, "failed", "disk unplugged")).toMatchObject({ status: "failed", error: "disk unplugged" });
    expect(() => store.transitionJob(id, "queued")).toThrow(/Illegal/);
  });

  it("lists only unfinished jobs", () => {
    const a = store.enqueueJob(scan);
    const b = store.enqueueJob(scan);
    store.claimNextJob();
    store.transitionJob(a.id, "done");
    expect(store.listActiveJobs().map((j) => j.id)).toEqual([b.id]);
  });

  it("puts jobs a crash left running back in the queue", () => {
    store.enqueueJob(scan);
    store.claimNextJob();
    expect(store.requeueInterruptedJobs()).toBe(1);
    expect(store.listActiveJobs()[0].status).toBe("queued");
  });
});

describe("worker heartbeat", () => {
  it("is offline before the worker ever beats", () => {
    expect(store.getWorkerStatus()).toEqual({ online: false, pid: null, startedAt: null, lastBeatAt: null });
  });

  it("is online right after a beat and offline once it goes stale", () => {
    store.recordWorkerBeat({ pid: 4242, startedAt: new Date().toISOString() });
    expect(store.getWorkerStatus()).toMatchObject({ online: true, pid: 4242 });
    const later = new Date(Date.now() + 60_000);
    expect(store.getWorkerStatus(later, 10_000).online).toBe(false);
  });

  it("is offline after a clean stop", () => {
    store.recordWorkerBeat({ pid: 1, startedAt: new Date().toISOString() });
    store.clearWorkerBeat();
    expect(store.getWorkerStatus().online).toBe(false);
  });
});

describe("on disk", () => {
  it("lets a second connection (the app) see what the first (the worker) wrote", () => {
    const dir = mkdtempSync(join(tmpdir(), "jugaad-"));
    const path = join(dir, "jugaad.db");
    const worker = openSqliteStore(path);
    const app = openSqliteStore(path);
    try {
      worker.recordWorkerBeat({ pid: 7, startedAt: new Date().toISOString() });
      const { id } = worker.enqueueJob(scan);
      expect(app.getWorkerStatus().pid).toBe(7);
      expect(app.getJob(id)?.status).toBe("queued");
    } finally {
      worker.close();
      app.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
