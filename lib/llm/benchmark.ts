/**
 * Lightweight model benchmarking.
 *
 * Runs two short prompts against each model:
 *   1. Planning — asks for structured JSON output (tests instruction-following & format adherence)
 *   2. Coding   — asks for a TypeScript function (tests code generation)
 *
 * Scores are 0-100 based on whether the output meets the expected format,
 * plus a speed bonus.  Recommendation tags are derived from the scores.
 */

import { streamChat } from "./client";
import type { LLMConfig } from "@/types";

/** Token budget per benchmark call — kept small so tests finish fast. */
const BENCHMARK_MAX_TOKENS = 300;

/**
 * /no_think disables the Qwen3 reasoning preamble so we measure actual output
 * speed, not thinking time.  Other models silently ignore it.
 */
const PLAN_PROMPT = `/no_think
Output ONLY a valid JSON object — no markdown fences, no explanation.
Schema: {"name": string, "goal": string, "features": string[]}
App idea: a personal finance tracker with budgets and expense history.`;

const CODE_PROMPT = `/no_think
Output ONLY a TypeScript function — no markdown fences, no explanation.
Write a function named formatCurrency that takes a number and returns it
formatted as a USD string (e.g. "$1,234.56").`;

// ─── scoring helpers ─────────────────────────────────────────────────────────

function scorePlan(raw: string): { pass: boolean; detail: string } {
  const text = raw.trim();
  // Strip possible markdown fences the model sneaked in
  const stripped = text.replace(/```[a-z]*\n?/g, "").trim();
  try {
    const obj = JSON.parse(stripped) as Record<string, unknown>;
    const hasName = typeof obj.name === "string" && obj.name.length > 0;
    const hasGoal = typeof obj.goal === "string" && obj.goal.length > 0;
    const hasFeatures = Array.isArray(obj.features) && obj.features.length >= 2;
    if (hasName && hasFeatures) {
      return {
        pass: true,
        detail: hasGoal
          ? "Valid JSON with all fields"
          : "Valid JSON (missing goal)",
      };
    }
    return { pass: false, detail: "JSON parsed but missing required fields" };
  } catch {
    // Partial credit: contains json-like structure
    if (text.includes("{") && text.includes("}")) {
      return { pass: false, detail: "Malformed JSON" };
    }
    return { pass: false, detail: "No JSON found in output" };
  }
}

function scoreCode(raw: string): { pass: boolean; detail: string } {
  const text = raw
    .trim()
    .replace(/```[a-z]*\n?/g, "")
    .trim();
  const hasFunction =
    text.includes("function formatCurrency") ||
    (text.includes("formatCurrency") && text.includes("=>"));
  const hasReturn = text.includes("return");
  const hasFormat =
    text.includes("toLocaleString") ||
    text.includes("Intl.NumberFormat") ||
    text.includes("toFixed") ||
    text.includes("replace");

  if (hasFunction && hasReturn) {
    return {
      pass: true,
      detail: hasFormat
        ? "Correct function with formatting logic"
        : "Function structure correct",
    };
  }
  if (text.includes("formatCurrency") && hasReturn) {
    return { pass: false, detail: "Partially correct (wrong syntax)" };
  }
  return { pass: false, detail: "Function not found in output" };
}

// ─── public types ─────────────────────────────────────────────────────────────

export type BenchmarkTask = "plan" | "code";

export type TaskResult = {
  pass: boolean;
  detail: string;
  ms: number;
  output: string;
};

export type ModelBenchmarkResult = {
  model: string;
  plan: TaskResult;
  code: TaskResult;
  /** Approximate characters per second averaged across both tasks. */
  charsPerSec: number;
  /** Derived recommendation. */
  tag: "planning" | "coding" | "balanced" | "weak";
};

// ─── core runner ─────────────────────────────────────────────────────────────

async function runTask(
  prompt: string,
  config: LLMConfig,
): Promise<{ output: string; ms: number }> {
  const start = Date.now();
  let output = "";
  await streamChat(
    [{ id: "bm", role: "user", content: prompt, timestamp: start }],
    config,
    (chunk) => {
      output += chunk;
    },
    BENCHMARK_MAX_TOKENS,
  );
  return { output, ms: Date.now() - start };
}

function deriveTag(
  planPass: boolean,
  codePass: boolean,
  planMs: number,
  codeMs: number,
): ModelBenchmarkResult["tag"] {
  if (!planPass && !codePass) return "weak";
  if (planPass && !codePass) return "planning";
  if (!planPass && codePass) return "coding";
  // Both pass — check relative speed
  const planFaster = planMs < codeMs * 0.8;
  const codeFaster = codeMs < planMs * 0.8;
  if (planFaster) return "planning"; // blazes through structured output
  if (codeFaster) return "coding"; // blazes through code
  return "balanced";
}

/**
 * Benchmark a single model.
 * @param onProgress called before each task so the caller can show live status.
 */
export async function benchmarkModel(
  model: string,
  baseConfig: LLMConfig,
  onProgress: (task: BenchmarkTask) => void,
): Promise<ModelBenchmarkResult> {
  const cfg: LLMConfig = { ...baseConfig, model };

  onProgress("plan");
  const planRaw = await runTask(PLAN_PROMPT, cfg);
  const planScore = scorePlan(planRaw.output);

  onProgress("code");
  const codeRaw = await runTask(CODE_PROMPT, cfg);
  const codeScore = scoreCode(codeRaw.output);

  const totalChars = planRaw.output.length + codeRaw.output.length;
  const totalSecs = (planRaw.ms + codeRaw.ms) / 1000;
  const charsPerSec = totalSecs > 0 ? Math.round(totalChars / totalSecs) : 0;

  return {
    model,
    plan: { ...planScore, ms: planRaw.ms, output: planRaw.output },
    code: { ...codeScore, ms: codeRaw.ms, output: codeRaw.output },
    charsPerSec,
    tag: deriveTag(planScore.pass, codeScore.pass, planRaw.ms, codeRaw.ms),
  };
}
