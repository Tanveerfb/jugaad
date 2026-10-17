import { readFile } from "node:fs/promises";
import path from "node:path";
import { AiTaskError, type WorkbenchAi } from "@/lib/ai";
import type { WorkbenchStore } from "@/lib/data";
import { renderFirstPage } from "@/lib/files/render-pdf-page";
import type { DescribeImageInput } from "@/schemas/image-caption-schema";

const MEDIA_TYPES: Record<string, DescribeImageInput["mediaType"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type DescribeOptions = {
  /** The vision model's id — captions are remembered per model. */
  model: string;
  /** Only these files (ids) — the ones a plan would sort. Leave out to look at every image. */
  only?: ReadonlySet<string>;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

/**
 * Lets the local vision model look at each image the folder holds and caption it in one line
 * (owner's choice, 2026-10-17: images only). A caption is remembered with the file's contents,
 * so an unchanged image is never looked at twice. An image the model can't describe — damaged,
 * or an answer that fails its check twice — keeps no caption and is sorted on its name, as
 * before. Returns how many images were captioned.
 */
export async function describeImages(
  store: WorkbenchStore,
  ai: WorkbenchAi,
  folderId: string,
  { model, only, signal, onProgress }: DescribeOptions,
): Promise<number> {
  const folder = store.getAllowedFolder(folderId);
  if (!folder) throw new Error("That folder is no longer on the allow-list.");
  const images = store.listImagesToDescribe(folderId, model).filter((f) => !only || only.has(f.id));
  let described = 0;
  for (const [i, file] of images.entries()) {
    if (signal?.aborted) break;
    onProgress?.(i, images.length);
    try {
      const full = path.join(folder.path, file.path);
      // a scanned PDF is shown as a picture of its first page
      const isPdf = file.extension === "pdf";
      const bytes = isPdf ? await renderFirstPage(full) : new Uint8Array(await readFile(full));
      const { caption } = await ai.describeImage(
        { image: bytes, mediaType: isPdf ? "image/png" : MEDIA_TYPES[file.extension], fileName: file.path.split(/[\\/]/).at(-1)! },
        { signal },
      );
      store.recordCaption(file.id, file.hash!, model, caption);
      described++;
    } catch (error) {
      if (signal?.aborted) break;
      // the model server is down: stop, the job reports it
      if (error instanceof AiTaskError && error.reason === "unreachable") throw error;
      // a file that vanished or is locked, or an answer that failed twice: carry on without it
    }
  }
  return described;
}
