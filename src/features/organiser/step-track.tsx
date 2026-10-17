import { stepState, type FolderStep } from "@/lib/domain/folder-status";
import { cn } from "@/lib/utils";

const STEPS: { step: FolderStep; done: string; ahead: string }[] = [
  { step: "scan", done: "Scanned", ahead: "Scan" },
  { step: "categories", done: "Categories", ahead: "Categories" },
  { step: "plan", done: "Plan", ahead: "Plan" },
  { step: "applied", done: "Applied", ahead: "Applied" },
];

/**
 * Scanned → categories → plan → applied, as hex nodes on a dashed line. Done steps are solid,
 * the current one lit, the rest hollow; the current one is also marked for screen readers.
 */
export function StepTrack({ current }: { current: FolderStep }) {
  return (
    <ol aria-label="Progress" className="m-0 flex list-none flex-wrap items-center gap-y-2 p-0">
      {STEPS.map(({ step, done, ahead }, i) => {
        const state = stepState(step, current);
        return (
          <li
            key={step}
            aria-current={state === "now" ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-[13px] font-semibold",
              state === "ahead" && "text-muted-foreground",
              state === "now" && "text-primary",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-3.5 w-4 shape-hex",
                state === "done" && "bg-foreground",
                state === "now" && "bg-primary shadow-[0_0_10px_var(--primary)]",
                state === "ahead" && "bg-surface-2",
              )}
            />
            {state === "done" ? done : ahead}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="mx-2 h-0.5 w-[34px] bg-[repeating-linear-gradient(90deg,var(--border)_0_4px,transparent_4px_7px)]"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
