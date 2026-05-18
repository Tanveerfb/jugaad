"use client";

import { useTaskStore } from "@/stores/taskStore";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function StreamPanel() {
  const streamBuffer = useTaskStore((s) => s.streamBuffer);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamBuffer]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 shrink-0">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <p className="text-xs font-mono text-muted-foreground truncate">
          {activeTask
            ? `Generating ${activeTask.filePath}…`
            : "Streaming output…"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-400 leading-relaxed whitespace-pre-wrap break-all">
        {streamBuffer || (
          <span className="text-muted-foreground">Waiting for LLM…</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
