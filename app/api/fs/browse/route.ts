import { type NextRequest } from "next/server";
import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { join, normalize } from "path";
import { homedir, platform } from "os";

export interface BrowseEntry {
  name: string;
  path: string;
}

export interface BrowseResult {
  path: string;
  parent: string | null;
  homedir: string;
  entries: BrowseEntry[];
  /** Windows-only: all detected drive letters (e.g. ["C:\\", "D:\\"]) */
  drives?: string[];
}

/** Detect available drive letters on Windows by probing A–Z. Cached after first call. */
let _cachedDrives: string[] | null = null;
function getWindowsDrives(): string[] {
  if (_cachedDrives) return _cachedDrives;
  const drives: string[] = [];
  for (let code = 65; code <= 90; code++) {
    const drive = `${String.fromCharCode(code)}:\\`;
    try {
      if (existsSync(drive)) drives.push(drive);
    } catch {
      // inaccessible drive — skip
    }
  }
  _cachedDrives = drives;
  return drives;
}

/** Returns candidate root paths the user is allowed to browse. */
function allowedRoots(): string[] {
  const home = homedir();
  if (platform() === "win32") {
    return [...getWindowsDrives(), home];
  }
  return [home, "/tmp", "/var/tmp"];
}

function isSafePath(p: string): boolean {
  const n = normalize(p);
  return allowedRoots().some((r) => n.startsWith(normalize(r)));
}

export async function GET(req: NextRequest): Promise<Response> {
  const rawPath = req.nextUrl.searchParams.get("path");

  // No path = return home directory
  const targetPath = rawPath ? normalize(rawPath) : homedir();

  if (!isSafePath(targetPath)) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const entries = await readdir(targetPath, { withFileTypes: true });

    const dirs: BrowseEntry[] = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => ({ name: e.name, path: join(targetPath, e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = normalize(join(targetPath, ".."));
    const atRoot = parentPath === targetPath;

    const result: BrowseResult = {
      path: targetPath,
      parent: atRoot ? null : parentPath,
      homedir: homedir(),
      entries: dirs,
      drives: platform() === "win32" ? getWindowsDrives() : undefined,
    };

    return Response.json(result);
  } catch {
    return Response.json({ error: "Cannot read directory" }, { status: 400 });
  }
}
