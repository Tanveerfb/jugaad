"use client";

import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
import ProviderBadge from "@/components/shared/ProviderBadge";
import { Settings, Download, GitBranch } from "lucide-react";
import appConfig from "@/app.config";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportToZip } from "@/lib/export/zipExport";
import { useFsStore } from "@/stores/fsStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";

function TopBar() {
  const projectHandle = useFsStore((s) => s.projectHandle);
  const plan = useProjectPlanStore((s) => s.plan);

  async function handleZipExport() {
    if (!projectHandle || !plan) return;
    await exportToZip(projectHandle, plan.name);
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-4 h-12 shrink-0">
      <div className="flex items-center gap-3">
        <BrandLogo variant="icon" />
        <span className="text-sm font-semibold">{appConfig.name}</span>
        {plan && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">{plan.name}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ProviderBadge />
        {projectHandle && (
          <>
            <Button
              variant="ghost"
              size="icon"
              title="Export ZIP"
              onClick={handleZipExport}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Link
              href="/studio/export"
              title="Export to GitHub"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            >
              <GitBranch className="h-4 w-4" />
            </Link>
          </>
        )}
        <Link
          href="/settings"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

type AppShellProps = {
  sidebar: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
};

export default function AppShell({ sidebar, center, right }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — 240px */}
        <aside className="w-60 shrink-0 border-r border-border flex flex-col overflow-hidden">
          {sidebar}
        </aside>

        {/* Center panel — flex-1 */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {center}
        </main>

        {/* Right panel — 420px */}
        <aside className="w-105 shrink-0 border-l border-border flex flex-col overflow-hidden">
          {right}
        </aside>
      </div>
    </div>
  );
}
