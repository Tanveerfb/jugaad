"use client";

import { useState, useEffect, useRef } from "react";
import { useDevServerStore } from "@/stores/devServerStore";
import EnvVarForm from "@/components/preview/EnvVarForm";
import {
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Monitor,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  projectPath: string;
}

export default function PreviewPanel({ projectPath }: Props) {
  const store = useDevServerStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); // bump to hard-reload iframe

  // On mount: check if server is already running for this project
  useEffect(() => {
    if (!projectPath) return;
    void fetch(`/api/run/status?projectPath=${encodeURIComponent(projectPath)}`)
      .then((r) => r.json())
      .then((data: { running: boolean; url?: string; port?: number }) => {
        if (data.running && data.url && data.port) {
          store.setServer(data.url, data.port);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  async function detectEnvAndStart() {
    store.setStatus("starting");
    try {
      const res = await fetch("/api/env/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
      const { all, missing } = (await res.json()) as {
        all: string[];
        missing: string[];
      };
      store.setEnvInfo(all, missing);

      if (missing.length > 0) {
        // Pause and ask user for env vars
        store.setStatus("idle"); // show the form instead
        return;
      }
      await doStart();
    } catch (err) {
      store.setError((err as Error).message);
    }
  }

  async function doStart() {
    store.setStatus("starting");
    try {
      const res = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath }),
      });
      const data = (await res.json()) as {
        url?: string;
        port?: number;
        error?: string;
      };
      if (!res.ok || !data.url || !data.port) {
        store.setError(data.error ?? "Failed to start dev server");
        return;
      }
      store.setServer(data.url, data.port);
    } catch (err) {
      store.setError((err as Error).message);
    }
  }

  async function handleEnvSubmit(values: Record<string, string>) {
    store.setStatus("starting");
    try {
      await fetch("/api/env/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath, values }),
      });
      store.setEnvInfo(store.envVars, []);
      await doStart();
    } catch (err) {
      store.setError((err as Error).message);
    }
  }

  async function handleStop() {
    store.setStatus("stopping");
    await fetch("/api/run/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath }),
    });
    store.reset();
  }

  function handleRefresh() {
    setKey((k) => k + 1);
  }

  // Show env form when missing vars exist and we're in idle state
  const needsEnv =
    store.missingVars.length > 0 &&
    (store.status === "idle" || store.status === "error");

  if (needsEnv) {
    return (
      <EnvVarForm
        vars={store.missingVars}
        onSubmit={handleEnvSubmit}
        isSubmitting={store.status === "starting"}
      />
    );
  }

  if (store.status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Monitor className="h-8 w-8 opacity-30" />
        <p className="text-sm">Preview not running</p>
        <Button size="sm" onClick={detectEnvAndStart}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Start Preview
        </Button>
      </div>
    );
  }

  if (store.status === "starting") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Starting dev server…</p>
        <p className="text-xs opacity-60">
          This may take 10–30 seconds on first run.
        </p>
      </div>
    );
  }

  if (store.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
        <p className="text-sm text-destructive">Failed to start preview</p>
        <p className="text-xs text-muted-foreground">{store.error}</p>
        <Button size="sm" variant="outline" onClick={detectEnvAndStart}>
          Retry
        </Button>
      </div>
    );
  }

  // Running state
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground font-mono truncate flex-1 pl-1">
          {store.url}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh"
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a
          href={store.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={handleStop}
          title="Stop server"
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* iframe */}
      <iframe
        key={key}
        ref={iframeRef}
        src={store.url ?? "about:blank"}
        className="flex-1 w-full border-0 bg-white"
        title="Project Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
