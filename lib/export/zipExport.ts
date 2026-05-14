import JSZip from "jszip";
import { saveAs } from "file-saver";

async function addFolderToZip(
  zip: JSZip,
  handle: FileSystemDirectoryHandle,
  path = "",
): Promise<void> {
  for await (const [name, entry] of handle.entries()) {
    const entryPath = path ? `${path}/${name}` : name;
    if (entry.kind === "directory") {
      await addFolderToZip(zip, entry as FileSystemDirectoryHandle, entryPath);
    } else {
      const file = await (entry as FileSystemFileHandle).getFile();
      const content = await file.text();
      zip.file(entryPath, content);
    }
  }
}

export async function exportToZip(
  projectHandle: FileSystemDirectoryHandle,
  projectName: string,
): Promise<void> {
  const zip = new JSZip();
  await addFolderToZip(zip, projectHandle);
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });
  saveAs(blob, `${projectName}.zip`);
}
