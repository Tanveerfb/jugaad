"use client";

import { stackOptions, DB_IDS, AUTH_IDS, LOCKED_IDS } from "./stackRegistry";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { cn } from "@/lib/utils";
import type { StackOption } from "@/types";

const CATEGORIES: StackOption["category"][] = [
  "language",
  "styling",
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

export default function StackSelector() {
  const plan = useProjectPlanStore((s) => s.plan);
  const updatePlan = useProjectPlanStore((s) => s.updatePlan);

  const selected: string[] = plan?.stack.selected ?? [
    ...stackOptions.filter((o) => o.default).map((o) => o.id),
  ];

  function toggle(id: string) {
    if (LOCKED_IDS.includes(id)) return;

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

    updatePlan({ stack: { selected: next } });
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map((cat) => {
        const items = stackOptions.filter((o) => o.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((option) => {
                const isSelected = selected.includes(option.id);
                const isLocked = LOCKED_IDS.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggle(option.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/50",
                      isLocked && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    {option.label}
                    {isLocked && (
                      <span className="ml-1 text-xs opacity-60">(locked)</span>
                    )}
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
