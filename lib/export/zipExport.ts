import { saveAs } from "file-saver";
import { toast } from "sonner";

export async function exportToZip(
  projectPath: string,
  projectName: string,
): Promise<void> {
  const res = await fetch(
    `/api/fs/export?projectPath=${encodeURIComponent(projectPath)}`,
  );
  if (!res.ok) throw new Error("Failed to read project files for export");
  const { files } = (await res.json()) as {
    files: { path: string; content: string }[];
  };

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const { path, content } of files) {
    zip.file(path, content);
  }
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  saveAs(blob, `${projectName}.zip`);
  toast.success(`Downloaded ${projectName}.zip`);
}
