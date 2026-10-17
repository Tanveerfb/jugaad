import path from "node:path";

/**
 * The allow-list rules, as pure functions over path strings (no disk access — the callers in
 * `lib/safety/` resolve real paths first). Spec: nothing outside the allow-listed folders is
 * ever read, system and program folders are never visible, and no module deletes.
 *
 * Windows paths compare case-insensitively: `C:\Users` and `c:\users` are the same folder.
 */

export type PathRules = {
  /** Path functions for the platform — `path.win32` in tests that pin Windows behaviour. */
  api: path.PlatformPath;
  /** Windows and macOS file systems are case-insensitive by default. */
  caseInsensitive: boolean;
};

export const NATIVE_RULES: PathRules = { api: path, caseInsensitive: process.platform !== "linux" };

function comparable(p: string, rules: PathRules): string {
  const resolved = rules.api.resolve(p);
  return rules.caseInsensitive ? resolved.toLowerCase() : resolved;
}

/** True when `child` is `parent` itself or somewhere beneath it. */
export function isInside(parent: string, child: string, rules: PathRules = NATIVE_RULES): boolean {
  const rel = rules.api.relative(comparable(parent, rules), comparable(child, rules));
  return rel === "" || (!rel.startsWith("..") && !rules.api.isAbsolute(rel));
}

/** True when two paths name the same place. */
export function samePath(a: string, b: string, rules: PathRules = NATIVE_RULES): boolean {
  return comparable(a, rules) === comparable(b, rules);
}

/** True when two paths differ only in letter case — a rename Windows needs to do in two steps. */
export function differsOnlyInCase(a: string, b: string, rules: PathRules = NATIVE_RULES): boolean {
  return a !== b && rules.api.resolve(a).toLowerCase() === rules.api.resolve(b).toLowerCase();
}

/**
 * Folders no module may ever see or touch, from the machine's own environment. Allowed folders
 * may not sit inside these; where one sits inside an allowed folder (AppData under a user
 * folder, Jugaad's own data folder), the scanner skips it.
 */
export function protectedFolders(env: Readonly<Record<string, string | undefined>>, dataDir: string): string[] {
  const fromEnv = [
    env.SystemRoot ?? env.windir,
    env.ProgramFiles,
    env["ProgramFiles(x86)"],
    env.ProgramData,
    env.APPDATA,
    env.LOCALAPPDATA,
  ];
  const drives = new Set<string>();
  for (const p of fromEnv) if (p && /^[A-Za-z]:/.test(p)) drives.add(p.slice(0, 2).toUpperCase());
  if (env.SystemDrive) drives.add(env.SystemDrive.toUpperCase());
  // per-drive system folders exist on every NTFS drive, not only C:
  const perDrive = [...drives].flatMap((d) => [`${d}\\$Recycle.Bin`, `${d}\\System Volume Information`]);
  return [...fromEnv.filter((p): p is string => !!p), ...perDrive, dataDir];
}

/** True when the path is, or is inside, a protected folder. */
export function isProtected(p: string, protectedPaths: readonly string[], rules: PathRules = NATIVE_RULES): boolean {
  return protectedPaths.some((guarded) => isInside(guarded, p, rules));
}

export type FolderRefusal =
  | "not-absolute"
  | "drive-root"
  | "protected"
  | "already-allowed"
  | "inside-allowed"
  | "contains-allowed";

/** What the owner sees when a folder can't be added — said plainly, with the way out. */
export const FOLDER_REFUSAL_TEXT: Record<FolderRefusal, string> = {
  "not-absolute": "Paste a full path, starting with a drive letter — for example E:\\Downloads.",
  "drive-root": "A whole drive can't be added. Add the folders on it you want organised.",
  protected: "That's a system or program folder, which Jugaad never touches.",
  "already-allowed": "That folder is already on the list.",
  "inside-allowed": "That folder is already covered — it's inside a folder on the list.",
  "contains-allowed": "That folder contains one already on the list. Remove the inner one first.",
};

/**
 * Checks a candidate allowed folder against the rules. `candidate` should already be the
 * resolved real path; this function only reasons about strings.
 */
export function checkAllowedFolder(
  candidate: string,
  existing: readonly string[],
  protectedPaths: readonly string[],
  rules: PathRules = NATIVE_RULES,
): FolderRefusal | null {
  const { api } = rules;
  // on Windows `\Downloads` counts as absolute but means "on whatever drive is current"
  const rooted = api.sep === "\\" ? /^([A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/.test(candidate) : api.isAbsolute(candidate);
  if (!rooted) return "not-absolute";
  const resolved = api.resolve(candidate);
  if (api.parse(resolved).root === resolved || api.dirname(resolved) === resolved) return "drive-root";
  if (isProtected(resolved, protectedPaths, rules)) return "protected";
  for (const folder of existing) {
    if (samePath(folder, resolved, rules)) return "already-allowed";
    if (isInside(folder, resolved, rules)) return "inside-allowed";
    if (isInside(resolved, folder, rules)) return "contains-allowed";
  }
  return null;
}

/**
 * Turns a path relative to an allowed folder into an absolute one, refusing anything that
 * climbs out (`..\..\Windows`) or is already absolute. Every move goes through this.
 */
export function resolveInside(folder: string, relative: string, rules: PathRules = NATIVE_RULES): string {
  const { api } = rules;
  if (!relative || api.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) {
    throw new Error(`Not a path inside the folder: ${relative}`);
  }
  const absolute = api.resolve(folder, relative);
  if (samePath(absolute, folder, rules) || !isInside(folder, absolute, rules)) {
    throw new Error(`Path leaves its folder: ${relative}`);
  }
  return absolute;
}
