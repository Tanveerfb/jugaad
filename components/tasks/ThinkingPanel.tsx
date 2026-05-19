"use client";

import { useTaskStore } from "@/stores/taskStore";
import { useEffect, useRef } from "react";
import { Code2 } from "lucide-react";

type ThinkingPanelProps = {
  onViewCode: () => void;
};

export default function ThinkingPanel({ onViewCode }: ThinkingPanelProps) {
  const thinkingBuffer = useTaskStore((s) => s.thinkingBuffer);
  const streamBuffer = useTaskStore((s) => s.streamBuffer);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const tasks = useTaskStore((s) => s.tasks);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeTask = tasks.find((t) => t.id === activeTaskId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thinkingBuffer, streamBuffer]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <p className="text-xs font-mono text-muted-foreground truncate">
            {activeTask ? activeTask.filePath : "LLM Output"}
          </p>
        </div>
        <button
          type="button"
          onClick={onViewCode}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/40 transition-colors shrink-0 ml-2"
          title="Switch to file preview"
        >
          <Code2 className="h-3 w-3" />
          Preview
        </button>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {/* Thinking section */}
        {thinkingBuffer && (
          <div className="mb-3 pb-3 border-b border-border/30">
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-1.5">
              thinking
            </p>
            <pre className="text-amber-400/60 whitespace-pre-wrap break-all">
              {thinkingBuffer}
            </pre>
          </div>
        )}

        {/* Output section */}
        {streamBuffer ? (
          <div>
            {thinkingBuffer && (
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest mb-1.5">
                output
              </p>
            )}
            <pre className="text-green-400 whitespace-pre-wrap break-all">
              {streamBuffer}
            </pre>
          </div>
        ) : (
          !thinkingBuffer && (
            <span className="text-muted-foreground/50 italic">
              Waiting for LLM…
            </span>
          )
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
