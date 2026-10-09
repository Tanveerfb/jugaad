import { serverEnv } from "@/lib/env";
import type { AiProviderName } from "./types";

/**
 * Task → provider and model, in one place (project-rules §AI). Phase 0 reads environment
 * variables; when the settings store exists (phase 1) the owner's in-app choice overrides
 * them (spec: "chosen in settings").
 */
export type TaskModel = {
  provider: AiProviderName;
  baseURL: string;
  modelId: string;
  /** Output cap for the task — cost and latency are design constraints even locally. */
  maxOutputTokens: number;
  /** Abort a call that runs longer than this. */
  timeoutMs: number;
  /**
   * Reasoning ("thinking") budget. Narrow tasks turn it off: on CPU a reasoning trace alone
   * outran a 110 s timeout, while the bare answer takes seconds (measured 2026-10-08).
   */
  reasoning: "none" | "low" | "medium";
};

export type AiTask = "classifyFile";

const CAPS: Record<AiTask, Pick<TaskModel, "maxOutputTokens" | "timeoutMs" | "reasoning">> = {
  // one category, one file name and a number: a small answer and no reasoning trace
  classifyFile: { maxOutputTokens: 256, timeoutMs: 60_000, reasoning: "none" },
};

/**
 * Default model per task, named as `ollama list` shows it. Gemma 4 12B QAT: correct on the
 * live check and fully on the 16 GB GPU at 32k context — 7.5 GB, ~1 s a file (decisions.md,
 * 2026-10-09). `gemma4:e4b-it-qat` is the lighter fallback, set via JUGAAD_CLASSIFY_MODEL.
 */
const DEFAULT_MODELS: Record<AiTask, string> = {
  classifyFile: "gemma4:12b-it-qat",
};

/** Resolves the model for a task from the environment. Null when running on the mock. */
export function modelFor(task: AiTask): TaskModel | null {
  const provider = serverEnv.JUGAAD_AI_PROVIDER;
  if (provider === "mock") return null;
  return {
    provider,
    baseURL: serverEnv.JUGAAD_OLLAMA_URL,
    modelId: serverEnv.JUGAAD_CLASSIFY_MODEL ?? DEFAULT_MODELS[task],
    ...CAPS[task],
  };
}
