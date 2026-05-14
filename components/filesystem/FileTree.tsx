"use client";

import { useFsStore } from "@/stores/fsStore";
import { useTaskStore } from "@/stores/taskStore";
import { readFile } from "@/lib/fs/writer";
import StatusBadge from "@/components/shared/StatusBadge";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/types";

type NodeProps = {
  node: FileTreeNode;
  depth: number;
};

function FileNode({ node, depth }: NodeProps) {
  const [open, setOpen] = useState(true);
  const tasks = useTaskStore((s) => s.tasks);
  const projectHandle = useFsStore((s) => s.projectHandle);
  const selectFile = useFsStore((s) => s.selectFile);
  const selectedFilePath = useFsStore((s) => s.selectedFilePath);

  const taskForFile = tasks.find((t) => t.filePath === node.path);

  async function handleFileClick() {
    if (!projectHandle) return;
    const content = await readFile(projectHandle, node.path);
    selectFile(node.path, content);
  }

  if (node.type === "directory") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className="flex items-center gap-1.5 w-full py-1 text-sm hover:bg-muted/50 text-muted-foreground"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <Folder className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileNode key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFileClick}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      className={cn(
        "flex items-center gap-1.5 w-full py-1 pr-2 text-sm hover:bg-muted/50",
        selectedFilePath === node.path && "bg-muted text-foreground",
      )}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate flex-1 text-left">{node.name}</span>
      {taskForFile && (
        <StatusBadge status={taskForFile.status} className="shrink-0" />
      )}
    </button>
  );
}

export default function FileTree() {
  const fileTree = useFsStore((s) => s.fileTree);

  if (fileTree.length === 0) {
    return <p className="p-4 text-xs text-muted-foreground">No files yet.</p>;
  }

  return (
    <div className="py-1">
      {fileTree.map((node) => (
        <FileNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}
