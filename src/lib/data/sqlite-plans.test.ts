import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqliteStore } from "./sqlite";
import type { WorkbenchStore } from "./types";

let store: WorkbenchStore;
beforeEach(() => {
  store = openSqliteStore(":memory:");
});
afterEach(() => store.close());

const MOVES = [
  { fromPath: "Invoice_0423.pdf", toPath: "Invoices\\Invoice_0423.pdf", category: "Invoices", confidence: 0.94 },
  { fromPath: "setup (1).exe", toPath: "_review\\setup (1).exe", category: null, confidence: null },
];

describe("allowed folders", () => {
  it("adds, lists and removes", () => {
    const a = store.allowFolder("E:\\Downloads");
    const b = store.allowFolder("C:\\Users\\Owner\\Pictures");
    expect(store.listAllowedFolders().map((f) => f.id)).toEqual([a.id, b.id]);
    store.removeAllowedFolder(a.id);
    expect(store.listAllowedFolders().map((f) => f.id)).toEqual([b.id]);
    expect(store.getAllowedFolder(a.id)).toBeNull();
  });

  it("brings a removed folder back with the same id, whatever the letter case", () => {
    const a = store.allowFolder("E:\\Downloads");
    store.removeAllowedFolder(a.id);
    const again = store.allowFolder("e:\\downloads");
    expect(again.id).toBe(a.id);
  });
});

describe("plans", () => {
  it("records a draft with its moves in order", () => {
    const folder = store.allowFolder("E:\\Downloads");
    const plan = store.createPlan(folder.id, MOVES);
    expect(plan.status).toBe("draft");
    const moves = store.listPlanMoves(plan.id);
    expect(moves.map((m) => m.fromPath)).toEqual(["Invoice_0423.pdf", "setup (1).exe"]);
    expect(moves.every((m) => m.included && m.status === "pending" && m.error === null)).toBe(true);
  });

  it("edits a draft, and refuses edits once approved", () => {
    const folder = store.allowFolder("E:\\Downloads");
    const plan = store.createPlan(folder.id, MOVES);
    const [first] = store.listPlanMoves(plan.id);
    expect(store.setMoveIncluded(first.id, false).included).toBe(false);
    store.transitionPlan(plan.id, "approved");
    expect(() => store.setMoveIncluded(first.id, true)).toThrow(/only drafts/);
  });

  it("refuses to apply a plan nobody approved", () => {
    const folder = store.allowFolder("E:\\Downloads");
    const plan = store.createPlan(folder.id, MOVES);
    expect(() => store.transitionPlan(plan.id, "applying")).toThrow(/Illegal plan transition: draft → applying/);
  });

  it("keeps a failed move pending with its reason, and clears it on success", () => {
    const folder = store.allowFolder("E:\\Downloads");
    const plan = store.createPlan(folder.id, MOVES);
    const [first] = store.listPlanMoves(plan.id);
    expect(store.failMove(first.id, "File is open in another program")).toMatchObject({
      status: "pending",
      error: "File is open in another program",
    });
    expect(store.completeMove(first.id, "moved")).toMatchObject({ status: "moved", error: null });
    expect(() => store.completeMove(first.id, "moved")).toThrow(/Illegal move transition/);
  });

  it("rolls back a plan whose moves fail to insert", () => {
    expect(() => store.createPlan("no-such-folder", MOVES)).toThrow();
    expect(store.listPlans("no-such-folder")).toEqual([]);
  });
});

describe("journal", () => {
  function entry() {
    const folder = store.allowFolder("E:\\Downloads");
    const plan = store.createPlan(folder.id, MOVES);
    return store.openJournalEntry({
      planId: plan.id,
      moveId: null,
      action: "move",
      fromPath: "E:\\Downloads\\a.pdf",
      toPath: "E:\\Downloads\\Invoices\\a.pdf",
    });
  }

  it("opens an entry before the change and closes it after", () => {
    const opened = entry();
    expect(store.listOpenJournalEntries().map((e) => e.id)).toEqual([opened.id]);
    const closed = store.closeJournalEntry(opened.id, { outcome: "done", method: "rename", size: 12, modifiedMs: 1000 });
    expect(closed).toMatchObject({ outcome: "done", method: "rename", size: 12 });
    expect(store.listOpenJournalEntries()).toEqual([]);
  });

  it("closes an entry only once", () => {
    const opened = entry();
    store.closeJournalEntry(opened.id, { outcome: "done" });
    expect(() => store.closeJournalEntry(opened.id, { outcome: "failed" })).toThrow(/already closed/);
  });
});
