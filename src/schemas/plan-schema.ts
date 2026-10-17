import { z } from "zod";

/**
 * Where a plan is in its life. Transitions are declared once in `lib/domain/plan-lifecycle.ts`.
 * - `draft`      — built, being reviewed; moves can be included or excluded
 * - `approved`   — the owner approved it; nothing has moved yet
 * - `discarded`  — the owner threw it away; nothing ever moved
 * - `applying`   — the worker is moving files
 * - `applied`    — every included move is done
 * - `incomplete` — some moves failed (a locked file, a name taken); retry or undo
 * - `undoing`    — the worker is moving files back
 * - `undone`     — every applied move is back where it was
 * - `undo-incomplete` — some files could not go back (changed or locked since); retry
 */
export const planStatusSchema = z.enum([
  "draft",
  "approved",
  "discarded",
  "applying",
  "applied",
  "incomplete",
  "undoing",
  "undone",
  "undo-incomplete",
]);
export type PlanStatus = z.infer<typeof planStatusSchema>;

/** A proposed reorganisation of one allowed folder: a list of moves the owner approves. */
export const planSchema = z.object({
  id: z.string().min(1),
  folderId: z.string().min(1),
  status: planStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Plan = z.infer<typeof planSchema>;

/**
 * Where one move is. Transitions in `lib/domain/plan-lifecycle.ts`.
 * `pending` → `moved` → `undone`; a move that fails stays `pending` with its `error` set, so
 * the next apply retries it — likewise a failed undo stays `moved`.
 */
export const moveStatusSchema = z.enum(["pending", "moved", "undone"]);
export type MoveStatus = z.infer<typeof moveStatusSchema>;

/** Paths are relative to the plan's allowed folder — a move can never leave it. */
export const planMoveSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  /** The owner can exclude a move without deleting it from the plan. */
  included: z.boolean(),
  /** The approved category it was sorted into, once classification exists. */
  category: z.string().nullable(),
  /** The model's confidence, 0…1; null for moves code decided (duplicates). */
  confidence: z.number().min(0).max(1).nullable(),
  /** A tidier name the model proposed, same extension; null when it had none worth offering. */
  suggestedName: z.string().min(1).nullable(),
  /** The owner ticked the suggested name: `toPath` then ends in it. Off unless ticked. */
  rename: z.boolean(),
  /** A whole project folder moving as one (kept whole — never scattered file by file). */
  isFolder: z.boolean(),
  status: moveStatusSchema,
  /** Why the last attempt at this move (or its undo) failed. */
  error: z.string().nullable(),
});
export type PlanMove = z.infer<typeof planMoveSchema>;

export const newPlanMoveSchema = planMoveSchema
  .pick({ fromPath: true, toPath: true, category: true, confidence: true })
  .extend({ suggestedName: planMoveSchema.shape.suggestedName.optional(), isFolder: z.boolean().optional() });
export type NewPlanMove = z.infer<typeof newPlanMoveSchema>;

/** Payload of the worker jobs that apply or undo a plan (`organiser/apply-plan`, `organiser/undo-plan`). */
export const planJobPayloadSchema = z.object({ planId: z.string().min(1) });
export type PlanJobPayload = z.infer<typeof planJobPayloadSchema>;

/** Payload of the `organiser/build-plan` job. */
export const buildPlanPayloadSchema = z.object({ folderId: z.string().min(1) });
