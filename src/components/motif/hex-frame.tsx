import { useId } from "react";
import { cn } from "@/lib/utils";
import { HEX_PATH, HEX_VIEWBOX } from "@/lib/motif-geometry";

type HexFrameProps = {
  /** Lit: a warm inner glow and a light running slowly round the edge. */
  lit?: boolean;
  /** Interactive tiles answer hover and keyboard focus with a fast lap of light. */
  interactive?: boolean;
  className?: string;
};

/**
 * The outline of a flat-top hexagon tile, drawn in SVG so the edge can carry a chasing light
 * (`pathLength="100"` makes one lap = a dashoffset of 100 at any size). Fills its parent; the
 * parent clips itself with `shape-hex` and owns hover/focus via `group`.
 */
export function HexFrame({ lit = false, interactive = false, className }: HexFrameProps) {
  const gradientId = `hex-lit-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox={HEX_VIEWBOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="45%" r="65%">
          <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.24 }} />
          <stop offset="62%" style={{ stopColor: "var(--card)", stopOpacity: 1 }} />
        </radialGradient>
      </defs>
      <path d={HEX_PATH} className="fill-card" style={lit ? { fill: `url(#${gradientId})` } : undefined} />
      <path
        d={HEX_PATH}
        vectorEffect="non-scaling-stroke"
        className={cn(
          "fill-none stroke-border [stroke-width:1.5]",
          lit && "stroke-[color-mix(in_srgb,var(--primary)_60%,var(--border))]",
          "group-focus-visible:stroke-ring group-focus-visible:[stroke-width:3]",
        )}
      />
      <path
        d={HEX_PATH}
        pathLength={100}
        vectorEffect="non-scaling-stroke"
        className={cn(
          "fill-none stroke-primary [stroke-linecap:round] [stroke-width:3] opacity-0",
          lit && "animate-chase opacity-100 [stroke-dasharray:14_86]",
          // hover / keyboard focus: one fast lap of light
          interactive &&
            "group-hover:animate-chase-fast group-hover:opacity-100 group-hover:[stroke-dasharray:22_78] group-focus-visible:animate-chase-fast group-focus-visible:opacity-100 group-focus-visible:[stroke-dasharray:22_78]",
          // reduced motion: a lit tile keeps a solid lit edge instead of the moving light
          lit && "motion-reduce:[stroke-dasharray:100_0] motion-reduce:opacity-60",
        )}
      />
    </svg>
  );
}
