import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import JSZip from "jszip";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { docxWith, jpegWithExif, pdfWith } from "./fixtures/build-files";
import { EXCERPT_CHARS, hasReadableSignals, readSignals, toExcerpt } from "./read-signals";

const dir = mkdtempSync(join(tmpdir(), "jugaad-signals-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function file(name: string, content: string | Buffer): string {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
}

describe("reading signals", () => {
  it("reads the opening text of a PDF, with its page count", async () => {
    const p = file("invoice.pdf", pdfWith("Invoice 0423 - Total due 120.00"));
    expect(await readSignals(p, "pdf", 1000)).toMatchObject({
      kind: "pdf",
      excerpt: "Invoice 0423 - Total due 120.00",
      pageCount: 1,
      error: null,
    });
  });

  it("reads a Word document's text", async () => {
    const p = file("letter.docx", await docxWith("Dear landlord, about the lease renewal"));
    expect(await readSignals(p, "docx", 1000)).toMatchObject({ kind: "docx", excerpt: "Dear landlord, about the lease renewal" });
  });

  it("reads only the opening of a text file", async () => {
    const p = file("notes.txt", "Shopping\n\n  list:   milk\n" + "x".repeat(50_000));
    const signals = await readSignals(p, "txt", 50_030);
    expect(signals.kind).toBe("text");
    expect(signals.excerpt?.startsWith("Shopping list: milk")).toBe(true);
    expect(signals.excerpt?.length).toBe(EXCERPT_CHARS);
  });

  it("reads a photo's capture time and camera, and whether it has a location", async () => {
    const p = file("IMG_2001.jpg", jpegWithExif({ make: "Google", model: "Pixel 8", taken: "2024:05:01 10:00:00" }));
    const signals = await readSignals(p, "jpg", 200);
    expect(signals).toMatchObject({ kind: "image", camera: "Google Pixel 8", hasLocation: false, error: null });
    expect(signals.takenAt).not.toBeNull();
  });

  it("records a damaged file's error instead of throwing", async () => {
    const p = file("broken.pdf", "this is not a pdf");
    const signals = await readSignals(p, "pdf", 17);
    expect(signals.kind).toBe("none");
    expect(signals.error).toBeTruthy();
  });

  it("knows which types have anything to read", () => {
    expect(hasReadableSignals("pdf")).toBe(true);
    expect(hasReadableSignals("heic")).toBe(true);
    expect(hasReadableSignals("exe")).toBe(true);
    expect(hasReadableSignals("zip")).toBe(true);
    expect(hasReadableSignals("mp4")).toBe(true);
    expect(hasReadableSignals("iso")).toBe(false);
    expect(hasReadableSignals("bin")).toBe(false);
  });

  it("collapses whitespace and drops empty text", () => {
    expect(toExcerpt("  a\n\tb  ")).toBe("a b");
    expect(toExcerpt(" \n ")).toBeNull();
  });
});

describe("reading what other tools can tell", () => {
  it("lists an archive's contents without unpacking it", async () => {
    const zip = new JSZip();
    zip.file("addon/__init__.py", "bl_info = {}");
    zip.file("addon/ui.py", "x = 1");
    const p = file("blender-addon.zip", await zip.generateAsync({ type: "nodebuffer" }));
    const signals = await readSignals(p, "zip", 300);
    expect(signals.kind).toBe("archive");
    expect(signals.excerpt).toMatch(/Archive of 2 files: .*__init__\.py/);
  });

  it("records a damaged archive's error instead of throwing", async () => {
    const p = file("broken.zip", "not a zip");
    expect(await readSignals(p, "zip", 9)).toMatchObject({ kind: "archive", excerpt: null });
  });

  it.runIf(hasFfmpeg())("reads a video's length and shape", { timeout: 30_000 }, async () => {
    const p = join(dir, "clip.mp4");
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=duration=2:size=320x568:rate=10", "-pix_fmt", "yuv420p", p]);
    const signals = await readSignals(p, "mp4", 1000);
    expect(signals.kind).toBe("video");
    expect(signals.excerpt).toMatch(/^Video, 2 s, 320×568 portrait, h264/);
  });
});

function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
