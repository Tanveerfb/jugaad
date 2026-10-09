import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import {
  classifyFileInputSchema,
  fileClassificationSchemaFor,
  type ClassifyFileInput,
  type FileClassification,
} from "@/schemas/file-classification-schema";
import type { TaskModel } from "./models";
import { CLASSIFY_FILE_SYSTEM, classifyFilePrompt } from "./prompts/classify-file";
import { AiTaskError, type AiCallOptions, type WorkbenchAi } from "./types";

/**
 * Ollama through the AI SDK's OpenAI-compatible provider. The server accepts a JSON schema as
 * the response format, so structured output is enforced there and then validated again here
 * with zod.
 */
export function createAiSdkAi(classify: TaskModel, model?: LanguageModel): WorkbenchAi {
  // `model` is injected only by tests (the SDK's MockLanguageModelV4)
  const classifyModel =
    model ??
    createOpenAICompatible({
      name: classify.provider,
      baseURL: classify.baseURL,
      supportsStructuredOutputs: true,
    }).chatModel(classify.modelId);

  return {
    provider: classify.provider,
    async classifyFile(input: ClassifyFileInput, options?: AiCallOptions): Promise<FileClassification> {
      const parsedInput = classifyFileInputSchema.parse(input);
      const schema = fileClassificationSchemaFor(parsedInput.categories);
      return withOneRetry("classifyFile", async () => {
        const { output } = await generateText({
          model: classifyModel,
          system: CLASSIFY_FILE_SYSTEM,
          prompt: classifyFilePrompt(parsedInput),
          output: Output.object({ schema }),
          maxOutputTokens: classify.maxOutputTokens,
          reasoning: classify.reasoning,
          temperature: 0,
          maxRetries: 0, // retries are ours: exactly one, and only for bad output
          abortSignal: combine(options?.signal, AbortSignal.timeout(classify.timeoutMs)),
        });
        return output;
      });
    },
  };
}

/**
 * Structured output that fails validation is retried once, then reported as an error state —
 * never used half-valid (project-rules §AI). Connection and timeout failures are not retried
 * here; the job queue decides whether to try the file again later.
 */
async function withOneRetry<T>(task: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (first) {
    if (!NoObjectGeneratedError.isInstance(first)) throw toTaskError(task, first);
    try {
      return await call();
    } catch (second) {
      throw toTaskError(task, second);
    }
  }
}

function toTaskError(task: string, error: unknown): AiTaskError {
  if (NoObjectGeneratedError.isInstance(error)) return new AiTaskError(task, "invalid-output", { cause: error });
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AiTaskError(task, "timeout", { cause: error });
  }
  if (APICallError.isInstance(error) || (error instanceof TypeError && /fetch/i.test(error.message))) {
    return new AiTaskError(task, "unreachable", { cause: error });
  }
  return new AiTaskError(task, "unknown", { cause: error });
}

function combine(...signals: (AbortSignal | undefined)[]): AbortSignal {
  return AbortSignal.any(signals.filter((s): s is AbortSignal => s !== undefined));
}
