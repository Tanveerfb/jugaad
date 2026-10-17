import "server-only";
import { getStore } from "@/lib/data";
import { jobFolderId, jobWord } from "@/lib/domain/folder-status";
import { MODULES } from "@/lib/modules";
import { folderName, listFolders } from "@/lib/organiser/organiser-view";
import type { Module } from "@/schemas/module-schema";

export type RunningJob = { title: string; progress: number | null; detail: string | null };

/**
 * The workbench's live picture: the Organiser tile lit when something waits for the owner or a
 * job runs, and the job running now for the panel beside the comb. Server only.
 */
export function getWorkbenchView(): { modules: Module[]; job: RunningJob | null; folderCount: number } {
  const store = getStore();
  const folders = listFolders();
  const running = store.listActiveJobs().find((j) => j.status === "running") ?? store.listActiveJobs()[0] ?? null;
  const planFolder = (planId: string) => store.getPlan(planId)?.folderId ?? null;

  let job: RunningJob | null = null;
  if (running) {
    const id = jobFolderId(running, planFolder);
    const folder = id ? store.getAllowedFolder(id) : null;
    job = {
      title: `${jobWord(running)}${folder ? ` ${folderName(folder)}` : ""}`,
      progress: running.status === "running" ? (running.progress ?? 0) : null,
      detail: running.status === "queued" ? "Waiting to start" : running.detail,
    };
  }

  const waiting = folders.filter((f) => f.status.tone === "attention");
  const organiser: Module = {
    ...MODULES.find((m) => m.id === "organiser")!,
    ...(job
      ? { state: "working", statusText: job.title }
      : waiting.length
        ? { state: "attention", statusText: waiting.length === 1 ? `${waiting[0].name}: ${waiting[0].status.word}` : `${waiting.length} folders need you` }
        : { state: "idle", statusText: folders.length ? `${folders.length} ${folders.length === 1 ? "folder" : "folders"}` : "Add a folder" }),
  };
  return { modules: MODULES.map((m) => (m.id === "organiser" ? organiser : m)), job, folderCount: folders.length };
}
