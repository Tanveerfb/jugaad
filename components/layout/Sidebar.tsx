"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FileTree from "@/components/filesystem/FileTree";
import FolderPicker from "@/components/filesystem/FolderPicker";
import { useFsStore } from "@/stores/fsStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useAuthStore } from "@/stores/authStore";
import { listProjects } from "@/lib/firebase/projects";
import { openBaseFolder } from "@/lib/fs/handle";
import { rebuildFileTree } from "@/lib/fs/tree";
import { writeFile } from "@/lib/fs/writer";
import { toast } from "sonner";
import { Settings, FolderOpen, Clock } from "lucide-react";
import Link from "next/link";
import type { ProjectPlan } from "@/types";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

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

function RecentProjects() {
  const [projects, setProjects] = useState<ProjectPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const setPlan = useProjectPlanStore((s) => s.setPlan);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    listProjects(user.uid)
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        <Link
          href="#"
          className="text-primary hover:underline"
          onClick={() => {}}
        >
          Sign in
        </Link>{" "}
        to sync projects
      </p>
    );
  }

  if (loading) return <LoadingSkeleton lines={3} />;

  if (projects.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
    );
  }

  async function handleOpen(project: ProjectPlan) {
    setPlan(project);
    router.push(`/studio/${project.id}`);
  }

  return (
    <ul className="space-y-0.5">
      {projects.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => handleOpen(p)}
            className="w-full text-left px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <p className="text-xs font-medium truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {timeAgo(p.updatedAt)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  const baseFolderHandle = useFsStore((s) => s.baseFolderHandle);
  const router = useRouter();

  async function handleOpenExisting() {
    try {
      const handle = await openBaseFolder();
      await rebuildFileTree(handle);
      // Try loading jugaad.json
      try {
        const fileHandle = await handle.getFileHandle("jugaad.json");
        const file = await fileHandle.getFile();
        const text = await file.text();
        const plan: ProjectPlan = JSON.parse(text);
        useFsStore.getState().setProjectHandle(handle);
        useProjectPlanStore.getState().setPlan(plan);
        router.push(`/studio/${plan.id}`);
      } catch {
        // No jugaad.json — create stub plan
        const stubPlan: ProjectPlan = {
          id: crypto.randomUUID(),
          name: handle.name,
          description: "",
          stack: { selected: ["nextjs", "typescript", "tailwind"] },
          features: [],
          pages: [],
          dataModels: [],
          authStrategy: "none",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        useFsStore.getState().setProjectHandle(handle);
        useProjectPlanStore.getState().setPlan(stubPlan);
        // Write jugaad.json so future opens work
        await writeFile(
          handle,
          "jugaad.json",
          JSON.stringify(stubPlan, null, 2),
        );
        router.push(`/studio/${stubPlan.id}`);
      }
    } catch {
      toast.error("Could not open folder.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* File tree header */}
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Files
        </p>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        <Suspense fallback={<LoadingSkeleton lines={6} />}>
          {baseFolderHandle ? <FileTree /> : <FolderPicker />}
        </Suspense>
      </div>

      {/* Recent Projects */}
      <div className="border-t border-border">
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent
          </p>
        </div>
        <Suspense fallback={<LoadingSkeleton lines={3} />}>
          <RecentProjects />
        </Suspense>

        {/* Open Existing Folder */}
        <button
          type="button"
          onClick={handleOpenExisting}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Open Existing Folder
        </button>
      </div>

      {/* Settings link */}
      <div className="border-t border-border p-2 shrink-0">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
