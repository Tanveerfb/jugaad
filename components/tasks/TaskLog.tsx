"use client";

import { useTaskStore } from "@/stores/taskStore";
import { useRef, useEffect } from "react";

export default function TaskLog() {
  const streamBuffer = useTaskStore((s) => s.streamBuffer);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamBuffer]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {activeTask && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <p className="text-xs text-muted-foreground font-mono">
            {activeTask.filePath}
          </p>
        </div>
      )}
      <pre className="flex-1 overflow-y-auto p-4 text-xs font-mono text-green-400 whitespace-pre-wrap break-all leading-relaxed">
        {streamBuffer || (
          <span className="text-muted-foreground">Waiting for output...</span>
        )}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
