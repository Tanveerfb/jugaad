"use client";

import { useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import TaskItem from "./TaskItem";

type TaskGroupProps = {
  dir: string;
  tasks: Task[];
  activeTaskId: string | null;
  onRetry: (taskId: string) => void;
};

function deriveGroupStatus(tasks: Task[]): TaskStatus {
  if (tasks.some((t) => t.status === "running")) return "running";
  if (tasks.every((t) => t.status === "done")) return "done";
  if (tasks.some((t) => t.status === "error")) return "error";
  return "pending";
}

export default function TaskGroup({
  dir,
  tasks,
  activeTaskId,
  onRetry,
}: TaskGroupProps) {
  const status = deriveGroupStatus(tasks);
  const isAnyActive = tasks.some((t) => t.id === activeTaskId);
  const hasError = tasks.some((t) => t.status === "error");
  const doneCount = tasks.filter((t) => t.status === "done").length;

  // Start collapsed; auto-expand when a child is running or has an error
  const [collapsed, setCollapsed] = useState(true);
  const open = isAnyActive || hasError ? true : !collapsed;

  const label = dir.split("/").pop() ?? dir;

  return (
    <div
      className={cn(
        "border-b border-border",
        isAnyActive && "border-l-2 border-l-primary",
      )}
    >
      {/* Group header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30",
          isAnyActive && "bg-primary/5",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150",
            open && "rotate-90",
          )}
        />
        <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{label}/</p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {dir}/
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {doneCount}/{tasks.length}
          </span>
          <StatusBadge status={status} />
        </div>
      </button>

      {/* Collapsible task list */}
      {open && (
        <div className="divide-y divide-border/60 bg-muted/10 pl-4">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isActive={task.id === activeTaskId}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
