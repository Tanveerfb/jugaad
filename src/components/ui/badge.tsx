import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/*
 * Jugaad motif: a hexagonal pill — pointed ends, like a stretched roundel. Tinted fills carry
 * the colour, so a state is never shown by colour alone: pair it with a word (and an icon
 * where it warns).
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden px-2.5 text-xs font-semibold whitespace-nowrap [clip-path:polygon(7px_0,calc(100%-7px)_0,100%_50%,calc(100%-7px)_100%,7px_100%,0_50%)] transition-[filter] focus-visible:brightness-125 focus-visible:outline-none [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:brightness-125",
        attention: "bg-attention/15 text-attention",
        working: "bg-working/15 text-working",
        destructive: "bg-destructive/15 text-destructive [a]:hover:bg-destructive/25",
        outline: "bg-surface-2 text-foreground [a]:hover:brightness-125",
        ghost: "text-muted-foreground hover:bg-surface-2",
        link: "text-primary underline-offset-4 [clip-path:none] hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
