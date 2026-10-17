"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { getStore } from "@/lib/data";
import { toCategoryName } from "@/lib/domain/category-rules";
import { jobFolderId } from "@/lib/domain/folder-status";
import { sendTo, setRename } from "@/lib/organiser/edit-plan";
import { allowFolder } from "@/lib/safety/allow-folder";
import { machineProtectedPaths } from "@/lib/safety/protected-paths";
import type { CategoryState } from "@/schemas/category-schema";

/**
 * The Organiser's server actions — the only way the interface changes anything. Each one
 * validates its input, writes through the store, queues work for the worker, and refreshes
 * the page. Nothing here moves a file: the worker does that, through the safety layer.
 */


const id = z.string().min(1).max(64);

async function run(work: () => void | Promise<void>): Promise<ActionResult> {
  try {
    await work();
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong. Try again." };
  }
}

/** A refused path comes back with the form, so the owner can correct it rather than retype it. */
export type AddFolderState = { ok: false; error: string; path: string } | null;

/** Adds a pasted folder path; on success opens that folder. Used with useActionState. */
export async function addFolder(_: AddFolderState, form: FormData): Promise<AddFolderState> {
  const path = z.string().max(1024).safeParse(form.get("path"));
  if (!path.success || !path.data.trim()) return { ok: false, error: "Paste a folder path first.", path: "" };
  const result = await allowFolder(getStore(), path.data, machineProtectedPaths());
  if (!result.ok) return { ok: false, error: result.reason, path: path.data };
  redirect(`/organiser?folder=${result.folder.id}`);
}

/** Queues a job for a folder, unless one is already queued or running for it. */
function enqueueFor(folderId: string, kind: string, payload: Record<string, unknown>) {
  const store = getStore();
  if (!store.getAllowedFolder(folderId)) throw new Error("That folder is no longer on the list.");
  const planFolder = (planId: string) => store.getPlan(planId)?.folderId ?? null;
  if (store.listActiveJobs().some((j) => jobFolderId(j, planFolder) === folderId)) {
    throw new Error("Something is already running for this folder. Wait for it, or stop it.");
  }
  store.enqueueJob({ module: "organiser", kind, payload });
}

export async function startScan(folderId: string): Promise<ActionResult> {
  return run(() => enqueueFor(id.parse(folderId), "scan-folder", { folderId }));
}

export async function suggestCategories(folderId: string): Promise<ActionResult> {
  return run(() => enqueueFor(id.parse(folderId), "suggest-categories", { folderId }));
}

export async function buildPlan(folderId: string): Promise<ActionResult> {
  return run(() => enqueueFor(id.parse(folderId), "build-plan", { folderId }));
}

/**
 * Takes a folder off the list. Refused while something runs for it, so a scan or a move is never
 * cut off; nothing on disk changes either way.
 */
export async function removeFolder(folderId: string): Promise<ActionResult> {
  return run(() => {
    const store = getStore();
    const planFolder = (planId: string) => store.getPlan(planId)?.folderId ?? null;
    if (store.listActiveJobs().some((j) => jobFolderId(j, planFolder) === folderId)) {
      throw new Error("Something is running for this folder. Wait for it, or stop it, then remove the folder.");
    }
    store.removeAllowedFolder(id.parse(folderId));
  });
}

/** The folder's "Include subfolders" tick — suggestions and plans both follow it. */
export async function setIncludeSubfolders(folderId: string, include: boolean): Promise<ActionResult> {
  return run(() => void getStore().setIncludeSubfolders(id.parse(folderId), z.boolean().parse(include)));
}

/** The owner's Stop: a queued job never starts; a running one is stopped by the worker. */
export async function stopJob(jobId: string): Promise<ActionResult> {
  return run(() => {
    const store = getStore();
    const job = store.getJob(id.parse(jobId));
    if (job && (job.status === "queued" || job.status === "running")) store.transitionJob(job.id, "cancelled");
  });
}

const categoryEditsSchema = z
  .array(z.object({ id, name: z.string().max(80), keep: z.boolean() }))
  .max(200);

