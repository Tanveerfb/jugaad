import type { Module } from "@/schemas/module-schema";
import { ModuleHex } from "./module-hex";

/**
 * Where each of the four tiles sits in the diamond: west, north, south, east. Flat-top
 * hexagons tessellate with columns 0.75 × width apart and alternate columns half a height down.
 */
const SLOTS = [
  "left-0 top-[calc(var(--hex-h)*0.5)]",
  "left-[calc(var(--hex-w)*0.75)] top-0",
  "left-[calc(var(--hex-w)*0.75)] top-(--hex-h)",
  "left-[calc(var(--hex-w)*1.5)] top-[calc(var(--hex-h)*0.5)]",
] as const;

type ModuleCombProps = {
  /** Exactly the modules to show, in slot order. Four today; more modules mean a bigger comb. */
  modules: readonly Module[];
};

/** The honeycomb of module tiles — the workbench's navigation. */
export function ModuleComb({ modules }: ModuleCombProps) {
  return (
    <nav
      aria-label="Modules"
      className="relative mx-auto h-[calc(var(--hex-h)*2)] w-[calc(var(--hex-w)*2.5)] [--hex-h:calc(var(--hex-w)*0.866)] [--hex-w:calc((100vw-40px)/2.5)] sm:[--hex-w:clamp(150px,15vw,218px)]"
    >
      {modules.slice(0, SLOTS.length).map((m, i) => (
        <ModuleHex key={m.id} module={m} className={SLOTS[i]} />
      ))}
    </nav>
  );
}
