import { describe, expect, it } from "vitest";
import { moveStatusSchema, planStatusSchema, type MoveStatus, type PlanStatus } from "@/schemas/plan-schema";
import {
  assertMoveTransition,
  assertPlanTransition,
  canTransitionMove,
  canTransitionPlan,
  isEditable,
} from "./plan-lifecycle";

const LEGAL_PLAN: [PlanStatus, PlanStatus][] = [
  ["draft", "approved"],
  ["draft", "discarded"],
  ["approved", "draft"],
  ["approved", "applying"],
  ["approved", "discarded"],
  ["applying", "applied"],
  ["applying", "incomplete"],
  ["applied", "undoing"],
  ["incomplete", "applying"],
  ["incomplete", "undoing"],
  ["undoing", "undone"],
  ["undoing", "undo-incomplete"],
  ["undo-incomplete", "undoing"],
];

const LEGAL_MOVE: [MoveStatus, MoveStatus][] = [
  ["pending", "moved"],
  ["moved", "undone"],
];

function allPairs<T extends string>(all: readonly T[], legal: [T, T][]): [T, T][] {
  return all
    .flatMap((from) => all.map((to) => [from, to] as [T, T]))
    .filter(([from, to]) => !legal.some(([f, t]) => f === from && t === to));
}

describe("plan lifecycle", () => {
  it.each(LEGAL_PLAN)("allows %s → %s", (from, to) => {
    expect(canTransitionPlan(from, to)).toBe(true);
    expect(() => assertPlanTransition(from, to)).not.toThrow();
  });

  it.each(allPairs(planStatusSchema.options, LEGAL_PLAN))("refuses %s → %s", (from, to) => {
    expect(canTransitionPlan(from, to)).toBe(false);
    expect(() => assertPlanTransition(from, to)).toThrow(/Illegal plan transition/);
  });

  it("never applies a plan nobody approved", () => {
    expect(canTransitionPlan("draft", "applying")).toBe(false);
  });

  it("only drafts are editable", () => {
    for (const s of planStatusSchema.options) expect(isEditable(s)).toBe(s === "draft");
  });
});

describe("move lifecycle", () => {
  it.each(LEGAL_MOVE)("allows %s → %s", (from, to) => {
    expect(canTransitionMove(from, to)).toBe(true);
    expect(() => assertMoveTransition(from, to)).not.toThrow();
  });

  it.each(allPairs(moveStatusSchema.options, LEGAL_MOVE))("refuses %s → %s", (from, to) => {
    expect(canTransitionMove(from, to)).toBe(false);
    expect(() => assertMoveTransition(from, to)).toThrow(/Illegal move transition/);
  });
});
