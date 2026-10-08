import * as React from "react"
import { cn } from "cn"

/*
 * Batch timeline (component round 2): items hang off a dashed rotor spine as lit hexagon
 * nodes; an item that no longer applies (an undone batch) goes dark. Use an ordered list —
 * the order is the history.
 */

function Timeline({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="timeline"
      className={cn(
        "relative grid list-none gap-4 py-0.5 pl-[30px]",
        "before:absolute before:top-1 before:bottom-1 before:left-[11px] before:w-0.5 before:bg-[repeating-linear-gradient(var(--border)_0_4px,transparent_4px_7px)] before:content-['']",
        className
      )}
      {...props}
    />
  )
}

type TimelineItemProps = React.ComponentProps<"li"> & {
  /** A dark node: the item no longer applies (e.g. an undone batch). Say so in the text too. */
  inactive?: boolean
}

function TimelineItem({ className, inactive = false, ...props }: TimelineItemProps) {
  return (
    <li
      data-slot="timeline-item"
      data-inactive={inactive || undefined}
      className={cn(
        "relative grid gap-0.5 text-sm",
        "before:absolute before:top-0.5 before:-left-[27px] before:h-4 before:w-[18px] before:bg-primary before:shape-hex before:content-['']",
        "data-inactive:text-muted-foreground data-inactive:before:bg-border",
        className
      )}
      {...props}
    />
  )
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="timeline-title" className={cn("m-0 font-semibold", className)} {...props} />
}

function TimelineMeta({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="timeline-meta" className={cn("m-0 text-[12.5px] text-muted-foreground", className)} {...props} />
}

export { Timeline, TimelineItem, TimelineMeta, TimelineTitle }
