import { describe, expect, it } from "vitest";
import type { Category } from "@/schemas/category-schema";
import type { IndexSummary } from "@/schemas/indexed-file-schema";
import type { Job } from "@/schemas/job-schema";
import type { Plan } from "@/schemas/plan-schema";
import { folderStatus, jobFolderId, stepState } from "./folder-status";

const empty: IndexSummary = { files: 0, bytes: 0, hashed: 0, onlineOnly: 0, locked: 0, duplicateFiles: 0 };
const scanned: IndexSummary = { ...empty, files: 3120, hashed: 3100 };
const cat = (state: Category["state"]): Category => ({
  id: state,
  folderId: "f",
  name: state,
  state,
  source: "suggested",
  fileCount: 1,
  examples: [],
});
const plan = (status: Plan["status"]): Plan => ({
  id: status,
  folderId: "f",
  status,
  createdAt: "2026-10-17T00:00:00.000Z",
  updatedAt: "2026-10-17T00:00:00.000Z",
});
const job = (kind: string) => ({ kind, payload: { folderId: "f" } }) as Job;

describe("folder status", () => {
  it.each([
    ["a new folder", { summary: empty, categories: [], plans: [], activeJob: null }, "scan", "idle", "Not scanned"],
    ["a scan running", { summary: empty, categories: [], plans: [], activeJob: job("scan-folder") }, "scan", "working", "Scanning"],
    ["scanned, nothing suggested", { summary: scanned, categories: [], plans: [], activeJob: null }, "categories", "idle", "Scanned"],
    ["suggestions waiting", { summary: scanned, categories: [cat("suggested")], plans: [], activeJob: null }, "categories", "attention", "Categories to approve"],
    ["categories approved", { summary: scanned, categories: [cat("approved")], plans: [], activeJob: null }, "plan", "idle", "Scanned"],
    ["a plan to review", { summary: scanned, categories: [cat("approved")], plans: [plan("draft")], activeJob: null }, "plan", "attention", "Plan ready"],
    ["applied", { summary: scanned, categories: [cat("approved")], plans: [plan("applied")], activeJob: null }, "applied", "done", "Organised"],
    ["some moves failed", { summary: scanned, categories: [cat("approved")], plans: [plan("incomplete")], activeJob: null }, "applied", "attention", "Needs you"],
    ["a discarded plan is ignored", { summary: scanned, categories: [cat("approved")], plans: [plan("discarded")], activeJob: null }, "plan", "idle", "Scanned"],
  ] as const)("%s", (_, facts, step, tone, word) => {
    expect(folderStatus(facts)).toEqual({ step, tone, word });
  });

  it("orders steps for the track", () => {
    expect(stepState("scan", "plan")).toBe("done");
    expect(stepState("plan", "plan")).toBe("now");
    expect(stepState("applied", "plan")).toBe("ahead");
  });

  it("finds a job's folder from its payload, through its plan if need be", () => {
    expect(jobFolderId({ payload: { folderId: "f1" } }, () => null)).toBe("f1");
    expect(jobFolderId({ payload: { planId: "p1" } }, (id) => (id === "p1" ? "f2" : null))).toBe("f2");
    expect(jobFolderId({ payload: null }, () => null)).toBeNull();
  });
});
