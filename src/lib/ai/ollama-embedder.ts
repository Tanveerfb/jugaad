import { normalise } from "@/lib/domain/vectors";
import type { EmbedModel } from "./models";
import { embed } from "./ollama-api";
import { combine, toTaskError } from "./ai-sdk";
import type { WorkbenchAi } from "./types";

/**
 * Embeddings through Ollama's own API rather than the AI SDK: the OpenAI-compatible endpoint
 * can't set a context size, and the app-wide 32k more than doubles the model's VRAM
 * (models.ts). Inputs go in batches; vectors come back unit length.
 */
export function createOllamaEmbedder(model: EmbedModel): Pick<WorkbenchAi, "embedTexts"> {
  return {
    async embedTexts(texts, options) {
      const vectors: number[][] = [];
      try {
        for (let i = 0; i < texts.length; i += model.batchSize) {
          const batch = texts.slice(i, i + model.batchSize).map(model.forGrouping);
          const request = { model: model.modelId, input: [...batch], numCtx: model.numCtx };
          const attempt = () => embed(model.baseURL, request, combine(options?.signal, AbortSignal.timeout(model.timeoutMs)));
          // Ollama can refuse a batch while it swaps models in VRAM (seen on the PC, 2026-10-17):
          // one retry after a pause, then the error stands
          const result = await attempt().catch(async (first: unknown) => {
            if (options?.signal?.aborted) throw first;
            await new Promise((r) => setTimeout(r, 1500));
            return attempt();
          });
          vectors.push(...result);
        }
      } catch (error) {
        throw toTaskError("embedTexts", error);
      }
      return vectors.map(normalise);
    },
  };
}
