import { createAiSdkAi } from "./ai-sdk";
import { createMockAi } from "./mock";
import { embedModel, modelFor } from "./models";
import { createOllamaEmbedder } from "./ollama-embedder";
import type { WorkbenchAi } from "./types";

export type { AiCallOptions, AiProviderName, WorkbenchAi } from "./types";
export { AiTaskError } from "./types";

let active: WorkbenchAi | undefined;

/**
 * The active adapter: the mock unless JUGAAD_AI_PROVIDER names a local server. Server code
 * and the worker only — the model servers are reached from Node, never from the browser
 * (CORS, and the browser has no business talking to them).
 */
export function getAi(): WorkbenchAi {
  if (!active) {
    const classify = modelFor("classifyFile");
    const naming = modelFor("nameCategories");
    const seeing = modelFor("describeImage");
    const embedder = embedModel();
    active =
      classify && naming && seeing && embedder
        ? { ...createAiSdkAi(classify, undefined, naming, seeing), ...createOllamaEmbedder(embedder) }
        : createMockAi();
  }
  return active;
}
