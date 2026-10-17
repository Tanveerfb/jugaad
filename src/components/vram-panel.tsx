"use client";

import { ChevronDownIcon } from "lucide-react";
import { VramMeter } from "@/components/motif/vram-gauge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The VRAM gauge as a control (settings round 1, locked V1): clicking it drops down the panel
 * of what holds the card's memory, with "Free VRAM". The panel's content is rendered on the
 * server and passed in, so it is current every time the page refreshes.
 */
export function VramPanel({ usedGb, totalGb, children }: { usedGb: number; totalGb: number; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Graphics memory: ${usedGb.toFixed(1)} of ${totalGb} GB in use. Open the VRAM panel`}
        className="-mx-2 -my-1.5 flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:text-foreground"
      >
        <VramMeter usedGb={usedGb} totalGb={totalGb} />
        <ChevronDownIcon aria-hidden="true" className="size-3 transition-transform duration-(--duration-fast) in-data-[state=open]:rotate-180" />
      </PopoverTrigger>
      <PopoverContent aria-label="Graphics memory">{children}</PopoverContent>
    </Popover>
  );
}
