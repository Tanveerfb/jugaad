import type { CategoryState } from "@/schemas/category-schema";

/**
 * Category rules: allowed state changes (project-rules §LIFECYCLE) and what makes a name usable
 * as a Windows folder name — a category becomes a real subfolder when a plan is applied.
 *
 *   suggested ──▶ approved
 *      ▲  │  ◀──────┘ (taken back to edit)
 *      │  ▼
 *    rejected
 */
const TRANSITIONS: Record<CategoryState, readonly CategoryState[]> = {
  suggested: ["approved", "rejected"],
  approved: ["suggested", "rejected"],
  rejected: ["suggested"],
};

export function canTransitionCategory(from: CategoryState, to: CategoryState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertCategoryTransition(from: CategoryState, to: CategoryState): void {
  if (!canTransitionCategory(from, to)) throw new Error(`Illegal category transition: ${from} → ${to}`);
}

/** Names Windows reserves for devices — a folder can't be called any of these. */
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

/**
 * Tidies a proposed name into a usable folder name: characters Windows forbids become spaces,
 * runs of spaces collapse, trailing dots and spaces go, sentence case is kept as given.
 * Returns null when nothing usable is left.
 */
export function toCategoryName(raw: string): string | null {
  const tidy = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 40)
    .trim();
  if (!tidy || RESERVED.test(tidy) || tidy.startsWith("_")) return null; // "_" names belong to Jugaad (_review)
  return tidy;
}

/** True when two category names would be the same folder on Windows. */
export function sameCategoryName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
