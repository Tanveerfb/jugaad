import { cn } from "cn"

/** A chamfered rectangle in a 100×100 box, stretched to the field (preserveAspectRatio none). */
const FRAME_PATH = "M3 0H97L100 8V92L97 100H3L0 92V8Z"

/**
 * Chase frame (component round 1b): the field's edge is the honeycomb tile's edge. When the
 * parent `group/field` gains focus — or is open, for a select — a light runs once round the
 * edge (`pathLength` 100 → dash 0→100) and stays lit. Invalid: the edge turns red and stays
 * lit. Disabled: dashed. Decorative; the field itself carries every state for assistive tech.
 */
function ChaseFrame({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
    >
      <path
        d={FRAME_PATH}
        vectorEffect="non-scaling-stroke"
        className={cn(
          "fill-none stroke-border [stroke-width:1.5] transition-[stroke] duration-(--duration-fast)",
          "group-hover/field:stroke-[color-mix(in_srgb,var(--primary)_45%,var(--border))]",
          "group-has-[[aria-invalid=true]]/field:stroke-destructive",
          "group-has-[:disabled]/field:[stroke-dasharray:3_3]"
        )}
      />
      <path
        d={FRAME_PATH}
        pathLength={100}
        vectorEffect="non-scaling-stroke"
        className={cn(
          "fill-none stroke-primary [stroke-dasharray:0_100] [stroke-width:2] transition-[stroke-dasharray] duration-550 ease-console",
          "group-focus-within/field:[stroke-dasharray:100_0] group-data-[state=open]/field:[stroke-dasharray:100_0]",
          "group-has-[[aria-invalid=true]]/field:stroke-destructive group-has-[[aria-invalid=true]]/field:[stroke-dasharray:100_0]"
        )}
      />
    </svg>
  )
}

export { ChaseFrame }
