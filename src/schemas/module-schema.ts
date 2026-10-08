import { z } from "zod";

/** Every module the workbench knows about, in phase order (spec: phases 1–4). */
export const moduleIdSchema = z.enum(["organiser", "voice", "ask-my-files", "auditor"]);
export type ModuleId = z.infer<typeof moduleIdSchema>;

/**
 * How a module tile presents itself:
 * - `planned`  — not built yet; the tile is dim and inert
 * - `idle`     — built, nothing to show
 * - `attention`— something waits for the owner (a plan to review) — the tile is lit
 * - `working`  — a job of this module is running — the tile is lit
 */
export const moduleStateSchema = z.enum(["planned", "idle", "attention", "working"]);
export type ModuleState = z.infer<typeof moduleStateSchema>;

export const moduleSchema = z.object({
  id: moduleIdSchema,
  name: z.string().min(1),
  summary: z.string().min(1),
  /** The spec phase that delivers it. */
  phase: z.number().int().min(1),
  state: moduleStateSchema,
  /** Short status word shown under the name, e.g. "Plan ready", "Phase 2". */
  statusText: z.string().min(1),
  /** Route of the module's full view; absent while planned. */
  href: z.string().startsWith("/").optional(),
});
export type Module = z.infer<typeof moduleSchema>;
