"use client";

import { useState } from "react";
import { benchmarkModel, type ModelBenchmarkResult } from "@/lib/llm/benchmark";
import type { LLMConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  Code2,
  Scale,
  AlertTriangle,
} from "lucide-react";

type Props = {
  models: string[];
  baseConfig: LLMConfig;
};

const TAG_META: Record<
  ModelBenchmarkResult["tag"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  planning: {
    label: "Planning",
    icon: <Brain className="h-3 w-3" />,
    className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  coding: {
    label: "Coding",
    icon: <Code2 className="h-3 w-3" />,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  balanced: {
    label: "Balanced",
    icon: <Scale className="h-3 w-3" />,
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  weak: {
    label: "Needs work",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
};

function Tag({ tag }: { tag: ModelBenchmarkResult["tag"] }) {
  const m = TAG_META[tag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border",
        m.className,
      )}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function PassBadge({ pass }: { pass: boolean }) {
  return pass ? (
    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive shrink-0" />
  );
}

function msLabel(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function ResultRow({ result }: { result: ModelBenchmarkResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Model name */}
        <span
          className="font-mono text-xs text-foreground truncate min-w-0 flex-1"
          title={result.model}
        >
          {result.model}
        </span>

        {/* Planning */}
        <div className="flex items-center gap-1.5 w-24 shrink-0">
          <PassBadge pass={result.plan.pass} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {msLabel(result.plan.ms)}
          </span>
        </div>

        {/* Coding */}
        <div className="flex items-center gap-1.5 w-24 shrink-0">
          <PassBadge pass={result.code.pass} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {msLabel(result.code.ms)}
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 w-20 shrink-0 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-amber-400" />
          {result.charsPerSec} c/s
        </div>

        {/* Tag */}
        <div className="w-24 shrink-0">
          <Tag tag={result.tag} />
        </div>

        {/* Expand */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={open ? "Hide output" : "Show output"}
        >
          {open ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Expanded output */}
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {(["plan", "code"] as const).map((task) => {
            const r = result[task];
            return (
              <div key={task}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                  {task === "plan" ? "Planning output" : "Coding output"} —{" "}
                  <span
                    className={r.pass ? "text-green-500" : "text-destructive"}
                  >
                    {r.detail}
                  </span>
                </p>
                <pre className="bg-[#1e1e1e] rounded-lg p-3 text-[11px] font-mono text-green-400 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                  {r.output || "(empty)"}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ModelBenchmark({ models, baseConfig }: Props) {
  const [results, setResults] = useState<ModelBenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    modelIndex: number;
    task: "plan" | "code";
  } | null>(null);

  async function handleRun() {
    setRunning(true);
    setResults([]);
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const result = await benchmarkModel(model, baseConfig, (task) => {
          setProgress({ modelIndex: i, task });
        });
        setResults((prev) => [...prev, result]);
      } catch {
        // If a model fails, record a minimal error result
        setResults((prev) => [
          ...prev,
          {
            model,
            plan: { pass: false, detail: "Error", ms: 0, output: "" },
            code: { pass: false, detail: "Error", ms: 0, output: "" },
            charsPerSec: 0,
            tag: "weak",
          } satisfies ModelBenchmarkResult,
        ]);
      }
    }
    setProgress(null);
    setRunning(false);
  }

  const currentModelName = progress ? models[progress.modelIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Runs two short prompts (planning JSON, coding function) against every
          installed model and scores them on format compliance and speed.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={running || models.length === 0}
          onClick={handleRun}
          className="shrink-0"
        >
          {running ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              Running…
            </>
          ) : (
            "Analyze Models"
          )}
        </Button>
      </div>

      {/* Live progress */}
      {running && currentModelName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>
            [{progress!.modelIndex + 1}/{models.length}]{" "}
            <span className="font-mono">{currentModelName}</span> —{" "}
            {progress!.task === "plan" ? "planning test" : "coding test"}…
          </span>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground/60">
            <span className="flex-1">Model</span>
            <span className="w-24 shrink-0">Planning</span>
            <span className="w-24 shrink-0">Coding</span>
            <span className="w-20 shrink-0">Speed</span>
            <span className="w-24 shrink-0">Best for</span>
            <span className="w-4 shrink-0" />
          </div>
          {results.map((r) => (
            <ResultRow key={r.model} result={r} />
          ))}
        </div>
      )}

      {models.length === 0 && !running && (
        <p className="text-xs text-muted-foreground italic">
          Connect to a provider first to detect installed models.
        </p>
      )}
    </div>
  );
}
