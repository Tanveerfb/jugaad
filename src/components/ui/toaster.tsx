"use client"

import * as React from "react"
import { cn } from "cn"
import { Toast as ToastPrimitive } from "radix-ui"
import { useToastStore, type ToastItem } from "@/stores/toast-store"

/*
 * Rotor ticket toasts (component round 2): a mini rotor counts down the time left — to undo,
 * typically — and the toast leaves on its own. Radix supplies the live region, timers, swipe
 * to dismiss and pause on hover/focus; the ring pauses with it so it never lies.
 */

const RING = {
  neutral: "stroke-primary",
  success: "stroke-working",
  error: "stroke-destructive",
} as const

function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <RotorToast key={t.id} toast={t} />
      ))}
      <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[100] flex w-full max-w-[360px] flex-col gap-2 p-4 outline-none" />
    </ToastPrimitive.Provider>
  )
}

function RotorToast({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const [paused, setPaused] = React.useState(false)

  return (
    <ToastPrimitive.Root
      duration={toast.duration}
      onPause={() => setPaused(true)}
      onResume={() => setPaused(false)}
      onOpenChange={(open) => {
        if (!open) dismiss(toast.id)
      }}
      className={cn(
        "flex items-center gap-3 bg-card py-2.5 pr-3 pl-2.5 shape-cut shadow-[inset_0_0_0_1px_var(--border)] [--chamfer-sm:10px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-3",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full"
      )}
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="size-[34px] shrink-0">
        <circle cx="18" cy="18" r="14" className="fill-none stroke-surface-2 [stroke-width:4]" />
        <circle
          cx="18"
          cy="18"
          r="14"
          pathLength={100}
          transform="rotate(-90 18 18)"
          className={cn("fill-none [stroke-dasharray:100_100] [stroke-width:4]", RING[toast.tone])}
          style={{
            animation: `countdown ${toast.duration}ms linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      </svg>
      <div className="grid min-w-0 flex-1">
        <ToastPrimitive.Title className="text-sm font-semibold">{toast.title}</ToastPrimitive.Title>
        {toast.description && (
          <ToastPrimitive.Description className="truncate text-[12.5px] text-muted-foreground">
            {toast.description}
          </ToastPrimitive.Description>
        )}
      </div>
      {toast.action && (
        <ToastPrimitive.Action
          altText={toast.action.altText}
          onClick={toast.action.onSelect}
          className="cursor-pointer rounded-xs px-1.5 py-1 text-sm font-semibold text-primary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring light:text-attention"
        >
          {toast.action.label}
        </ToastPrimitive.Action>
      )}
    </ToastPrimitive.Root>
  )
}

export { Toaster }
