"use client"

import * as React from "react"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

/*
 * Rotor track tabs (component round 1): the tabs sit on a dashed rail and a glowing bead
 * travels along it to the active tab. The bead moves with `transform` only; its position is
 * measured from the active trigger. Keyboard behaviour (arrows, Home/End) is Radix's.
 */

function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const beadRef = React.useRef<HTMLSpanElement>(null)

  React.useLayoutEffect(() => {
    const list = listRef.current
    const bead = beadRef.current
    if (!list || !bead) return

    function place() {
      const active = list!.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]')
      if (!active) {
        bead!.style.opacity = "0"
        return
      }
      const x = active.offsetLeft + active.offsetWidth / 2 - bead!.offsetWidth / 2
      bead!.style.transform = `translateX(${x}px)`
      bead!.style.opacity = "1"
    }

    place()
    // the active tab changes through Radix's data-state; sizes change with fonts and layout
    const states = new MutationObserver(place)
    states.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] })
    const sizes = new ResizeObserver(place)
    sizes.observe(list)
    return () => {
      states.disconnect()
      sizes.disconnect()
    }
  }, [])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex w-fit items-center gap-1 pb-3",
        // the dashed rail
        "before:absolute before:inset-x-0 before:bottom-1 before:h-0.5 before:bg-[repeating-linear-gradient(90deg,var(--border)_0_6px,transparent_6px_9px)] before:content-['']",
        className
      )}
      {...props}
    >
      {children}
      <span
        ref={beadRef}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-2.5 w-7 rounded-full bg-primary opacity-0 shadow-[0_0_12px_var(--primary)] transition-[transform,opacity] duration-350 ease-console"
      />
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors duration-(--duration-fast) outline-none",
        "hover:text-foreground data-[state=active]:text-foreground",
        "focus-visible:rounded-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
