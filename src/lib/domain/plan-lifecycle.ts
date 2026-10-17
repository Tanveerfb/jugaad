import type { MoveStatus, PlanStatus } from "@/schemas/plan-schema";

/**
 * Every allowed plan transition, declared once (project-rules §LIFECYCLE). The store calls
 * `assertPlanTransition` before it writes a status.
 *
 *   draft ⇄ approved ──▶ applying ──▶ applied ──────┐
 *     │                     ▲  └────▶ incomplete ───┼──▶ undoing ──▶ undone
 *     ▼                     └──────── (retry) ┘     │       ▲  └────▶ undo-incomplete
 *   discarded                                       │       └──────── (retry) ┘
 *
 * `applying` and `undoing` are the only states the worker holds; a crash leaves them, and the
 * next start settles them to `incomplete` / `undo-incomplete` after checking the disk.
 */
const PLAN_TRANSITIONS: Record<PlanStatus, readonly PlanStatus[]> = {
  draft: ["approved", "discarded"],
  approved: ["draft", "applying", "discarded"],
  discarded: [],
  applying: ["applied", "incomplete"],
  applied: ["undoing"],
  incomplete: ["applying", "undoing"],
  undoing: ["undone", "undo-incomplete"],
  undone: [],
  "undo-incomplete": ["undoing"],
};

/** True when a plan may move from `from` to `to`. */
export function canTransitionPlan(from: PlanStatus, to: PlanStatus): boolean {
  return PLAN_TRANSITIONS[from].includes(to);
}

/** Throws on an illegal move — a programming error, not a user error. */
export function assertPlanTransition(from: PlanStatus, to: PlanStatus): void {
  if (!canTransitionPlan(from, to)) throw new Error(`Illegal plan transition: ${from} → ${to}`);
}

/** Moves can be included, excluded or edited only while the plan is a draft. */
export function isEditable(status: PlanStatus): boolean {
  return status === "draft";
}

/**
 * Every allowed move transition. A failed attempt does not change the status — it sets the
 * move's error, and the next apply (or undo) retries it.
 */
const MOVE_TRANSITIONS: Record<MoveStatus, readonly MoveStatus[]> = {
  pending: ["moved"],
  moved: ["undone"],
  undone: [],
};

export function canTransitionMove(from: MoveStatus, to: MoveStatus): boolean {
  return MOVE_TRANSITIONS[from].includes(to);
}

export function assertMoveTransition(from: MoveStatus, to: MoveStatus): void {
  if (!canTransitionMove(from, to)) throw new Error(`Illegal move transition: ${from} → ${to}`);
}
