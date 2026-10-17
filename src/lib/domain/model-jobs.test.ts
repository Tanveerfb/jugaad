import { describe, expect, it } from "vitest";
import { canDo, changeNotes, jobsUsing, modelsForJob, modelsToLoad, toChoices, type InstalledModel, type ResolvedModels } from "./model-jobs";

const GB = 1e9;
const installed: InstalledModel[] = [
  { name: "gemma4:12b-it-qat", sizeBytes: 7.15 * GB, capabilities: ["completion", "vision", "tools"] },
  { name: "qwen3:8b", sizeBytes: 5.23 * GB, capabilities: ["completion", "tools", "thinking"] },
  { name: "qwen3-embedding:0.6b", sizeBytes: 0.64 * GB, capabilities: ["tools", "thinking", "embedding"] },
  { name: "nomic-embed-text:latest", sizeBytes: 0.27 * GB, capabilities: ["embedding"] },
];
const defaults: ResolvedModels = {
  classifyFile: "gemma4:12b-it-qat",
  nameCategories: "gemma4:12b-it-qat",
  describeImage: "gemma4:12b-it-qat",
  embed: "qwen3-embedding:0.6b",
};

describe("models for each job", () => {
  it("offers only models that can do the job, smallest first", () => {
    expect(modelsForJob("classifyFile", installed).map((m) => m.name)).toEqual(["qwen3:8b", "gemma4:12b-it-qat"]);
    expect(modelsForJob("describeImage", installed).map((m) => m.name)).toEqual(["gemma4:12b-it-qat"]);
    expect(modelsForJob("embed", installed).map((m) => m.name)).toEqual(["nomic-embed-text:latest", "qwen3-embedding:0.6b"]);
  });

  it("refuses a model that can't do the job, or isn't installed", () => {
    expect(canDo("describeImage", installed[1])).toBe(false);
    expect(canDo("embed", installed[0])).toBe(false);
    expect(canDo("classifyFile", undefined)).toBe(false);
  });

  it("loads a model shared by several jobs once, and skips images when they're off", () => {
    expect(modelsToLoad(defaults)).toEqual(["gemma4:12b-it-qat", "qwen3-embedding:0.6b"]);
    expect(modelsToLoad({ ...defaults, describeImage: null, classifyFile: "qwen3:8b" })).toEqual([
      "qwen3:8b",
      "gemma4:12b-it-qat",
      "qwen3-embedding:0.6b",
    ]);
  });

  it("names the jobs a loaded model is doing", () => {
    expect(jobsUsing("gemma4:12b-it-qat", defaults)).toEqual(["sorting files", "naming groups", "looking at images"]);
    expect(jobsUsing("llama3:8b", defaults)).toEqual([]);
  });
});

describe("changing a model", () => {
  it("warns that a new sorting or grouping model redoes that work once", () => {
    const notes = changeNotes(defaults, { ...defaults, classifyFile: "qwen3:8b", embed: "nomic-embed-text:latest" });
    expect(Object.keys(notes).sort()).toEqual(["classifyFile", "embed"]);
  });

  it("says nothing when only naming changes", () => {
    expect(changeNotes(defaults, { ...defaults, nameCategories: "qwen3:8b" })).toEqual({});
  });

  it("says what turning images off costs", () => {
    expect(changeNotes(defaults, { ...defaults, describeImage: null }).describeImage).toMatch(/names and dates/);
  });

  it("stores only what differs from the defaults", () => {
    expect(toChoices(defaults, defaults)).toEqual({});
    expect(toChoices({ ...defaults, describeImage: null, embed: "nomic-embed-text:latest" }, defaults)).toEqual({
      describeImage: null,
      embed: "nomic-embed-text:latest",
    });
  });
});
