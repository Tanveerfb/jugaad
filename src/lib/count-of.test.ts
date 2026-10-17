import { describe, expect, it } from "vitest";
import { countOf } from "./count-of";

describe("counts", () => {
  it("says one file, not one files", () => expect(countOf(1, "file")).toBe("1 file"));
  it("groups thousands and pluralises", () => expect(countOf(1407, "file")).toBe("1,407 files"));
  it("uses the plural for none", () => expect(countOf(0, "move")).toBe("0 moves"));
  it("takes an irregular plural", () => expect(countOf(2, "copy", "copies")).toBe("2 copies"));
});
