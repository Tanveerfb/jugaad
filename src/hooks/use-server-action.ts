"use client";

import { useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { toast } from "@/stores/toast-store";

/**
 * Runs a server action from a button or a tick box: `pending` while it runs, and a failure
 * shown as a toast saying what went wrong — nothing fails silently (project-rules §FORMS).
 */
export function useServerAction(): { pending: boolean; run: (action: () => Promise<ActionResult>) => void } {
  const [pending, start] = useTransition();
  return {
    pending,
    run: (action) =>
      start(async () => {
        const result = await action().catch(() => ({ ok: false as const, error: "Jugaad couldn't reach its server. Is it running?" }));
        if (!result.ok) toast({ title: "Not done", description: result.error, tone: "error" });
      }),
  };
}
