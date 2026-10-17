import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { estimateVramBytes, planRoom, type GpuPicture } from "@/lib/domain/vram-plan";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";
import type { SettingsStore } from "@/lib/data/types";
import { MEASURED_VRAM_GB } from "./models";
import { listInstalledModels, listLoadedModels, unloadModel } from "./ollama-api";

const run = promisify(execFile);
const GB = 1024 ** 3;

/**
 * Where Jugaad notes the models it loaded — the only ones it may unload. The store, so the app
 * can free what the worker loaded (settings page, VRAM panel).
 */
export type ModelLedger = Pick<SettingsStore, "listJugaadModels" | "markModelLoaded" | "markModelReleased">;

/** Not enough free graphics memory — what to tell the owner, with the numbers. */
export class NoRoomError extends Error {
  constructor(model: string, needBytes: number, freeBytes: number, blockedBy: "other-apps" | "budget") {
    const need = (needBytes / GB).toFixed(1);
    const free = (freeBytes / GB).toFixed(1);
    super(
      blockedBy === "budget"
        ? `${model} needs ${need} GB, which is over Jugaad's graphics memory budget. Raise JUGAAD_VRAM_BUDGET_GB or pick a smaller model.`
        : `${model} needs ${need} GB of graphics memory and ${free} GB is free. Close a game or another AI app, then try again.`,
    );
    this.name = "NoRoomError";
  }
}

/**
 * Makes sure `model` can load without going over the VRAM budget (spec: model manager): reads
 * the card and Ollama, unloads Jugaad's own other models if needed, or refuses with the numbers.
 * Call before a job's first model call. On the mock adapter there is no GPU work to plan.
 */
export async function prepareModel(model: string, ledger: ModelLedger): Promise<void> {
  if (serverEnv.JUGAAD_AI_PROVIDER === "mock") return;
  const baseURL = serverEnv.JUGAAD_OLLAMA_URL;
  const [picture, needBytes] = await Promise.all([readGpuPicture(baseURL, ledger), vramNeeded(baseURL, model)]);
  const plan = planRoom(picture, { name: model, bytes: needBytes });
  if (!plan.fits) throw new NoRoomError(model, plan.needBytes, plan.freeBytes, plan.blockedBy);
  for (const name of plan.unload) {
    await unloadModel(baseURL, name);
    ledger.markModelReleased(name);
    log("model.unloaded", { model: name, reason: `room for ${model}` });
  }
  ledger.markModelLoaded(model);
}

/**
 * Lets go of every model Jugaad loaded — "Free VRAM", and on worker shutdown so the GPU is
 * handed back. Models other apps loaded are never touched. Returns the names unloaded.
 */
export async function releaseModels(ledger: ModelLedger): Promise<string[]> {
  if (serverEnv.JUGAAD_AI_PROVIDER === "mock") return [];
  const released: string[] = [];
  for (const name of ledger.listJugaadModels()) {
    try {
      await unloadModel(serverEnv.JUGAAD_OLLAMA_URL, name);
      ledger.markModelReleased(name);
      released.push(name);
      log("model.unloaded", { model: name, reason: "released" });
    } catch (error) {
      // Ollama not answering: keep the note, so the next try still knows the model is Jugaad's
      log("model.unload-failed", { model: name, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return released;
}

/** The card's memory and what Ollama holds. Without `nvidia-smi`, Ollama's own numbers stand in. */
export async function readGpuPicture(baseURL: string, ledger: Pick<ModelLedger, "listJugaadModels">): Promise<GpuPicture> {
  const ours = new Set(ledger.listJugaadModels());
  const [loaded, card] = await Promise.all([listLoadedModels(baseURL), readCardMemory()]);
  const modelBytes = loaded.reduce((sum, m) => sum + m.vramBytes, 0);
  const budget = serverEnv.JUGAAD_VRAM_BUDGET_GB;
  return {
    totalBytes: card?.totalBytes ?? (budget ?? 16) * GB,
    usedBytes: card?.usedBytes ?? modelBytes,
    loaded: loaded.map((m) => ({ ...m, ours: ours.has(m.name) })),
    budgetBytes: budget === undefined ? null : budget * GB,
  };
}

/** Total and used memory of the first NVIDIA card, or null where there is none. */
async function readCardMemory(): Promise<{ totalBytes: number; usedBytes: number } | null> {
  try {
    const { stdout } = await run("nvidia-smi", ["--query-gpu=memory.total,memory.used", "--format=csv,noheader,nounits"], {
      windowsHide: true,
      timeout: 5000,
    });
    const [total, used] = stdout.split(/\r?\n/)[0].split(",").map((n) => Number(n.trim()) * 1024 ** 2);
    return Number.isFinite(total) && Number.isFinite(used) ? { totalBytes: total, usedBytes: used } : null;
  } catch {
    return null;
  }
}

async function vramNeeded(baseURL: string, model: string): Promise<number> {
  const measured = MEASURED_VRAM_GB[model];
  if (measured !== undefined) return measured * GB;
  const download = (await listInstalledModels(baseURL)).get(model);
  if (download === undefined) throw new Error(`${model} isn't installed in Ollama. Run: ollama pull ${model}`);
  return estimateVramBytes(download);
}
