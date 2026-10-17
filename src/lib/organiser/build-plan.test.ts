import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockAi } from "@/lib/ai/mock";
import { AiTaskError, type WorkbenchAi } from "@/lib/ai/types";
import { openSqliteStore } from "@/lib/data/sqlite";
import type { WorkbenchStore } from "@/lib/data/types";
import { scanFolder } from "@/lib/files/scan-folder";
import { applyPlan, undoPlan } from "@/lib/safety/apply-plan";
import { buildPlan } from "./build-plan";
import { sendTo, setRename } from "./edit-plan";

let store: WorkbenchStore;
let root: string;
let folderId: string;
const ai = createMockAi();
const options = { classifyModel: "mock", prepareModel: async () => {} };

beforeEach(() => {
  store = openSqliteStore(":memory:");
  root = mkdtempSync(join(tmpdir(), "jugaad-plan-"));
  folderId = store.allowFolder(root).id;
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});

function put(rel: string, content: string) {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
}

async function scanned() {
  await scanFolder(store, folderId, { protectedPaths: [], listOnlineOnly: async () => new Set() });
}

function approve(...names: string[]) {
  for (const name of names) store.setCategoryState(store.addCategory(folderId, name).id, "approved");
}

describe("building a plan", () => {
  it("sorts loose files, sends doubtful ones and extra copies to review, and moves nothing yet", async () => {
    put("invoice_march.txt", "Invoice total due");
    put("holiday_photo_beach.txt", "beach photo");
    put("mystery.bin", "???");
    put("invoice_copy.txt", "Invoice total due"); // same bytes as invoice_march.txt
    put("Kept\\invoice_old.txt", "already filed by the owner");
    await scanned();
    approve("Invoices", "Photos");

    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    expect(result).toMatchObject({ sorted: 2, needsReview: 1, duplicates: 1 });
    expect(result.plan.status).toBe("draft");

    const moves = Object.fromEntries(store.listPlanMoves(result.plan.id).map((m) => [m.fromPath, m.toPath]));
    expect(moves).toEqual({
      "invoice_march.txt": "Invoices\\invoice_march.txt",
      "holiday_photo_beach.txt": "Photos\\holiday_photo_beach.txt",
      "mystery.bin": "_review\\mystery.bin",
      "invoice_copy.txt": "_review\\Duplicates\\invoice_copy.txt",
    });
    // the owner's own subfolder is untouched, and nothing has moved
    expect(existsSync(join(root, "invoice_march.txt"))).toBe(true);
  });

  it("goes all the way: approve, apply, undo", async () => {
    put("invoice_march.txt", "Invoice total due");
    put("photo_beach.txt", "beach photo");
    await scanned();
    approve("Invoices", "Photos");
    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");

    store.transitionPlan(result.plan.id, "approved");
    expect((await applyPlan(store, result.plan.id, { protectedPaths: [] })).status).toBe("applied");
    expect(readdirSync(root).sort()).toEqual(["Invoices", "Photos"]);

    expect((await undoPlan(store, result.plan.id, { protectedPaths: [] })).status).toBe("undone");
    expect(readdirSync(root).sort()).toEqual(["invoice_march.txt", "photo_beach.txt"]);
  });

  it("sends a file to review when the model can't answer validly", async () => {
    put("weird.txt", "x");
    await scanned();
    approve("Invoices");
    const failing: WorkbenchAi = {
      ...ai,
      classifyFile: async () => {
        throw new AiTaskError("classifyFile", "invalid-output");
      },
    };
    const result = await buildPlan(store, failing, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    expect(store.listPlanMoves(result.plan.id)[0]).toMatchObject({ toPath: "_review\\weird.txt", category: null, confidence: 0 });
  });

  it("replaces an earlier plan that was never applied", async () => {
    put("invoice_march.txt", "Invoice");
    await scanned();
    approve("Invoices");
    const first = await buildPlan(store, ai, folderId, options);
    const second = await buildPlan(store, ai, folderId, options);
    if ("stopped" in first || "stopped" in second) throw new Error("stopped");
    expect(store.getPlan(first.plan.id)?.status).toBe("discarded");
    expect(store.getPlan(second.plan.id)?.status).toBe("draft");
  });

  it("asks for approved categories first", async () => {
    put("a.txt", "x");
    await scanned();
    await expect(buildPlan(store, ai, folderId, options)).rejects.toThrow(/Approve at least one category/);
  });
});

describe("the owner's choices on a plan", () => {
  it("sorts subfolders only when asked, and never re-files what's already in a category", async () => {
    put("invoice_loose.txt", "Invoice");
    put("Old stuff\\invoice_nested.txt", "Invoice");
    put("Invoices\\invoice_filed.txt", "Invoice");
    await scanned();
    approve("Invoices");

    const topOnly = await buildPlan(store, ai, folderId, options);
    if ("stopped" in topOnly) throw new Error("stopped");
    expect(store.listPlanMoves(topOnly.plan.id).map((m) => m.fromPath)).toEqual(["invoice_loose.txt"]);

    store.setIncludeSubfolders(folderId, true);
    const deep = await buildPlan(store, ai, folderId, options);
    if ("stopped" in deep) throw new Error("stopped");
    expect(store.listPlanMoves(deep.plan.id).map((m) => m.fromPath).sort()).toEqual([
      "Old stuff\\invoice_nested.txt",
      "invoice_loose.txt",
    ]);
  });

  it("renames a file only when its suggested name is ticked, and back when unticked", async () => {
    put("Invoice March FINAL.txt", "Invoice");
    await scanned();
    approve("Invoices");
    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    const [move] = store.listPlanMoves(result.plan.id);
    expect(move).toMatchObject({ toPath: "Invoices\\Invoice March FINAL.txt", suggestedName: "invoice-march.txt", rename: false });

    expect(setRename(store, move.id, true)).toMatchObject({ toPath: "Invoices\\invoice-march.txt", rename: true });
    expect(setRename(store, move.id, false)).toMatchObject({ toPath: "Invoices\\Invoice March FINAL.txt", rename: false });

    setRename(store, move.id, true);
    store.transitionPlan(result.plan.id, "approved");
    await applyPlan(store, result.plan.id, { protectedPaths: [] });
    expect(readdirSync(join(root, "Invoices"))).toEqual(["invoice-march.txt"]);
    await undoPlan(store, result.plan.id, { protectedPaths: [] });
    expect(readdirSync(root)).toEqual(["Invoice March FINAL.txt"]);
  });

  it("sends a doubtful file to an approved category, and back to review", async () => {
    put("mystery.bin", "???");
    await scanned();
    approve("Invoices");
    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    const [move] = store.listPlanMoves(result.plan.id);
    expect(move.toPath).toBe("_review\\mystery.bin");

    expect(sendTo(store, move.id, "Invoices")).toMatchObject({ toPath: "Invoices\\mystery.bin", category: "Invoices" });
    expect(sendTo(store, move.id, null).toPath).toBe("_review\\mystery.bin");
    expect(() => sendTo(store, move.id, "Not approved")).toThrow(/isn't an approved category/);
  });

  it("keeps a ticked name unique against the other moves", async () => {
    put("Invoice March (1).txt", "Invoice one");
    put("invoice-march.txt", "Invoice two");
    await scanned();
    approve("Invoices");
    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    const moves = store.listPlanMoves(result.plan.id);
    const spaced = moves.find((m) => m.fromPath === "Invoice March (1).txt")!;
    expect(setRename(store, spaced.id, true).toPath).toBe("Invoices\\invoice-march (2).txt");
  });
});

describe("remembered answers", () => {
  it("rebuilds without asking the model again, and asks again when the categories change", async () => {
    put("invoice_march.txt", "Invoice total due");
    put("photo_beach.txt", "beach photo");
    await scanned();
    approve("Invoices", "Photos");
    let asked = 0;
    const counting: WorkbenchAi = {
      ...ai,
      classifyFile: async (input, o) => {
        asked++;
        return ai.classifyFile(input, o);
      },
    };

    await buildPlan(store, counting, folderId, options);
    expect(asked).toBe(2);
    await buildPlan(store, counting, folderId, options);
    expect(asked).toBe(2);

    approve("Receipts");
    await buildPlan(store, counting, folderId, options);
    expect(asked).toBe(4);
  });
});

describe("learning from the owner's corrections", () => {
  it("files a corrected file where the owner put it, and shows that decision for similar files", async () => {
    put("dokkan_overlay_one.png", "png one");
    put("dokkan_overlay_two.png", "png two");
    await scanned();
    approve("Stream overlays", "Invoices");
    const seen: { file: string; examples?: { file: string; category: string }[] }[] = [];
    const watching: WorkbenchAi = {
      ...ai,
      classifyFile: async (input) => {
        seen.push({ file: input.fileName, examples: input.examples });
        return { category: "Invoices", suggestedName: input.fileName, confidence: 0.3 };
      },
    };

    const first = await buildPlan(store, watching, folderId, options);
    if ("stopped" in first) throw new Error("stopped");
    const one = store.listPlanMoves(first.plan.id).find((m) => m.fromPath === "dokkan_overlay_one.png")!;
    sendTo(store, one.id, "Stream overlays");

    seen.length = 0;
    const second = await buildPlan(store, watching, folderId, options);
    if ("stopped" in second) throw new Error("stopped");
    const moves = Object.fromEntries(store.listPlanMoves(second.plan.id).map((m) => [m.fromPath, m]));
    expect(moves["dokkan_overlay_one.png"]).toMatchObject({ toPath: "Stream overlays\\dokkan_overlay_one.png", confidence: 1 });
    // only the other file was asked about, and it was shown the owner's decision
    expect(seen.map((s) => s.file)).toEqual(["dokkan_overlay_two.png"]);
    expect(seen[0].examples).toEqual([expect.objectContaining({ category: "Stream overlays" })]);
  });
});

describe("project folders", () => {
  it("moves a project as one folder, never file by file, and moves it back on undo", async () => {
    put("Old stuff\\invoice_old.txt", "Invoice");
    put("myapp\\package.json", "{}");
    put("myapp\\src\\index.ts", "export {}");
    put("myapp\\README.md", "invoice tracker app");
    await scanned();
    approve("Invoices");
    store.setIncludeSubfolders(folderId, true);

    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    const moves = store.listPlanMoves(result.plan.id);
    const project = moves.find((m) => m.isFolder)!;
    expect(project).toMatchObject({ fromPath: "myapp", isFolder: true, suggestedName: null });
    expect(moves.some((m) => m.fromPath.startsWith("myapp\\"))).toBe(false);

    store.transitionPlan(result.plan.id, "approved");
    await applyPlan(store, result.plan.id, { protectedPaths: [] });
    const landed = join(root, ...project.toPath.split("\\"));
    expect(readdirSync(landed).sort()).toEqual(["README.md", "package.json", "src"]);
    expect(store.listIndexedFiles(folderId).find((f) => f.path.endsWith("index.ts"))?.path).toBe(`${project.toPath}\\src\\index.ts`);

    await undoPlan(store, result.plan.id, { protectedPaths: [] });
    expect(readdirSync(join(root, "myapp")).sort()).toEqual(["README.md", "package.json", "src"]);
    expect(store.listIndexedFiles(folderId).find((f) => f.path.endsWith("index.ts"))?.path).toBe("myapp\\src\\index.ts");
  });
});

describe("the index after a plan", () => {
  it("follows moved files, and follows them back on undo", async () => {
    put("invoice_march.txt", "Invoice total due");
    await scanned();
    approve("Invoices");
    const result = await buildPlan(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");
    const before = store.listIndexedFiles(folderId)[0];
    store.transitionPlan(result.plan.id, "approved");
    await applyPlan(store, result.plan.id, { protectedPaths: [] });

    const after = store.listIndexedFiles(folderId)[0];
    expect(after).toMatchObject({ id: before.id, hash: before.hash });
    expect(after.path).toBe("Invoices\\invoice_march.txt");

    await undoPlan(store, result.plan.id, { protectedPaths: [] });
    expect(store.listIndexedFiles(folderId)[0].path).toBe("invoice_march.txt");
  });
});
