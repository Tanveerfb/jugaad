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
): Promise<string> {
  const target = `${config.baseUrl}/v1/chat/completions`;
  const { url, headers } = resolveRequest(target, {
    "Content-Type": "application/json",
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: messages.map(({ role, content }) => ({ role, content })),
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: true,
      }),
    });
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

  const reader = response.body?.getReader();
  if (!reader) {
    throw new LLMConnectionError("Response body is not readable.");
  }

  const decoder = new TextDecoder();
  let fullResponse = "";

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
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          onChunk(delta);
        }
      } catch {
        // Malformed SSE line — skip
      }
    }
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
