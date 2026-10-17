"use client"

import * as React from "react"
import { cn } from "cn"
import { Popover as PopoverPrimitive } from "radix-ui"

/*
 * Popover (settings round 1, locked 2026-10-17 — the VRAM panel): a notched drop-down whose
 * pointer sits near its top right, under the control that opened it. The 1px edge is the
 * outer layer showing round the inner one (clip-path removes borders). Behaviour is Radix's:
 * Escape and an outside click close it, focus moves in and returns to the trigger.
 */

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  children,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn(
          "z-50 w-[min(360px,calc(100vw-32px))] bg-border p-px shape-pop outline-none",
          "origin-(--radix-popover-content-transform-origin) duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          className
        )}
        {...props}
      >
        <div className="grid gap-3 bg-card px-4 pt-[22px] pb-4 text-card-foreground shape-pop">{children}</div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
