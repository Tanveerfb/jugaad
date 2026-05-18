"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import FileTree from "@/components/filesystem/FileTree";
import FolderPicker from "@/components/filesystem/FolderPicker";
import FolderBrowser from "@/components/filesystem/FolderBrowser";
import ProjectBrowser from "@/components/projects/ProjectBrowser";
import { useFsStore } from "@/stores/fsStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { rebuildFileTree } from "@/lib/fs/tree";
import { writeFile } from "@/lib/fs/writer";
import { Settings, FolderOpen, Files, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ProjectPlan } from "@/types";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

type Tab = "files" | "projects";

export default function Sidebar() {
  const projectPath = useFsStore((s) => s.projectPath);
  const activeProjectPath = useFsStore((s) => s.activeProjectPath);
  const setProjectPath = useFsStore((s) => s.setProjectPath);
  const setActiveProjectPath = useFsStore((s) => s.setActiveProjectPath);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);

  // The path to read/display files for — project subfolder when available
  const displayPath = activeProjectPath ?? projectPath;

  async function handleOpenExistingFolder(folderPath: string) {
    setFolderBrowserOpen(false);
    setActiveProjectPath(folderPath);

    // Try to load jugaad.json from that folder
    try {
      const res = await fetch(
        `/api/fs/read-file?projectPath=${encodeURIComponent(folderPath)}&filePath=jugaad.json`,
      );
      if (res.ok) {
        const { content } = (await res.json()) as { content: string };
        const plan = JSON.parse(content) as ProjectPlan;
        useProjectPlanStore.getState().setPlan(plan);
        await rebuildFileTree(folderPath);
        setActiveTab("files");
        router.push(`/studio/${plan.id}`);
        return;
      }
    } catch {
      // no jugaad.json
    }

    // No jugaad.json — create a stub plan and write it
    const folderName =
      folderPath.split(/[\\/]/).filter(Boolean).pop() ?? "project";
    const stubPlan: ProjectPlan = {
      id: crypto.randomUUID(),
      name: folderName,
      description: "",
      stack: { selected: ["nextjs", "typescript", "tailwind"] },
      features: [],
      pages: [],
      dataModels: [],
      authStrategy: "none",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    useProjectPlanStore.getState().setPlan(stubPlan);
    await writeFile(
      folderPath,
      "jugaad.json",
      JSON.stringify(stubPlan, null, 2),
    );
    setProjectPath(folderPath);
    setActiveTab("files");
    router.push(`/studio/${stubPlan.id}`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
            activeTab === "files"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Files className="h-3.5 w-3.5" />
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
            activeTab === "projects"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          Projects
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "files" ? (
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<LoadingSkeleton lines={6} />}>
              {displayPath ? <FileTree /> : <FolderPicker />}
            </Suspense>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ProjectBrowser onProjectOpen={() => setActiveTab("files")} />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border shrink-0">
        <button
          type="button"
          onClick={() => setFolderBrowserOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Open Folder
        </button>

        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md mx-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      {folderBrowserOpen && (
        <FolderBrowser
          onSelect={handleOpenExistingFolder}
          onClose={() => setFolderBrowserOpen(false)}
        />
      )}
    </div>
  );
}
