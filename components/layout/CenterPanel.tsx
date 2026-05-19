"use client";

import { useTaskStore } from "@/stores/taskStore";
import ChatInterface from "@/components/agent/ChatInterface";
import TaskLog from "@/components/tasks/TaskLog";
import IterateInterface from "@/components/agent/IterateInterface";

export default function CenterPanel() {
  const isExecuting = useTaskStore((s) => s.isExecuting);
  const allDone = useTaskStore(
    (s) => s.tasks.length > 0 && s.tasks.every((t) => t.status === "done"),
  );

  if (isExecuting) return <TaskLog />;
  if (allDone) return <IterateInterface />;
  return <ChatInterface />;
}
