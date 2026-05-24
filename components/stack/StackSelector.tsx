"use client";

import {
  stackOptions,
  DB_IDS,
  AUTH_IDS,
  NEXTJS_GROUP,
  REACT_GROUP,
  STYLING_FOR,
  STYLING_IDS,
  NEXTJS_ONLY_IDS,
  REACT_ONLY_IDS,
} from "./stackRegistry";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { cn } from "@/lib/utils";
import type { StackOption } from "@/types";

const TOGGLEABLE_CATEGORIES: StackOption["category"][] = [
  "ui",
  "database",
  "auth",
  "utilities",
];

const CATEGORY_LABELS: Record<StackOption["category"], string> = {
  language: "Language",
  styling: "Styling",
  ui: "UI Components",
  database: "Database",
  auth: "Auth",
  utilities: "Utilities",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNextjsGroup(selected: string[]) {
  return selected.includes("nextjs");
}

/**
 * Switch the entire language group, enforcing the correct styling and removing
 * options that are only valid for the other group.
 */
function applyGroupSwitch(
  groupKey: "nextjs" | "reactjs",
  selected: string[],
): string[] {
  const nextjsActive = groupKey === "nextjs";
  const removeIds = [
    ...(nextjsActive ? [...REACT_GROUP] : [...NEXTJS_GROUP]),
    ...(nextjsActive ? ["bootstrap"] : ["tailwind"]),
    ...(nextjsActive ? REACT_ONLY_IDS : NEXTJS_ONLY_IDS),
  ];
  const addIds = [
    ...(nextjsActive ? [...NEXTJS_GROUP] : [...REACT_GROUP]),
    STYLING_FOR[groupKey],
  ];
  const kept = selected.filter((s) => !removeIds.includes(s));
  return [...new Set([...addIds, ...kept])];
}

export default function StackSelector() {
  const plan = useProjectPlanStore((s) => s.plan);
  const updatePlan = useProjectPlanStore((s) => s.updatePlan);
  const pendingStack = useProjectPlanStore((s) => s.pendingStack);
  const setPendingStack = useProjectPlanStore((s) => s.setPendingStack);

  const selected: string[] = plan?.stack.selected ?? pendingStack.selected;
  const nextjs = isNextjsGroup(selected);

  function setSelected(next: string[]) {
    if (plan) updatePlan({ stack: { selected: next } });
    else setPendingStack({ selected: next });
  }

  function switchGroup(key: "nextjs" | "reactjs") {
    if ((key === "nextjs") === nextjs) return; // already active
    setSelected(applyGroupSwitch(key, selected));
  }

  function toggle(id: string) {
    // Language and styling IDs are controlled by group logic, not manual toggle
    if (
      ([...NEXTJS_GROUP, ...REACT_GROUP] as string[]).includes(id) ||
      STYLING_IDS.includes(id)
    )
      return;
    // nextjs-only items blocked when react group is active
    if (NEXTJS_ONLY_IDS.includes(id) && !nextjs) return;
    // react-only items blocked when nextjs group is active
    if (REACT_ONLY_IDS.includes(id) && nextjs) return;

    let next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];

    // Mutual exclusion: only one DB
    if (DB_IDS.includes(id) && !selected.includes(id)) {
      next = next.filter((s) => !DB_IDS.includes(s) || s === id);
    }
    // Mutual exclusion: only one Auth
    if (AUTH_IDS.includes(id) && !selected.includes(id)) {
      next = next.filter((s) => !AUTH_IDS.includes(s) || s === id);
    }

    setSelected(next);
  }

  const activeStylingLabel = nextjs ? "Tailwind CSS v4" : "Bootstrap 5";

  return (
    <div className="space-y-6">
      {/* ── Language group (radio cards) ────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {CATEGORY_LABELS.language}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchGroup("nextjs")}
            className={cn(
              "p-3 rounded-xl border text-left transition-all",
              nextjs
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="text-xs font-semibold">Next.js · TypeScript</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              App Router · SSR · Full-stack
            </div>
          </button>
          <button
            type="button"
            onClick={() => switchGroup("reactjs")}
            className={cn(
              "p-3 rounded-xl border text-left transition-all",
              !nextjs
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="text-xs font-semibold">React.js · JavaScript</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Vite SPA · Client-only
            </div>
          </button>
        </div>
      </div>

      {/* ── Styling (auto-enforced, read-only) ──────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {CATEGORY_LABELS.styling}
        </p>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-primary text-primary-foreground border-primary">
            {activeStylingLabel}
          </span>
          <span className="text-[10px] text-muted-foreground italic">
            enforced by language
          </span>
        </div>
      </div>

      {/* ── Toggleable categories ────────────────────────────────────────── */}
      {TOGGLEABLE_CATEGORIES.map((cat) => {
        const items = stackOptions.filter((o) => {
          if (o.category !== cat) return false;
          // Hide group-restricted items
          if (NEXTJS_ONLY_IDS.includes(o.id) && !nextjs) return false;
          if (REACT_ONLY_IDS.includes(o.id) && nextjs) return false;
          return true;
        });
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/50",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
