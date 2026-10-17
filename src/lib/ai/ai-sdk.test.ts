import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { ClassifyFileInput } from "@/schemas/file-classification-schema";
import { createAiSdkAi } from "./ai-sdk";
import type { TaskModel } from "./models";
import { AiTaskError } from "./types";

const TASK: TaskModel = {
  provider: "ollama",
  baseURL: "http://localhost:11434/v1",
  modelId: "test-model",
  maxOutputTokens: 256,
  timeoutMs: 5_000,
  reasoning: "none",
};

const INPUT: ClassifyFileInput = {
  fileName: "Invoice_0423.pdf",
  extension: "pdf",
  sizeBytes: 81_920,
  modifiedAt: "2026-04-23T10:00:00Z",
  categories: ["Invoices", "Photos"],
};

/** A mock model that answers each call with the next text in `replies`. */
function modelReplying(...replies: string[]) {
  let call = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: replies[Math.min(call++, replies.length - 1)] }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 10, text: 10, reasoning: undefined },
      },
      warnings: [],
    }),
  });
  return { model, calls: () => call };
}

const GOOD = JSON.stringify({ category: "Invoices", suggestedName: "invoice-2026-04.pdf", confidence: 0.92 });

describe("createAiSdkAi — classifyFile", () => {
  it("returns a valid classification", async () => {
    const { model, calls } = modelReplying(GOOD);
    const ai = createAiSdkAi(TASK, model);
    await expect(ai.classifyFile(INPUT)).resolves.toEqual({
      category: "Invoices",
      suggestedName: "invoice-2026-04.pdf",
      confidence: 0.92,
    });
    expect(calls()).toBe(1);
  });

  it("retries once when the output is not valid JSON, then succeeds", async () => {
    const { model, calls } = modelReplying("not json at all", GOOD);
    await expect(createAiSdkAi(TASK, model).classifyFile(INPUT)).resolves.toMatchObject({ category: "Invoices" });
    expect(calls()).toBe(2);
  });

  it("rejects a category the owner did not approve, after one retry", async () => {
    const invented = JSON.stringify({ category: "Receipts", suggestedName: "x.pdf", confidence: 0.9 });
    const { model, calls } = modelReplying(invented, invented);
    const error = await createAiSdkAi(TASK, model).classifyFile(INPUT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiTaskError);
    expect((error as AiTaskError).reason).toBe("invalid-output");
    expect(calls()).toBe(2);
  });

  it("rejects a confidence outside 0…1", async () => {
    const { model } = modelReplying(JSON.stringify({ category: "Invoices", suggestedName: "x.pdf", confidence: 7 }));
    await expect(createAiSdkAi(TASK, model).classifyFile(INPUT)).rejects.toBeInstanceOf(AiTaskError);
  });

  it("refuses input with no approved categories before calling the model", async () => {
    const { model, calls } = modelReplying(GOOD);
    await expect(createAiSdkAi(TASK, model).classifyFile({ ...INPUT, categories: [] })).rejects.toThrow();
    expect(calls()).toBe(0);
  });
});

describe("createAiSdkAi — nameCategories", () => {
  const groups = {
    groups: [{ files: [{ name: "IMG-20250827-WA0130.jpg" }] }, { files: [{ name: "Screenshot 2026-09-12.png" }] }],
    existing: [],
  };

  it("returns one name per group, in order", async () => {
    const { model, calls } = modelReplying(JSON.stringify({ names: ["Phone photos", "Screenshots"] }));
    await expect(createAiSdkAi(TASK, model).nameCategories(groups)).resolves.toEqual({ names: ["Phone photos", "Screenshots"] });
    expect(calls()).toBe(1);
  });

  it("retries once when the count is wrong, then fails", async () => {
    const short = JSON.stringify({ names: ["Phone photos"] });
    const { model, calls } = modelReplying(short, short);
    await expect(createAiSdkAi(TASK, model).nameCategories(groups)).rejects.toBeInstanceOf(AiTaskError);
    expect(calls()).toBe(2);
  });
});

describe("createAiSdkAi — describeImage", () => {
  const image = { image: new Uint8Array([1, 2, 3]), mediaType: "image/png" as const, fileName: "overlay.png" };

  it("returns the model's line, tidied", async () => {
    const { model } = modelReplying("  Split-screen graphic of anime characters.\n");
    await expect(createAiSdkAi(TASK, model).describeImage(image)).resolves.toEqual({
      caption: "Split-screen graphic of anime characters.",
    });
  });

  it("retries a blank answer once, then fails", async () => {
    const { model, calls } = modelReplying("   ", "");
    await expect(createAiSdkAi(TASK, model).describeImage(image)).rejects.toBeInstanceOf(AiTaskError);
    expect(calls()).toBe(2);
  });
});

describe("createAiSdkAi — errors from the server", () => {
  const image = { image: new Uint8Array([1, 2, 3]), mediaType: "image/webp" as const, fileName: "odd.webp" };
  const failingWith = (statusCode: number | undefined) =>
    new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: "decode WebP image: invalid format", url: "http://x", requestBodyValues: {}, statusCode });
      },
    });

  it("calls a refused input rejected, so the job can skip the file", async () => {
    const error = await createAiSdkAi(TASK, failingWith(500)).describeImage(image).catch((e: unknown) => e);
    expect((error as AiTaskError).reason).toBe("rejected");
  });

  it("calls a missing or unavailable server unreachable", async () => {
    for (const status of [undefined, 503]) {
      const error = await createAiSdkAi(TASK, failingWith(status)).describeImage(image).catch((e: unknown) => e);
      expect((error as AiTaskError).reason).toBe("unreachable");
    }
  });
});
