"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { sendMessage } from "@/lib/planner/planAgent";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import type { ConversationMessage } from "@/types";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = useProjectPlanStore((s) => s.conversation);
  const addMessage = useProjectPlanStore((s) => s.addMessage);
  const setPlan = useProjectPlanStore((s) => s.setPlan);
  const isPlanning = useProjectPlanStore((s) => s.isPlanning);
  const setIsPlanning = useProjectPlanStore((s) => s.setIsPlanning);
  const plan = useProjectPlanStore((s) => s.plan);
  const llmConfig = useLLMConfigStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, streamingContent]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isPlanning) return;
    setInput("");
    setIsPlanning(true);

    const userMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    setStreamingContent("");
    try {
      const { response, extractedPlan } = await sendMessage(
        text,
        conversation,
        plan?.stack ?? {
          selected: [
            "nextjs",
            "typescript",
            "tailwind",
            "shadcn",
            "zod",
            "rhf",
          ],
        },
        llmConfig,
        (chunk) => setStreamingContent((prev) => prev + chunk),
      );

      const assistantMsg: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };
      addMessage(assistantMsg);
      if (extractedPlan) setPlan(extractedPlan);
    } finally {
      setStreamingContent("");
      setIsPlanning(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {streamingContent && (
          <ChatMessage
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent,
              timestamp: 0,
            }}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your app idea..."
            rows={2}
            disabled={isPlanning}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={isPlanning || !input.trim()}
            size="icon"
          >
            {isPlanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
