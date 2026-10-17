"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { releaseModels } from "@/lib/ai/model-manager";
import { listInstalledModels, modelCapabilities } from "@/lib/ai/ollama-api";
import { getStore } from "@/lib/data";
import { canDo, toChoices } from "@/lib/domain/model-jobs";
import { serverEnv } from "@/lib/env";
import { getVramView, resolveModels } from "@/lib/settings-view";
import { MODEL_JOBS } from "@/schemas/settings-schema";

/**
 * Settings and the VRAM panel's actions. Choices are checked against what Ollama actually has
 * installed and can do — a model name from the page is never trusted as it comes.
 */

async function run(work: () => void | Promise<void>): Promise<ActionResult> {
  try {
    await work();
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong. Try again." };
  }
}

/** Unloads the models Jugaad loaded; other apps' models stay. Refused while a job is using one. */
export async function freeVram(): Promise<ActionResult> {
  return run(async () => {
    const view = await getVramView();
    if (!view.reachable) throw new Error("Ollama isn't answering. Start the Ollama app, then try again.");
    if (view.busy) throw new Error("A job is using the model. Free it when the job ends, or stop the job first.");
    await releaseModels(getStore());
  });
}

const pickedSchema = z.object({
  classifyFile: z.string().min(1).max(200),
  nameCategories: z.string().min(1).max(200),
  describeImage: z.string().min(1).max(200).nullable(),
  embed: z.string().min(1).max(200),
});

/** Saves the model per job. Each must be installed and able to do its job. */
export async function saveModels(raw: unknown): Promise<ActionResult> {
  return run(async () => {
    const picked = pickedSchema.parse(raw);
    const baseURL = serverEnv.JUGAAD_OLLAMA_URL;
    const sizes = await listInstalledModels(baseURL).catch(() => {
      throw new Error("Ollama isn't answering, so the models can't be checked. Start the Ollama app, then save again.");
    });
    for (const job of MODEL_JOBS) {
      const name = picked[job];
      if (name === null) continue; // images off
      const capabilities = sizes.has(name) ? await modelCapabilities(baseURL, name) : [];
      if (!canDo(job, { name, sizeBytes: sizes.get(name) ?? 0, capabilities })) {
        throw new Error(`${name} can't be used for this job — pick one from the list.`);
      }
    }
    getStore().setModelChoices(toChoices(picked, resolveModels({})));
  });
}

/** Back to the defaults (`.env.local`, then Jugaad's own). */
export async function resetModels(): Promise<ActionResult> {
  return run(() => getStore().setModelChoices({}));
}
