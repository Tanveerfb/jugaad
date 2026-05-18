"use client";

import StackSelector from "@/components/stack/StackSelector";
import ChatInterface from "@/components/agent/ChatInterface";
import PlanSummary from "@/components/agent/PlanSummary";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useTaskStore } from "@/stores/taskStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { useAuthStore } from "@/stores/authStore";
import { generateTasks } from "@/lib/planner/taskGenerator";
import { saveProject } from "@/lib/firebase/projects";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const plan = useProjectPlanStore((s) => s.plan);
  const isPlanConfirmed = useProjectPlanStore((s) => s.isPlanConfirmed);
  const confirmPlan = useProjectPlanStore((s) => s.confirmPlan);
  const resetPlan = useProjectPlanStore((s) => s.resetPlan);
  const setTasks = useTaskStore((s) => s.setTasks);
  const llmConfig = useLLMConfigStore();
  const user = useAuthStore((s) => s.user);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function handleConfirm() {
    if (!plan) return;
    confirmPlan();
    setIsGenerating(true);
    try {
      const tasks = await generateTasks(plan, llmConfig, setStatus);
      setTasks(tasks);
      toast.success(`Generated ${tasks.length} tasks`);

      // Save to Firestore (non-blocking — don't block navigation on errors)
      if (user) {
        saveProject(plan, user.uid).catch(() => {
          toast.warning(
            "Could not save project to cloud — your files are safe locally",
          );
        });
      }

      router.push(`/studio/${plan.id}`);
    } catch (err) {
      toast.error(`Failed to generate tasks: ${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
      setStatus("");
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stack selector at top when no plan yet */}
      {!plan && (
        <div className="border-b border-border px-5 py-4 shrink-0 overflow-y-auto max-h-52">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Tech Stack
          </p>
          <StackSelector />
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-hidden relative">
        <ChatInterface />
      </div>

      {/* Plan summary + confirm */}
      {plan && !isPlanConfirmed && (
        <div className="border-t border-border p-4">
          <PlanSummary onEdit={resetPlan} onConfirm={handleConfirm} />
        </div>
      )}

      {/* Generating state */}
      {isGenerating && (
        <div className="border-t border-border p-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {status || "Generating tasks..."}
          </p>
        </div>
      )}
    </div>
  );
}
