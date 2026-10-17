"use client";

import { useId } from "react";
import { setIncludeSubfolders } from "@/app/organiser/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "@/hooks/use-server-action";

/**
 * The folder's "Include subfolders" tick (owner's choice, 2026-10-17: one choice on the folder,
 * which suggestions and plans both follow). Unticked, only the folder's own files are sorted.
 */
export function SubfolderToggle({ folderId, include, busy }: { folderId: string; include: boolean; busy: boolean }) {
  const { pending, run } = useServerAction();
  const tickId = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={tickId} className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
        <Checkbox
          id={tickId}
          checked={include}
          disabled={busy || pending}
          onCheckedChange={(v) => run(() => setIncludeSubfolders(folderId, v === true))}
        />
        Include subfolders
      </label>
      <p className="m-0 text-[13px] text-muted-foreground">
        {include
          ? "Files in subfolders are sorted too, except those already in a category folder."
          : "Only the files sitting directly in this folder are sorted."}{" "}
        Suggest categories again after changing this.
      </p>
    </div>
  );
}
