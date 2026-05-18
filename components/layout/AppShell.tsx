"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/shared/BrandLogo";
import ProviderBadge from "@/components/shared/ProviderBadge";
import GitHubExportModal from "@/components/export/GitHubExportModal";
import { Settings, Download, GitBranch, Loader2 } from "lucide-react";
import appConfig from "@/app.config";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { exportToZip } from "@/lib/export/zipExport";
import { useFsStore } from "@/stores/fsStore";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useAuthStore } from "@/stores/authStore";
import { signOut } from "@/lib/firebase/authHelpers";
import { toast } from "sonner";

function TopBar() {
  const projectHandle = useFsStore((s) => s.projectHandle);
  const plan = useProjectPlanStore((s) => s.plan);
  const user = useAuthStore((s) => s.user);
  const [githubOpen, setGithubOpen] = useState(false);
  const [zipping, setZipping] = useState(false);

  async function handleZipExport() {
    if (!projectHandle || !plan) return;
    setZipping(true);
    try {
      await exportToZip(projectHandle, plan.name);
    } finally {
      setZipping(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
  }

  return (
    <>
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

          {/* Export buttons — only shown when project folder is selected */}
          {projectHandle && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title="Export ZIP"
                onClick={handleZipExport}
                disabled={zipping}
              >
                {zipping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Push to GitHub"
                onClick={() => setGithubOpen(true)}
              >
                <GitBranch className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Auth UI */}
          {user === null ? (
            <AuthButton />
          ) : user.isAnonymous ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                Guest
              </span>
              <AuthButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserAvatar user={user} />
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}

          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <GitHubExportModal
        isOpen={githubOpen}
        onClose={() => setGithubOpen(false)}
      />
    </>
  );
}

function AuthButton() {
  // Lazy import AuthModal to avoid circular deps — renders only on click
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
      >
        Sign in
      </button>
      {open && (
        <AuthModalDynamic isOpen={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function AuthModalDynamic({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // We import lazily via next/dynamic to keep the auth bundle separate
  const AuthModal = require("@/components/auth/AuthModal").default;
  return <AuthModal isOpen={isOpen} onClose={onClose} />;
}

function UserAvatar({
  user,
}: {
  user: {
    displayName: string | null;
    photoURL: string | null;
    email: string | null;
  };
}) {
  if (user.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt={user.displayName ?? "User"}
        className="h-7 w-7 rounded-full object-cover"
        title={user.email ?? undefined}
      />
    );
  }
  const initials = (user.displayName ?? user.email ?? "G")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary"
      title={user.email ?? undefined}
    >
      {initials}
    </div>
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
