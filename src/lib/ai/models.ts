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

export type AiTask = "classifyFile" | "nameCategories" | "describeImage";

const CAPS: Record<AiTask, Pick<TaskModel, "maxOutputTokens" | "timeoutMs" | "reasoning">> = {
  // one category, one file name and a number: a small answer and no reasoning trace
  classifyFile: { maxOutputTokens: 256, timeoutMs: 60_000, reasoning: "none" },
  // up to 16 names of one to three words
  nameCategories: { maxOutputTokens: 400, timeoutMs: 90_000, reasoning: "none" },
  // one line of at most 15 words; ~1 s an image warm on the PC
  describeImage: { maxOutputTokens: 60, timeoutMs: 60_000, reasoning: "none" },
};

/**
 * Default model per task, named as `ollama list` shows it. Gemma 4 12B QAT: 48 of 48 right on
 * the sample folder, fully on the 16 GB GPU at 32k context — 8.0 GB, ~1 s a file. The lighter
 * `gemma4:e4b-it-qat` scored 44 of 48, calling screenshots photos at 0.9 confidence
 * (decisions.md, 2026-10-17); it stays available through JUGAAD_CLASSIFY_MODEL.
 */
const DEFAULT_MODELS: Record<AiTask, string> = {
  classifyFile: "gemma4:12b-it-qat",
  // the same model as classification, so naming and sorting never swap models on the GPU
  nameCategories: "gemma4:12b-it-qat",
  // the 12B has vision built in: seeing images needs no second model
  describeImage: "gemma4:12b-it-qat",
};

/** An embedding model: Ollama's own `/api/embed`, which — unlike its OpenAI-compatible API — takes a context size. */
export type EmbedModel = {
  baseURL: string;
  modelId: string;
  /**
   * Context per input. Ollama's app-wide 32k applies to embedding models too, and made
   * `qwen3-embedding:0.6b` take 5.78 GB of VRAM; inputs here are a file name and at most 1,500
   * characters, and at 4,096 it takes 2.37 GB, ~80 ms a file in batches (measured 2026-10-17).
   */
  numCtx: number;
  /** Inputs per request. */
  batchSize: number;
  timeoutMs: number;
  /** Wraps each text the way this model expects when the goal is grouping files. */
  forGrouping: (text: string) => string;
};

/**
 * How each embedding family is told the texts are for grouping. On the sample folder the
 * instruction took `qwen3-embedding` from 71% to 98% of files grouped correctly (decisions.md,
 * 2026-10-17). Keyed by the name before the `:` tag.
 */
const GROUPING_PREFIX: Readonly<Record<string, (text: string) => string>> = {
  "qwen3-embedding": (t) => `Instruct: Identify what kind of personal file this is and what it is for\nQuery: ${t}`,
  "nomic-embed-text": (t) => `clustering: ${t}`,
};

/** `qwen3-embedding:0.6b`: installed, multilingual, 1,024 dimensions; `nomic-embed-text` is the fallback. */
const DEFAULT_EMBED_MODEL = "qwen3-embedding:0.6b";

/** The embedding model from the environment. Null when running on the mock. */
export function embedModel(): EmbedModel | null {
  if (serverEnv.JUGAAD_AI_PROVIDER === "mock") return null;
  const modelId = serverEnv.JUGAAD_EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
  return {
    baseURL: serverEnv.JUGAAD_OLLAMA_URL,
    modelId,
    numCtx: 4096,
    batchSize: 32,
    timeoutMs: 120_000,
    forGrouping: groupingPrefix(modelId),
  };
}

/** The grouping wrapper for a model, or the bare text for a family without one. */
export function groupingPrefix(modelId: string): (text: string) => string {
  return GROUPING_PREFIX[modelId.split(":")[0]] ?? ((t) => t);
}

/**
 * VRAM each model takes once loaded, in GB, measured on the PC 2026-10-17 (RTX 5060 Ti, Ollama 0.34.2,
 * 32k context for chat models, 4k for embeddings). The model manager plans with these; a model
 * not listed is estimated from its download size.
 */
export const MEASURED_VRAM_GB: Readonly<Record<string, number>> = {
  "gemma4:12b-it-qat": 8.02,
  "gemma4:e4b-it-qat": 3.28,
  "qwen3-embedding:0.6b": 2.37,
};

/**
 * Resolves the model for a task from the environment. Null when running on the mock.
 * JUGAAD_CLASSIFY_MODEL overrides naming too: both are chat tasks on one model, so the GPU
 * never swaps between them.
 */
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
