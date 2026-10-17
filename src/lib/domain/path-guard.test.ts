import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkAllowedFolder,
  differsOnlyInCase,
  isInside,
  isProtected,
  protectedFolders,
  resolveInside,
  samePath,
  type PathRules,
} from "./path-guard";

const WIN: PathRules = { api: path.win32, caseInsensitive: true };

const ENV = {
  SystemRoot: "C:\\Windows",
  ProgramFiles: "C:\\Program Files",
  "ProgramFiles(x86)": "C:\\Program Files (x86)",
  ProgramData: "C:\\ProgramData",
  APPDATA: "C:\\Users\\Owner\\AppData\\Roaming",
  LOCALAPPDATA: "C:\\Users\\Owner\\AppData\\Local",
  SystemDrive: "C:",
};
const DATA_DIR = "C:\\Users\\Owner\\AppData\\Local\\Jugaad";
const PROTECTED = protectedFolders(ENV, DATA_DIR);

describe("containment", () => {
  it("ignores letter case on Windows", () => {
    expect(isInside("E:\\Downloads", "e:\\downloads\\a.pdf", WIN)).toBe(true);
    expect(samePath("E:\\Downloads", "e:\\DOWNLOADS\\", WIN)).toBe(true);
  });

  it("does not mistake a sibling with a shared prefix for a child", () => {
    expect(isInside("E:\\Down", "E:\\Downloads\\a.pdf", WIN)).toBe(false);
  });

  it("sees through .. segments", () => {
    expect(isInside("E:\\Downloads", "E:\\Downloads\\..\\Windows", WIN)).toBe(false);
  });

  it("spots a capitals-only rename", () => {
    expect(differsOnlyInCase("E:\\d\\invoice.pdf", "E:\\d\\Invoice.pdf", WIN)).toBe(true);
    expect(differsOnlyInCase("E:\\d\\a.pdf", "E:\\d\\a.pdf", WIN)).toBe(false);
    expect(differsOnlyInCase("E:\\d\\a.pdf", "E:\\d\\b.pdf", WIN)).toBe(false);
  });
});

describe("protected folders", () => {
  it.each([
    "C:\\Windows\\System32",
    "c:\\program files\\Ollama",
    "C:\\ProgramData",
    "C:\\Users\\Owner\\AppData\\Roaming\\Code",
    "C:\\$Recycle.Bin\\S-1-5",
    "C:\\System Volume Information",
    DATA_DIR,
  ])("protects %s", (p) => {
    expect(isProtected(p, PROTECTED, WIN)).toBe(true);
  });

  it("covers the recycle bin on every drive the system uses", () => {
    expect(isProtected("C:\\$Recycle.Bin", PROTECTED, WIN)).toBe(true);
  });

  it("leaves ordinary folders alone", () => {
    expect(isProtected("C:\\Users\\Owner\\Downloads", PROTECTED, WIN)).toBe(false);
    expect(isProtected("E:\\Projects", PROTECTED, WIN)).toBe(false);
  });
});

describe("adding an allowed folder", () => {
  const existing = ["E:\\Downloads"];

  it("accepts an ordinary folder", () => {
    expect(checkAllowedFolder("C:\\Users\\Owner\\Pictures", existing, PROTECTED, WIN)).toBeNull();
  });

  it.each([
    ["Downloads", "not-absolute"],
    ["\\Downloads", "not-absolute"],
    ["E:", "not-absolute"],
    ["E:\\", "drive-root"],
    ["C:\\Windows\\Temp", "protected"],
    ["C:\\Users\\Owner\\AppData\\Local\\Temp", "protected"],
    ["e:\\downloads", "already-allowed"],
    ["E:\\Downloads\\Installers", "inside-allowed"],
    ["E:\\", "drive-root"],
  ] as const)("refuses %s (%s)", (candidate, reason) => {
    expect(checkAllowedFolder(candidate, existing, PROTECTED, WIN)).toBe(reason);
  });

  it("refuses a folder that would swallow one already on the list", () => {
    expect(checkAllowedFolder("E:\\Stuff", ["E:\\Stuff\\Inner"], PROTECTED, WIN)).toBe("contains-allowed");
  });

  it("accepts a user folder even though AppData sits inside it — the scanner skips that part", () => {
    expect(checkAllowedFolder("C:\\Users\\Owner", [], PROTECTED, WIN)).toBeNull();
  });
});

describe("resolving a move inside its folder", () => {
  it("resolves a plain relative path", () => {
    expect(resolveInside("E:\\Downloads", "Invoices\\a.pdf", WIN)).toBe("E:\\Downloads\\Invoices\\a.pdf");
  });

  it.each(["..\\Windows\\a.dll", "Invoices\\..\\..\\a.pdf", "C:\\Windows\\a.dll", "D:a.pdf", "", "."])(
    "refuses %s",
    (rel) => {
      expect(() => resolveInside("E:\\Downloads", rel, WIN)).toThrow();
    },
  );
});
