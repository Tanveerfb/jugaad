import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { NotchedPanel } from "@/components/motif/notched-panel";
import { Roundel } from "@/components/motif/roundel";
import { BackToWorkbench } from "@/components/back-to-workbench";
import { Button } from "@/components/ui/button";
import { isLit } from "@/lib/modules";
import type { Module } from "@/schemas/module-schema";

type ModuleViewProps = {
  module: Module;
  /** A screen inside the module ("Downloads · plan"); defaults to the module's name. */
  title?: string;
  /** Where the back key goes on an inner screen; the module's own view goes back to the workbench. */
  back?: { href: string; label: string };
  children: React.ReactNode;
};

/**
 * The full view a module tile opens into — bigger on the inside. Shares the tile's
 * ViewTransition name, so the hexagon morphs into this notched panel; its content then
 * materialises in three soft pulses (visible by default — the animation only enhances).
 */
export function ModuleView({ module, title, back, children }: ModuleViewProps) {
  return (
    <ViewTransition name={`module-${module.id}`} share="module-morph" default="none">
      <NotchedPanel innerClassName="p-3.5 sm:p-[22px]">
        <div className="[&>*]:animate-materialise [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms]">
          <div className="mb-[18px] flex items-center gap-3.5">
            {back ? (
              <Button asChild variant="secondary" size="icon">
                <Link href={back.href} aria-label={back.label}>
                  <ChevronLeftIcon aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <BackToWorkbench />
            )}
            <Roundel glowing={isLit(module)} />
            <h1 className="min-w-0 text-[25px] font-semibold tracking-[-0.01em] break-words sm:text-[30px]">
              {title ?? module.name}
            </h1>
          </div>
          {children}
        </div>
      </NotchedPanel>
    </ViewTransition>
  );
}
