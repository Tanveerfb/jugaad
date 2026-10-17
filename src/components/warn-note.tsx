import { cn } from "@/lib/utils";

type WarnNoteProps = {
  /** `attention` for "know this before you go on"; `destructive` for "this isn't working". */
  tone?: "attention" | "destructive";
  className?: string;
  children: React.ReactNode;
};

/**
 * A short warning beside the control it is about (settings round 1, locked 2026-10-17): a lit
 * bar on the left, an exclamation mark, and the text — never colour alone. Lead with a `<b>`
 * saying what happens; the rest says what to do about it.
 */
export function WarnNote({ tone = "attention", className, children }: WarnNoteProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 px-3 py-2.5 text-[13.5px] [&_b]:text-foreground",
        tone === "attention"
          ? "bg-[color-mix(in_srgb,var(--attention)_10%,transparent)] shadow-[inset_3px_0_0_var(--attention)]"
          : "bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)] shadow-[inset_3px_0_0_var(--destructive)]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className={cn("mt-0.5 size-4 shrink-0", tone === "attention" ? "text-attention" : "text-destructive")}
      >
        <path d="M8 4v5M8 12h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
