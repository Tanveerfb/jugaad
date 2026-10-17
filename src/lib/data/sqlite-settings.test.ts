import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqliteStore } from "./sqlite";
import type { WorkbenchStore } from "./types";

let store: WorkbenchStore;
beforeEach(() => {
  store = openSqliteStore(":memory:");
});
afterEach(() => store.close());

describe("settings", () => {
  it("starts with no choices, so the defaults apply", () => {
    expect(store.getModelChoices()).toEqual({});
  });

  it("keeps the owner's model choices, images off included", () => {
    store.setModelChoices({ classifyFile: "qwen3:8b", describeImage: null });
    expect(store.getModelChoices()).toEqual({ classifyFile: "qwen3:8b", describeImage: null });
    store.setModelChoices({});
    expect(store.getModelChoices()).toEqual({});
  });

  it("notes the models Jugaad loaded, once each, until released", () => {
    store.markModelLoaded("gemma4:12b-it-qat");
    store.markModelLoaded("gemma4:12b-it-qat");
    store.markModelLoaded("qwen3-embedding:0.6b");
    expect(store.listJugaadModels()).toEqual(["gemma4:12b-it-qat", "qwen3-embedding:0.6b"]);
    store.markModelReleased("gemma4:12b-it-qat");
    expect(store.listJugaadModels()).toEqual(["qwen3-embedding:0.6b"]);
  });
});
