import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqliteStore } from "@/lib/data/sqlite";
import type { WorkbenchStore } from "@/lib/data/types";
import type { NewPlanMove } from "@/schemas/plan-schema";
import { allowFolder } from "./allow-folder";
import { applyPlan, undoPlan } from "./apply-plan";
import { reconcileJournal } from "./reconcile-journal";

let store: WorkbenchStore;
let root: string;
let folder: string;
let guarded: string[];

beforeEach(() => {
  store = openSqliteStore(":memory:");
  root = mkdtempSync(join(tmpdir(), "jugaad-safety-"));
  folder = join(root, "Downloads");
  mkdirSync(folder);
  // the temp folder sits under AppData, which the real rules protect — tests use their own list
  guarded = [join(folder, "AppData")];
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});

function put(rel: string, content = rel): string {
  const p = join(folder, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
  return p;
}

const move = (fromPath: string, toPath: string): NewPlanMove => ({ fromPath, toPath, category: null, confidence: null });

async function approvedPlan(moves: NewPlanMove[]) {
  const added = await allowFolder(store, folder, guarded);
  if (!added.ok) throw new Error(added.reason);
  const plan = store.createPlan(added.folder.id, moves);
  store.transitionPlan(plan.id, "approved");
  return plan;
}

const opts = () => ({ protectedPaths: guarded });

describe("adding a folder", () => {
  it("accepts a real folder, even pasted with Explorer's quotes", async () => {
    const result = await allowFolder(store, `"${folder}"`, guarded);
    expect(result.ok).toBe(true);
  });

  it("refuses a path that doesn't exist, a file, and a protected folder", async () => {
    expect(await allowFolder(store, join(folder, "nope"), guarded)).toMatchObject({ ok: false, reason: /No folder/ });
    expect(await allowFolder(store, put("a.txt"), guarded)).toMatchObject({ ok: false, reason: /That's a file/ });
    mkdirSync(join(folder, "AppData"));
    expect(await allowFolder(store, join(folder, "AppData"), guarded)).toMatchObject({ ok: false, reason: /system or program/ });
  });
});

describe("applying a plan", () => {
  it("moves the files, creating folders, and journals every change", async () => {
    put("Invoice_0423.pdf", "invoice");
    put("photo.jpg", "photo");
    const plan = await approvedPlan([
      move("Invoice_0423.pdf", "Invoices\\2026\\Invoice_0423.pdf"),
      move("photo.jpg", "Photos\\photo.jpg"),
    ]);

    expect((await applyPlan(store, plan.id, opts())).status).toBe("applied");
    expect(readFileSync(join(folder, "Invoices", "2026", "Invoice_0423.pdf"), "utf8")).toBe("invoice");
    expect(existsSync(join(folder, "Invoice_0423.pdf"))).toBe(false);

    const journal = store.listJournal(plan.id);
    expect(journal.map((e) => e.action)).toEqual(["make-folder", "make-folder", "move", "make-folder", "move"]);
    expect(journal.every((e) => e.outcome === "done")).toBe(true);
    expect(journal.find((e) => e.action === "move")).toMatchObject({ method: "rename", size: 7 });
  });

  it("never overwrites: a taken name leaves both files and marks the plan incomplete", async () => {
    put("a.pdf", "mine");
    put("Docs\\a.pdf", "already there");
    const plan = await approvedPlan([move("a.pdf", "Docs\\a.pdf")]);

    expect((await applyPlan(store, plan.id, opts())).status).toBe("incomplete");
    expect(readFileSync(join(folder, "Docs", "a.pdf"), "utf8")).toBe("already there");
    expect(readFileSync(join(folder, "a.pdf"), "utf8")).toBe("mine");
    expect(store.listPlanMoves(plan.id)[0]).toMatchObject({ status: "pending", error: /already there/ });
  });

  it("refuses moves that leave the folder or touch a protected one, and touches nothing", async () => {
    put("a.pdf");
    put("AppData\\secret.db");
    const plan = await approvedPlan([move("a.pdf", "..\\escaped.pdf"), move("AppData\\secret.db", "Docs\\secret.db")]);

    expect((await applyPlan(store, plan.id, opts())).status).toBe("incomplete");
    expect(existsSync(join(folder, "a.pdf"))).toBe(true);
    expect(existsSync(join(root, "escaped.pdf"))).toBe(false);
    expect(existsSync(join(folder, "AppData", "secret.db"))).toBe(true);
    expect(store.listJournal(plan.id)).toEqual([]);
  });

  it("does a capitals-only rename in two steps, which Windows needs", async () => {
    put("invoice.pdf", "x");
    const plan = await approvedPlan([move("invoice.pdf", "Invoice.pdf")]);

    expect((await applyPlan(store, plan.id, opts())).status).toBe("applied");
    expect(readdirSync(folder)).toEqual(["Invoice.pdf"]);
  });

  it("skips excluded moves", async () => {
    put("a.pdf");
    put("b.pdf");
    const added = await allowFolder(store, folder, guarded);
    if (!added.ok) throw new Error(added.reason);
    const plan = store.createPlan(added.folder.id, [move("a.pdf", "A\\a.pdf"), move("b.pdf", "B\\b.pdf")]);
    store.setMoveIncluded(store.listPlanMoves(plan.id)[1].id, false);
    store.transitionPlan(plan.id, "approved");

    expect((await applyPlan(store, plan.id, opts())).status).toBe("applied");
    expect(existsSync(join(folder, "b.pdf"))).toBe(true);
  });

  it("retries an incomplete plan once the obstacle is gone", async () => {
    put("a.pdf", "mine");
    put("Docs\\a.pdf", "theirs");
    const plan = await approvedPlan([move("a.pdf", "Docs\\a.pdf")]);
    await applyPlan(store, plan.id, opts());
    rmSync(join(folder, "Docs", "a.pdf")); // the owner deals with it

    expect((await applyPlan(store, plan.id, opts())).status).toBe("applied");
    expect(readFileSync(join(folder, "Docs", "a.pdf"), "utf8")).toBe("mine");
  });

  it("refuses to run once its folder is off the allow-list", async () => {
    put("a.pdf");
    const plan = await approvedPlan([move("a.pdf", "A\\a.pdf")]);
    store.removeAllowedFolder(store.listAllowedFolders()[0].id);
    await expect(applyPlan(store, plan.id, opts())).rejects.toThrow(/no longer on the allow-list/);
    expect(existsSync(join(folder, "a.pdf"))).toBe(true);
  });

  it("stops between moves when asked, and resumes where it left off", async () => {
    put("a.pdf");
    put("b.pdf");
    const plan = await approvedPlan([move("a.pdf", "A\\a.pdf"), move("b.pdf", "B\\b.pdf")]);
    const stop = new AbortController();

    const paused = await applyPlan(store, plan.id, { ...opts(), signal: stop.signal, onProgress: () => stop.abort() });
    expect(paused.status).toBe("applying");
    expect(store.listPlanMoves(plan.id).map((m) => m.status)).toEqual(["moved", "pending"]);

    expect((await applyPlan(store, plan.id, opts())).status).toBe("applied");
  });
});

describe("undoing a plan", () => {
  it("puts every file back and removes the folders it made", async () => {
    put("Invoice_0423.pdf", "invoice");
    put("photo.jpg");
    const plan = await approvedPlan([
      move("Invoice_0423.pdf", "Invoices\\2026\\Invoice_0423.pdf"),
      move("photo.jpg", "Photos\\photo.jpg"),
    ]);
    await applyPlan(store, plan.id, opts());

    expect((await undoPlan(store, plan.id, opts())).status).toBe("undone");
    expect(readdirSync(folder).sort()).toEqual(["Invoice_0423.pdf", "photo.jpg"]);
    expect(readFileSync(join(folder, "Invoice_0423.pdf"), "utf8")).toBe("invoice");
  });

  it("keeps a folder it made if something else was put in it since", async () => {
    put("a.pdf");
    const plan = await approvedPlan([move("a.pdf", "Docs\\a.pdf")]);
    await applyPlan(store, plan.id, opts());
    put("Docs\\notes.txt", "the owner's");

    expect((await undoPlan(store, plan.id, opts())).status).toBe("undone");
    expect(readFileSync(join(folder, "Docs", "notes.txt"), "utf8")).toBe("the owner's");
    expect(store.listJournal(plan.id).at(-1)).toMatchObject({ action: "remove-empty-folder", outcome: "failed" });
  });

  it("leaves a file that changed after it was moved, and says why", async () => {
    put("a.pdf", "v1");
    const plan = await approvedPlan([move("a.pdf", "Docs\\a.pdf")]);
    await applyPlan(store, plan.id, opts());
    const moved = join(folder, "Docs", "a.pdf");
    writeFileSync(moved, "v2, edited by the owner");
    utimesSync(moved, new Date(), new Date(Date.now() + 60_000));

    expect((await undoPlan(store, plan.id, opts())).status).toBe("undo-incomplete");
    expect(existsSync(moved)).toBe(true);
    expect(store.listPlanMoves(plan.id)[0]).toMatchObject({ status: "moved", error: /changed after it was moved/ });
  });

  it("can't undo a plan that was never applied", async () => {
    const plan = await approvedPlan([]);
    await expect(undoPlan(store, plan.id, opts())).rejects.toThrow(/can't be undone/);
  });
});

describe("after a crash", () => {
  it("records a move the disk shows happened, and one it shows did not", async () => {
    put("a.pdf");
    put("b.pdf");
    const plan = await approvedPlan([move("a.pdf", "a2.pdf"), move("b.pdf", "b2.pdf")]);
    store.transitionPlan(plan.id, "applying");
    const [a, b] = store.listPlanMoves(plan.id);
    // the crash: both journalled, only the first actually moved
    store.openJournalEntry({ planId: plan.id, moveId: a.id, action: "move", fromPath: join(folder, "a.pdf"), toPath: join(folder, "a2.pdf") });
    store.openJournalEntry({ planId: plan.id, moveId: b.id, action: "move", fromPath: join(folder, "b.pdf"), toPath: join(folder, "b2.pdf") });
    rmSync(join(folder, "a.pdf"));
    put("a2.pdf");

    expect(await reconcileJournal(store)).toBe(2);
    expect(store.listOpenJournalEntries()).toEqual([]);
    expect(store.listPlanMoves(plan.id).map((m) => m.status)).toEqual(["moved", "pending"]);
    expect(store.listPlanMoves(plan.id)[1].error).toMatch(/still where it was/);

    // the requeued job resumes and finishes the rest
    expect((await applyPlan(store, plan.id, opts())).status).toBe("applied");
    expect(existsSync(join(folder, "b2.pdf"))).toBe(true);
  });
});
