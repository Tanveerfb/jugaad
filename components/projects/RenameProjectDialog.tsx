"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectPlan } from "@/types";

type Props = {
  project: { plan: ProjectPlan };
  onConfirm: (newName: string) => void;
  onCancel: () => void;
};

export default function RenameProjectDialog({
  project,
  onConfirm,
  onCancel,
}: Props) {
  const [name, setName] = useState(project.plan.name);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === project.plan.name) {
      onCancel();
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-xl p-5 w-95 max-w-[calc(100vw-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted shrink-0">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">Rename project</p>
            <p className="text-xs text-muted-foreground">
              The folder on disk will also be renamed.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="rename-input"
              className="block text-xs text-muted-foreground mb-1.5"
            >
              Project name
            </label>
            <input
              id="rename-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Rename
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
