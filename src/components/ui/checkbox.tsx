"use client"

import * as React from "react"
import { cn } from "cn"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

/*
 * Hex checkbox (component round 2, "hex" family): a hollow hexagon that fills with the accent
 * when checked; indeterminate shows a bar across the filled hexagon. Shape and fill — not hue
 * alone — tell the states apart. Focus fills the outer edge with the focus colour.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer group/checkbox relative grid h-[18px] w-5 shrink-0 cursor-pointer place-items-center bg-border shape-hex outline-none",
        "transition-colors duration-(--duration-fast)",
        // the hollow centre, which the checked state fills
        "before:absolute before:inset-[2px] before:bg-background before:shape-hex before:transition-all before:duration-200 before:ease-console before:content-['']",
        "data-[state=checked]:bg-primary data-[state=checked]:before:inset-0 data-[state=checked]:before:bg-primary",
        "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:before:inset-0 data-[state=indeterminate]:before:bg-primary",
        "hover:bg-[color-mix(in_srgb,var(--primary)_55%,var(--border))]",
        "focus-visible:bg-ring data-[state=checked]:focus-visible:bg-ring",
        "aria-invalid:bg-destructive disabled:cursor-not-allowed disabled:opacity-50",
        // a larger hit area than the 20px mark
        "after:absolute after:-inset-x-3 after:-inset-y-2 after:content-['']",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="relative grid place-items-center">
        <span aria-hidden="true" className="hidden h-0.5 w-2 rounded-full bg-background group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
