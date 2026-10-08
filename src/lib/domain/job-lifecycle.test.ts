import { describe, expect, it } from "vitest";
import { jobStatusSchema, type JobStatus } from "@/schemas/job-schema";
import { assertTransition, canTransition, isTerminal } from "./job-lifecycle";

const ALL = jobStatusSchema.options;

const LEGAL: [JobStatus, JobStatus][] = [
  ["queued", "running"],
  ["queued", "cancelled"],
  ["running", "done"],
  ["running", "failed"],
  ["running", "paused"],
  ["running", "cancelled"],
  ["running", "queued"],
  ["paused", "queued"],
  ["paused", "cancelled"],
];

describe("job lifecycle", () => {
  it.each(LEGAL)("allows %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  // every pair not listed above is illegal — checked exhaustively, not by example
  const illegal = ALL.flatMap((from) => ALL.map((to) => [from, to] as [JobStatus, JobStatus])).filter(
    ([from, to]) => !LEGAL.some(([f, t]) => f === from && t === to),
  );

  it.each(illegal)("refuses %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(/Illegal job transition/);
  });

  it("never lets a finished job change", () => {
    for (const s of ["done", "failed", "cancelled"] as const) expect(isTerminal(s)).toBe(true);
    for (const s of ["queued", "running", "paused"] as const) expect(isTerminal(s)).toBe(false);
  });

  it("cannot skip the queue: a paused job resumes by being queued, not by running", () => {
    expect(canTransition("paused", "running")).toBe(false);
  });
});
