import { describe, expect, it } from "vitest";
import { HEADROOM_BYTES, planRoom, type GpuPicture } from "./vram-plan";

const GB = 1024 ** 3;

/** The PC: 16 GB card, the owner's apps holding ~2.3 GB. */
function pc(loaded: GpuPicture["loaded"] = [], budgetGb: number | null = null): GpuPicture {
  const modelBytes = loaded.reduce((s, m) => s + m.vramBytes, 0);
  return { totalBytes: 16 * GB, usedBytes: 2.3 * GB + modelBytes, loaded, budgetBytes: budgetGb === null ? null : budgetGb * GB };
}

describe("planning room on the GPU", () => {
  it("loads the classifier onto an idle card", () => {
    expect(planRoom(pc(), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB })).toEqual({ fits: true, unload: [] });
  });

  it("keeps the embedding model loaded beside the classifier — both fit", () => {
    const loaded = [{ name: "qwen3-embedding:0.6b", vramBytes: 2.37 * GB, ours: true }];
    expect(planRoom(pc(loaded), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB })).toEqual({ fits: true, unload: [] });
  });

  it("does nothing for a model already loaded", () => {
    const loaded = [{ name: "gemma4:12b-it-qat", vramBytes: 7.47 * GB, ours: true }];
    expect(planRoom(pc(loaded), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB })).toEqual({ fits: true, unload: [] });
  });

  it("unloads its own models, largest first, only as far as needed", () => {
    const loaded = [
      { name: "small", vramBytes: 2 * GB, ours: true },
      { name: "big", vramBytes: 9 * GB, ours: true },
    ];
    // 16 - 2.3 - 11 - 0.5 = 2.2 GB free; 7.47 needs the big one gone, not the small one
    expect(planRoom(pc(loaded), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB })).toEqual({ fits: true, unload: ["big"] });
  });

  it("never unloads another app's model, and says the card is full", () => {
    const loaded = [{ name: "someone-elses:20b", vramBytes: 12 * GB, ours: false }];
    const plan = planRoom(pc(loaded), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB });
    expect(plan).toMatchObject({ fits: false, blockedBy: "other-apps" });
  });

  it("refuses when a game holds the memory", () => {
    const gaming: GpuPicture = { totalBytes: 16 * GB, usedBytes: 11 * GB, loaded: [], budgetBytes: null };
    const plan = planRoom(gaming, { name: "gemma4:12b-it-qat", bytes: 7.47 * GB });
    expect(plan).toMatchObject({ fits: false, blockedBy: "other-apps" });
    if (!plan.fits) expect(plan.freeBytes).toBeCloseTo(5 * GB - HEADROOM_BYTES);
  });

  it("holds to the owner's budget even when the card has room", () => {
    const loaded = [{ name: "qwen3-embedding:0.6b", vramBytes: 2.37 * GB, ours: true }];
    // budget 8 GB: 2.37 + 7.47 is over, so the embedder goes
    expect(planRoom(pc(loaded, 8), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB })).toEqual({
      fits: true,
      unload: ["qwen3-embedding:0.6b"],
    });
    expect(planRoom(pc([], 6), { name: "gemma4:12b-it-qat", bytes: 7.47 * GB })).toMatchObject({
      fits: false,
      blockedBy: "budget",
    });
  });
});
