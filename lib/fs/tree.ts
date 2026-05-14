import type { FileTreeNode } from "@/types";

export async function buildTree(
  handle: FileSystemDirectoryHandle,
  path = "",
): Promise<FileTreeNode[]> {
  const nodes: FileTreeNode[] = [];

  for await (const [name, entry] of handle.entries()) {
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
