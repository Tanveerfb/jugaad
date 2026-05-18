import { rebuildFileTree } from "./tree";
import { useFsStore } from "@/stores/fsStore";

async function getOrCreateDirHandle(
  root: FileSystemDirectoryHandle,
  parts: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

export async function writeFile(
  root: FileSystemDirectoryHandle,
  filePath: string,
  content: string,
): Promise<void> {
  const parts = filePath.split("/");
  const fileName = parts.pop()!;
  const dirHandle =
    parts.length > 0 ? await getOrCreateDirHandle(root, parts) : root;

  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();

  await rebuildFileTree(root);
}

export async function readFile(
  root: FileSystemDirectoryHandle,
  filePath: string,
): Promise<string> {
  const parts = filePath.split("/");
  const fileName = parts.pop()!;

  let dirHandle = root;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part);
  }

  const fileHandle = await dirHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

export async function deleteFile(
  root: FileSystemDirectoryHandle,
  filePath: string,
): Promise<void> {
  const parts = filePath.split("/");
  const fileName = parts.pop()!;

  let dirHandle = root;
  for (const part of parts) {
    dirHandle = await dirHandle.getDirectoryHandle(part);
  }

  await dirHandle.removeEntry(fileName);

  await rebuildFileTree(root);
}
