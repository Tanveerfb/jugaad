"use client";

import { useState } from "react";
import { useFsStore } from "@/stores/fsStore";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import FolderBrowser from "./FolderBrowser";
import appConfig from "@/app.config";
import { toast } from "sonner";

export default function FolderPicker() {
  const baseFolderName = useFsStore((s) => s.baseFolderName);
  const setProjectPath = useFsStore((s) => s.setProjectPath);
  const [open, setOpen] = useState(false);

  function handleSelect(path: string) {
    setProjectPath(path);
    setOpen(false);
    toast.success(
      `Output folder: ${path.split(/[\\/]/).filter(Boolean).pop()}`,
    );
  }

  return (
    <>
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
        <Button onClick={() => setOpen(true)} size="sm">
          <FolderOpen className="h-4 w-4 mr-2" />
          {baseFolderName ? "Change folder" : "Select folder"}
        </Button>
      </div>

      {open && (
        <FolderBrowser onSelect={handleSelect} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
