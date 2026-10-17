import { describe, expect, it } from "vitest";
import { nearestExamples } from "./filing-examples";

const ex = (fileId: string, description: string, category: string) => ({ fileId, hash: "h", description, category });

describe("nearest filing examples", () => {
  const examples = [
    ex("1", "Dokkan Legends Overlays png file — split-screen graphic of anime characters", "Stream overlays"),
    ex("2", "electricity bill march pdf file — amount payable", "Bills"),
    ex("3", "Dokkan banner png file — anime character banner", "Stream overlays"),
  ];

  it("picks the decisions most like the file, closest first", () => {
    const picked = nearestExamples("Dokkan Legends Thumbnail png file — anime characters", examples);
    expect(picked.map((e) => e.fileId)).toEqual(["1", "3"]);
  });

  it("leaves out examples that share nothing with the file", () => {
    expect(nearestExamples("vacation photo jpg file", examples)).toEqual([]);
  });

  it("caps how many it returns", () => {
    expect(nearestExamples("png file anime", examples, 1)).toHaveLength(1);
  });
});
