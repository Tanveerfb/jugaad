import { moduleSchema, type Module } from "@/schemas/module-schema";

/**
 * The module registry. Phase 0: nothing is built, so every module is `planned` except the
 * Organiser, whose route exists (its empty view) ahead of phase 1. When a module ships, its
 * entry moves to a real state fed by the core (job queue, plans) rather than this constant.
 *
 * Parsed through the schema so a bad entry fails at startup, not on screen (§STATE).
 */
export const MODULES: readonly Module[] = moduleSchema.array().parse([
  {
    id: "organiser",
    name: "Organiser",
    summary: "Sort messy folders safely. Every move is approved and can be undone.",
    phase: 1,
    state: "idle",
    statusText: "Phase 1",
    href: "/organiser",
  },
  {
    id: "voice",
    name: "Voice",
    summary: "Push to talk inside the app. Spoken replies, all on this PC.",
    phase: 2,
    state: "planned",
    statusText: "Phase 2",
  },
  {
    id: "ask-my-files",
    name: "Ask my files",
    summary: "Questions answered from your own files, with links to them.",
    phase: 3,
    state: "planned",
    statusText: "Phase 3",
  },
  {
    id: "auditor",
    name: "Auditor",
    summary: "Check a project against fleet standards, locally.",
    phase: 4,
    state: "planned",
    statusText: "Phase 4",
  },
]);

/** True when a tile should glow and carry the edge light. */
export function isLit(module: Module): boolean {
  return module.state === "attention" || module.state === "working";
}

/** Looks a module up by id; throws on an unknown id, which is a programming error. */
export function getModule(id: Module["id"]): Module {
  const found = MODULES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown module: ${id}`);
  return found;
}
