"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectPlan } from "@/types";

type Props = {
  project: { plan: ProjectPlan; slug: string };
  onConfirm: (deleteDisk: boolean) => void;
  onCancel: () => void;
};

export default function DeleteProjectDialog({
  project,
  onConfirm,
  onCancel,
}: Props) {
  const [deleteDisk, setDeleteDisk] = useState(false);

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
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-destructive/10 shrink-0">
            <Trash2 className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Delete project?</p>
            <p className="text-xs text-muted-foreground truncate">
              {project.plan.name}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          The project will be removed from Jugaad. Optionally, you can also
          delete all generated files from disk.
        </p>

        {/* Delete from disk checkbox */}
        <label className="flex items-start gap-2.5 mb-5 cursor-pointer select-none group">
          <input
            type="checkbox"
            id="delete-disk"
            checked={deleteDisk}
            onChange={(e) => setDeleteDisk(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded accent-destructive shrink-0"
          />
          <div>
            <span className="text-sm text-foreground group-hover:text-foreground">
              Also delete files from disk
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes the{" "}
              <code className="font-mono bg-muted px-1 rounded">
                {project.slug}/
              </code>{" "}
              folder. This cannot be undone.
            </p>
          </div>
        </label>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onConfirm(deleteDisk)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {deleteDisk ? "Delete & Remove Files" : "Remove from Jugaad"}
          </Button>
        </div>
      </div>
    </div>
  );
}
