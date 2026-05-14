"use client";

import { useTaskStore } from "@/stores/taskStore";
import ChatInterface from "@/components/agent/ChatInterface";
import TaskLog from "@/components/tasks/TaskLog";

export default function CenterPanel() {
  const isExecuting = useTaskStore((s) => s.isExecuting);
  return isExecuting ? <TaskLog /> : <ChatInterface />;
}
