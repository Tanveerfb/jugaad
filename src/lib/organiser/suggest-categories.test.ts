import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockAi } from "@/lib/ai/mock";
import type { WorkbenchAi } from "@/lib/ai/types";
import { openSqliteStore } from "@/lib/data/sqlite";
import type { WorkbenchStore } from "@/lib/data/types";
import { scanFolder } from "@/lib/files/scan-folder";
import { suggestCategories } from "./suggest-categories";

let store: WorkbenchStore;
let root: string;
let folderId: string;
let embedded: number;
let ai: WorkbenchAi;

beforeEach(() => {
  store = openSqliteStore(":memory:");
  root = mkdtempSync(join(tmpdir(), "jugaad-suggest-"));
  folderId = store.allowFolder(root).id;
  embedded = 0;
  const mock = createMockAi();
  ai = {
    ...mock,
    embedTexts: async (texts) => {
      embedded += texts.length;
      return mock.embedTexts(texts);
    },
  };
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});

function put(name: string, content: string) {
  writeFileSync(join(root, name), content);
}

/** A Downloads-like folder: invoices, holiday photos notes and installers. */
function messyFolder() {
  for (let i = 1; i <= 6; i++) put(`invoice_${i}.txt`, `Tax invoice number ${i} total amount due payment`);
  for (let i = 1; i <= 6; i++) put(`holiday_beach_${i}.md`, `Holiday trip beach sunset goa travel day ${i}`);
  for (let i = 1; i <= 6; i++) put(`setup_installer_${i}.exe`, `MZ binary ${i}`);
}

const options = { embedModel: "mock", nameModel: "mock", prepareModel: async () => {} };
const scan = () => scanFolder(store, folderId, { protectedPaths: [], listOnlineOnly: async () => new Set() });

describe("suggesting categories", () => {
  it("groups similar files and names each group", async () => {
    messyFolder();
    await scan();
    const result = await suggestCategories(store, ai, folderId, options);
    if ("stopped" in result) throw new Error("stopped");

    expect(result.map((c) => [c.name, c.fileCount]).sort()).toEqual([
      ["Beach", 6],
      ["Installer", 6],
      ["Invoice", 6],
    ]);
    expect(result.every((c) => c.state === "suggested" && c.source === "suggested")).toBe(true);
    expect(result.find((c) => c.name === "Invoice")?.examples[0]).toMatch(/^invoice_/);
  });

  it("embeds each file once — a second run uses the cache", async () => {
    messyFolder();
    await scan();
    await suggestCategories(store, ai, folderId, options);
    expect(embedded).toBe(18);
    await suggestCategories(store, ai, folderId, options);
    expect(embedded).toBe(18);
  });

  it("counts a set of duplicates once", async () => {
    messyFolder();
    for (let i = 1; i <= 4; i++) put(`invoice_copy_${i}.txt`, "Tax invoice number 1 total amount due payment");
    await scan();
    await suggestCategories(store, ai, folderId, options);
    expect(embedded).toBe(18);
  });

  it("keeps the owner's approved and rejected choices when suggesting again", async () => {
    messyFolder();
    await scan();
    const first = await suggestCategories(store, ai, folderId, options);
    if ("stopped" in first) throw new Error("stopped");
    const invoices = first.find((c) => c.name === "Invoice")!;
    const installers = first.find((c) => c.name === "Installer")!;
    store.renameCategory(invoices.id, "Bills and invoices");
    store.setCategoryState(invoices.id, "approved");
    store.setCategoryState(installers.id, "rejected");

    const again = await suggestCategories(store, ai, folderId, options);
    if ("stopped" in again) throw new Error("stopped");
    expect(again.find((c) => c.id === invoices.id)).toMatchObject({ name: "Bills and invoices", state: "approved" });
    expect(again.filter((c) => c.name === "Installer")).toEqual([expect.objectContaining({ state: "rejected" })]);
  });

  it("suggesting again reuses the owner's category names rather than offering near-twins", async () => {
    messyFolder();
    await scan();
    const first = await suggestCategories(store, ai, folderId, options);
    if ("stopped" in first) throw new Error("stopped");
    const invoices = first.find((c) => c.name === "Invoice")!;
    store.renameCategory(invoices.id, "Bills and invoices");
    store.setCategoryState(invoices.id, "approved");

    let shown: readonly string[] = [];
    const namer: WorkbenchAi = {
      ...ai,
      nameCategories: async (input) => {
        shown = input.existing ?? [];
        // the namer recognises the invoice group as the owner's category
        return { names: input.groups.map((g) => (g.files[0].name.startsWith("invoice") ? "Bills and invoices" : g.files[0].name.split("_")[0])) };
      },
    };
    const again = await suggestCategories(store, namer, folderId, options);
    if ("stopped" in again) throw new Error("stopped");
    expect(shown).toContain("Bills and invoices");
    expect(again.filter((c) => c.name === "Bills and invoices")).toEqual([expect.objectContaining({ id: invoices.id, state: "approved" })]);
  });

  it("groups the files a plan would sort — subfolders only when the folder includes them", async () => {
    messyFolder();
    mkdirSync(join(root, "Archive"));
    for (let i = 1; i <= 6; i++) writeFileSync(join(root, "Archive", `old_scan_${i}.txt`), `Old archived scan document ${i}`);
    await scan();

    await suggestCategories(store, ai, folderId, options);
    expect(embedded).toBe(18);

    store.setIncludeSubfolders(folderId, true);
    await suggestCategories(store, ai, folderId, options);
    expect(embedded).toBe(24);
  });

  it("offers the owner's existing subfolders first, as their own categories", async () => {
    messyFolder();
    mkdirSync(join(root, "Twitch VOD"));
    writeFileSync(join(root, "Twitch VOD", "stream_2026_01_01.txt"), "stream recording notes");
    mkdirSync(join(root, "_review"));
    writeFileSync(join(root, "_review", "x.txt"), "x");
    await scan();

    // no group belongs in it: offered last, unticked
    const unmatched = await suggestCategories(store, ai, folderId, options);
    if ("stopped" in unmatched) throw new Error("stopped");
    expect(unmatched.at(-1)).toMatchObject({ name: "Twitch VOD", source: "folder", fileCount: 1, state: "rejected" });
    expect(unmatched.some((c) => c.name === "_review")).toBe(false);

    // the namer puts a group in it: offered first, ticked, and no new category for that group
    const matching: WorkbenchAi = {
      ...ai,
      nameCategories: async (input) => ({ names: input.groups.map((_, i) => (i === 0 ? "Twitch VOD" : `Group ${i}`)) }),
    };
    const matched = await suggestCategories(store, matching, folderId, options);
    if ("stopped" in matched) throw new Error("stopped");
    expect(matched[0]).toMatchObject({ name: "Twitch VOD", source: "folder", state: "suggested" });
    expect(matched.filter((c) => c.name === "Twitch VOD")).toHaveLength(1);
  });

  it("asks for a scan first on an empty index", async () => {
    await expect(suggestCategories(store, ai, folderId, options)).rejects.toThrow(/scan the folder first/);
  });
});
