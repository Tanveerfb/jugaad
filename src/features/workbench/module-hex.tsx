import Link from "next/link";
import { ViewTransition } from "react";
import { HexFrame } from "@/components/motif/hex-frame";
import { Roundel } from "@/components/motif/roundel";
import { StatusLight, type StatusTone } from "@/components/motif/status-light";
import { isLit } from "@/lib/modules";
import { cn } from "@/lib/utils";
import type { Module, ModuleState } from "@/schemas/module-schema";

const TONE: Record<ModuleState, StatusTone> = {
  planned: "idle",
  idle: "idle",
  attention: "attention",
  working: "working",
};

type ModuleHexProps = {
  module: Module;
  className?: string;
};

/**
 * One honeycomb tile. A module with a view is a link whose hexagon morphs into the view's
 * notched panel (shared ViewTransition name); a planned module is dim and inert.
 */
export function ModuleHex({ module, className }: ModuleHexProps) {
  const lit = isLit(module);
  const body = (
    <>
      <HexFrame lit={lit} interactive={Boolean(module.href)} />
      <span className="relative grid h-full place-content-center justify-items-center gap-0.5 px-[12%] text-center sm:gap-1.5 sm:px-[16%]">
        <Roundel glowing={lit} size="md" className="max-sm:h-[26px] max-sm:w-[30px]" />
        <span className={cn("font-heading text-[15px] font-semibold leading-tight lg:text-lg", module.state === "planned" && "text-muted-foreground")}>
          {module.name}
        </span>
        <StatusLight tone={TONE[module.state]}>{module.statusText}</StatusLight>
      </span>
    </>
  );

  const tile = "group absolute block h-(--hex-h) w-(--hex-w) shape-hex outline-none";

  if (!module.href) {
    return (
      <div className={cn(tile, className)} aria-label={`${module.name} — ${module.statusText}, not built yet`} role="img">
        {body}
      </div>
    );
  }

  return (
    <ViewTransition name={`module-${module.id}`} share="module-morph" default="none">
      <Link
        href={module.href}
        transitionTypes={["module-open"]}
        aria-label={`${module.name} — ${module.statusText}. ${module.summary}`}
        className={cn(
          tile,
          "cursor-pointer transition-transform duration-(--duration) ease-console hover:scale-[1.03] active:scale-[0.98]",
          className,
        )}
      >
        {body}
      </Link>
    </ViewTransition>
  );
}
