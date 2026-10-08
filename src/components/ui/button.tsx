import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/*
 * Console key (component round 1b, docs/design/components.html): a hexagon stretched into a
 * key, with a light on its left that wakes on hover. The primary is "Ember" — a burnt-orange
 * body with white text (5.8:1); bright orange appears only in the light and the loading
 * sweep. clip-path removes outside focus rings, so focus is an inset bar along the base.
 */
const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden font-semibold whitespace-nowrap select-none shape-key",
    "transition-[filter,transform,background-color] duration-(--duration-fast) ease-console outline-none",
    // the light
    "before:size-2 before:shrink-0 before:rounded-full before:transition-all before:duration-200 before:content-['']",
    "focus-visible:shadow-[inset_0_-3px_0_var(--ring)] active:not-aria-[haspopup]:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:grayscale-[0.5] disabled:before:border-[1.5px] disabled:before:border-dashed disabled:before:border-current disabled:before:bg-transparent! disabled:before:shadow-none!",
    // loading: the light blinks and a bar sweeps along the base
    "aria-busy:pointer-events-none aria-busy:before:animate-blink",
    "aria-busy:after:absolute aria-busy:after:bottom-0 aria-busy:after:left-0 aria-busy:after:h-[3px] aria-busy:after:w-[30%] aria-busy:after:animate-sweep aria-busy:after:content-['']",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-ember text-white before:bg-primary before:shadow-[0_0_8px_var(--primary)] hover:bg-ember-hover hover:before:bg-[#ffd9b8] aria-busy:after:bg-primary",
        secondary:
          "bg-surface-2 text-foreground before:bg-muted-foreground hover:brightness-125 hover:before:bg-primary hover:before:shadow-[0_0_10px_var(--primary)] aria-busy:after:bg-primary",
        ghost:
          "bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] text-foreground before:bg-muted-foreground hover:bg-surface-2 hover:before:bg-primary aria-busy:after:bg-primary",
        destructive:
          "bg-[color-mix(in_srgb,var(--destructive)_16%,var(--surface-2))] text-destructive before:bg-destructive hover:brightness-125 aria-busy:after:bg-destructive",
        link: "text-primary underline-offset-4 [clip-path:none] before:hidden hover:underline",
      },
      size: {
        default: "h-10 gap-2.5 pr-[22px] pl-4 text-sm",
        sm: "h-8 gap-2 pr-4 pl-3 text-[13px] [--tip:10px]",
        lg: "h-12 gap-3 pr-7 pl-5 text-[15px] [--tip:14px]",
        // a true hexagon, no light — for icon-only buttons (they carry an aria-label)
        icon: "h-[34px] w-10 shape-hex before:hidden",
        "icon-sm": "h-7 w-8 shape-hex before:hidden [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows the loading state and makes the button inert until it clears. */
    loading?: boolean
  }

function Button({ className, variant = "default", size = "default", asChild = false, loading = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
