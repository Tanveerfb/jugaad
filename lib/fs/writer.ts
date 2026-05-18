import { useFsStore } from "@/stores/fsStore";

/**
 * Write a file via the Next.js server API (/api/fs/write).
 * Works in all browsers — no File System Access API required.
 */
export async function writeFile(
  projectPath: string,
  filePath: string,
  content: string,
): Promise<void> {
  const res = await fetch("/api/fs/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, filePath, content }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Write failed" }));
    throw new Error(error ?? "Write failed");
  }

  // Refresh the file tree in the sidebar
  await rebuildFileTree(projectPath);
}

/**
 * Read a file via the Next.js server API (/api/fs/read-file).
 */
export async function readFile(
  projectPath: string,
  filePath: string,
): Promise<string> {
  const res = await fetch(
    `/api/fs/read-file?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(filePath)}`,
  );

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Read failed" }));
    throw new Error(error ?? "Read failed");
  }

  const { content } = await res.json();
  return content as string;
}

/**
 * Rebuild the file tree by calling the server API and updating the store.
 */
async function rebuildFileTree(projectPath: string): Promise<void> {
  try {
    const res = await fetch(
      `/api/fs/tree?projectPath=${encodeURIComponent(projectPath)}`,
    );
    if (!res.ok) return;
    const { tree } = await res.json();
    useFsStore.getState().setFileTree(tree);
  } catch {
    // Non-fatal — tree will refresh on next interaction
  }
}
