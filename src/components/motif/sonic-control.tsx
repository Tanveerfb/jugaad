"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SonicControlProps = {
  /** False until a module that listens (Voice, phase 2) is installed. */
  available: boolean;
  onStart?: () => void;
  onStop?: () => void;
  /** Shown in the tooltip while unavailable. */
  unavailableReason?: string;
};

/**
 * The one control for push-to-talk: hold with the pointer, or hold Space / Enter. While live
 * its tip glows and a soundwave line runs. The tool glyph is original (a slim rod, grip bands
 * and an emitter), not a prop from the show.
 */
export function SonicControl({ available, onStart, onStop, unavailableReason }: SonicControlProps) {
  const [live, setLive] = useState(false);

  function start() {
    if (!available || live) return;
    setLive(true);
    onStart?.();
  }
  function stop() {
    if (!live) return;
    setLive(false);
    onStop?.();
  }

  const button = (
    <button
      type="button"
      aria-label={live ? "Listening — release to stop" : "Push to talk — hold to speak"}
      aria-pressed={live}
      aria-disabled={!available}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      className={cn(
        "inline-flex h-10 select-none items-center gap-2.5 rounded-full border bg-card px-2.5 text-sm font-semibold sm:pr-3.5",
        "transition-[box-shadow,border-color] duration-(--duration-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        available ? "cursor-pointer" : "cursor-not-allowed opacity-60",
        live &&
          "border-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_40%,transparent),0_0_18px_color-mix(in_srgb,var(--primary)_30%,transparent)]",
      )}
    >
      <svg viewBox="0 0 42 14" aria-hidden="true" className="h-3.5 w-[42px] overflow-visible">
        <rect x="0" y="5" width="26" height="4" rx="2" className="fill-current opacity-55" />
        <rect x="8" y="3.5" width="2" height="7" rx="1" className="fill-current opacity-80" />
        <rect x="13" y="3.5" width="2" height="7" rx="1" className="fill-current opacity-80" />
        <path d="M26 4 L33 2.5 L33 11.5 L26 10 Z" className="fill-current opacity-70" />
        <circle
          cx="37"
          cy="7"
          r="3.5"
          className={cn(
            "transition-[fill] duration-(--duration-fast)",
            live ? "fill-primary drop-shadow-[0_0_4px_var(--primary)]" : "fill-muted-foreground",
          )}
        />
      </svg>
      {live && (
        <svg viewBox="0 0 56 18" aria-hidden="true" className="h-[18px] w-14">
          <path
            d="M1 9 Q5 1 9 9 T17 9 T25 9 T33 9 T41 9 T49 9 T55 9"
            className="animate-wave fill-none stroke-primary [stroke-dasharray:4_3] [stroke-linecap:round] [stroke-width:2]"
          />
        </svg>
      )}
      <span className="hidden sm:inline">{live ? "Listening…" : "Hold to talk"}</span>
    </button>
  );

  if (available) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{unavailableReason ?? "Not available yet"}</TooltipContent>
    </Tooltip>
  );
}
