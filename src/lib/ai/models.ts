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

/** Resolves the model for a task from the environment. Null when running on the mock. */
export function modelFor(task: AiTask): TaskModel | null {
  const provider = serverEnv.JUGAAD_AI_PROVIDER;
  if (provider === "mock" || !serverEnv.JUGAAD_CLASSIFY_MODEL) return null;
  return {
    provider,
    baseURL: provider === "lmstudio" ? serverEnv.JUGAAD_LMSTUDIO_URL : serverEnv.JUGAAD_OLLAMA_URL,
    modelId: serverEnv.JUGAAD_CLASSIFY_MODEL,
    ...CAPS[task],
  };
}
