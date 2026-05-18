"use client";

import { useTaskStore } from "@/stores/taskStore";
import { useFsStore } from "@/stores/fsStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { executeAll } from "@/lib/executor/taskExecutor";
import TaskBoard from "@/components/tasks/TaskBoard";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { toast } from "sonner";
import FolderPicker from "@/components/filesystem/FolderPicker";

export default function ProjectPage() {
  const tasks = useTaskStore();
  const projectPath = useFsStore((s) => s.projectPath);
  const llmConfig = useLLMConfigStore();

  async function handleStart() {
    if (!projectPath) {
      toast.error("Select an output folder first.");
      return;
    }
    try {
      await executeAll(tasks.tasks, projectPath, llmConfig);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (!projectPath) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <FolderPicker />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold">Project Workspace</p>
        {!tasks.isExecuting && tasks.tasks.length > 0 && (
          <Button size="sm" onClick={handleStart}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Start Building
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <TaskBoard />
      </div>
    </div>
  );
}
