import * as React from "react"
import { cn } from "cn"

/*
 * Missing-cell empty state (component round 2): a small honeycomb with one cell outlined
 * where it belongs. Every empty state says what to do next (project-rules §QOL) — pass it as
 * `children` (usually a button) or say it in the description.
 */

type EmptyStateProps = Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  description?: React.ReactNode
}

function EmptyState({ title, description, className, children, ...props }: EmptyStateProps) {
  const titleId = React.useId()
  return (
    <section
      data-slot="empty-state"
      aria-labelledby={titleId}
      className={cn("grid justify-items-center gap-3 px-5 py-10 text-center", className)}
      {...props}
    >
      <MissingCell />
      <h2 id={titleId} className="mt-1 text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="m-0 max-w-[46ch] text-pretty text-muted-foreground">{description}</p>}
      {children}
    </section>
  )
}

/** Three cells of a flat-top honeycomb and a dashed outline for the fourth. */
function MissingCell() {
  const hex = "M10.5 1H29.5L39 17.5L29.5 34H10.5L1 17.5Z"
  return (
    <svg aria-hidden="true" viewBox="0 0 96 72" className="h-[72px] w-24 overflow-visible">
      <path d={hex} transform="translate(0 18)" className="fill-surface-2" />
      <path d={hex} transform="translate(28 0)" className="fill-surface-2" />
      <path d={hex} transform="translate(56 18)" className="fill-surface-2" />
      <path
        d={hex}
        transform="translate(28 36)"
        className="fill-none stroke-primary [stroke-dasharray:3_3] [stroke-width:1.5]"
      />
    </svg>
  )
}

export { EmptyState }
