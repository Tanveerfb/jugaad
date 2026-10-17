import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqliteStore } from "@/lib/data/sqlite";
import type { WorkbenchStore } from "@/lib/data/types";
import { listOnlineOnlyFiles } from "./online-only";
import { scanFolder } from "./scan-folder";

let store: WorkbenchStore;
let root: string;
let folder: string;
let folderId: string;
let guarded: string[];

beforeEach(() => {
  store = openSqliteStore(":memory:");
  root = mkdtempSync(join(tmpdir(), "jugaad-scan-"));
  folder = join(root, "Downloads");
  mkdirSync(folder);
  guarded = [join(folder, "AppData")];
  folderId = store.allowFolder(folder).id;
});
afterEach(() => {
  store.close();
  rmSync(root, { recursive: true, force: true });
});

function put(rel: string, content: string | Buffer = rel): string {
  const p = join(folder, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
  return p;
}

const noCloud = async () => new Set<string>();
const scan = (extra: Partial<Parameters<typeof scanFolder>[2]> = {}) =>
  scanFolder(store, folderId, { protectedPaths: guarded, listOnlineOnly: noCloud, ...extra });

describe("scanning a folder", () => {
  it("indexes every file with its metadata and hash", async () => {
    put("a.PDF", "hello");
    put("Sub\\deeper\\b.txt", "world");

    const result = await scan();
    expect(result).toMatchObject({ summary: { files: 2, hashed: 2, bytes: 10, duplicateFiles: 0 }, gone: 0 });
    const files = store.listIndexedFiles(folderId);
    expect(files.map((f) => [f.path, f.extension])).toEqual([
      ["a.PDF", "pdf"],
      ["Sub\\deeper\\b.txt", "txt"],
    ]);
    // sha-256 of "hello"
    expect(files[0].hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("reads document text and records a nothing-to-read marker for other types", async () => {
    put("notes.txt", "Electricity bill for March");
    put("disk.iso", "ISO");

    await scan();
    const files = Object.fromEntries(store.listIndexedFiles(folderId).map((f) => [f.path, f.id]));
    const signals = store.listFileSignals(folderId);
    expect(signals.get(files["notes.txt"])).toMatchObject({ kind: "text", excerpt: "Electricity bill for March" });
    expect(signals.get(files["disk.iso"])).toMatchObject({ kind: "none", excerpt: null });
    expect(store.listFilesWithoutSignals(folderId)).toEqual([]);
  });

  it("fingerprints a big one-of-a-kind file, and hashes it in full once a same-size twin appears", async () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 7);
    put("vod_2026-01-01.mp4", big);
    await scan();
    expect(store.listIndexedFiles(folderId)[0].hash).toMatch(/^q:/);

    put("vod copy.mp4", big);
    await scan();
    const hashes = store.listIndexedFiles(folderId).map((f) => f.hash);
    expect(hashes.every((h) => h && !h.startsWith("q:"))).toBe(true);
    expect(store.listDuplicateGroups(folderId)).toHaveLength(1);
  });

  it("finds duplicates by content, whatever their names", async () => {
    put("Invoice_0423_final.pdf", "same bytes");
    put("Invoice_0423_final(2).pdf", "same bytes");
    put("Old\\copy of invoice.pdf", "same bytes");
    put("other.pdf", "different");

    await scan();
    const groups = store.listDuplicateGroups(folderId);
    expect(groups).toHaveLength(1);
    expect(groups[0].files.map((f) => f.path).sort()).toEqual([
      "Invoice_0423_final(2).pdf",
      "Invoice_0423_final.pdf",
      "Old\\copy of invoice.pdf",
    ]);
    expect(store.getIndexSummary(folderId).duplicateFiles).toBe(3);
  });

  it("never descends into protected folders, tool folders or junctions", async () => {
    put("keep.txt");
    put("AppData\\Local\\secret.db");
    put(".git\\HEAD");
    put("node_modules\\x\\index.js");
    const outside = join(root, "Outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "not-yours.txt"), "x");
    symlinkSync(outside, join(folder, "Shortcut"), "junction");

    await scan();
    expect(store.listIndexedFiles(folderId).map((f) => f.path)).toEqual(["keep.txt"]);
  });

  it("lists online-only files but never reads them", async () => {
    put("local.txt", "x");
    const cloud = put("cloud.docx", "would download");

    await scan({ listOnlineOnly: async () => new Set([cloud.toLowerCase()]) });
    const files = store.listIndexedFiles(folderId);
    expect(files.find((f) => f.path === "cloud.docx")).toMatchObject({ state: "online-only", hash: null });
    expect(files.find((f) => f.path === "local.txt")?.hash).not.toBeNull();
  });

  it("reads nothing at all if it can't tell which files are online-only", async () => {
    put("a.txt");
    await expect(scan({ listOnlineOnly: async () => null })).rejects.toThrow(/nothing was read/);
    expect(store.listIndexedFiles(folderId)).toEqual([]);
  });

  it("does not re-read a file that hasn't changed, and re-reads one that has", async () => {
    put("same.txt", "v1");
    const changed = put("changed.txt", "v1");
    await scan();
    const before = Object.fromEntries(store.listIndexedFiles(folderId).map((f) => [f.path, f.hash]));

    writeFileSync(changed, "v2 is longer");
    utimesSync(changed, new Date(), new Date(Date.now() + 60_000));
    await scan();

    const after = Object.fromEntries(store.listIndexedFiles(folderId).map((f) => [f.path, f.hash]));
    expect(after["same.txt"]).toBe(before["same.txt"]);
    expect(after["changed.txt"]).not.toBe(before["changed.txt"]);
    // the changed file's text was read again from its new contents
    const id = store.listIndexedFiles(folderId).find((f) => f.path === "changed.txt")!.id;
    expect(store.listFileSignals(folderId).get(id)?.excerpt).toBe("v2 is longer");
  });

  it("marks files that disappeared since the last scan as gone", async () => {
    put("a.txt");
    const b = put("b.txt");
    await scan();
    rmSync(b);

    const result = await scan();
    expect(result).toMatchObject({ gone: 1, summary: { files: 1 } });
  });

  it("keeps one row when only the letter case of a name changed", async () => {
    put("report.pdf");
    await scan();
    rmSync(join(folder, "report.pdf"));
    put("Report.pdf");
    await scan();
    expect(store.listIndexedFiles(folderId).map((f) => f.path)).toEqual(["Report.pdf"]);
  });

  it("stops when asked and leaves the rest for the next run", async () => {
    for (let i = 0; i < 5; i++) put(`f${i}.txt`, `content ${i}`);
    const stop = new AbortController();
    stop.abort();
    expect(await scan({ signal: stop.signal })).toEqual({ stopped: true });
  });
});

describe.runIf(process.platform === "win32")("the PowerShell placeholder check", () => {
  it("runs, handles non-English names, and finds nothing in an ordinary folder", async () => {
    const odd = join(folder, "Фото — 写真");
    mkdirSync(odd);
    writeFileSync(join(odd, "a.jpg"), "x");
    const result = await listOnlineOnlyFiles([folder, odd]);
    expect(result).toEqual(new Set());
  }, 20_000);
});
