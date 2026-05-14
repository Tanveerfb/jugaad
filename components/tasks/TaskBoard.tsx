"use client";

import { useTaskStore } from "@/stores/taskStore";
import TaskItem from "./TaskItem";

export default function TaskBoard() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const isExecuting = useTaskStore((s) => s.isExecuting);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Tasks</h2>
        <span className="text-xs text-muted-foreground">
          {tasks.filter((t) => t.status === "done").length} / {tasks.length}{" "}
          done
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isActive={task.id === activeTaskId}
          />
        ))}
        {tasks.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No tasks yet. Confirm a plan to generate tasks.
          </p>
        )}
      </div>
      {isExecuting && (
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground animate-pulse">
          Building...
        </div>
      )}
    </div>
  );
}
