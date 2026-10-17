import type { Category } from "@/schemas/category-schema";
import type { IndexSummary } from "@/schemas/indexed-file-schema";
import type { Job } from "@/schemas/job-schema";
import type { Plan } from "@/schemas/plan-schema";

/**
 * Where an allowed folder stands in the Organiser's flow — scanned → categories → plan →
 * applied — and the one word shown beside it on the rail (locked design,
 * `docs/design/organiser.html`). Pure: the page passes in what the store holds.
 */

export type FolderStep = "scan" | "categories" | "plan" | "applied";
export type FolderTone = "working" | "attention" | "done" | "idle";

export type FolderStatus = {
  /** The step the owner is on now; earlier steps are done. */
  step: FolderStep;
  tone: FolderTone;
  /** One or two words: "Scanning", "Plan ready", "Organised". */
  word: string;
};

/** What a running job is doing, in the owner's words. */
const JOB_WORDS: Record<string, string> = {
  "scan-folder": "Scanning",
  "suggest-categories": "Suggesting categories",
  "build-plan": "Sorting",
  "apply-plan": "Moving files",
  "undo-plan": "Undoing",
};

export function jobWord(job: Pick<Job, "kind">): string {
  return JOB_WORDS[job.kind] ?? "Working";
}

export type FolderFacts = {
  summary: IndexSummary;
  categories: readonly Category[];
  /** Newest first. */
  plans: readonly Plan[];
  /** A queued or running job for this folder, if any. */
  activeJob: Job | null;
};

export function folderStatus({ summary, categories, plans, activeJob }: FolderFacts): FolderStatus {
  const step = currentStep(summary, categories, plans);
  if (activeJob) return { step, tone: "working", word: jobWord(activeJob) };

  const latest = plans.find((p) => p.status !== "discarded");
  if (latest?.status === "incomplete" || latest?.status === "undo-incomplete") {
    return { step, tone: "attention", word: "Needs you" };
  }
  if (latest?.status === "draft" || latest?.status === "approved") return { step, tone: "attention", word: "Plan ready" };
  if (latest?.status === "applied") return { step, tone: "done", word: "Organised" };
  if (step === "categories" && categories.some((c) => c.state === "suggested")) {
    return { step, tone: "attention", word: "Categories to approve" };
  }
  if (summary.files === 0) return { step, tone: "idle", word: "Not scanned" };
  return { step, tone: "idle", word: "Scanned" };
}

function currentStep(summary: IndexSummary, categories: readonly Category[], plans: readonly Plan[]): FolderStep {
  if (summary.files === 0) return "scan";
  const latest = plans.find((p) => p.status !== "discarded");
  if (latest && ["applied", "undone", "incomplete", "undo-incomplete", "applying", "undoing"].includes(latest.status)) {
    return "applied";
  }
  if (latest) return "plan";
  return categories.some((c) => c.state === "approved") ? "plan" : "categories";
}

const ORDER: readonly FolderStep[] = ["scan", "categories", "plan", "applied"];

/** Whether a step is behind, at, or ahead of the folder's current one — for the step track. */
export function stepState(step: FolderStep, current: FolderStep): "done" | "now" | "ahead" {
  const a = ORDER.indexOf(step);
  const b = ORDER.indexOf(current);
  return a < b ? "done" : a === b ? "now" : "ahead";
}

/** The folder id a job belongs to, from its payload, or null. Plan jobs carry a plan id instead. */
export function jobFolderId(job: Pick<Job, "payload">, planFolder: (planId: string) => string | null): string | null {
  const payload = job.payload as { folderId?: unknown; planId?: unknown } | null;
  if (typeof payload?.folderId === "string") return payload.folderId;
  if (typeof payload?.planId === "string") return planFolder(payload.planId);
  return null;
}
