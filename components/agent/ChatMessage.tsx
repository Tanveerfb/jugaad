"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types";

type ChatMessageProps = {
  message: ConversationMessage;
};

// Strip internal LLM format tags (<plan>…</plan>, <tasks>…</tasks>) that
// should never be shown raw in the chat bubble.
function sanitizeContent(content: string): string {
  return content
    .replace(/<plan>[\s\S]*?<\/plan>/g, "")
    .replace(/<tasks>[\s\S]*?<\/tasks>/g, "")
    .trim();
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const content = isUser ? message.content : sanitizeContent(message.content);

  // Don't render an empty bubble (e.g. when the entire message was a <plan> block)
  if (!content) return null;

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm",
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            code: ({ children }) => (
              <code className="text-xs bg-black/20 rounded px-1 py-px font-mono">
                {children}
              </code>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-0.5 mb-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-0.5 mb-1">
                {children}
              </ol>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
