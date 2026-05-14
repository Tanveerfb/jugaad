"use client";

import { useLLMConfigStore } from "@/stores/llmConfigStore";
import { fetchModels, LLMConnectionError } from "@/lib/llm/client";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import appConfig from "@/app.config";

type ConnectionStatus = "idle" | "checking" | "ok" | "fail";

export default function SettingsPage() {
  const store = useLLMConfigStore();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  // Track the last baseUrl checked so we don't double-fire on first render
  const lastChecked = useRef<string>("");

  const checkConnection = useCallback(
    async (baseUrl: string, silent = false) => {
      setStatus("checking");
      setAvailableModels([]);
      try {
        const models = await fetchModels({ baseUrl });
        setStatus("ok");
        setAvailableModels(models);
        if (!silent)
          toast.success(`Connected — ${models.length} model(s) found.`);
      } catch (err) {
        setStatus("fail");
        const msg =
          err instanceof LLMConnectionError
            ? err.message
            : "Unexpected error. Check console.";
        if (!silent) toast.error(msg);
      }
    },
    [],
  );

  // Auto-check whenever provider or baseUrl changes
  useEffect(() => {
    if (!store.baseUrl || store.baseUrl === lastChecked.current) return;
    lastChecked.current = store.baseUrl;
    checkConnection(store.baseUrl, true);
  }, [store.provider, store.baseUrl, checkConnection]);

  return (
    <div className="max-w-xl mx-auto py-12 px-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{appConfig.name} Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your local LLM connection.
        </p>
      </div>

      <div className="space-y-5">
        {/* Provider */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">LLM Provider</label>
          <div className="flex gap-2">
            {(["ollama", "lmstudio"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => store.setProvider(p)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  store.provider === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {p === "ollama" ? "Ollama" : "LM Studio"}
              </button>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Base URL</label>
          <input
            type="url"
            value={store.baseUrl}
            onChange={(e) => store.setBaseUrl(e.target.value)}
            placeholder={
              store.provider === "ollama"
                ? appConfig.defaults.llm.ollamaBaseUrl
                : appConfig.defaults.llm.lmstudioBaseUrl
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          {status === "checking" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">
                Checking connection…
              </span>
            </>
          )}
          {status === "ok" && (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-500">
                Connected · {availableModels.length} model
                {availableModels.length !== 1 ? "s" : ""} available
              </span>
            </>
          )}
          {status === "fail" && (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">
                Could not connect to provider
              </span>
            </>
          )}
        </div>

        {/* Model — dropdown when models are known, text input as fallback */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Model</label>
            {status !== "idle" && (
              <button
                type="button"
                onClick={() => checkConnection(store.baseUrl)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            )}
          </div>

          {availableModels.length > 0 ? (
            <select
              value={store.model}
              onChange={(e) => store.setModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {!availableModels.includes(store.model) && store.model && (
                <option value={store.model}>{store.model} (custom)</option>
              )}
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={store.model}
              onChange={(e) => store.setModel(e.target.value)}
              placeholder="llama3"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Temperature: {store.temperature}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={store.temperature}
            onChange={(e) => store.setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Max tokens */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Max Tokens</label>
          <input
            type="number"
            value={store.maxTokens}
            onChange={(e) => store.setMaxTokens(parseInt(e.target.value, 10))}
            min={512}
            max={32768}
            step={512}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Reset */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={store.reset}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
