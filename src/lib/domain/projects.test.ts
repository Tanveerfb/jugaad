import { describe, expect, it } from "vitest";
import { findProjectRoots, insideDir, isProjectMarker } from "./projects";

describe("project folders", () => {
  it("recognises the marker files of code, game, video and design projects", () => {
    for (const name of ["package.json", "PyProject.toml", "Game.uproject", "scene.blend", "Edit.prproj", "App.sln"]) {
      expect(isProjectMarker(name)).toBe(true);
    }
    for (const name of ["notes.txt", "photo.png", "package.json.bak"]) expect(isProjectMarker(name)).toBe(false);
  });

  it("finds the outermost project folders, with their file counts", () => {
    const roots = findProjectRoots([
      "invoice.pdf",
      "package.json", // the allowed folder itself is never a project
      "streamerbot-setup\\package.json",
      "streamerbot-setup\\src\\index.ts",
      "streamerbot-setup\\tools\\cli\\package.json", // inside the outer project
      "Old stuff\\Blender scenes\\scene.blend",
      "Old stuff\\Blender scenes\\textures\\wood.png",
      "Old stuff\\notes.txt",
    ]);
    expect(roots).toEqual([
      { path: "streamerbot-setup", marker: "package.json", files: 3 },
      { path: "Old stuff\\Blender scenes", marker: "scene.blend", files: 2 },
    ]);
  });

  it("matches paths inside a folder without letter case, and not a sibling sharing a prefix", () => {
    expect(insideDir("Streamerbot-Setup\\src\\a.ts", "streamerbot-setup")).toBe(true);
    expect(insideDir("streamerbot-setup-old\\a.ts", "streamerbot-setup")).toBe(false);
  });
});
