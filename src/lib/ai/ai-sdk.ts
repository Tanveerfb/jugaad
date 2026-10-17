import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import {
  classifyFileInputSchema,
  fileClassificationSchemaFor,
  type ClassifyFileInput,
  type FileClassification,
} from "@/schemas/file-classification-schema";
import { categoryNamesSchemaFor, nameCategoriesInputSchema, type NameCategoriesInput } from "@/schemas/category-schema";
import type { TaskModel } from "./models";
import { CLASSIFY_FILE_SYSTEM, classifyFilePrompt } from "./prompts/classify-file";
import { describeImageInputSchema, imageCaptionSchema, type DescribeImageInput } from "@/schemas/image-caption-schema";
import { DESCRIBE_IMAGE_SYSTEM, describeImagePrompt } from "./prompts/describe-image";
import { NAME_CATEGORIES_SYSTEM, nameCategoriesPrompt } from "./prompts/name-categories";
import { AiTaskError, type AiCallOptions, type WorkbenchAi } from "./types";

/**
 * Ollama through the AI SDK's OpenAI-compatible provider. The server accepts a JSON schema as
 * the response format, so structured output is enforced there and then validated again here
 * with zod.
 */
export function createAiSdkAi(
  classify: TaskModel,
  model?: LanguageModel,
  naming: TaskModel = classify,
  seeing: TaskModel = classify,
): Pick<WorkbenchAi, "provider" | "classifyFile" | "nameCategories" | "describeImage"> {
  // `model` is injected only by tests (the SDK's MockLanguageModelV4)
  const chat = (task: TaskModel) =>
    model ??
    createOpenAICompatible({
      name: task.provider,
      baseURL: task.baseURL,
      supportsStructuredOutputs: true,
    }).chatModel(task.modelId);
  const classifyModel = chat(classify);
  const namingModel = chat(naming);
  const seeingModel = chat(seeing);

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

    async nameCategories(input: NameCategoriesInput, options?: AiCallOptions) {
      const parsedInput = nameCategoriesInputSchema.parse(input);
      // one name per group, exactly — a short or long list fails validation and is retried
      const schema = categoryNamesSchemaFor(parsedInput.groups.length);
      return withOneRetry("nameCategories", async () => {
        const { output } = await generateText({
          model: namingModel,
          system: NAME_CATEGORIES_SYSTEM,
          prompt: nameCategoriesPrompt(parsedInput),
          output: Output.object({ schema }),
          maxOutputTokens: naming.maxOutputTokens,
          reasoning: naming.reasoning,
          temperature: 0,
          maxRetries: 0,
          abortSignal: combine(options?.signal, AbortSignal.timeout(naming.timeoutMs)),
        });
        return output;
      });
    },

    async describeImage(input: DescribeImageInput, options?: AiCallOptions) {
      const parsedInput = describeImageInputSchema.parse(input);
      return withOneRetry("describeImage", async () => {
        const { text } = await generateText({
          model: seeingModel,
          system: DESCRIBE_IMAGE_SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                { type: "file", data: parsedInput.image, mediaType: parsedInput.mediaType },
                { type: "text", text: describeImagePrompt(parsedInput) },
              ],
            },
          ],
          maxOutputTokens: seeing.maxOutputTokens,
          reasoning: seeing.reasoning,
          temperature: 0,
          maxRetries: 0,
          abortSignal: combine(options?.signal, AbortSignal.timeout(seeing.timeoutMs)),
        });
        // a blank or runaway answer counts as invalid output, retried once like any other
        const caption = imageCaptionSchema.safeParse(text.replace(/\s+/g, " "));
        if (!caption.success) throw new InvalidOutput("No usable caption");
        return { caption: caption.data };
      });
    },
  };
}

/**
 * Structured output that fails validation is retried once, then reported as an error state —
 * never used half-valid (project-rules §AI). Connection and timeout failures are not retried
 * here; the job queue decides whether to try the file again later.
 */
/** A free-text answer that failed its check — treated like structured output that failed parsing. */
class InvalidOutput extends Error {}

const isInvalidOutput = (error: unknown) => NoObjectGeneratedError.isInstance(error) || error instanceof InvalidOutput;

export async function withOneRetry<T>(task: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (first) {
    if (!isInvalidOutput(first)) throw toTaskError(task, first);
    try {
      return await call();
    } catch (second) {
      throw toTaskError(task, second);
    }
  }
}

export function toTaskError(task: string, error: unknown): AiTaskError {
  if (isInvalidOutput(error)) return new AiTaskError(task, "invalid-output", { cause: error });
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AiTaskError(task, "timeout", { cause: error });
  }
  // the server answered, but refused this input (an image it can't decode, say): skip the file,
  // not the job — on the owner's Downloads one odd WebP stopped a whole run until this
  if (APICallError.isInstance(error) && error.statusCode !== undefined && error.statusCode < 502) {
    return new AiTaskError(task, "rejected", { cause: error });
  }
  if (APICallError.isInstance(error) || (error instanceof TypeError && /fetch/i.test(error.message))) {
    return new AiTaskError(task, "unreachable", { cause: error });
  }
  return new AiTaskError(task, "unknown", { cause: error });
}

export function combine(...signals: (AbortSignal | undefined)[]): AbortSignal {
  return AbortSignal.any(signals.filter((s): s is AbortSignal => s !== undefined));
}
