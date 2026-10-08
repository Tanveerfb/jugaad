"use client"

import * as React from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "./button"

/*
 * Iris dialog (component round 2): the dialog opens as a circle growing out of the control
 * that opened it and closes back into it. The panel is the motif's notched panel. Focus trap,
 * Escape, outside click and focus return are Radix's. Under reduced motion it simply appears.
 */

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  // A callback ref, because the portal attaches the content a tick after mount. It runs as the
  // node attaches — before Radix moves focus inside — so the active element is still the
  // control that opened the dialog, and the iris grows from that control's centre.
  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
      if (!node) return
      const origin = document.activeElement
      if (!(origin instanceof HTMLElement) || origin === document.body) return
      const from = origin.getBoundingClientRect()
      const box = node.getBoundingClientRect()
      node.style.setProperty("--iris-x", `${from.left + from.width / 2 - box.left}px`)
      node.style.setProperty("--iris-y", `${from.top + from.height / 2 - box.top}px`)
    },
    [ref]
  )

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-background/70 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 outline-none",
          "data-open:animate-iris-in data-closed:animate-iris-out",
          // notched panel: border layer, then the inset surface
          "bg-border p-px shape-notched",
          className
        )}
        {...props}
      >
        <div className="relative grid gap-3 bg-card p-5 shape-notched">
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="absolute top-3 right-3">
                <XIcon aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("grid gap-1.5 pr-10", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title data-slot="dialog-title" className={cn("font-heading text-lg font-semibold", className)} {...props} />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }
