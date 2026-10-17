import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { assertTransition } from "@/lib/domain/job-lifecycle";
import { jobSchema, workerStatusSchema, type Job, type JobStatus, type NewJob } from "@/schemas/job-schema";
import type { JobsStore } from "./types";

/** The job queue and the worker heartbeat, on the shared database. */
export function sqliteJobs(db: DatabaseSync): JobsStore {
  const now = () => new Date().toISOString();
  const getRow = db.prepare("SELECT * FROM jobs WHERE id = ?");

  function getJob(id: string): Job | null {
    const row = getRow.get(id) as JobRow | undefined;
    return row ? toJob(row) : null;
  }

  function mustGet(id: string): Job {
    const job = getJob(id);
    if (!job) throw new Error(`No job ${id}`);
    return job;
  }

  return {
    enqueueJob(job: NewJob): Job {
      const id = randomUUID();
      const at = now();
      db.prepare(
        `INSERT INTO jobs (id, module, kind, status, progress, detail, payload, error, created_at, updated_at)
         VALUES (?, ?, ?, 'queued', NULL, NULL, ?, NULL, ?, ?)`,
      ).run(id, job.module, job.kind, JSON.stringify(job.payload ?? null), at, at);
      return mustGet(id);
    },

    claimNextJob(): Job | null {
      // one statement, so two claimers can never take the same job
      const row = db
        .prepare(
          `UPDATE jobs SET status = 'running', updated_at = ?
           WHERE id = (SELECT id FROM jobs WHERE status = 'queued' ORDER BY created_at, rowid LIMIT 1)
           RETURNING *`,
        )
        .get(now()) as JobRow | undefined;
      return row ? toJob(row) : null;
    },

    reportProgress(id, progress, detail) {
      const job = mustGet(id);
      if (job.status !== "running") throw new Error(`Job ${id} is ${job.status}, not running`);
      db.prepare("UPDATE jobs SET progress = ?, detail = ?, updated_at = ? WHERE id = ?").run(progress, detail, now(), id);
    },

    transitionJob(id, to: JobStatus, error) {
      const job = mustGet(id);
      assertTransition(job.status, to);
      db.prepare("UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?").run(to, error ?? null, now(), id);
      return mustGet(id);
    },

    getJob,

    listActiveJobs() {
      const rows = db
        .prepare("SELECT * FROM jobs WHERE status IN ('queued', 'running', 'paused') ORDER BY created_at, rowid")
        .all() as unknown as JobRow[];
      return rows.map(toJob);
    },

    listRecentJobs(limit) {
      const rows = db.prepare("SELECT * FROM jobs ORDER BY updated_at DESC, rowid DESC LIMIT ?").all(limit) as unknown as JobRow[];
      return rows.map(toJob);
    },

    requeueInterruptedJobs() {
      // running → queued is a declared transition (job-lifecycle.ts)
      assertTransition("running", "queued");
      const result = db.prepare("UPDATE jobs SET status = 'queued', updated_at = ? WHERE status = 'running'").run(now());
      return Number(result.changes);
    },

    recordWorkerBeat({ pid, startedAt }) {
      db.prepare(
        `INSERT INTO worker_beat (id, pid, started_at, beat_at) VALUES (1, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET pid = excluded.pid, started_at = excluded.started_at, beat_at = excluded.beat_at`,
      ).run(pid, startedAt, now());
    },

    getWorkerStatus(at = new Date(), staleAfterMs = 10_000) {
      const row = db.prepare("SELECT pid, started_at, beat_at FROM worker_beat WHERE id = 1").get() as
        | { pid: number; started_at: string; beat_at: string }
        | undefined;
      if (!row) return { online: false, pid: null, startedAt: null, lastBeatAt: null };
      return workerStatusSchema.parse({
        online: at.getTime() - Date.parse(row.beat_at) <= staleAfterMs,
        pid: row.pid,
        startedAt: row.started_at,
        lastBeatAt: row.beat_at,
      });
    },

    clearWorkerBeat() {
      db.exec("DELETE FROM worker_beat");
    },
  };
}

type JobRow = {
  id: string;
  module: string;
  kind: string;
  status: string;
  progress: number | null;
  detail: string | null;
  payload: string;
  error: string | null;
  created_at: string;
  updated_at: string;
};

/** Every row read is parsed through the schema (project-rules §STATE). */
function toJob(row: JobRow): Job {
  return jobSchema.parse({
    id: row.id,
    module: row.module,
    kind: row.kind,
    status: row.status,
    progress: row.progress,
    detail: row.detail,
    payload: JSON.parse(row.payload),
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
