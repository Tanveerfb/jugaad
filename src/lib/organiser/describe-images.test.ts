import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockAi } from "@/lib/ai/mock";
import { AiTaskError, type WorkbenchAi } from "@/lib/ai/types";
import { openSqliteStore } from "@/lib/data/sqlite";
import type { WorkbenchStore } from "@/lib/data/types";
import { scanFolder } from "@/lib/files/scan-folder";
import { describeImages } from "./describe-images";

let store: WorkbenchStore;
let root: string;
let folderId: string;
let looked: string[];
let ai: WorkbenchAi;

beforeEach(() => {
  store = openSqliteStore(":memory:");
  root = mkdtempSync(join(tmpdir(), "jugaad-images-"));
  folderId = store.allowFolder(root).id;
  looked = [];
  const mock = createMockAi();
  ai = {
    ...mock,
    describeImage: async (input, o) => {
      looked.push(input.fileName);
      return mock.describeImage(input, o);
    },
  };
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});

const scan = () => scanFolder(store, folderId, { protectedPaths: [], listOnlineOnly: async () => new Set() });

describe("looking at images", () => {
  it("captions JPEG, PNG and WebP files, and nothing else", async () => {
    writeFileSync(join(root, "anime_overlay.png"), "png bytes");
    writeFileSync(join(root, "beach.jpg"), "jpg bytes");
    writeFileSync(join(root, "notes.txt"), "not an image");
    await scan();

    expect(await describeImages(store, ai, folderId, { model: "mock" })).toBe(2);
    const files = Object.fromEntries(store.listIndexedFiles(folderId).map((f) => [f.path, f.id]));
    const signals = store.listFileSignals(folderId);
    expect(signals.get(files["anime_overlay.png"])?.caption).toBe("Image: anime overlay");
    expect(signals.get(files["notes.txt"])?.caption).toBeNull();
  });

  it("never looks at an unchanged image twice, and looks again when it changes", async () => {
    const p = join(root, "beach.jpg");
    writeFileSync(p, "v1");
    await scan();
    await describeImages(store, ai, folderId, { model: "mock" });
    await describeImages(store, ai, folderId, { model: "mock" });
    expect(looked).toEqual(["beach.jpg"]);

    writeFileSync(p, "v2, edited");
    utimesSync(p, new Date(), new Date(Date.now() + 60_000));
    await scan();
    await describeImages(store, ai, folderId, { model: "mock" });
    expect(looked).toEqual(["beach.jpg", "beach.jpg"]);
  });

  it("carries on past an image the model can't describe, and stops if the model is unreachable", async () => {
    writeFileSync(join(root, "a.png"), "a");
    writeFileSync(join(root, "b.png"), "b");
    await scan();
    const flaky: WorkbenchAi = {
      ...ai,
      describeImage: async (input) => {
        if (input.fileName === "a.png") throw new AiTaskError("describeImage", "invalid-output");
        return { caption: "fine" };
      },
    };
    expect(await describeImages(store, flaky, folderId, { model: "mock" })).toBe(1);

    const down: WorkbenchAi = {
      ...ai,
      describeImage: async () => {
        throw new AiTaskError("describeImage", "unreachable");
      },
    };
    await expect(describeImages(store, down, folderId, { model: "other" })).rejects.toThrow(/unreachable/);
  });
});
