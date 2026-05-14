import { useFsStore } from "@/stores/fsStore";

export async function openBaseFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  useFsStore.getState().setBaseFolderHandle(handle);
  localStorage.setItem("baseFolderName", handle.name);
  return handle;
}

export async function reconnectBaseFolder(): Promise<boolean> {
  const handle = useFsStore.getState().baseFolderHandle;
  if (!handle) return false;
  try {
    const permission = await handle.requestPermission({ mode: "readwrite" });
    return permission === "granted";
  } catch {
    return false;
  }
}

export async function createProjectFolder(
  base: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  return base.getDirectoryHandle(name, { create: true });
}
