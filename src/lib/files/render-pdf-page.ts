import { readFile } from "node:fs/promises";
import { renderPageAsImage } from "unpdf";

/**
 * Page 1 of a PDF as a PNG, for the vision model — used only for PDFs with no text layer
 * (scans, image-only exports), which gave nothing to read (22 of them on the owner's Downloads,
 * 2026-10-17). Rendered small: enough to tell a receipt from a certificate.
 */
export async function renderFirstPage(file: string): Promise<Uint8Array<ArrayBuffer>> {
  const data = new Uint8Array(await readFile(file));
  const png = await renderPageAsImage(data, 1, {
    canvasImport: () => import("@napi-rs/canvas"),
    width: 900,
  });
  return new Uint8Array(png);
}
