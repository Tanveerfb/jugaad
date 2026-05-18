import { saveAs } from "file-saver";
import { toast } from "sonner";

async function addFolderToZip(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zip: any,
  handle: FileSystemDirectoryHandle,
  prefix = "",
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const [name, entry] of (handle as any).entries()) {
    const entryPath = prefix ? `${prefix}/${name}` : name;
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
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  await addFolderToZip(zip, projectHandle);
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  saveAs(blob, `${projectName}.zip`);
  toast.success(`Downloaded ${projectName}.zip`);
}
