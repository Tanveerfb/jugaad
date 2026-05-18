"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  X,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BrowseResult } from "@/app/api/fs/browse/route";

interface Props {
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function FolderBrowser({ onSelect, onClose }: Props) {
  const [result, setResult] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const browse = useCallback(async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = path
        ? `/api/fs/browse?path=${encodeURIComponent(path)}`
        : "/api/fs/browse";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Cannot read directory");
      const data: BrowseResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    browse();
  }, [browse]);

  /** Split the current path into crumb segments for display */
  function breadcrumbs(): { label: string; path: string }[] {
    if (!result) return [];
    const sep = result.path.includes("\\") ? "\\" : "/";
    const parts = result.path.split(sep).filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let acc = result.path.startsWith("\\\\") ? "\\\\" : "";
    if (result.path.match(/^[A-Za-z]:\\/)) {
      // Windows drive root e.g. C:\
      acc = parts[0] + "\\";
      crumbs.push({ label: parts[0], path: acc });
      for (let i = 1; i < parts.length; i++) {
        acc = acc + parts[i] + "\\";
        crumbs.push({ label: parts[i], path: acc });
      }
    } else {
      // Unix
      for (const part of parts) {
        acc = acc + "/" + part;
        crumbs.push({ label: part, path: acc });
      }
    }
    return crumbs;
  }

  const crumbs = breadcrumbs();
  const folderName = result?.path.split(/[\\/]/).filter(Boolean).pop() ?? "";

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* panel */}
      <div
        className="relative flex flex-col w-130 max-h-[70vh] rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold">Select Output Folder</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/40 shrink-0 overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => result && browse(result.homedir)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Home className="h-3 w-3" />
          </button>
          {crumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button
                type="button"
                onClick={() => browse(crumb.path)}
                className={cn(
                  "rounded px-1.5 py-0.5 hover:bg-muted transition-colors max-w-30 truncate",
                  i === crumbs.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>

        {/* nav + entries */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => browse()}>
                Go home
              </Button>
            </div>
          ) : (
            <ul className="py-1">
              {/* back row */}
              {result?.parent && (
                <li>
                  <button
                    type="button"
                    onClick={() => browse(result.parent!)}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span className="font-mono text-xs">..</span>
                  </button>
                </li>
              )}
              {result?.entries.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No sub-folders
                </li>
              )}
              {result?.entries.map((entry) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    onDoubleClick={() => browse(entry.path)}
                    onClick={() => browse(entry.path)}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-muted transition-colors group"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-yellow-500 group-hover:hidden" />
                    <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500 hidden group-hover:block" />
                    <span className="truncate">{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border shrink-0 bg-muted/30">
          <p className="text-xs text-muted-foreground font-mono truncate max-w-75">
            {result?.path ?? "—"}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!result}
              onClick={() => result && onSelect(result.path)}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Select &ldquo;{folderName}&rdquo;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
