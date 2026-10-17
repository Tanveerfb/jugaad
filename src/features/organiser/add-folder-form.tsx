"use client";

import { useActionState, useId } from "react";
import { addFolder } from "@/app/organiser/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Paste a folder path to add it (owner's choice: paste, not browse — nothing outside the list
 * is ever listed). A refusal says why, under the field. `compact` is the rail's version.
 */
export function AddFolderForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(addFolder, null);
  const fieldId = useId();
  const errorId = useId();
  const error = state?.error ?? null;

  return (
    <form action={action} className={cn("grid gap-2.5", compact ? "grid-cols-[minmax(0,1fr)_auto] items-start" : "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end")}>
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor={fieldId} className={cn("text-[12.5px] font-semibold text-muted-foreground", compact && "sr-only")}>
          Folder path
        </label>
        <Input
          id={fieldId}
          name="path"
          placeholder={compact ? "Paste a folder path" : "E:\\Downloads"}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          defaultValue={state?.path}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} role="alert" className="m-0 text-[13px] text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size={compact ? "sm" : "default"} variant={compact ? "secondary" : "default"} loading={pending} className={cn(compact && "mt-1")}>
        {compact ? "Add" : "Add folder"}
      </Button>
    </form>
  );
}
