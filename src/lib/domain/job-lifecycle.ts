import type { JobStatus } from "@/schemas/job-schema";

/**
 * Every allowed job transition, declared once (project-rules §LIFECYCLE). Nothing writes a
 * job's status directly — the store calls `assertTransition` first.
 *
 *   queued ──▶ running ──▶ done
 *     │  ▲       │  │ └──▶ failed
 *     │  │       │  └────▶ paused ──▶ queued (resume)
 *     │  └───────┘ (requeued after a worker restart)
 *     └──▶ cancelled ◀── running, paused
 */
const TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["done", "failed", "paused", "cancelled", "queued"],
  paused: ["queued", "cancelled"],
  done: [],
  failed: [],
  cancelled: [],
};

/** True when a job may move from `from` to `to`. */
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Throws on an illegal move — a programming error, not a user error. */
export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) throw new Error(`Illegal job transition: ${from} → ${to}`);
}

/** A job in one of these states will never change again. */
export function isTerminal(status: JobStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
