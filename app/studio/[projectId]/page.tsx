"use client";

import { useEffect, useRef, useState } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { useFsStore } from "@/stores/fsStore";
import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useDevServerStore } from "@/stores/devServerStore";
import { executeAll } from "@/lib/executor/taskExecutor";
import { fixTypeScriptErrors } from "@/lib/executor/errorFixer";
import { getProjectOutputPath } from "@/lib/utils";
import TaskBoard from "@/components/tasks/TaskBoard";
import IterateInterface from "@/components/agent/IterateInterface";
import { Button } from "@/components/ui/button";
import {
  Play,
  RefreshCw,
  Plus,
  Wrench,
  Monitor,
  Loader2,
  LayoutList,
} from "lucide-react";
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
  const autoRun = useProjectPlanStore((s) => s.autoRun);
  const setAutoRun = useProjectPlanStore((s) => s.setAutoRun);
  const devStatus = useDevServerStore((s) => s.status);
  const setShowPreview = useDevServerStore((s) => s.setShowPreview);

  const [isFixing, setIsFixing] = useState(false);
  const [fixStatus, setFixStatus] = useState("");
  const [showTasks, setShowTasks] = useState(false);

  const isExecuting = tasks.isExecuting;
  const allDone =
    tasks.tasks.length > 0 && tasks.tasks.every((t) => t.status === "done");
  // Has some done + some unbuilt (pending, error, or split)
  const hasPendingAfterDone =
    tasks.tasks.some((t) => t.status === "done") &&
    tasks.tasks.some(
      (t) =>
        t.status === "pending" || t.status === "error" || t.status === "split",
    );
  const hasErrors = tasks.tasks.some((t) => t.status === "error");

  // Tasks belong to a different project — stale state warning
  const planMismatch = projectId && planId && planId !== projectId;

  // Autopilot: fire handleStart once when tasks are ready and autoRun is on
  const autoStarted = useRef(false);
  useEffect(() => {
    if (
      !autoRun ||
      autoStarted.current ||
      isExecuting ||
      !projectPath ||
      tasks.tasks.length === 0 ||
      planId !== projectId
    )
      return;
    autoStarted.current = true;
    setAutoRun(false);
    void handleStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoRun,
    tasks.tasks.length,
    projectPath,
    planId,
    projectId,
    isExecuting,
  ]);

  useEffect(() => {
    if (!projectPath || !plan || !projectId || isExecuting) return;
    if (plan.id !== projectId) {
      resetPlan();
      router.replace("/studio/new");
      return;
    }
    if (!allDone) return;
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

  async function handleFixErrors() {
    if (!projectPath || !plan) return;
    const effectivePath = getProjectOutputPath(projectPath, plan.name);
    setIsFixing(true);
    setFixStatus("Scanning for errors…");
    try {
      const result = await fixTypeScriptErrors(
        effectivePath,
        llmConfig,
        setFixStatus,
      );
      if (result.fixed) {
        toast.success("All TypeScript errors fixed!");
      } else {
        toast.warning(`${result.remaining} error(s) could not be auto-fixed.`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsFixing(false);
      setFixStatus("");
    }
  }

  function handleOpenPreview() {
    setShowPreview(true);
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
        <div className="flex flex-col">
          <p className="text-sm font-semibold">
            {planMismatch ? (
              <span className="text-yellow-500">⚠ Stale workspace</span>
            ) : (
              "Project Workspace"
            )}
          </p>
          {isFixing && fixStatus && (
            <p className="text-xs text-muted-foreground mt-0.5">{fixStatus}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Project
            </Link>
          </Button>

          {/* View Tasks toggle — shown in iterate mode */}
          {!isExecuting && (allDone || hasPendingAfterDone) && (
            <Button
              size="sm"
              variant={showTasks ? "default" : "outline"}
              onClick={() => setShowTasks((v) => !v)}
            >
              <LayoutList className="h-3.5 w-3.5 mr-1.5" />
              {showTasks ? "Hide Tasks" : "View Tasks"}
            </Button>
          )}

          {/* Preview button */}
          {!isExecuting && !isFixing && allDone && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenPreview}
              title={
                devStatus === "running"
                  ? "Preview running"
                  : "Open preview in right panel"
              }
            >
              <Monitor className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </Button>
          )}

          {!isExecuting && hasErrors && !isFixing && (
            <Button size="sm" variant="outline" onClick={handleFixErrors}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              Fix Errors
            </Button>
          )}

          {isFixing && (
            <Button size="sm" variant="outline" disabled>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Fixing…
            </Button>
          )}

          {!isExecuting && !isFixing && tasks.tasks.length > 0 && (
            <Button size="sm" onClick={handleStart}>
              {allDone && !hasPendingAfterDone ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Rebuild
                </>
              ) : hasPendingAfterDone ? (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Build New Tasks
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
      <div className="flex-1 overflow-hidden">
        {isExecuting || showTasks || (!allDone && !hasPendingAfterDone) ? (
          <TaskBoard />
        ) : (
          <IterateInterface />
        )}
      </div>
    </div>
  );
}
