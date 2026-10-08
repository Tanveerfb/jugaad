"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

/*
 * Hex switch (component round 2, "hex" family): a hexagonal bead on a rail. Off, the bead
 * rests left in steel; on, it slides right and lights orange. Position and colour together
 * carry the state.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-5 w-11 shrink-0 cursor-pointer items-center rounded-full bg-surface-2 shadow-[inset_0_0_0_1px_var(--border)] outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "after:absolute after:-inset-x-2 after:-inset-y-2 after:content-['']",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-[18px] translate-x-[3px] bg-muted-foreground shape-hex transition-[translate,background-color,filter] duration-200 ease-console",
          "data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-primary data-[state=checked]:drop-shadow-[0_0_6px_var(--primary)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
