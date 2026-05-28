"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import ChatMessage from "@/components/agent/ChatMessage";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { useFsStore } from "@/stores/fsStore";
import { useDevServerStore } from "@/stores/devServerStore";
import { useTaskStore } from "@/stores/taskStore";
import { streamChat } from "@/lib/llm/client";
import {
  buildIterateSystemPrompt,
  buildAddFeaturesPrompt,
} from "@/lib/llm/prompts";
import { Button } from "@/components/ui/button";
import {
  Send,
  Loader2,
  Pencil,
  ExternalLink,
  Sparkles,
  Plus,
  CheckCircle2,
  Globe,
} from "lucide-react";
import type { ConversationMessage, Task } from "@/types";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Tab = "iterate" | "add-features";

type FileEdit = { path: string; content: string };

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  filePath: z.string(),
  instruction: z.string(),
  dependsOn: z.array(z.string()),
  docsContext: z.string(),
  status: z.enum(["pending", "running", "done", "error"]),
  retryCount: z.number(),
});

function extractFileEdits(text: string): FileEdit[] {
  const edits: FileEdit[] = [];
  const re = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
  for (const m of text.matchAll(re)) {
    edits.push({ path: m[1].trim(), content: m[2].trim() });
  }
  return edits;
}

function stripFileTags(text: string): string {
  return text.replace(/<file\s+path="[^"]+">[\s\S]*?<\/file>/g, "").trim();
}

function extractNewTasks(response: string): Task[] {
  const match = response.match(/<tasks>([\s\S]*?)<\/tasks>/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    return z.array(TaskSchema).parse(parsed) as Task[];
  } catch {
    return [];
  }
}

