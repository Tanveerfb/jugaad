import { z } from "zod";

/**
 * One disk change, written **before** it happens and closed after (spec: "proposed → approved →
 * journalled → undoable"). An entry left open by a crash is reconciled against the disk on the
 * next start. Append-only: entries are closed, never edited otherwise or removed.
 */
export const journalActionSchema = z.enum(["move", "undo", "make-folder", "remove-empty-folder"]);
export type JournalAction = z.infer<typeof journalActionSchema>;

/** How a file actually travelled: a rename on the same drive, or copy-verify-remove across drives. */
export const moveMethodSchema = z.enum(["rename", "copy"]);
export type MoveMethod = z.infer<typeof moveMethodSchema>;

export const journalOutcomeSchema = z.enum(["done", "failed"]);
export type JournalOutcome = z.infer<typeof journalOutcomeSchema>;

export const journalEntrySchema = z.object({
  id: z.number().int(),
  planId: z.string().min(1),
  moveId: z.string().nullable(),
  action: journalActionSchema,
  /** Absolute paths, as they were at the time. */
  fromPath: z.string().nullable(),
  toPath: z.string(),
  method: moveMethodSchema.nullable(),
  /** Size and modified time of the file as it landed — undo refuses a file changed since. */
  size: z.number().int().nullable(),
  modifiedMs: z.number().nullable(),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  /** Null while open: the change was started and not yet confirmed. */
  outcome: journalOutcomeSchema.nullable(),
  error: z.string().nullable(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const newJournalEntrySchema = journalEntrySchema.pick({
  planId: true,
  moveId: true,
  action: true,
  fromPath: true,
  toPath: true,
});
export type NewJournalEntry = z.infer<typeof newJournalEntrySchema>;
