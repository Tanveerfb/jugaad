import "server-only";
import { DEFAULT_EMBED_MODEL, MEASURED_VRAM_GB, modelIdFor } from "@/lib/ai/models";
import { readGpuPicture } from "@/lib/ai/model-manager";
import { listInstalledModels, modelCapabilities, ollamaVersion } from "@/lib/ai/ollama-api";
import { getStore } from "@/lib/data";
import { estimateVramBytes } from "@/lib/domain/vram-plan";
import { jobsUsing, modelsForJob, type InstalledModel, type ResolvedModels } from "@/lib/domain/model-jobs";
import { serverEnv } from "@/lib/env";
import { MODEL_JOBS, type ModelChoices, type ModelJob } from "@/schemas/settings-schema";

const GB = 1024 ** 3;
/** Job kinds that hold a model on the GPU while they run. */
const MODEL_JOB_KINDS = new Set(["suggest-categories", "build-plan"]);

/** The model each job uses for these choices: the owner's, else the environment's, else the default. */
export function resolveModels(choices: ModelChoices): ResolvedModels {
  return {
    classifyFile: modelIdFor("classifyFile", choices),
    nameCategories: modelIdFor("nameCategories", choices),
    describeImage: choices.describeImage === null ? null : modelIdFor("describeImage", choices),
    embed: choices.embed ?? serverEnv.JUGAAD_EMBED_MODEL ?? DEFAULT_EMBED_MODEL,
  };
}

/** VRAM a model takes once loaded: measured on the PC where we have it, else estimated from its download. */
function vramGbFor(name: string, installed: readonly InstalledModel[]): number {
  const measured = MEASURED_VRAM_GB[name];
  if (measured !== undefined) return measured;
  const download = installed.find((m) => m.name === name)?.sizeBytes;
  return download === undefined ? 0 : estimateVramBytes(download) / GB;
}

/** A running job that holds a model — "Free VRAM" waits for it. */
function busyJob(): { detail: string } | null {
  const job = getStore()
    .listActiveJobs()
    .find((j) => j.status === "running" && MODEL_JOB_KINDS.has(j.kind));
  return job ? { detail: job.detail ?? "A job is using the model" } : null;
}

export type VramView =
  | { reachable: false }
  | {
      reachable: true;
      usedGb: number;
      totalGb: number;
      /** Models Jugaad loaded that are in memory now, with the jobs each is doing. */
      jugaad: { name: string; gb: number; jobs: string[] }[];
      otherGb: number;
      freeGb: number;
      busy: { detail: string } | null;
    };

/** The VRAM panel: what is in the card, what of it is Jugaad's, and whether it can be freed now. */
export async function getVramView(): Promise<VramView> {
  const store = getStore();
  const gpu = await readGpuPicture(serverEnv.JUGAAD_OLLAMA_URL, store).catch(() => null);
  if (!gpu) return { reachable: false };
  const resolved = resolveModels(store.getModelChoices());
  const jugaad = gpu.loaded
    .filter((m) => m.ours)
    .map((m) => ({ name: m.name, gb: m.vramBytes / GB, jobs: jobsUsing(m.name, resolved) }));
  const jugaadGb = jugaad.reduce((sum, m) => sum + m.gb, 0);
  const usedGb = gpu.usedBytes / GB;
  const totalGb = gpu.totalBytes / GB;
  return {
    reachable: true,
    usedGb,
    totalGb,
    jugaad,
    otherGb: Math.max(0, usedGb - jugaadGb),
    freeGb: Math.max(0, totalGb - usedGb),
    busy: busyJob(),
  };
}

export type JobOption = { name: string; gb: number };

export type SettingsView =
  | { reachable: false; address: string }
  | {
      reachable: true;
      address: string;
      version: string;
      installedCount: number;
      /** The models each job can use, and the one it uses now. */
      jobs: { job: ModelJob; options: JobOption[]; current: string | null }[];
      defaults: ResolvedModels;
      current: ResolvedModels;
      /** VRAM per installed model, for the "fits together" bar as the owner changes things. */
      vramGb: Record<string, number>;
      totalGb: number;
      /** What the card holds that isn't Jugaad's, right now. */
      otherGb: number;
      jugaadLoadedGb: number;
      busy: { detail: string } | null;
    };

/** Everything the settings page shows: Ollama's state, the models per job, and what fits. */
export async function getSettingsView(): Promise<SettingsView> {
  const store = getStore();
  const baseURL = serverEnv.JUGAAD_OLLAMA_URL;
  const address = baseURL.replace(/^https?:\/\//, "").replace(/\/v1\/?$/, "");
  try {
    const [version, sizes, vram] = await Promise.all([ollamaVersion(baseURL), listInstalledModels(baseURL), getVramView()]);
    const installed: InstalledModel[] = await Promise.all(
      [...sizes].map(async ([name, sizeBytes]) => ({
        name,
        sizeBytes,
        capabilities: await modelCapabilities(baseURL, name).catch(() => []),
      })),
    );
    const current = resolveModels(store.getModelChoices());
    const vramGb = Object.fromEntries(installed.map((m) => [m.name, vramGbFor(m.name, installed)]));
    const jugaadLoadedGb = vram.reachable ? vram.jugaad.reduce((sum, m) => sum + m.gb, 0) : 0;
    return {
      reachable: true,
      address,
      version,
      installedCount: installed.length,
      jobs: MODEL_JOBS.map((job) => ({
        job,
        options: modelsForJob(job, installed).map((m) => ({ name: m.name, gb: vramGb[m.name] })),
        current: current[job],
      })),
      defaults: resolveModels({}),
      current,
      vramGb,
      totalGb: vram.reachable ? vram.totalGb : 16,
      otherGb: vram.reachable ? vram.otherGb : 0,
      jugaadLoadedGb,
      busy: vram.reachable ? vram.busy : null,
    };
  } catch {
    return { reachable: false, address };
  }
}
