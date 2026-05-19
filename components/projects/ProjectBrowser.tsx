"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useFsStore } from "@/stores/fsStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useTaskStore } from "@/stores/taskStore";
import { rebuildFileTree } from "@/lib/fs/tree";
import { cn } from "@/lib/utils";
import type { LocalProject } from "@/app/api/projects/list/route";
import DeleteProjectDialog from "./DeleteProjectDialog";
import RenameProjectDialog from "./RenameProjectDialog";

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProjectBrowser({
  onProjectOpen,
}: {
  onProjectOpen?: () => void;
}) {
  const outputFolder = useFsStore((s) => s.projectPath);
  const activeProjectPath = useFsStore((s) => s.activeProjectPath);
  const setActiveProjectPath = useFsStore((s) => s.setActiveProjectPath);
  const setPlan = useProjectPlanStore((s) => s.setPlan);
  const router = useRouter();

  const isExecuting = useTaskStore((s) => s.isExecuting);
  const activePlanId = useTaskStore((s) => s.planId);
  const syncPlanId = useTaskStore((s) => s.syncPlanId);

  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocalProject | null>(null);
  const [renameTarget, setRenameTarget] = useState<LocalProject | null>(null);

  const loadProjects = useCallback(async () => {
    if (!outputFolder) return;
    setLoading(true);
    try {
      const resp = await fetch(
        `/api/projects/list?outputFolder=${encodeURIComponent(outputFolder)}`,
      );
      if (resp.ok) {
        const data = (await resp.json()) as { projects: LocalProject[] };
        setProjects(data.projects);
      }
    } finally {
      setLoading(false);
    }
  }, [outputFolder]);

  // Refresh when build starts or finishes (deferred to avoid set-state-in-effect)
  useEffect(() => {
    const id = setTimeout(() => void loadProjects(), 150);
    return () => clearTimeout(id);
  }, [isExecuting, loadProjects]);

  // Poll every 3 s while a build is running so the project appears
  // as soon as jugaad.json lands on disk.
  useEffect(() => {
    if (!isExecuting) return;
    const id = setInterval(loadProjects, 3000);
    return () => clearInterval(id);
  }, [isExecuting, loadProjects]);

  async function handleOpenProject(project: LocalProject) {
    setActiveProjectPath(project.path);
    setPlan(project.plan);
    syncPlanId(project.plan.id);
    try {
      await rebuildFileTree(project.path);
    } catch {
      // non-fatal — project may not have files yet
    }
    onProjectOpen?.();
    router.push(`/studio/${project.plan.id}`);
  }

  async function handleDelete(project: LocalProject, deleteDisk: boolean) {
    await fetch("/api/projects/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath: project.path, deleteDisk }),
    });
    setDeleteTarget(null);
    if (activeProjectPath === project.path) {
      setActiveProjectPath(outputFolder ?? "");
    }
    await loadProjects();
  }

  async function handleRename(project: LocalProject, newName: string) {
    const resp = await fetch("/api/projects/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath: project.path, newName }),
    });
    if (!resp.ok) return;
    const data = (await resp.json()) as { newPath: string };
    setRenameTarget(null);
    if (activeProjectPath === project.path) {
      setActiveProjectPath(data.newPath);
    }
    await loadProjects();
  }

  if (!outputFolder) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Set an output folder in{" "}
          <Link href="/settings" className="text-primary hover:underline">
            Settings
          </Link>{" "}
          to manage your projects.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Refresh list"
            onClick={loadProjects}
            className={cn(
              "p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
              loading && "animate-spin",
            )}
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <Link
            href="/studio/new"
            title="New project"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center"
          >
            <Plus className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        {loading && projects.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground animate-pulse">
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-6 text-center space-y-2">
            <Package className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">No projects yet.</p>
            <Link
              href="/studio/new"
              className="text-xs text-primary hover:underline"
            >
              Create your first project →
            </Link>
          </div>
        ) : (
          <ul className="py-1">
            {projects.map((p) => (
              <li key={p.path}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenProject(p)}
                  onKeyDown={(e) => e.key === "Enter" && handleOpenProject(p)}
                  className={cn(
                    "group relative flex items-center gap-2.5 mx-1 px-2.5 py-2.5 rounded-md cursor-pointer hover:bg-muted/60 transition-colors",
                    activeProjectPath === p.path &&
                      "bg-primary/10 hover:bg-primary/15",
                  )}
                >
                  {/* Status dot / building spinner */}
                  {isExecuting && activePlanId === p.plan.id ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary mt-0.5" />
                  ) : (
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0 mt-0.5",
                        p.isBuilt ? "bg-green-500" : "bg-muted-foreground/40",
                      )}
                      title={p.isBuilt ? "Built" : "Not yet built"}
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">
                      {p.plan.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      <span className="text-xs">
                        {timeAgo(p.plan.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Hover action buttons */}
                  <div
                    className="hidden group-hover:flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title="Rename"
                      onClick={() => setRenameTarget(p)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => setDeleteTarget(p)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialogs */}
      {deleteTarget && (
        <DeleteProjectDialog
          project={deleteTarget}
          onConfirm={(deleteDisk) => handleDelete(deleteTarget, deleteDisk)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {renameTarget && (
        <RenameProjectDialog
          project={renameTarget}
          onConfirm={(newName) => handleRename(renameTarget, newName)}
          onCancel={() => setRenameTarget(null)}
        />
      )}
    </div>
  );
}
