"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types";

type ChatMessageProps = {
  message: ConversationMessage;
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? "U" : "AI"}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm",
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="prose prose-sm dark:prose-invert max-w-none"
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
