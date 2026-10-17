import { describe, expect, it } from "vitest";
import { folderSamples } from "./folder-samples";

describe("samples of what each category folder holds", () => {
  it("shows a spread of names from each existing category folder", () => {
    const paths = [
      "loose.mp4",
      "Recorded\\2026-03-10_23-22-19.mp4",
      "Recorded\\2026-03-25_11-39-51.mp4",
      "Recorded\\2026-03-25_11-56-12.mp4",
      "Recorded\\Old\\2025-01-01_00-00-00.mp4",
      "Recorded\\9 April Part 1.mp4",
      "Recorded\\Backtrack_2026-01-25.mp4",
      "Clips\\pRSJfEqT.mp4",
    ];
    const samples = folderSamples(paths, ["recorded", "Clips", "Invoices"], 3);
    expect(samples.recorded).toHaveLength(3);
    expect(samples.recorded[0]).toBe("2025-01-01_00-00-00.mp4");
    expect(samples.Clips).toEqual(["pRSJfEqT.mp4"]);
    expect(samples).not.toHaveProperty("Invoices");
  });

  it("clips very long names", () => {
    const [name] = folderSamples([`A\\${"x".repeat(200)}.mp4`], ["A"]).A;
    expect(name.length).toBe(80);
    expect(name.endsWith("…")).toBe(true);
  });
});
