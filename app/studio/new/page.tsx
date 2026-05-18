"use client";

import StackSelector from "@/components/stack/StackSelector";
import ChatInterface from "@/components/agent/ChatInterface";
import PlanSummary from "@/components/agent/PlanSummary";
import PlanEditor from "@/components/agent/PlanEditor";
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
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (!plan) return;
    setIsGenerating(true);
    try {
      const tasks = await generateTasks(plan, llmConfig, setStatus);
      setTasks(tasks, plan.id);
      confirmPlan();
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

      {/* Start-over banner when arriving at /new with an already-confirmed plan */}
      {plan && isPlanConfirmed && (
        <div className="border-b border-border px-5 py-2.5 shrink-0 flex items-center justify-between bg-muted/40">
          <p className="text-xs text-muted-foreground">
            You have a confirmed plan for{" "}
            <span className="font-medium text-foreground">{plan.name}</span>.
            Describe a new app below or start over.
          </p>
          <button
            onClick={resetPlan}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-hidden relative">
        <ChatInterface />
      </div>

      {/* Plan editor (inline edit mode) */}
      {plan && !isPlanConfirmed && isEditing && (
        <div className="border-t border-border p-4">
          <PlanEditor
            onSave={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      {/* Plan summary + confirm */}
      {plan && !isPlanConfirmed && !isEditing && (
        <div className="border-t border-border p-4">
          <PlanSummary
            onEdit={() => setIsEditing(true)}
            onStartOver={resetPlan}
            onConfirm={handleConfirm}
          />
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
