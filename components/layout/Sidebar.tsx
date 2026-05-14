"use client";

import FileTree from "@/components/filesystem/FileTree";
import FolderPicker from "@/components/filesystem/FolderPicker";
import { useFsStore } from "@/stores/fsStore";
import Link from "next/link";
import { Settings } from "lucide-react";

export default function Sidebar() {
  const baseFolderHandle = useFsStore((s) => s.baseFolderHandle);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Files
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {baseFolderHandle ? <FileTree /> : <FolderPicker />}
      </div>
      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
