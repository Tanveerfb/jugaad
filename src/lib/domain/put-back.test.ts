import { describe, expect, it } from "vitest";
import { leftOwnFolder, putBackGroups } from "./put-back";

const move = (fromPath: string, toPath: string, status = "moved") => ({ fromPath, toPath, status });

describe("files moved out of the owner's folders", () => {
  it("counts a file that left a subfolder, not a loose file that was sorted", () => {
    expect(leftOwnFolder(move("Photos 2024\\a.jpg", "Group photos\\a.jpg"))).toBe(true);
    expect(leftOwnFolder(move("a.jpg", "Group photos\\a.jpg"))).toBe(false);
  });

  it("ignores moves that stayed in the same folder, or were already undone", () => {
    expect(leftOwnFolder(move("Fonts\\a.ttf", "fonts\\b.ttf"))).toBe(false);
    expect(leftOwnFolder(move("Fonts\\a.ttf", "_review\\a.ttf", "undone"))).toBe(false);
  });

  it("groups them by folder, most first, with where they went", () => {
    const groups = putBackGroups([
      move("NCA\\x.pdf", "Documents\\x.pdf"),
      move("Oxford\\1.jpg", "Group photos\\1.jpg"),
      move("Oxford\\2.jpg", "Group photos\\2.jpg"),
      move("Oxford\\3.png", "_review\\3.png"),
      move("loose.pdf", "Documents\\loose.pdf"),
    ]);
    expect(groups).toEqual([
      { folder: "Oxford", files: 3, wentTo: ["Group photos", "_review"] },
      { folder: "NCA", files: 1, wentTo: ["Documents"] },
    ]);
  });
});
