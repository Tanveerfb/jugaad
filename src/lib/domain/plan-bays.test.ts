import { describe, expect, it } from "vitest";
import type { PlanMove } from "@/schemas/plan-schema";
import { groupIntoBays, planCounts } from "./plan-bays";

const move = (toPath: string, extra: Partial<PlanMove> = {}): PlanMove => ({
  id: toPath,
  planId: "p",
  fromPath: toPath.split("\\").at(-1)!,
  toPath,
  included: true,
  category: null,
  confidence: 0.9,
  suggestedName: null,
  rename: false,
  isFolder: false,
  status: "pending",
  error: null,
  ...extra,
});

describe("destination bays", () => {
  const moves = [
    move("_review\\Duplicates\\a (2).pdf"),
    move("Photos\\b.jpg"),
    move("_review\\c.bin"),
    move("Invoices\\a.pdf", { rename: true }),
    move("invoices\\d.pdf", { included: false }),
  ];

  it("groups by destination folder: categories in approved order, then review, then duplicates", () => {
    const bays = groupIntoBays(moves, ["Invoices", "Photos"]);
    expect(bays.map((b) => [b.title, b.kind, b.moves.length])).toEqual([
      ["Invoices", "category", 2],
      ["Photos", "category", 1],
      ["To review", "review", 1],
      ["Duplicate copies", "duplicates", 1],
    ]);
  });

  it("counts what the header and approve bar show", () => {
    expect(planCounts(moves)).toEqual({ moves: 5, included: 4, toReview: 1, duplicates: 1, renames: 1 });
  });
});
