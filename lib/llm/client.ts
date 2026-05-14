import type { ConversationMessage, LLMConfig } from "@/types";

export class LLMConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConnectionError";
  }
}

export async function streamChat(
  messages: ConversationMessage[],
  config: LLMConfig,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const url = `${config.baseUrl}/v1/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      `Unable to reach LLM at ${url}. Is your LLM server running?`,
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
  const url = `${config.baseUrl}/v1/models`;
  let response: Response;
  try {
    response = await fetch(url, { method: "GET" });
  } catch {
    throw new LLMConnectionError(
      `Unable to reach LLM at ${url}. Is your LLM server running?`,
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
