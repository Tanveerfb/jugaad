import { useState, useCallback, useRef } from "react";
import type { OverlayQuestion } from "@/types";

type OverlayEntry = {
  questions: OverlayQuestion[];
  onComplete: (answered: OverlayQuestion[]) => void;
};

export function useOverlayQA() {
  const [current, setCurrent] = useState<OverlayEntry | null>(null);
  const queue = useRef<OverlayEntry[]>([]);

  const enqueueQuestions = useCallback(
    (
      questions: OverlayQuestion[],
      onComplete: (answered: OverlayQuestion[]) => void,
    ) => {
      queue.current.push({ questions, onComplete });
      if (!current) {
        setCurrent(queue.current.shift() ?? null);
      }
    },
    [current],
  );

  function handleComplete(answered: OverlayQuestion[]) {
    current?.onComplete(answered);
    const next = queue.current.shift() ?? null;
    setCurrent(next);
  }

  function handleDismiss() {
    current?.onComplete(current.questions); // return unanswered
    queue.current = [];
    setCurrent(null);
  }

  return { current, enqueueQuestions, handleComplete, handleDismiss };
}
