import { describe, expect, it } from "vitest";
import { categoryStateSchema, type CategoryState } from "@/schemas/category-schema";
import { assertCategoryTransition, canTransitionCategory, sameCategoryName, toCategoryName } from "./category-rules";

const LEGAL: [CategoryState, CategoryState][] = [
  ["suggested", "approved"],
  ["suggested", "rejected"],
  ["approved", "suggested"],
  ["approved", "rejected"],
  ["rejected", "suggested"],
];

describe("category lifecycle", () => {
  it.each(LEGAL)("allows %s → %s", (from, to) => expect(canTransitionCategory(from, to)).toBe(true));

  const all = categoryStateSchema.options;
  const illegal = all
    .flatMap((f) => all.map((t) => [f, t] as [CategoryState, CategoryState]))
    .filter(([f, t]) => !LEGAL.some(([a, b]) => a === f && b === t));
  it.each(illegal)("refuses %s → %s", (from, to) => {
    expect(() => assertCategoryTransition(from, to)).toThrow(/Illegal category transition/);
  });

  it("can't approve a rejected category without bringing it back first", () => {
    expect(canTransitionCategory("rejected", "approved")).toBe(false);
  });
});

describe("category names", () => {
  it.each([
    ["Invoices", "Invoices"],
    ["  Tax / receipts  ", "Tax receipts"],
    ['Photos: "Goa" 2024', "Photos Goa 2024"],
    ["Notes...", "Notes"],
    ["a".repeat(60), "a".repeat(40)],
  ])("tidies %j to %j", (raw, tidy) => expect(toCategoryName(raw)).toBe(tidy));

  it.each(["", "   ", "CON", "nul.txt", "COM1", "///", "_review"])("refuses %j", (raw) => {
    expect(toCategoryName(raw)).toBeNull();
  });

  it("treats names differing only in case as the same folder", () => {
    expect(sameCategoryName("Invoices", "invoices")).toBe(true);
  });
});
