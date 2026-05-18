import type { FileTreeNode } from "@/types";
import { useFsStore } from "@/stores/fsStore";

export async function buildTree(
  handle: FileSystemDirectoryHandle,
  path = "",
): Promise<FileTreeNode[]> {
  const nodes: FileTreeNode[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, entry] of (handle as any).entries()) {
    const nodePath = path ? `${path}/${name}` : name;
    if (entry.kind === "directory") {
      const children = await buildTree(
        entry as FileSystemDirectoryHandle,
        nodePath,
      );
      nodes.push({ name, path: nodePath, type: "directory", children });
    } else {
      nodes.push({ name, path: nodePath, type: "file" });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Rebuild the file tree from root, store in fsStore, and return it.
 */
export async function rebuildFileTree(
  root: FileSystemDirectoryHandle,
): Promise<FileTreeNode[]> {
  const tree = await buildTree(root);
  useFsStore.getState().setFileTree(tree);
  return tree;
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
