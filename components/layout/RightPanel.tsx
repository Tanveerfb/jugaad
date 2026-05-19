"use client";

import { useState, useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { useFsStore } from "@/stores/fsStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useDevServerStore } from "@/stores/devServerStore";
import { getProjectOutputPath } from "@/lib/utils";
import CodePreview from "@/components/editor/CodePreview";
import ThinkingPanel from "@/components/tasks/ThinkingPanel";
import PreviewPanel from "@/components/preview/PreviewPanel";
import { Monitor, Code2 } from "lucide-react";

type Tab = "code" | "preview";

export default function RightPanel() {
  const thinkingBuffer = useTaskStore((s) => s.thinkingBuffer);
  const streamBuffer = useTaskStore((s) => s.streamBuffer);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const allDone = useTaskStore(
    (s) => s.tasks.length > 0 && s.tasks.every((t) => t.status === "done"),
  );

  const projectPath = useFsStore((s) => s.projectPath);
  const plan = useProjectPlanStore((s) => s.plan);
  const showPreviewFlag = useDevServerStore((s) => s.showPreview);
  const previewUnlocked = useDevServerStore((s) => s.previewUnlocked);
  const setShowPreview = useDevServerStore((s) => s.setShowPreview);

  const [dismissedForTask, setDismissedForTask] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("code");

  // Auto-switch to preview tab when flagged from store (e.g. IterateInterface)
  // Must be a useEffect to avoid setState-during-render
  useEffect(() => {
    if (showPreviewFlag) {
      setTab("preview");
      setShowPreview(false);
    }
  }, [showPreviewFlag, setShowPreview]);

  const hasOutput = Boolean(thinkingBuffer || streamBuffer);
  const showThinking =
    activeTaskId !== null && hasOutput && dismissedForTask !== activeTaskId;

  const effectivePath =
    projectPath && plan ? getProjectOutputPath(projectPath, plan.name) : null;

  // Show the tab bar & preview panel once build is complete OR user has explicitly unlocked preview
  const canPreview = (allDone || previewUnlocked) && Boolean(effectivePath);

  if (showThinking) {
    return (
      <ThinkingPanel
        onViewCode={() => setDismissedForTask(activeTaskId ?? null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {activeTaskId !== null && !showThinking && (
        <button
          type="button"
          onClick={() => setDismissedForTask(null)}
          className="shrink-0 text-xs text-amber-400/70 bg-amber-400/5 hover:bg-amber-400/10 border-b border-border px-3 py-1.5 text-left transition-colors font-mono"
        >
          ● LLM output — click to view
        </button>
      )}

      {/* Tab bar — shown when build is done or preview is unlocked */}
      {canPreview && (
        <div className="flex shrink-0 border-b border-border">
          <TabButton
            label="Code"
            icon={<Code2 className="h-3.5 w-3.5" />}
            active={tab === "code"}
            onClick={() => setTab("code")}
          />
          <TabButton
            label="Preview"
            icon={<Monitor className="h-3.5 w-3.5" />}
            active={tab === "preview"}
            onClick={() => setTab("preview")}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {canPreview && tab === "preview" ? (
          <PreviewPanel projectPath={effectivePath!} />
        ) : (
          <CodePreview />
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
