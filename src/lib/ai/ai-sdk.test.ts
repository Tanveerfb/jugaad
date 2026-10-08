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
