import { createAiSdkAi } from "./ai-sdk";
import { createMockAi } from "./mock";
import { embedModel, modelFor } from "./models";
import { createOllamaEmbedder } from "./ollama-embedder";
import type { WorkbenchAi } from "./types";
import type { ModelChoices } from "@/schemas/settings-schema";

export type { AiCallOptions, AiProviderName, WorkbenchAi } from "./types";
export { AiTaskError } from "./types";

const built = new Map<string, WorkbenchAi>();

/**
 * The adapter for the owner's model choices: the mock unless JUGAAD_AI_PROVIDER names a local
 * server. Built once per set of choices, so a job started after a settings change uses the new
 * models without a restart. Server code and the worker only — the model servers are reached
 * from Node, never from the browser (CORS, and the browser has no business talking to them).
 */
export function getAi(choices: ModelChoices = {}): WorkbenchAi {
  const key = JSON.stringify(choices);
  let ai = built.get(key);
  if (!ai) {
    const classify = modelFor("classifyFile", choices);
    const naming = modelFor("nameCategories", choices);
    // with images turned off the adapter still needs a seeing model; jobs simply never call it
    const seeing = modelFor("describeImage", choices) ?? classify;
    const embedder = embedModel(choices);
    ai =
      classify && naming && seeing && embedder
        ? { ...createAiSdkAi(classify, undefined, naming, seeing), ...createOllamaEmbedder(embedder) }
        : createMockAi();
    built.set(key, ai);
  }
  return ai;
}
