import { useFsStore } from "@/stores/fsStore";
import { readFile, writeFile } from "@/lib/fs/writer";
import { rebuildFileTree } from "@/lib/fs/tree";

export function useFileSystem() {
  const projectPath = useFsStore((s) => s.projectPath);

  async function refreshTree() {
    if (!projectPath) throw new Error("No project folder selected.");
    return rebuildFileTree(projectPath);
  }

  async function read(filePath: string) {
    if (!projectPath) throw new Error("No project folder selected.");
    return readFile(projectPath, filePath);
  }

  async function write(filePath: string, content: string) {
    if (!projectPath) throw new Error("No project folder selected.");
    return writeFile(projectPath, filePath, content);
  }

  return {
    projectPath,
    refreshTree,
    read,
    write,
  };
}