/**
 * "Approve N categories": every ticked row is approved under its (possibly edited) name, every
 * unticked one turned down. Names are tidied into valid folder names first.
 */
export async function approveCategories(folderId: string, edits: unknown): Promise<ActionResult> {
  return run(() => {
    const store = getStore();
    const rows = categoryEditsSchema.parse(edits);
    const current = new Map(store.listCategories(id.parse(folderId)).map((c) => [c.id, c]));
    for (const row of rows) {
      const category = current.get(row.id);
      if (!category) continue;
      if (row.keep) {
        const name = toCategoryName(row.name);
        if (!name) throw new Error(`"${row.name}" can't be a folder name. Use letters, numbers and spaces.`);
        if (name !== category.name) store.renameCategory(category.id, name);
      }
      moveTo(store, category.id, category.state, row.keep ? "approved" : "rejected");
    }
  });
}

/** Walks a category to the wanted state through the declared lifecycle. */
function moveTo(store: ReturnType<typeof getStore>, categoryId: string, from: CategoryState, to: CategoryState) {
  if (from === to) return;
  if (from === "rejected" && to === "approved") store.setCategoryState(categoryId, "suggested");
  store.setCategoryState(categoryId, to);
}

export async function addCategory(folderId: string, rawName: string): Promise<ActionResult> {
  return run(() => {
    const name = toCategoryName(z.string().max(80).parse(rawName));
    if (!name) throw new Error("Type a name of letters, numbers and spaces.");
    const store = getStore();
    if (store.listCategories(id.parse(folderId)).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`There's already a category called ${name}.`);
    }
    store.addCategory(folderId, name);
  });
}

export async function setIncluded(moveIds: string[], included: boolean): Promise<ActionResult> {
  return run(() => {
    const store = getStore();
    for (const moveId of z.array(id).max(10_000).parse(moveIds)) store.setMoveIncluded(moveId, z.boolean().parse(included));
  });
}

export async function setMoveRename(moveId: string, rename: boolean): Promise<ActionResult> {
  return run(() => void setRename(getStore(), id.parse(moveId), z.boolean().parse(rename)));
}

export async function sendMoveTo(moveId: string, category: string | null): Promise<ActionResult> {
  return run(() => void sendTo(getStore(), id.parse(moveId), z.string().min(1).max(80).nullable().parse(category)));
}

/** "Approve and move": the plan is approved and the worker applies it through the safety layer. */
export async function approvePlan(planId: string): Promise<ActionResult> {
  return run(() => {
    const store = getStore();
    const plan = store.getPlan(id.parse(planId));
    if (!plan) throw new Error("That plan no longer exists.");
    if (plan.status === "draft") store.transitionPlan(plan.id, "approved");
    enqueueFor(plan.folderId, "apply-plan", { planId: plan.id });
  });
}

/** Retries the moves that failed — a file that was open, a name that was taken. */
export async function retryPlan(planId: string): Promise<ActionResult> {
  return run(() => {
    const plan = getStore().getPlan(id.parse(planId));
    if (!plan) throw new Error("That plan no longer exists.");
    enqueueFor(plan.folderId, plan.status === "undo-incomplete" ? "undo-plan" : "apply-plan", { planId: plan.id });
  });
}

export async function undoPlan(planId: string): Promise<ActionResult> {
  return run(() => {
    const plan = getStore().getPlan(id.parse(planId));
    if (!plan) throw new Error("That plan no longer exists.");
    enqueueFor(plan.folderId, "undo-plan", { planId: plan.id });
  });
}

/** Puts back only the files a plan moved out of the owner's own folders (History, "Put back"). */
export async function putBack(planId: string): Promise<ActionResult> {
  return run(() => {
    const plan = getStore().getPlan(id.parse(planId));
    if (!plan) throw new Error("That plan no longer exists.");
    if (plan.status !== "applied") throw new Error("Only a plan that finished moving can put files back.");
    enqueueFor(plan.folderId, "put-back", { planId: plan.id });
  });
}

export async function discardPlan(planId: string): Promise<ActionResult> {
  return run(() => void getStore().transitionPlan(id.parse(planId), "discarded"));
}
