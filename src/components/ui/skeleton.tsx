import { cn } from "cn"

/*
 * Skeleton (component round 2, "missing cell" family): placeholders materialise in soft
 * pulses, the same rhythm as a module view arriving. Stagger a group with `style={{
 * animationDelay }}`. Reduced motion: a still block. Shape it to match the final layout.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("h-3 rounded-xs bg-surface-2 animate-materialise-loop", className)}
      {...props}
    />
  )
}

export { Skeleton }
