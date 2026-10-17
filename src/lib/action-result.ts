/** What every server action returns: done, or a message saying what went wrong (project-rules §FORMS). */
export type ActionResult = { ok: true } | { ok: false; error: string };
