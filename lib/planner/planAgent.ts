import { z } from "zod";
import { streamChat } from "@/lib/llm/client";
import { buildPlanAgentSystemPrompt } from "@/lib/llm/prompts";
import type {
  ConversationMessage,
  LLMConfig,
  ProjectPlan,
  StackConfig,
} from "@/types";

const FieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
});

const ProjectPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stack: z.object({ selected: z.array(z.string()) }),
  features: z.array(
    z.object({ id: z.string(), title: z.string(), description: z.string() }),
  ),
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      route: z.string(),
      description: z.string(),
    }),
  ),
  dataModels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      fields: z.array(FieldSchema),
    }),
  ),
  authStrategy: z.enum(["none", "nextauth", "clerk", "firebase", "custom"]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

function extractPlan(response: string): ProjectPlan | null {
  const match = response.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    const result = ProjectPlanSchema.safeParse(parsed);
    if (!result.success) return null;
    // The LLM has no real-time clock — always stamp with the actual current time.
    const now = Date.now();
    return { ...(result.data as ProjectPlan), createdAt: now, updatedAt: now };
  } catch {
    return null;
  }
}

/** Cap planning chat responses — prevents thinking-heavy models from
 *  generating unbounded tokens and aborting the stream mid-plan. */
const PLAN_MAX_TOKENS = 16_384;

export async function sendMessage(
  userMessage: string,
  history: ConversationMessage[],
  stack: StackConfig,
  config: LLMConfig,
  onChunk: (chunk: string) => void,
): Promise<{ response: string; extractedPlan: ProjectPlan | null }> {
  const systemMessage: ConversationMessage = {
    id: "system",
    role: "system",
    content: buildPlanAgentSystemPrompt(stack),
    timestamp: Date.now(),
  };

  const messages: ConversationMessage[] = [
    systemMessage,
    ...history,
    {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    },
  ];

  const response = await streamChat(messages, config, onChunk, PLAN_MAX_TOKENS);
  const extractedPlan = extractPlan(response);
  return { response, extractedPlan };
}
