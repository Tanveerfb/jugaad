"use client";

import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { Cpu } from "lucide-react";

export default function ProviderBadge() {
  const provider = useLLMConfigStore((s) => s.provider);
  const model = useLLMConfigStore((s) => s.model);

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      <Cpu className="h-3 w-3" />
      <span>{provider === "ollama" ? "Ollama" : "LM Studio"}</span>
      <span className="text-foreground/60">·</span>
      <span className="font-mono">{model}</span>
    </div>
  );
}