export default function IterateInterface() {
  const [tab, setTab] = useState<Tab>("iterate");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Add Features state
  const [featureInput, setFeatureInput] = useState("");
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [generationStatus, setGenerationStatus] = useState("");
  const [livePageContext, setLivePageContext] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const plan = useProjectPlanStore((s) => s.plan);
  const llmConfig = useLLMConfigStore();
  const projectPath = useFsStore((s) => s.activeProjectPath ?? s.projectPath);
  const devUrl = useDevServerStore((s) => s.url);
  const setShowPreview = useDevServerStore((s) => s.setShowPreview);
  const existingTasks = useTaskStore((s) => s.tasks);
  const appendTasks = useTaskStore((s) => s.appendTasks);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function getLogs(): Promise<string | null> {
    if (!projectPath) return null;
    try {
      const res = await fetch(
        `/api/run/logs?projectPath=${encodeURIComponent(projectPath)}&lines=150`,
      );
      const data = (await res.json()) as { logs?: string[] };
      const lines = data.logs ?? [];
      return lines.length > 0 ? lines.join("\n") : null;
    } catch {
      return null;
    }
  }

  async function capturePage(): Promise<string | null> {
    if (!projectPath) return null;
    try {
      const res = await fetch("/api/run/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass devUrl as fallback so capture works even for externally-started servers
        body: JSON.stringify({ projectPath, devUrl }),
      });
      const data = (await res.json()) as { html?: string };
      return data.html ?? null;
    } catch {
      return null;
    }
  }

  async function getFileTree(): Promise<{
    treeText: string;
    filePaths: string[];
  }> {
    if (!projectPath) return { treeText: "", filePaths: [] };
    try {
      const res = await fetch(
        `/api/fs/tree?projectPath=${encodeURIComponent(projectPath)}`,
      );
      const data = (await res.json()) as {
        tree?: import("@/types").FileTreeNode[];
      };
      if (!data.tree) return { treeText: "", filePaths: [] };
      const filePaths: string[] = [];
      function formatNode(
        node: import("@/types").FileTreeNode,
        depth: number,
      ): string {
        const pad = "  ".repeat(depth);
        if (node.type === "directory") {
          const children = (node.children ?? [])
            .map((c) => formatNode(c, depth + 1))
            .join("\n");
          return `${pad}${node.name}/\n${children}`;
        }
        filePaths.push(node.path);
        return `${pad}${node.name}`;
      }
      const treeText = data.tree.map((n) => formatNode(n, 0)).join("\n");
      return { treeText, filePaths };
    } catch {
      return { treeText: "", filePaths: [] };
    }
  }

  async function getAllFileContents(filePaths: string[]): Promise<string> {
    if (!projectPath || filePaths.length === 0) return "";

    // Skip generated/binary directories — only read source files
    const SOURCE_EXTS = /\.(tsx?|jsx?|css|json|md|env[^/]*)$/i;
    const SKIP_DIRS = /[\\/](node_modules|\.next|\.git|dist|out|build)[\\/]/;
    const toRead = filePaths
      .filter((p) => SOURCE_EXTS.test(p) && !SKIP_DIRS.test(p))
      .slice(0, 60); // hard cap: 60 files max

    if (toRead.length === 0) return "";

    const results = await Promise.allSettled(
      toRead.map(async (filePath) => {
        const res = await fetch(
          `/api/fs/read-file?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(filePath)}`,
        );
        const data = (await res.json()) as { content?: string };
        return { filePath, content: data.content ?? "" };
      }),
    );

    const sections: string[] = [];
    let totalChars = 0;
    const CHAR_CAP = 80_000; // ~20k tokens — keep prompt manageable
    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value.content) continue;
      const block = `--- File: ${r.value.filePath} ---\n${r.value.content}\n--- End: ${r.value.filePath} ---`;
      if (totalChars + block.length > CHAR_CAP) break;
      sections.push(block);
      totalChars += block.length;
    }
    return sections.join("\n\n");
  }

  async function applyEdits(edits: FileEdit[]): Promise<void> {
    for (const edit of edits) {
      await fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath,
          filePath: edit.path,
          content: edit.content,
        }),
      });
    }
  }

  /** Run per-file isolated TypeScript checks on every edited TS/TSX file.
   *  Returns a formatted error string if any errors are found, otherwise null. */
  async function runTypechecks(edits: FileEdit[]): Promise<string | null> {
    if (!projectPath || edits.length === 0) return null;
    type TsError = { file: string; line: number; col: number; message: string };
    const allErrors: string[] = [];

    await Promise.allSettled(
      edits
        .filter((e) => /\.(tsx?|jsx?)$/.test(e.path))
        .map(async (edit) => {
          try {
            const res = await fetch("/api/typecheck", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectPath, filePath: edit.path }),
            });
            if (!res.ok) return;
            const data = (await res.json()) as { errors?: TsError[] };
            for (const err of data.errors ?? []) {
              allErrors.push(
                `${edit.path}:${err.line}:${err.col}: ${err.message}`,
              );
            }
          } catch {
            // Silently ignore network/parse errors
          }
        }),
    );

    return allErrors.length > 0 ? allErrors.join("\n") : null;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending || !projectPath || !plan) return;
    setInput("");
    setIsSending(true);

    const userMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const [{ treeText, filePaths }, pageHtml, serverLogs] = await Promise.all(
        [getFileTree(), capturePage(), getLogs()],
      );
      if (pageHtml) setLivePageContext(pageHtml);
      const fileContents = await getAllFileContents(filePaths);
      const systemPrompt = buildIterateSystemPrompt(
        plan,
        treeText,
        devUrl,
        pageHtml ?? undefined,
        fileContents || undefined,
        serverLogs ?? undefined,
      );

      const history: ConversationMessage[] = [
        { id: "sys", role: "system", content: systemPrompt, timestamp: 0 },
        ...messages,
        userMsg,
      ];

      setStreaming("");
      let fullResponse = "";
      await streamChat(history, llmConfig, (chunk) => {
        fullResponse += chunk;
        setStreaming(fullResponse);
      });

      const edits = extractFileEdits(fullResponse);
      const displayContent = stripFileTags(fullResponse);

      let typecheckReport: string | null = null;
      if (edits.length > 0) {
        await applyEdits(edits);
        notify.success(
          `Applied ${edits.length} file edit${edits.length > 1 ? "s" : ""}. Dev server hot-reloading…`,
        );
        typecheckReport = await runTypechecks(edits);
        if (typecheckReport) {
          notify.warning("TypeScript errors found in edited files.");
        }
      }

      const assistantMsg: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          displayContent ||
          `Applied ${edits.length} file edit${edits.length !== 1 ? "s" : ""}.`,
        timestamp: Date.now(),
      };
      if (typecheckReport) {
        const errorMsg: ConversationMessage = {
          id: crypto.randomUUID(),
          role: "system",
          content: `?? **TypeScript errors found after applying edits. Please fix them:**\n\`\`\`\n${typecheckReport}\n\`\`\``,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg, errorMsg]);
      } else {
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      notify.error((err as Error).message);
    } finally {
      setStreaming("");
      setIsSending(false);
    }
  }

  async function handleGenerateTasks() {
    const text = featureInput.trim();
    if (!text || isGeneratingTasks || !plan) return;
    setPendingTasks([]);
    setIsGeneratingTasks(true);
    setGenerationStatus("Generating task plan…");

    try {
      const existingPaths = existingTasks.map((t) => t.filePath);
      const prompt = buildAddFeaturesPrompt(plan, existingPaths, text);

      let fullResponse = "";
      await streamChat(
        [{ id: "af", role: "user", content: prompt, timestamp: Date.now() }],
        llmConfig,
        (chunk) => {
          fullResponse += chunk;
        },
      );

      const tasks = extractNewTasks(fullResponse);
      if (tasks.length === 0) {
        notify.error("LLM did not return a valid task list. Try rephrasing.");
        return;
      }

      // Ensure all tasks have status "pending"
      const normalised = tasks.map((t) => ({
        ...t,
        status: "pending" as const,
        retryCount: 0,
      }));
      setPendingTasks(normalised);
      setGenerationStatus("");
    } catch (err) {
      notify.error((err as Error).message);
      setGenerationStatus("");
    } finally {
      setIsGeneratingTasks(false);
    }
  }

  function handleAddToQueue() {
    if (pendingTasks.length === 0) return;
    appendTasks(pendingTasks);
    notify.success(
      `${pendingTasks.length} task${pendingTasks.length !== 1 ? "s" : ""} added to build queue.`,
    );
    setPendingTasks([]);
    setFeatureInput("");
    if (plan) router.push(`/studio/${plan.id}`);
  }

  const headerContent = (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">
        {plan?.name}
      </span>
      {devUrl ? (
        <a
          href={devUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {devUrl}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Start Preview →
        </button>
      )}
    </div>
  );

  const tabBar = (
    <div className="flex shrink-0 border-b border-border">
      {(["iterate", "add-features"] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors",
            tab === t
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t === "iterate" ? (
            <>
              <Pencil className="h-3 w-3" /> Iterate
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" /> Add Features
            </>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {headerContent}
      {tabBar}

      {tab === "iterate" && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="text-sm text-muted-foreground text-center mt-8">
                <p>Ask me to improve your app.</p>
                <p className="mt-1 text-xs opacity-60">
                  e.g. Make the navbar sticky, add a dark mode toggle, fix the
                  login form validation
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {streaming && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: stripFileTags(streaming),
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
                void handleSend();
              }}
              className="flex gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Ask for a change… (e.g. make the header sticky)"
                rows={2}
                disabled={isSending}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={isSending || !input.trim()}
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            {devUrl && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3 shrink-0 text-green-500" />
                {livePageContext
                  ? "Live page context captured � AI can see the current rendered UI"
                  : "Dev server running � page context will be captured on next message"}
              </p>
            )}
          </div>
        </>
      )}

      {tab === "add-features" && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Describe the features you want to add. A new set of build tasks will
            be generated and appended to your project queue.
          </p>

          <textarea
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            placeholder="e.g. Add a user profile page with avatar upload, show recent activity feed on dashboard, add email notification settings"
            rows={5}
            disabled={isGeneratingTasks}
            className="resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />

          <Button
            onClick={() => void handleGenerateTasks()}
            disabled={isGeneratingTasks || !featureInput.trim()}
            className="self-start"
          >
            {isGeneratingTasks ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {generationStatus || "Generating…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Tasks
              </>
            )}
          </Button>

          {pendingTasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {pendingTasks.length} new task
                {pendingTasks.length !== 1 ? "s" : ""} will be added:
              </p>
              <div className="rounded-lg border border-border divide-y divide-border max-h-64 overflow-y-auto">
                {pendingTasks.map((t) => (
                  <div key={t.id} className="flex items-start gap-3 px-3 py-2">
                    <Plus className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {t.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {t.filePath}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleAddToQueue} className="self-start mt-1">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Add to Build Queue
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
