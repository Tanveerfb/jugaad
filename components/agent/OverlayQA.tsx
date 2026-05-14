"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { OverlayQuestion } from "@/types";

export type OverlayQAProps = {
  questions: OverlayQuestion[];
  onComplete: (answers: OverlayQuestion[]) => void;
  onDismiss: () => void;
  mode: "sequential" | "batch";
};

export default function OverlayQA({
  questions,
  onComplete,
  onDismiss,
  mode,
}: OverlayQAProps) {
  const [answers, setAnswers] = useState<OverlayQuestion[]>(
    questions.map((q) => ({ ...q })),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textValue, setTextValue] = useState("");

  const current = answers[currentIndex];

  function setAnswer(id: string, answer: string | string[]) {
    setAnswers((prev) => prev.map((q) => (q.id === id ? { ...q, answer } : q)));
  }

  function advance() {
    if (mode === "sequential") {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        setTextValue("");
      } else {
        onComplete(answers);
      }
    }
  }

  function handleSingleSelect(option: string) {
    setAnswer(current.id, option);
    setTimeout(advance, 150);
  }

  function handleMultiToggle(option: string) {
    const prev = (current.answer as string[]) ?? [];
    const next = prev.includes(option)
      ? prev.filter((o) => o !== option)
      : [...prev, option];
    setAnswer(current.id, next);
  }

  function handleTextSubmit() {
    setAnswer(current.id, textValue);
    advance();
  }

  const renderQuestion = (q: OverlayQuestion) => (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{q.question}</p>
      {q.type === "single_select" && q.options && (
        <div className="flex flex-wrap gap-2">
          {q.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSingleSelect(opt)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:border-primary hover:bg-primary/10 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {q.type === "multi_select" && q.options && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt) => {
              const selected = ((q.answer as string[]) ?? []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleMultiToggle(opt)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <Button size="sm" onClick={() => onComplete(answers)}>
            Continue
          </Button>
        </div>
      )}
      {q.type === "text" && (
        <div className="flex gap-2">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder="Type your answer..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button size="sm" onClick={handleTextSubmit}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-background/95 backdrop-blur-sm p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Follow-up{" "}
            {mode === "sequential"
              ? `${currentIndex + 1} / ${questions.length}`
              : ""}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Skip all</span>
          </button>
        </div>

        {mode === "sequential" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderQuestion(current)}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-6">
            {answers.map((q) => renderQuestion(q))}
            <Button onClick={() => onComplete(answers)}>Continue</Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
