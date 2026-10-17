import "server-only";
import { putBackGroups, type PutBackGroup } from "@/lib/domain/put-back";
import { getStore } from "@/lib/data";
import { folderStatus, jobFolderId, type FolderStatus } from "@/lib/domain/folder-status";
import { groupIntoBays, planCounts, type Bay } from "@/lib/domain/plan-bays";
import { REVIEW_FOLDER, inScope } from "@/lib/domain/plan-rules";
import type { AllowedFolder } from "@/schemas/allowed-folder-schema";
import type { Category } from "@/schemas/category-schema";
import type { IndexSummary } from "@/schemas/indexed-file-schema";
import type { Job, WorkerStatus } from "@/schemas/job-schema";
import type { Plan, PlanMove } from "@/schemas/plan-schema";

/**
 * What the Organiser's screens show, read from the store in one place — pages stay thin and
 * never touch the store's details (project-rules §DATA). Server only.
 */

export type FolderListItem = { folder: AllowedFolder; name: string; status: FolderStatus };

export type FolderView = {
  folder: AllowedFolder;
  name: string;
  summary: IndexSummary;
  status: FolderStatus;
  categories: Category[];
  /** Newest first, discarded ones left out. */
  plans: Plan[];
  activeJob: Job | null;
  /** The folder's last job, if it failed — its reason is shown until something newer runs. */
  failedJob: Job | null;
  worker: WorkerStatus;
};

export type PlanView = {
  plan: Plan;
  bays: Bay[];
  counts: ReturnType<typeof planCounts>;
  approvedCategories: string[];
};

/** The last part of a folder's path — "Downloads" for `C:\Users\Tanve\Downloads`. */
export function folderName(folder: AllowedFolder): string {
  return folder.path.split(/[\\/]/).filter(Boolean).at(-1) ?? folder.path;
}

export function listFolders(): FolderListItem[] {
  const store = getStore();
  const jobs = activeJobsByFolder();
  return store.listAllowedFolders().map((folder) => ({
    folder,
    name: folderName(folder),
    status: folderStatus({
      summary: store.getIndexSummary(folder.id),
      categories: store.listCategories(folder.id),
      plans: store.listPlans(folder.id),
      activeJob: jobs.get(folder.id) ?? null,
    }),
  }));
}

export function getFolderView(folderId: string): FolderView | null {
  const store = getStore();
  const folder = store.getAllowedFolder(folderId);
  if (!folder) return null;
  const summary = store.getIndexSummary(folder.id);
  const categories = store.listCategories(folder.id);
  const plans = store.listPlans(folder.id).filter((p) => p.status !== "discarded");
  const activeJob = activeJobsByFolder().get(folder.id) ?? null;
  const lastJob = store.listRecentJobs(50).find((j) => jobFolderId(j, planFolder) === folder.id);
  return {
    folder,
    name: folderName(folder),
    summary,
    status: folderStatus({ summary, categories, plans, activeJob }),
    categories,
    plans,
    activeJob,
    failedJob: lastJob?.status === "failed" ? lastJob : null,
    worker: store.getWorkerStatus(),
  };
}

/** The plan the owner is looking at: the newest one that was not discarded. */
export function getPlanView(folderId: string): PlanView | null {
  const store = getStore();
  const plan = store.listPlans(folderId).find((p) => p.status !== "discarded");
  if (!plan) return null;
  const moves = store.listPlanMoves(plan.id);
  const approvedCategories = store
    .listCategories(folderId)
    .filter((c) => c.state === "approved")
    .map((c) => c.name);
  return { plan, bays: groupIntoBays(moves, approvedCategories), counts: planCounts(moves), approvedCategories };
}

/** What "Build plan" would sort, following the folder's "Include subfolders" tick. */
export function getPlanSetup(folderId: string): { files: number; includeSubfolders: boolean; categoryCount: number } {
  const store = getStore();
  const approved = store.listCategories(folderId).filter((c) => c.state === "approved");
  const settled = new Set([REVIEW_FOLDER, ...approved.map((c) => c.name)].map((n) => n.toLowerCase()));
  const includeSubfolders = store.getAllowedFolder(folderId)?.includeSubfolders ?? false;
  const files = store.listIndexedFiles(folderId).filter((f) => f.state !== "locked" && inScope(f.path, includeSubfolders, settled));
  return { files: files.length, includeSubfolders, categoryCount: approved.length };
}

export type HistoryEntry = {
  plan: Plan;
  moved: number;
  total: number;
  /** Files put back with "Put back" (or a full undo), counted for the entry's title. */
  putBack: number;
  failed: PlanMove[];
  /** The owner's folders this plan took files out of and hasn't put back (History, "Put back"). */
  outOfOwn: PutBackGroup[];
};

/** Plans that changed the disk, newest first, with what failed. */
export function getHistory(folderId: string): HistoryEntry[] {
  const store = getStore();
  return store
    .listPlans(folderId)
    .filter((p) => !["draft", "approved", "discarded"].includes(p.status))
    .map((plan) => {
      const moves = store.listPlanMoves(plan.id).filter((m) => m.included);
      return {
        plan,
        moved: moves.filter((m) => m.status === "moved").length,
        total: moves.length,
        putBack: moves.filter((m) => m.status === "undone").length,
        failed: moves.filter((m) => m.error !== null),
        outOfOwn: plan.status === "applied" ? putBackGroups(moves) : [],
      };
    });
}

function planFolder(planId: string): string | null {
  return getStore().getPlan(planId)?.folderId ?? null;
}

function activeJobsByFolder(): Map<string, Job> {
  const byFolder = new Map<string, Job>();
  for (const job of getStore().listActiveJobs()) {
    const folderId = jobFolderId(job, planFolder);
    // oldest first: the one running now, or next in line
    if (folderId && !byFolder.has(folderId)) byFolder.set(folderId, job);
  }
  return byFolder;
}
