"use client";

import { useState, useEffect } from "react";
import { exportToGitHub } from "@/lib/export/githubExport";
import { useProjectPlanStore } from "@/stores/projectPlanStore";
import { useFsStore } from "@/stores/fsStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, GitBranch, ExternalLink, X } from "lucide-react";

const TOKEN_KEY = "jugaad-github-token";

type Step = "idle" | "creating" | "uploading" | "finalizing" | "done" | "error";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function GitHubExportModal({ isOpen, onClose }: Props) {
  const plan = useProjectPlanStore((s) => s.plan);
  const projectHandle = useFsStore((s) => s.projectHandle);

  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (plan) {
      setRepoName(
        plan.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      );
      setDescription(plan.description);
    }
    const saved = localStorage.getItem(TOKEN_KEY) ?? "";
    if (saved) {
      setToken(saved);
      setTokenSaved(true);
    }
  }, [plan]);

  if (!isOpen) return null;

  async function handlePush() {
    if (!projectHandle) {
      toast.error("No project folder selected.");
      return;
    }
    if (!token.trim()) {
      toast.error("GitHub token is required.");
      return;
    }

    localStorage.setItem(TOKEN_KEY, token.trim());
    setErrorMsg("");

    try {
      setStep("creating");
      setStepLabel("Creating repository...");

      // Give UI time to update before heavy work
      await new Promise((r) => setTimeout(r, 0));

      setStep("uploading");
      setStepLabel("Uploading files...");

      const { repoUrl: url } = await exportToGitHub({
        projectHandle,
        repoName: repoName.trim(),
        description: description.trim(),
        token: token.trim(),
        isPrivate,
      });

      setStep("finalizing");
      setStepLabel("Finalizing...");
      await new Promise((r) => setTimeout(r, 300));

      setRepoUrl(url);
      setStep("done");
    } catch (err) {
      setStep("error");
      setErrorMsg((err as Error).message);
    }
  }

  const isLoading =
    step === "creating" || step === "uploading" || step === "finalizing";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <h2 className="text-base font-semibold">Push to GitHub</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "done" ? (
          <div className="space-y-4">
            <p className="text-sm text-green-400">
              Repository created successfully!
            </p>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary underline underline-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {repoUrl}
            </a>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => window.open(repoUrl, "_blank")}>
                View on GitHub
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Repo Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Repository Name
              </label>
              <input
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                disabled={isLoading}
                placeholder="my-project"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </label>
              <input
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                placeholder="What does this project do?"
              />
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Visibility
              </label>
              <div className="flex gap-2">
                {[false, true].map((priv) => (
                  <button
                    key={String(priv)}
                    type="button"
                    onClick={() => setIsPrivate(priv)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      isPrivate === priv
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    {priv ? "Private" : "Public"}
                  </button>
                ))}
              </div>
            </div>

            {/* Token */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Personal Access Token
                </label>
                {tokenSaved && (
                  <span className="text-xs text-green-400">Saved</span>
                )}
              </div>
              <input
                type="password"
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
                placeholder="ghp_..."
              />
              <p className="text-xs text-muted-foreground">
                Needs <code className="bg-muted rounded px-1">repo</code> scope.{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Create one
                </a>
              </p>
            </div>

            {/* Error */}
            {step === "error" && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}

            {/* Loading label */}
            {isLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {stepLabel}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handlePush}
                disabled={isLoading || !repoName.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <GitBranch className="h-4 w-4 mr-2" />
                )}
                Push to GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
