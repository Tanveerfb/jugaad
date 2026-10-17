import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { moveFile } from "./move-file";

// the system temp folder and the repo are on different drives on the owner's PC (C: and E:),
// which is the only way to exercise a real cross-drive move
const here = mkdtempSync(join(tmpdir(), "jugaad-move-"));
const otherDriveBase = join(process.cwd(), "node_modules", ".cache");
const crossDrive = parse(here).root.toLowerCase() !== parse(process.cwd()).root.toLowerCase();

let there: string;
beforeEach(() => {
  mkdirSync(otherDriveBase, { recursive: true });
  there = mkdtempSync(join(otherDriveBase, "jugaad-move-"));
});
afterEach(() => rmSync(there, { recursive: true, force: true }));
afterAll(() => rmSync(here, { recursive: true, force: true }));

describe.runIf(crossDrive)("moving across drives", () => {
  it("copies, verifies, keeps the modified time, then removes the original", async () => {
    const from = join(here, "video.mp4");
    writeFileSync(from, Buffer.alloc(3 * 1024 * 1024, 7));
    const old = new Date("2024-05-01T10:00:00Z");
    utimesSync(from, old, old);

    const to = join(there, "video.mp4");
    const moved = await moveFile(from, to);

    expect(moved.method).toBe("copy");
    expect(existsSync(from)).toBe(false);
    expect(statSync(to).size).toBe(3 * 1024 * 1024);
    expect(Math.abs(statSync(to).mtimeMs - old.getTime())).toBeLessThan(1000);
  });

  it("refuses to overwrite on the other drive and leaves the original", async () => {
    const from = join(here, "a.txt");
    writeFileSync(from, "mine");
    writeFileSync(join(there, "a.txt"), "theirs");

    await expect(moveFile(from, join(there, "a.txt"))).rejects.toThrow(/already there/);
    expect(readFileSync(from, "utf8")).toBe("mine");
    expect(readFileSync(join(there, "a.txt"), "utf8")).toBe("theirs");
  });
});

describe("moving on one drive", () => {
  it("renames, and refuses a folder", async () => {
    const from = join(there, "a.txt");
    writeFileSync(from, "x");
    expect((await moveFile(from, join(there, "b.txt"))).method).toBe("rename");
    mkdirSync(join(there, "dir"));
    await expect(moveFile(join(there, "dir"), join(there, "dir2"))).rejects.toThrow(/Only files/);
  });

  it("says plainly when the file is gone", async () => {
    await expect(moveFile(join(there, "ghost.txt"), join(there, "b.txt"))).rejects.toThrow(/no longer there/);
  });
});
