import { createAiSdkAi } from "./ai-sdk";
import { createMockAi } from "./mock";
import { modelFor } from "./models";
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
    active = classify ? createAiSdkAi(classify) : createMockAi();
  }
  return active;
}
