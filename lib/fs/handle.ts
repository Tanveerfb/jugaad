import { useFsStore, setStoredFolderName } from "@/stores/fsStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = (typeof window !== "undefined" ? window : {}) as any;

export async function openBaseFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await win.showDirectoryPicker({
    mode: "readwrite",
    startIn: "documents",
  });
  useFsStore.getState().setBaseFolderHandle(handle);
  setStoredFolderName(handle.name);
  return handle;
}

export async function requestPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any;
  const status = await h.queryPermission({ mode: "readwrite" });
  if (status === "granted") return true;
  if (status === "prompt") {
    const result = await h.requestPermission({ mode: "readwrite" });
    return result === "granted";
  }
  return false;
}

export async function createProjectFolder(
  base: FileSystemDirectoryHandle,
  projectName: string,
): Promise<FileSystemDirectoryHandle> {
  const sanitized = projectName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
  const handle = await base.getDirectoryHandle(sanitized, { create: true });
  useFsStore.getState().setProjectHandle(handle);
  return handle;
}
