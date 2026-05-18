"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { useFsStore } from "@/stores/fsStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { executeAll } from "@/lib/executor/taskExecutor";
import { getProjectOutputPath } from "@/lib/utils";
import TaskBoard from "@/components/tasks/TaskBoard";
import StreamPanel from "@/components/tasks/StreamPanel";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import FolderPicker from "@/components/filesystem/FolderPicker";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const router = useRouter();

  const tasks = useTaskStore();
  const planId = useTaskStore((s) => s.planId);
  const projectPath = useFsStore((s) => s.projectPath);
  const llmConfig = useLLMConfigStore();
  const plan = useProjectPlanStore((s) => s.plan);
  const resetPlan = useProjectPlanStore((s) => s.resetPlan);

  const isExecuting = tasks.isExecuting;
  const allDone =
    tasks.tasks.length > 0 && tasks.tasks.every((t) => t.status === "done");
  const hasErrors = tasks.tasks.some((t) => t.status === "error");

  // Tasks belong to a different project — stale state warning
  const planMismatch = projectId && planId && planId !== projectId;

  // Verify the project still exists on disk (new subfolder system).
  // If tasks are all done but the project has no jugaad.json subfolder,
  // the plan is stale (e.g. built before the subfolder system was introduced).
  useEffect(() => {
    if (!projectPath || !plan || !projectId || isExecuting) return;
    if (plan.id !== projectId) {
      resetPlan();
      router.replace("/studio/new");
      return;
    }
    if (!allDone) return; // Not yet built — folder won't exist yet, that's fine
    fetch(`/api/projects/list?outputFolder=${encodeURIComponent(projectPath)}`)
      .then((r) => r.json())
      .then((data: { projects: { plan: { id: string } }[] }) => {
        const found = data.projects?.some((p) => p.plan.id === projectId);
        if (!found) {
          resetPlan();
          router.replace("/studio/new");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, projectId, allDone, isExecuting]);

  async function handleStart() {
    if (!projectPath) {
      toast.error("Select an output folder first.");
      return;
    }
    // Nest output in a project-named subfolder: [outputFolder]/[project-slug]/
    const effectivePath = getProjectOutputPath(
      projectPath,
      plan?.name ?? "project",
    );
    try {
      await executeAll(tasks.tasks, effectivePath, llmConfig);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (!projectPath) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <FolderPicker />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold">
          {planMismatch ? (
            <span className="text-yellow-500">⚠ Stale workspace</span>
          ) : (
            "Project Workspace"
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Project
            </Link>
          </Button>
          {!isExecuting && tasks.tasks.length > 0 && (
            <Button size="sm" onClick={handleStart}>
              {allDone ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Rebuild
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {hasErrors ? "Retry All" : "Start Building"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {isExecuting && (
          <div className="h-48 shrink-0 border-b border-border">
            <StreamPanel />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <TaskBoard />
        </div>
      </div>
    </div>
  );
}
