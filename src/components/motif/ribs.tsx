import { ribLines } from "@/lib/motif-geometry";

const LINES = ribLines();

/**
 * The background: 18 faint ribs fanning down from above the page, after the 2012 console
 * room. Still — the light that swept across them read as constant flicker on the panels above
 * (owner, 2026-10-17). Decorative only.
 */
export function Ribs() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none fixed inset-0 z-0 size-full"
    >
      {LINES.map((l, i) => (
        <line
          key={i}
          {...l}
          vectorEffect="non-scaling-stroke"
          className="stroke-rib opacity-[0.16] [stroke-width:1]"
        />
      ))}
    </svg>
  );
}
