import { cn } from "@/lib/utils";

type RoundelProps = {
  /** Glowing (something to show) or dim (nothing yet). */
  glowing?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { outer: "h-[26px] w-[30px]", core: "size-[15px]" },
  md: { outer: "h-[33px] w-[38px]", core: "size-5" },
  lg: { outer: "h-[72px] w-[84px]", core: "size-10" },
} as const;

/** The 2012 console room's roundel: a hexagon with a glowing circle laid over it. */
export function Roundel({ glowing = true, size = "md", className }: RoundelProps) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid shrink-0 place-items-center bg-surface-2 shape-hex", s.outer, className)}
    >
      <span
        className={cn(
          "rounded-full",
          s.core,
          glowing
            ? "animate-breathe bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary)_70%,white)_0_28%,var(--primary)_52%,transparent_72%)] shadow-[0_0_12px_var(--primary)]"
            : "bg-[radial-gradient(circle,var(--muted-foreground)_0_34%,transparent_70%)] opacity-55",
        )}
      />
    </span>
  );
}
