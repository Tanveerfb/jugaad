import { ribLines } from "@/lib/motif-geometry";

const LINES = ribLines();

/**
 * The background: 18 faint ribs fanning down from above the page, after the 2012 console
 * room, with a light sweeping across them in turn. Decorative only.
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
          style={{ animation: "rib-chase 7.2s linear infinite", animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}
