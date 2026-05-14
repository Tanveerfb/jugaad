# Phase 2 — Stack Selector + Doc Fetcher

Attach alongside `#file:CONTEXT.md` for this session.
Phase 1 must be fully verified before starting this phase.

---

## Goal

Users can browse and toggle their tech stack before starting a plan. The app fetches and caches relevant documentation for each selected library, ready to be injected into generation prompts later.

---

## Tasks

### 1. `components/stack/stackRegistry.ts`

Create with all entries below. This is the single source of truth for available stack options.

```ts
import type { StackOption } from "@/types";

export const stackOptions: StackOption[] = [
  // LOCKED — always selected, not toggleable
  {
    id: "nextjs",
    label: "Next.js",
    category: "language",
    default: true,
    docUrl: "https://nextjs.org/docs/app/api-reference/file-conventions",
    packageName: "next",
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "language",
    default: true,
    docUrl:
      "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    packageName: "typescript",
  },
  {
    id: "tailwind",
    label: "Tailwind CSS v4",
    category: "styling",
    default: true,
    docUrl: "https://tailwindcss.com/docs/installation",
    packageName: "tailwindcss",
  },

  // TOGGLEABLE
  {
    id: "shadcn",
    label: "shadcn/ui",
    category: "ui",
    default: true,
    docUrl: "https://ui.shadcn.com/docs/components/button",
    packageName: "shadcn-ui",
  },
  {
    id: "prisma",
    label: "Prisma ORM",
    category: "database",
    default: false,
    docUrl: "https://www.prisma.io/docs/orm/reference/prisma-schema-reference",
    packageName: "prisma",
  },
  {
    id: "drizzle",
    label: "Drizzle ORM",
    category: "database",
    default: false,
    docUrl: "https://orm.drizzle.team/docs/overview",
    packageName: "drizzle-orm",
  },
  {
    id: "nextauth",
    label: "NextAuth.js v5",
    category: "auth",
    default: false,
    docUrl: "https://authjs.dev/getting-started",
    packageName: "next-auth",
  },
  {
    id: "clerk",
    label: "Clerk",
    category: "auth",
    default: false,
    docUrl: "https://clerk.com/docs/quickstarts/nextjs",
    packageName: "@clerk/nextjs",
  },
  {
    id: "stripe",
    label: "Stripe",
    category: "utilities",
    default: false,
    docUrl: "https://docs.stripe.com/api",
    packageName: "stripe",
  },
  {
    id: "zod",
    label: "Zod",
    category: "utilities",
    default: true,
    docUrl: "https://zod.dev/?id=basic-usage",
    packageName: "zod",
  },
  {
    id: "rhf",
    label: "React Hook Form",
    category: "utilities",
    default: true,
    docUrl: "https://react-hook-form.com/docs/useform",
    packageName: "react-hook-form",
  },
  {
    id: "zustand",
    label: "Zustand",
    category: "utilities",
    default: false,
    docUrl: "https://docs.pmnd.rs/zustand/getting-started/introduction",
    packageName: "zustand",
  },
  {
    id: "framer",
    label: "Framer Motion",
    category: "utilities",
    default: false,
    docUrl: "https://motion.dev/docs/react-quick-start",
    packageName: "framer-motion",
  },
  {
    id: "uploadthing",
    label: "UploadThing",
    category: "utilities",
    default: false,
    docUrl: "https://docs.uploadthing.com/getting-started/appdir",
    packageName: "uploadthing",
  },
  {
    id: "resend",
    label: "Resend",
    category: "utilities",
    default: false,
    docUrl: "https://resend.com/docs/send-with-nextjs",
    packageName: "resend",
  },
];

// Locked option IDs — these cannot be deselected in the UI
export const lockedStackIds = ["nextjs", "typescript", "tailwind"];

// Mutual exclusion groups — selecting one deselects others in the same group
export const mutualExclusionGroups: string[][] = [
  ["prisma", "drizzle"], // database ORMs
  ["nextauth", "clerk"], // auth providers
];

// Helper: apply mutual exclusion when toggling an option
export function applyMutualExclusion(
  selected: string[],
  toggledId: string,
): string[] {
  const group = mutualExclusionGroups.find((g) => g.includes(toggledId));
  if (!group) return selected;
  // Remove all others in the group, then add the toggled one
  const filtered = selected.filter((id) => !group.includes(id));
  return [...filtered, toggledId];
}
```

---

### 2. `components/stack/StackSelector.tsx`

Props: none — reads from and writes to `projectPlanStore.plan.stack`

Layout:

- Groups options by `category`
- Category headings: "Language", "Styling", "UI Components", "Database", "Auth", "Utilities"
- Each option is a toggleable card showing the label and package name
- Locked options (`lockedStackIds`) render as selected and disabled — show a lock icon
- Selecting a database or auth option calls `applyMutualExclusion` before updating the store
- Show a subtle "mutually exclusive" tooltip when hovering a database or auth card that explains only one can be selected

