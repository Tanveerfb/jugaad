"use client";

import dynamic from "next/dynamic";
import { useFsStore } from "@/stores/fsStore";
import { useRef, useCallback } from "react";
import { writeFile } from "@/lib/fs/writer";
import { CheckCheck, Save } from "lucide-react";
import { useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const MAP: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    md: "markdown",
    html: "html",
    env: "plaintext",
  };
  return MAP[ext ?? ""] ?? "plaintext";
}

type CodePreviewProps = {
  readOnly?: boolean;
};

export default function CodePreview({ readOnly = false }: CodePreviewProps) {
  const selectedFilePath = useFsStore((s) => s.selectedFilePath);
  const selectedFileContent = useFsStore((s) => s.selectedFileContent);
  const projectHandle = useFsStore((s) => s.projectHandle);
  const selectFile = useFsStore((s) => s.selectFile);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!value || !selectedFilePath || !projectHandle || readOnly) return;

      selectFile(selectedFilePath, value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await writeFile(projectHandle, selectedFilePath, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 500);
    },
    [selectedFilePath, projectHandle, readOnly, selectFile],
  );

  if (!selectedFilePath) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a file to preview
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20 shrink-0">
        <p className="text-xs font-mono text-muted-foreground truncate">
          {selectedFilePath}
        </p>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCheck className="h-3 w-3" />
            Saved
          </span>
        )}
        {!saved && !readOnly && (
          <Save className="h-3 w-3 text-muted-foreground opacity-40" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={getLanguage(selectedFilePath)}
          value={selectedFileContent ?? ""}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
          }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
