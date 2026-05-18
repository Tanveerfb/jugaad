"use client";

import { useTaskStore } from "@/stores/taskStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { useFsStore } from "@/stores/fsStore";
import TaskItem from "./TaskItem";
import { executeSingleTask } from "@/lib/executor/taskExecutor";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function useElapsed(
  startedAt: number | null,
  finishedAt: number | null,
  isExecuting: boolean,
) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || !isExecuting) {
      if (startedAt && finishedAt) {
        setElapsed(Math.floor((finishedAt - startedAt) / 1000));
      }
      return;
    }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, finishedAt, isExecuting]);

  return elapsed;
}

function formatElapsed(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function TaskBoard() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const isExecuting = useTaskStore((s) => s.isExecuting);
  const buildStartedAt = useTaskStore((s) => s.buildStartedAt);
  const buildFinishedAt = useTaskStore((s) => s.buildFinishedAt);
  const projectPath = useFsStore((s) => s.activeProjectPath ?? s.projectPath);
  const llmConfig = useLLMConfigStore();

  const elapsed = useElapsed(buildStartedAt, buildFinishedAt, isExecuting);
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

  async function handleRetry(taskId: string) {
    if (!projectPath) {
      toast.error("No project folder selected.");
      return;
    }
    try {
      await executeSingleTask(taskId, projectPath, llmConfig);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Tasks</h2>
        <div className="flex items-center gap-3">
          {(buildStartedAt || isExecuting) && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatElapsed(elapsed)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {doneCount} / {tasks.length} done
            {errorCount > 0 && (
              <span className="text-red-400 ml-1">
                · {errorCount} error{errorCount > 1 ? "s" : ""}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isActive={task.id === activeTaskId}
            onRetry={handleRetry}
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
          Building…
        </div>
      )}
    </div>
  );
}