Visual states:

- Selected: highlighted border, filled background
- Unselected: subtle border, transparent background
- Disabled/locked: grayed out, lock icon, cannot be clicked

On mount: initialize `plan.stack.selected` with all options where `default === true` if not already set.

---

### 3. `lib/llm/docFetcher.ts`

```ts
// Module-level session cache
const cache = new Map<string, string>();

// fetchDocChunk(url: string, keyword?: string): Promise<string>
//
// 1. Check cache — return cached value if present
// 2. fetch(url) with AbortController timeout of 10 seconds
//    On timeout or network error, return a fallback string:
//    `[Doc fetch failed for ${url} — proceeding without documentation context]`
// 3. Strip HTML:
//    - Remove all <script>, <style>, <nav>, <header>, <footer>, <aside> blocks and their content
//    - Remove all remaining HTML tags (strip to text only)
//    - Decode HTML entities (&amp; → &, &lt; → <, etc.)
//    - Normalize whitespace (collapse multiple spaces/newlines to single)
// 4. If keyword provided:
//    - Find the line index of the first occurrence of keyword (case-insensitive)
//    - Extract lines [index - 30, index + 70] (clamped to array bounds)
//    - Join back to string
// 5. Hard truncate to 8000 characters (not tokens — chars is fine for a fetch wrapper)
//    Append "[...truncated]" if truncated
// 6. Store result in cache
// 7. Return the cleaned string

// fetchStackDocs(selectedIds: string[]): Promise<Record<string, string>>
//
// Takes an array of stack option IDs
// For each ID, finds the matching entry in stackOptions (import from stackRegistry)
// Calls fetchDocChunk(option.docUrl)
// Returns a Record<stackOptionId, docChunkString>
// Runs fetches in parallel via Promise.all
```

---

### 4. Update `projectPlanStore.ts`

Add to state:

```ts
docCache: Record<string, string>; // stackOptionId → fetched doc chunk
isFetchingDocs: boolean;
docFetchProgress: string; // e.g. "Fetching Next.js docs..."
```

Add actions:

```ts
setDocCache(cache: Record<string, string>): void;
setIsFetchingDocs(val: boolean): void;
setDocFetchProgress(msg: string): void;
```

---

### 5. `hooks/useDocFetcher.ts`

```ts
// Exports: { fetchDocs, isFetching, progress }
//
// fetchDocs(selectedIds: string[]): Promise<void>
//   - Sets store.isFetchingDocs = true
//   - For each selected stack ID, sets store.docFetchProgress = `Fetching ${label} docs...`
//   - Calls fetchStackDocs(selectedIds)
//   - On completion, sets store.docCache with results
//   - Sets store.isFetchingDocs = false
//   - Shows a Sonner success toast: "Documentation loaded for X libraries"
//   - On any error, shows a Sonner warning toast: "Some docs failed to load — generation will continue"
```

---

### 6. Update `app/studio/new/page.tsx`

Rearrange the new project flow into two steps:

**Step 1 — Stack Selection** (shown first):

- Renders `StackSelector`
- "Continue to Planning" button at the bottom
- Clicking it triggers `fetchDocs` for the selected stack, shows a loading state with `docFetchProgress` text, then advances to Step 2

**Step 2 — Plan Agent** (shown after docs are fetched):

- Renders `ChatInterface` as before
- Small read-only stack summary bar above the chat showing selected stack as badges
- "← Change Stack" button that goes back to Step 1 (clears plan and doc cache)

Use Framer Motion to animate the transition between steps (slide left/right or fade).

---

### 7. Dev Utility Route `app/dev/page.tsx`

Create a hidden dev-only route at `/dev` for testing the doc fetcher output without running the full flow.

UI:

- A list of all stack options with a "Fetch Docs" button next to each
- Clicking "Fetch Docs" calls `fetchDocChunk(option.docUrl)` and displays the raw output in a scrollable `<pre>` block below
- Shows character count of the result
- A "Fetch All" button that fetches all options and shows results
- Add a note at the top: "Dev only — remove before production"

This page does not use `AppShell` — render it standalone.

---

## Verification

1. `/studio/new` shows Stack Selector on first load
2. Next.js, TypeScript, and Tailwind are pre-selected and cannot be deselected
3. Selecting Prisma deselects Drizzle (and vice versa)
4. Selecting Clerk deselects NextAuth (and vice versa)
5. Clicking "Continue to Planning" shows a loading state with progress text for each library
6. After loading, chat interface appears with the stack summary bar
7. `/dev` loads and "Fetch Docs" returns cleaned plain text output for at least 3 different libraries
8. Fetched doc output contains no HTML tags, is under 8000 chars, and contains relevant API content
9. No TypeScript errors on `npm run dev`
