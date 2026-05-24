"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  Loader2,
  Settings2,
  ChevronUp,
  Maximize2,
  X,
  RotateCcw,
} from "lucide-react";
import ChatMessage from "@/components/agent/ChatMessage";
import StackSelector from "@/components/stack/StackSelector";
import PlanSummary from "@/components/agent/PlanSummary";
import PlanEditor from "@/components/agent/PlanEditor";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useTaskStore } from "@/stores/taskStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { generateTasks } from "@/lib/planner/taskGenerator";
import { sendMessage } from "@/lib/planner/planAgent";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import type { ConversationMessage } from "@/types";

export default function NewProjectPage() {
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [stackOpen, setStackOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [genStream, setGenStream] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const conversation = useProjectPlanStore((s) => s.conversation);
  const addMessage = useProjectPlanStore((s) => s.addMessage);
  const setPlan = useProjectPlanStore((s) => s.setPlan);
  const plan = useProjectPlanStore((s) => s.plan);
  const isPlanConfirmed = useProjectPlanStore((s) => s.isPlanConfirmed);
  const confirmPlan = useProjectPlanStore((s) => s.confirmPlan);
  const resetPlan = useProjectPlanStore((s) => s.resetPlan);
  const isPlanning = useProjectPlanStore((s) => s.isPlanning);
  const setIsPlanning = useProjectPlanStore((s) => s.setIsPlanning);
  const pendingStack = useProjectPlanStore((s) => s.pendingStack);
  const autoRun = useProjectPlanStore((s) => s.autoRun);
  const setAutoRun = useProjectPlanStore((s) => s.setAutoRun);
  const isGenerating = useProjectPlanStore((s) => s.isGenerating);
  const status = useProjectPlanStore((s) => s.generatingStatus);
  const startGenerating = useProjectPlanStore((s) => s.startGenerating);
  const setGeneratingStatus = useProjectPlanStore((s) => s.setGeneratingStatus);
  const stopGenerating = useProjectPlanStore((s) => s.stopGenerating);
  const setTasks = useTaskStore((s) => s.setTasks);
  const llmConfig = useLLMConfigStore();

  const isEmpty = conversation.length === 0 && !plan;
  const isBusy = isPlanning || isGenerating;

  // Reset plan state when entering new-project page
  useEffect(() => {
    resetPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, streamingContent, isGenerating]);

  // Auto-resize textarea — no hard cap so it never needs a scrollbar.
  // The container is capped via CSS max-h; overflow-hidden on the textarea
  // keeps it clean. An expand overlay takes over for very long prompts.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Auto-scroll the stream panel to the bottom as chunks arrive,
  // unless the user has manually scrolled up.
  useEffect(() => {
    if (!genStream) {
      // New generation started — reset the scroll-pause flag.
      userScrolledRef.current = false;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      return;
    }
    if (userScrolledRef.current) return;
    const el = streamScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [genStream]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isBusy) return;
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
        plan?.stack ?? pendingStack,
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
    } catch (err) {
      const errMsg = (err as Error).message ?? "Unknown error";
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ The response was interrupted — ${errMsg}.\n\nYou can try again or use **Start over** to clear the conversation.`,
        timestamp: Date.now(),
      });
      notify.error("Stream interrupted. Try again.");
    } finally {
      setStreamingContent("");
      setIsPlanning(false);
    }
  }

  async function handleConfirm() {
    if (!plan) return;
    setGenStream("");
    startGenerating();
    try {
      const tasks = await generateTasks(
        plan,
        llmConfig,
        setGeneratingStatus,
        (chunk) => setGenStream((prev) => prev + chunk),
      );
      setTasks(tasks, plan.id);
      confirmPlan();
      notify.success(`Generated ${tasks.length} tasks`);
      router.push(`/studio/${plan.id}`);
    } catch (err) {
      notify.error(`Failed to generate tasks: ${(err as Error).message}`);
    } finally {
      stopGenerating();
    }
  }

  // If the page remounts while generation was in-flight (Fast Refresh / navigation),
  // auto-restart so the progress card stays live and finishes the job.
  const autoRestartedRef = useRef(false);
  useEffect(() => {
    if (autoRestartedRef.current) return;
    autoRestartedRef.current = true;
    if (isGenerating && plan && !isPlanConfirmed) {
      void handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStreamScroll() {
    const el = streamScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (!atBottom) {
      // User scrolled up — pause auto-scroll and schedule a resume.
      userScrolledRef.current = true;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        userScrolledRef.current = false;
        const container = streamScrollRef.current;
        if (container) container.scrollTop = container.scrollHeight;
      }, 7000);
    } else {
      // User scrolled back to bottom — resume immediately.
      userScrolledRef.current = false;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Scrollable feed ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4">
          {/* Hero empty state */}
          <AnimatePresence>
            {isEmpty && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col items-center text-center gap-5 pt-24 pb-10"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
                  className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.3, ease: "easeOut" }}
                  className="space-y-1.5"
                >
                  <h1 className="text-2xl font-semibold tracking-tight">
                    What are you building?
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    Describe your app idea and Jugaad will generate a full
                    project plan with tasks ready to build.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation messages */}
          {conversation.length > 0 && (
            <div className="py-6 space-y-4">
              {conversation.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <ChatMessage message={msg} />
                </motion.div>
              ))}
              <AnimatePresence>
                {streamingContent && (
                  <motion.div
                    key="streaming"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <ChatMessage
                      message={{
                        id: "streaming",
                        role: "assistant",
                        content: streamingContent,
                        timestamp: 0,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Plan summary + editor */}
          <AnimatePresence mode="wait">
            {plan && !isPlanConfirmed && !isEditing && (
              <motion.div
                key="plan-summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pb-6"
              >
                <PlanSummary
                  onEdit={() => setIsEditing(true)}
                  onStartOver={resetPlan}
                  onConfirm={handleConfirm}
                  autoRun={autoRun}
                  onToggleAutoRun={() => setAutoRun(!autoRun)}
                />
              </motion.div>
            )}
            {plan && !isPlanConfirmed && isEditing && (
              <motion.div
                key="plan-editor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="pb-6"
              >
                <PlanEditor
                  onSave={() => setIsEditing(false)}
                  onCancel={() => setIsEditing(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generating tasks — live AI stream */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="pb-6"
              >
                <div className="rounded-xl border border-border overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border bg-muted/20">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {status || "Preparing your project\u2026"}
                    </span>
                  </div>
                  {/* Stream output */}
                  <div className="bg-[#1e1e1e] max-h-72 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
                    {genStream ? (
                      <pre className="text-green-400 whitespace-pre-wrap break-all">
                        {genStream}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground/50 italic">
                        Waiting for LLM\u2026
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Already-confirmed notice */}
          {plan && isPlanConfirmed && (
            <div className="py-16 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                Plan confirmed for{" "}
                <span className="font-medium text-foreground">{plan.name}</span>
                .
              </p>
              <button
                onClick={resetPlan}
                className="text-sm text-primary hover:underline underline-offset-2 transition-colors"
              >
                Start a new project
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Sticky input bar ────────────────────────────────────────────── */}
      {!isPlanConfirmed && (
        <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-3">
            {/* Stack options — collapsible */}
            <AnimatePresence>
              {stackOpen && (
                <motion.div
                  key="stack"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="rounded-xl border border-border bg-muted/30 p-4 mb-3">
                    <StackSelector />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2">
              {/* Stack toggle */}
              <button
                type="button"
                title={stackOpen ? "Hide stack options" : "Stack options"}
                onClick={() => setStackOpen((o) => !o)}
                className={cn(
                  "h-11.5 w-11.5 shrink-0 rounded-xl border flex items-center justify-center transition-colors",
                  stackOpen
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
                )}
              >
                {stackOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <Settings2 className="h-4 w-4" />
                )}
              </button>

              {/* Text input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="flex flex-1 items-end gap-2"
              >
                {/* Textarea wrapper — capped at ~5 lines, no internal scrollbar */}
                <div className="relative flex-1">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={
                      isEmpty
                        ? "e.g. A SaaS dashboard for tracking solar panel output…"
                        : "Ask a follow-up or refine the plan…"
                    }
                    rows={1}
                    disabled={isBusy}
                    className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 min-h-11.5 max-h-32.5 overflow-hidden leading-relaxed"
                  />
                  {/* Expand button — shown when prompt is getting long */}
                  <AnimatePresence>
                    {input.length > 180 && (
                      <motion.button
                        key="expand"
                        type="button"
                        title="Expand editor"
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.75 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setOverlayOpen(true)}
                        className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <Button
                  type="submit"
                  disabled={isBusy || !input.trim()}
                  size="icon"
                  className="h-11.5 w-11.5 shrink-0 rounded-xl"
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>

            <p className="text-center text-[11px] text-muted-foreground/50">
              Enter to send · Shift+Enter for new line
            </p>

            {/* Start over — shown when conversation is stuck (no plan yet) */}
            <AnimatePresence>
              {conversation.length > 0 && !plan && !isBusy && (
                <motion.div
                  key="start-over"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18 }}
                  className="flex justify-center"
                >
                  <button
                    type="button"
                    onClick={resetPlan}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Start over
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Full-screen prompt overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {overlayOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0">
              <span className="text-sm font-medium">Write your prompt</span>
              <button
                type="button"
                onClick={() => setOverlayOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Large textarea */}
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  setOverlayOpen(false);
                  void handleSend();
                }
                if (e.key === "Escape") setOverlayOpen(false);
              }}
              placeholder="Describe your app in detail…"
              className="flex-1 resize-none bg-transparent px-6 py-5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            />

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-border shrink-0">
              <span className="text-xs text-muted-foreground">
                ⌘/Ctrl+Enter to send · Esc to collapse
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverlayOpen(false)}
                >
                  Collapse
                </Button>
                <Button
                  size="sm"
                  disabled={isBusy || !input.trim()}
                  onClick={() => {
                    setOverlayOpen(false);
                    void handleSend();
                  }}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
