/**
 * Deciding whether a model fits on the GPU, and what to unload to make it fit (spec: "never
 * loads more than the VRAM budget allows"). Pure — the model manager supplies the numbers.
 */

export type GpuPicture = {
  /** The card's total memory. */
  totalBytes: number;
  /** Everything in use now: other apps, the desktop, and every loaded model. */
  usedBytes: number;
  /** Models Ollama holds now. `ours` = loaded by Jugaad, so Jugaad may unload it. */
  loaded: readonly { name: string; vramBytes: number; ours: boolean }[];
  /** The owner's cap on Jugaad's own models together, if set (JUGAAD_VRAM_BUDGET_GB). */
  budgetBytes: number | null;
};

export type RoomPlan =
  | { fits: true; unload: string[] }
  | { fits: false; needBytes: number; freeBytes: number; blockedBy: "other-apps" | "budget" };

/** Kept free for the desktop and for Ollama's working memory beyond the measured size. */
export const HEADROOM_BYTES = 512 * 1024 ** 2;

/**
 * Plans room for `need`. Already loaded → nothing to do. Otherwise unload Jugaad's own other
 * models, largest first, until it fits both the card's free memory (less headroom) and the
 * owner's budget. Never unloads a model Jugaad didn't load — that belongs to another app.
 */
export function planRoom(picture: GpuPicture, need: { name: string; bytes: number }): RoomPlan {
  if (picture.loaded.some((m) => m.name === need.name)) return { fits: true, unload: [] };

  const ours = picture.loaded.filter((m) => m.ours).sort((a, b) => b.vramBytes - a.vramBytes);
  let free = picture.totalBytes - picture.usedBytes - HEADROOM_BYTES;
  let oursTotal = ours.reduce((sum, m) => sum + m.vramBytes, 0);
  const unload: string[] = [];

  const fitsBudget = () => picture.budgetBytes === null || oursTotal + need.bytes <= picture.budgetBytes;
  for (const model of ours) {
    if (need.bytes <= free && fitsBudget()) break;
    unload.push(model.name);
    free += model.vramBytes;
    oursTotal -= model.vramBytes;
  }

  if (need.bytes <= free && fitsBudget()) return { fits: true, unload };
  return {
    fits: false,
    needBytes: need.bytes,
    freeBytes: Math.max(0, free),
    blockedBy: need.bytes > free ? "other-apps" : "budget",
  };
}

/** A model's VRAM when it wasn't measured: its download size plus a margin for the context cache. */
export function estimateVramBytes(downloadBytes: number): number {
  return Math.round(downloadBytes * 1.25 + 256 * 1024 ** 2);
}
