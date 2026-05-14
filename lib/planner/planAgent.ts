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
    return result.success ? (result.data as ProjectPlan) : null;
  } catch {
    return null;
  }
}

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

  const response = await streamChat(messages, config, onChunk);
  const extractedPlan = extractPlan(response);
  return { response, extractedPlan };
}
