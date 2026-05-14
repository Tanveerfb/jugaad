import { useState, useCallback } from "react";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { streamChat } from "@/lib/llm/client";
import type { ConversationMessage } from "@/types";

export function useLLMStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [buffer, setBuffer] = useState("");
  const config = useLLMConfigStore();

  const stream = useCallback(
    async (
      messages: ConversationMessage[],
      onChunk?: (chunk: string) => void,
    ): Promise<string> => {
      setIsStreaming(true);
      setBuffer("");
      try {
        const full = await streamChat(messages, config, (chunk) => {
          setBuffer((prev) => prev + chunk);
          onChunk?.(chunk);
        });
        return full;
      } finally {
        setIsStreaming(false);
        setBuffer("");
      }
    },
    [config],
  );

  return { stream, isStreaming, buffer };
}
