/**
 * Project folders — code, game, video or design projects — are kept whole (owner's choice,
 * 2026-10-17): moved as one folder or not at all, never scattered file by file. A folder is a
 * project when it directly holds one of these marker files. Pure: works on the index's paths.
 */
const MARKER_NAMES = new Set([
  "package.json",
  "pyproject.toml",
  "setup.py",
  "requirements.txt",
  "cargo.toml",
  "go.mod",
  "cmakelists.txt",
  "pom.xml",
  "build.gradle",
]);
const MARKER_EXTENSIONS = new Set(["sln", "csproj", "uproject", "blend", "prproj", "aep", "drp", "veg"]);

export type ProjectRoot = { path: string; marker: string; files: number };

/** True when a file name marks the folder holding it as a project. */
export function isProjectMarker(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return MARKER_NAMES.has(lower) || (dot > 0 && MARKER_EXTENSIONS.has(lower.slice(dot + 1)));
}

/**
 * The outermost project folders among the given relative file paths. The allowed folder itself
 * is never one (its loose files are what the Organiser sorts); a project inside a project is
 * part of the outer one.
 */
export function findProjectRoots(paths: readonly string[]): ProjectRoot[] {
  const markers = new Map<string, string>();
  for (const p of paths) {
    const parts = p.split(/[\\/]/);
    if (parts.length < 2 || !isProjectMarker(parts.at(-1)!)) continue;
    const dir = parts.slice(0, -1).join("\\");
    if (!markers.has(dir.toLowerCase())) markers.set(dir.toLowerCase(), parts.at(-1)!);
  }
  const roots = [...markers.keys()]
    .sort((a, b) => a.length - b.length)
    .filter((dir, _, all) => !all.some((other) => other !== dir && dir.startsWith(`${other}\\`)));
  return roots.map((root) => {
    const files = paths.filter((p) => insideDir(p, root)).length;
    const original = paths.find((p) => insideDir(p, root))!.split(/[\\/]/).slice(0, root.split("\\").length).join("\\");
    return { path: original, marker: markers.get(root)!, files };
  });
}

/** True when a relative path lies inside a project folder (compared without letter case). */
export function insideDir(path: string, dir: string): boolean {
  return path.toLowerCase().replace(/\//g, "\\").startsWith(`${dir.toLowerCase()}\\`);
}
