import { useFsStore } from "@/stores/fsStore";
import {
  openBaseFolder,
  reconnectBaseFolder,
  createProjectFolder,
} from "@/lib/fs/handle";
import { readFile, writeFile, deleteFile } from "@/lib/fs/writer";

export function useFileSystem() {
  const baseFolderHandle = useFsStore((s) => s.baseFolderHandle);
  const projectHandle = useFsStore((s) => s.projectHandle);
  const setProjectHandle = useFsStore((s) => s.setProjectHandle);

  async function pickBaseFolder() {
    return openBaseFolder();
  }

  async function reconnect() {
    return reconnectBaseFolder();
  }

  async function createProject(name: string) {
    if (!baseFolderHandle) throw new Error("No base folder selected.");
    const handle = await createProjectFolder(baseFolderHandle, name);
    setProjectHandle(handle);
    return handle;
  }

  async function read(filePath: string) {
    if (!projectHandle) throw new Error("No project folder selected.");
    return readFile(projectHandle, filePath);
  }

  async function write(filePath: string, content: string) {
    if (!projectHandle) throw new Error("No project folder selected.");
    return writeFile(projectHandle, filePath, content);
  }

  async function remove(filePath: string) {
    if (!projectHandle) throw new Error("No project folder selected.");
    return deleteFile(projectHandle, filePath);
  }

  return {
    baseFolderHandle,
    projectHandle,
    pickBaseFolder,
    reconnect,
    createProject,
    read,
    write,
    remove,
  };
}
