import { cn } from "@/lib/utils";

export type StatusTone = "attention" | "working" | "idle";

type StatusLightProps = {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
};

const TONES: Record<StatusTone, string> = {
  attention: "text-attention before:shadow-[0_0_8px_currentColor]",
  working: "text-working before:shadow-[0_0_8px_currentColor]",
  idle: "text-muted-foreground",
};

/** A status: a light plus a word — never colour alone (design-system.md). */
export function StatusLight({ tone, children, className }: StatusLightProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12.5px] font-semibold",
        "before:size-2 before:rounded-full before:bg-current before:content-['']",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
