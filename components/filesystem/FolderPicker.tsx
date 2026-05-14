"use client";

import { openBaseFolder } from "@/lib/fs/handle";
import { useFsStore } from "@/stores/fsStore";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import appConfig from "@/app.config";

export default function FolderPicker() {
  const baseFolderName = useFsStore((s) => s.baseFolderName);

  async function handlePick() {
    await openBaseFolder();
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">
          {baseFolderName
            ? `Connected: ${baseFolderName}`
            : "Choose output folder"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {appConfig.name} will write generated files here.
        </p>
      </div>
      <Button onClick={handlePick} size="sm">
        <FolderOpen className="h-4 w-4 mr-2" />
        {baseFolderName ? "Change folder" : "Select folder"}
      </Button>
    </div>
  );
}
