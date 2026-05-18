import type { FileTreeNode } from "@/types";
import { useFsStore } from "@/stores/fsStore";

/**
 * Rebuild the file tree by calling the server API and updating the store.
 */
export async function rebuildFileTree(
  projectPath: string,
): Promise<FileTreeNode[]> {
  const res = await fetch(
    `/api/fs/tree?projectPath=${encodeURIComponent(projectPath)}`,
  );
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Tree failed" }));
    throw new Error(error ?? "Tree failed");
  }
  const { tree } = await res.json();
  useFsStore.getState().setFileTree(tree);
  return tree as FileTreeNode[];
}

/**
 * Map a file path to a Monaco editor language identifier.
 */
export function getFileLanguage(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  if (name.startsWith(".env")) return "plaintext";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const MAP: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    md: "markdown",
    html: "html",
    mdx: "markdown",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
    prisma: "plaintext",
  };
  return MAP[ext] ?? "plaintext";
}
