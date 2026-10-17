"use client";

import { freeVram } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

/**
 * "Free 8.0 GB": unloads the models Jugaad loaded (owner's choice, 2026-10-17 — other apps'
 * models stay). Disabled while a job holds a model, or when Jugaad has nothing loaded.
 */
export function FreeVramButton({ gb, busy, size = "sm" }: { gb: number; busy: boolean; size?: "sm" | "default" }) {
  const { pending, run } = useServerAction();
  return (
    <Button size={size} disabled={busy || gb === 0} loading={pending} onClick={() => run(freeVram)}>
      {gb === 0 ? "Nothing to free" : `Free ${gb.toFixed(1)} GB`}
    </Button>
  );
}
