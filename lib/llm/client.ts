import type { ConversationMessage, LLMConfig } from "@/types";

export class LLMConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConnectionError";
  }
}

/**
 * When called from the browser, any request to a different origin (e.g.
 * LM Studio on :1234 from the app on :9999) is blocked by CORS.
 * Route those through the Next.js server-side proxy instead.
 * Server-side calls (e.g. task generator) hit the target directly.
 */
function resolveRequest(
  target: string,
  baseHeaders: Record<string, string>,
): { url: string; headers: Record<string, string> } {
  if (
    typeof window !== "undefined" &&
    new URL(target).origin !== window.location.origin
  ) {
    return {
      url: "/api/lm-proxy",
      headers: { ...baseHeaders, "x-proxy-target": target },
    };
  }
  return { url: target, headers: baseHeaders };
}

export async function streamChat(
  messages: ConversationMessage[],
  config: LLMConfig,
  onChunk: (chunk: string) => void,
  maxTokensOverride?: number,
  onThinkingChunk?: (chunk: string) => void,
  /** Cap thinking tokens for Qwen3-style reasoning models (0 = disable thinking). */
  thinkingBudget?: number,
  /**
   * Stall timeout in ms. If no OUTPUT tokens arrive within this window
   * (from request start OR after the last output token), the stream is
   * aborted. Thinking-only tokens do NOT reset the timer, so a model
   * stuck in an infinite thinking loop will be killed after this delay.
   * Defaults to 600 000 ms (10 min). Pass Infinity to disable.
   */
  stallTimeoutMs = 600_000,
): Promise<string> {
  const target = `${config.baseUrl}/v1/chat/completions`;
  const { url, headers } = resolveRequest(target, {
    "Content-Type": "application/json",
  });

  // Build optional thinking-control params (Qwen3 / LM Studio).
  // budget_tokens=0 disables thinking; any positive value caps it.
  const thinkingParams =
    thinkingBudget !== undefined
      ? {
          chat_template_kwargs: { enable_thinking: thinkingBudget > 0 },
          ...(thinkingBudget > 0 && {
            thinking: { type: "enabled", budget_tokens: thinkingBudget },
          }),
        }
      : {};

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        temperature: config.temperature,
        max_tokens: maxTokensOverride ?? config.maxTokens,
        stream: true,
        ...thinkingParams,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new LLMConnectionError(
      `Unable to reach LLM at ${target}. Is your LLM server running? (${msg})`,
    );
  }

  if (!response.ok) {
    throw new LLMConnectionError(
      `LLM server returned ${response.status}: ${response.statusText}`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new LLMConnectionError("Response body is not readable.");
  }

  const decoder = new TextDecoder();
  let fullResponse = "";
  // Track last time we received a real OUTPUT token (not thinking).
  // If no output token arrives within stallTimeoutMs, throw.
  let lastOutputMs = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed?.choices?.[0]?.delta;
          // reasoning_content = internal thinking tokens (e.g. qwen3.5 /think mode).
          // These are routed to onThinkingChunk only — never into fullResponse.
          const thinking = choice?.reasoning_content as string | undefined;
          const delta = choice?.content as string | undefined;
          if (thinking) {
            onThinkingChunk?.(thinking);
            // Thinking tokens do NOT reset the stall timer.
          }
          if (delta) {
            fullResponse += delta;
            onChunk(delta);
            // Real output token — reset the stall clock.
            lastOutputMs = Date.now();
          }
        } catch {
          // Malformed SSE line — skip
        }
      }

      // Check stall AFTER processing each chunk.
      // A model stuck in infinite thinking will keep sending thinking tokens
      // but never emit output tokens, so lastOutputMs won't update.
      if (
        stallTimeoutMs !== Infinity &&
        Date.now() - lastOutputMs > stallTimeoutMs
      ) {
        try {
          reader.cancel();
        } catch {
          /* best-effort */
        }
        throw new LLMConnectionError(
          `LLM stream stalled — no output tokens for ${stallTimeoutMs / 1000}s. ` +
            `The model may be in an infinite thinking loop.`,
        );
      }
    }
  } catch (err) {
    if (err instanceof LLMConnectionError) throw err;
    throw new LLMConnectionError(
      `Stream read error: ${(err as Error).message}`,
    );
  }

  return fullResponse;
}

/**
 * Fetch available model IDs from the OpenAI-compatible /v1/models endpoint.
 * Works with both Ollama and LM Studio.
 */
export async function fetchModels(
  config: Pick<LLMConfig, "baseUrl">,
): Promise<string[]> {
  const target = `${config.baseUrl}/v1/models`;
  const { url, headers } = resolveRequest(target, {});
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", headers });
  } catch {
    throw new LLMConnectionError(
      `Unable to reach LLM at ${target}. Is your LLM server running?`,
    );
  }

  if (!response.ok) {
    throw new LLMConnectionError(
      `LLM server returned ${response.status}: ${response.statusText}`,
    );
  }

  const json = await response.json();
  const models: string[] = (json?.data ?? []).map((m: { id: string }) => m.id);
  return models.sort();
}
