import { ViewTransition } from "react";
import { NotchedPanel } from "@/components/motif/notched-panel";
import { Roundel } from "@/components/motif/roundel";
import { BackToWorkbench } from "@/components/back-to-workbench";
import { isLit } from "@/lib/modules";
import type { Module } from "@/schemas/module-schema";

type ModuleViewProps = {
  module: Module;
  children: React.ReactNode;
};

/**
 * The full view a module tile opens into — bigger on the inside. Shares the tile's
 * ViewTransition name, so the hexagon morphs into this notched panel; its content then
 * materialises in three soft pulses (visible by default — the animation only enhances).
 */
export function ModuleView({ module, children }: ModuleViewProps) {
  return (
    <ViewTransition name={`module-${module.id}`} share="module-morph" default="none">
      <NotchedPanel innerClassName="p-3.5 sm:p-[22px]">
        <div className="[&>*]:animate-materialise [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms]">
          <div className="mb-[18px] flex items-center gap-3.5">
            <BackToWorkbench />
            <Roundel glowing={isLit(module)} />
            <h1 className="text-[30px] font-semibold tracking-[-0.01em]">{module.name}</h1>
          </div>
          {children}
        </div>
      </NotchedPanel>
    </ViewTransition>
  );
}
