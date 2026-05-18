"use client";

import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { fetchModels } from "@/lib/llm/client";
import { useEffect, useState } from "react";
import { ChevronDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModelSwitcher() {
  const model = useLLMConfigStore((s) => s.model);
  const baseUrl = useLLMConfigStore((s) => s.baseUrl);
  const setModel = useLLMConfigStore((s) => s.setModel);

  const [models, setModels] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadModels() {
    setLoading(true);
    try {
      const ids = await fetchModels({ baseUrl });
      setModels(ids);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    if (!open) loadModels();
    setOpen((v) => !v);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const el = document.getElementById("model-switcher-root");
      if (!el?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const shortModel = model.split("/").pop() ?? model;

  return (
    <div id="model-switcher-root" className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono",
          "bg-muted/50 hover:bg-muted border border-border/50 transition-colors",
          "max-w-40 truncate",
        )}
        title={model}
      >
        <Cpu className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{shortModel}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-border bg-popover shadow-lg py-1">
          {loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Loading models…
            </p>
          )}
          {!loading && models.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No models found
            </p>
          )}
          {models.map((m) => (
            <button
              key={m}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-mono truncate",
                "hover:bg-muted transition-colors",
                m === model && "text-primary font-semibold",
              )}
              onClick={() => {
                setModel(m);
                setOpen(false);
              }}
            >
              {m}
            </button>
          ))}
          <div className="border-t border-border mt-1 px-3 py-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/70">
                Recommended:
              </span>{" "}
              9B+ or MoE models for best code quality.
              <br />
              e.g. Gemma 4, Qwen3, Mistral, DeepSeek-Coder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
