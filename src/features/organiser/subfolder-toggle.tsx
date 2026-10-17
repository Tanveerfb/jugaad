"use client";

import { useId } from "react";
import { setIncludeSubfolders } from "@/app/organiser/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { WarnNote } from "@/components/warn-note";
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
      {include ? (
        // with subfolders included, an existing folder of the owner's is only safe if it is
        // ticked as a category — said here, where the choice is made (settings round 1)
        <WarnNote>
          <b>Your subfolders&apos; files will be sorted too.</b> A folder of yours stays as it is only if you tick it as
          a category. You&apos;ll see each one on the categories list before anything moves. Suggest categories again
          after changing this.
        </WarnNote>
      ) : (
        <p className="m-0 text-[13px] text-muted-foreground">
          Only the files sitting directly in this folder are sorted. Suggest categories again after changing this.
        </p>
      )}
    </div>
  );
}
