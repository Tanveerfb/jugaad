"use client";

import StatusBadge from "@/components/shared/StatusBadge";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import { Lock, RotateCcw } from "lucide-react";
import { useTaskStore } from "@/stores/taskStore";
import { useFsStore } from "@/stores/fsStore";

type TaskItemProps = {
  task: Task;
  isActive: boolean;
  onRetry?: (taskId: string) => void;
};

export default function TaskItem({ task, isActive, onRetry }: TaskItemProps) {
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask);
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const selectFile = useFsStore((s) => s.selectFile);

  function handleClick() {
    if (task.output) {
      setSelectedTask(task.id);
      selectFile(task.filePath, task.output);
    }
  }

  const isSelected = selectedTaskId === task.id;
  const canRetry = task.status === "error" || task.status === "done";
  const isExecuting = useTaskStore((s) => s.isExecuting);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors",
        isActive && "bg-primary/5 border-l-2 border-primary",
        !isActive && isSelected && "bg-muted/50",
        task.output && !isActive && "cursor-pointer hover:bg-muted/30",
        task.isSystem && "bg-muted/20",
      )}
      onClick={handleClick}
      role={task.output ? "button" : undefined}
      tabIndex={task.output ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {task.isSystem && (
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
          {task.filePath}
        </p>
        {task.retryCount > 0 && task.status !== "done" && (
          <p className="text-xs text-yellow-500 mt-0.5">
            Retry {task.retryCount}/3
          </p>
        )}
        {task.error && (
          <p className="text-xs text-red-400 mt-1 line-clamp-2">{task.error}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {canRetry && onRetry && !isExecuting && !task.isSystem && (
          <button
            type="button"
            title="Re-run this task"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(task.id);
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
}
