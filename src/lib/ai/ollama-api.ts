import { z } from "zod";

/**
 * Ollama's own API — the parts its OpenAI-compatible one lacks: what is loaded and how much VRAM
 * it holds, unloading, and embeddings with a context size. Used only inside `lib/ai/`.
 * `baseURL` is the OpenAI-compatible one (`…/v1`); the native API sits beside it.
 */

const loadedSchema = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
      size_vram: z.number(),
    }),
  ),
});

const installedSchema = z.object({
  models: z.array(z.object({ name: z.string(), size: z.number() })),
});

const embedSchema = z.object({ embeddings: z.array(z.array(z.number())) });

export type LoadedModel = { name: string; vramBytes: number };

function nativeRoot(baseURL: string): string {
  return baseURL.replace(/\/v1\/?$/, "");
}

async function call<T>(baseURL: string, path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${nativeRoot(baseURL)}${path}`, init);
  if (!response.ok) {
    // Ollama explains a refusal in the body ({"error": "..."}); keep it for the log
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Ollama ${path} answered ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return schema.parse(await response.json());
}

/** Models Ollama has in memory right now, with the VRAM each holds. */
export async function listLoadedModels(baseURL: string, signal?: AbortSignal): Promise<LoadedModel[]> {
  const { models } = await call(baseURL, "/api/ps", loadedSchema, { signal });
  return models.map((m) => ({ name: m.name, vramBytes: m.size_vram }));
}

/** Download sizes of installed models — the fallback when a model's VRAM wasn't measured. */
export async function listInstalledModels(baseURL: string, signal?: AbortSignal): Promise<Map<string, number>> {
  const { models } = await call(baseURL, "/api/tags", installedSchema, { signal });
  return new Map(models.map((m) => [m.name, m.size]));
}

/** Asks Ollama to drop a model from memory now. */
export async function unloadModel(baseURL: string, name: string): Promise<void> {
  await call(baseURL, "/api/generate", z.unknown(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: name, keep_alive: 0 }),
  });
}

/** One embedding per input, in order. */
export async function embed(
  baseURL: string,
  request: { model: string; input: string[]; numCtx: number },
  signal?: AbortSignal,
): Promise<number[][]> {
  const { embeddings } = await call(baseURL, "/api/embed", embedSchema, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: request.model,
      input: request.input,
      truncate: true, // an over-long input is cut, not refused
      options: { num_ctx: request.numCtx },
    }),
    signal,
  });
  if (embeddings.length !== request.input.length) throw new Error("Ollama returned the wrong number of embeddings");
  return embeddings;
}
