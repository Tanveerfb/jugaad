import { describe, expect, it } from "vitest";
import { inScope, isLoose, looksMessy, toFileName, toMoves, uniquePath, withName } from "./plan-rules";

describe("files that stay put", () => {
  it.each(["desktop.ini", "Thumbs.db", ".DS_Store", "Photos\\desktop.ini", "setup.exe.crdownload", "movie.mkv.part"])(
    "never sorts %s",
    (path) => expect(inScope(path, true, new Set())).toBe(false),
  );

  it("still sorts ordinary files with similar names", () => {
    expect(inScope("desktop.ini.txt", false, new Set())).toBe(true);
    expect(inScope("part 2.pdf", false, new Set())).toBe(true);
  });
});

describe("plan rules", () => {
  it("sends confident files to their category, doubtful ones to review, extra copies to duplicates", () => {
    const moves = toMoves(
      [
        { path: "Invoice_0423.pdf", kind: "sorted", category: "Invoices", confidence: 0.94 },
        { path: "scan0007.pdf", kind: "needs-review", category: "Invoices", confidence: 0.4 },
        { path: "Invoice_0423(2).pdf", kind: "duplicate", keeperPath: "Invoice_0423.pdf" },
      ],
      new Set(),
    );
    expect(moves).toEqual([
      { fromPath: "Invoice_0423.pdf", toPath: "Invoices\\Invoice_0423.pdf", category: "Invoices", confidence: 0.94, suggestedName: null, isFolder: false },
      { fromPath: "scan0007.pdf", toPath: "_review\\scan0007.pdf", category: "Invoices", confidence: 0.4, suggestedName: null, isFolder: false },
      {
        fromPath: "Invoice_0423(2).pdf",
        toPath: "_review\\Duplicates\\Invoice_0423(2).pdf",
        category: null,
        confidence: null,
        suggestedName: null,
        isFolder: false,
      },
    ]);
  });

  it("never lands on an existing file or on another move's destination", () => {
    const moves = toMoves(
      [
        { path: "a.pdf", kind: "sorted", category: "Docs", confidence: 0.9 },
        { path: "A.PDF", kind: "sorted", category: "Docs", confidence: 0.9 },
      ],
      new Set(["Docs\\a.pdf"]),
    );
    expect(moves.map((m) => m.toPath)).toEqual(["Docs\\a (2).pdf", "Docs\\A (3).PDF"]);
  });

  it("numbers names without an extension, and dotted folder names, correctly", () => {
    expect(uniquePath("Docs\\README", new Set(["docs\\readme"]))).toBe("Docs\\README (2)");
    expect(uniquePath("v1.2\\notes", new Set(["v1.2\\notes"]))).toBe("v1.2\\notes (2)");
  });

  it("only plans loose files", () => {
    expect(isLoose("a.pdf")).toBe(true);
    expect(isLoose("Sub\\a.pdf")).toBe(false);
  });
});

describe("messy names", () => {
  it.each([
    "Invoice_0423_final(2).pdf",
    "ChatGPT Installer (1).exe",
    "image (23).png",
    "scan0007.pdf",
    "Copy of budget.xlsx",
    "untitled.txt",
    "my%20report.pdf",
    "notes__old.md",
    "a".repeat(70) + ".pdf",
  ])("tidies %s", (name) => expect(looksMessy(name)).toBe(true));

  it.each([
    "IMG-20250827-WA0130.jpg",
    "Screenshot 2026-09-12 101523.png",
    "GoogleSansFlex_36pt-Black.ttf",
    "HandBrake-1.11.1-x86_64-Win_GUI.exe",
    "CV_2026.docx",
    "newsletter.pdf",
  ])("leaves %s alone", (name) => expect(looksMessy(name)).toBe(false));

  it("offers no suggestion for a clean name, whatever the model said", () => {
    const [move] = toMoves(
      [{ path: "CV_2026.docx", kind: "sorted", category: "Career", confidence: 0.9, suggestedName: "Curriculum vitae 2026.docx" }],
      new Set(),
    );
    expect(move.suggestedName).toBeNull();
  });

  it("offers no suggestion for a file going to review", () => {
    const [move] = toMoves(
      [{ path: "Screenshot_2022-09-12-02-23-05-95_a738fd82.jpg", kind: "needs-review", category: "Canva", confidence: 0.4, suggestedName: "Kitchen photo.jpg" }],
      new Set(),
    );
    expect(move.suggestedName).toBeNull();
  });

  it("offers nothing that only changes case or separators", () => {
    expect(toFileName("invoice-final-2.pdf", "Invoice_Final (2).pdf")).toBeNull();
  });
});

describe("suggested names", () => {
  it.each([
    ["invoice-2026-04.pdf", "Invoice_0423_final(2).pdf", "invoice-2026-04.pdf"],
    ["invoice-2026-04", "Invoice_0423_final(2).pdf", "invoice-2026-04.pdf"],
    ["invoice 2026: april?.PDF", "a.pdf", "invoice 2026 april.pdf"],
    ["Invoices\\x.pdf", "a.pdf", "x.pdf"],
  ])("offers %j for %j as %j", (suggested, original, offered) => {
    expect(toFileName(suggested, original)).toBe(offered);
  });

  it.each([
    ["", "a.pdf"],
    ["CON.pdf", "a.pdf"],
    ["A.PDF", "a.pdf"],
    ["...", "a.pdf"],
  ])("offers nothing for %j", (suggested, original) => {
    expect(toFileName(suggested, original)).toBeNull();
  });

  it("swaps only the name, never the folder", () => {
    expect(withName("Invoices\\2026\\a.pdf", "b.pdf")).toBe("Invoices\\2026\\b.pdf");
    expect(withName("a.pdf", "b.pdf")).toBe("b.pdf");
  });

  it("carries the suggestion into the move, not into its destination", () => {
    const [move] = toMoves(
      [{ path: "Invoice_0423 (2).pdf", kind: "sorted", category: "Invoices", confidence: 0.9, suggestedName: "Plumbing invoice 0423.pdf" }],
      new Set(),
    );
    expect(move).toMatchObject({ toPath: "Invoices\\Invoice_0423 (2).pdf", suggestedName: "Plumbing invoice 0423.pdf" });
  });
});
