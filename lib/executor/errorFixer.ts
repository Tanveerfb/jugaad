import type { LLMConfig } from "@/types";
import { buildErrorFixerPrompt } from "@/lib/llm/prompts";
import { streamChat } from "@/lib/llm/client";

type TscError = { file: string; line: number; col: number; message: string };

async function getTscErrors(projectPath: string): Promise<TscError[]> {
  const res = await fetch("/api/typecheck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, filePath: "**" }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    errors?: TscError[];
  };
  return data.errors ?? [];
}

async function readProjectFile(
  projectPath: string,
  filePath: string,
): Promise<string> {
  const res = await fetch("/api/fs/read-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, filePath }),
  });
  const data = (await res.json()) as { content?: string };
  return data.content ?? "";
}

async function writeProjectFile(
  projectPath: string,
  filePath: string,
  content: string,
): Promise<void> {
  await fetch("/api/fs/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, filePath, content }),
  });
}

function extractFileContent(llmOutput: string): string | null {
  const match = llmOutput.match(/<file>([\s\S]*?)<\/file>/);
  return match ? match[1].trim() : null;
}

export async function fixTypeScriptErrors(
  projectPath: string,
  config: LLMConfig,
  onProgress: (msg: string) => void,
): Promise<{ fixed: boolean; remaining: number }> {
  const MAX_PASSES = 3;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    onProgress(`Pass ${pass}/${MAX_PASSES}: running type check…`);
    const errors = await getTscErrors(projectPath);

    if (errors.length === 0) {
      onProgress("All TypeScript errors resolved.");
      return { fixed: true, remaining: 0 };
    }

    // Group errors by file
    const byFile = new Map<string, TscError[]>();
    for (const e of errors) {
      if (!byFile.has(e.file)) byFile.set(e.file, []);
      byFile.get(e.file)!.push(e);
    }

    onProgress(
      `Found ${errors.length} errors in ${byFile.size} file(s). Fixing…`,
    );

    for (const [relPath, fileErrors] of byFile.entries()) {
      onProgress(`Fixing ${relPath}…`);
      const content = await readProjectFile(projectPath, relPath);
      if (!content) continue;

      const prompt = buildErrorFixerPrompt(relPath, content, fileErrors);
      let llmOutput = "";
      await streamChat(
        [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: prompt,
            timestamp: Date.now(),
          },
        ],
        config,
        (chunk) => {
          llmOutput += chunk;
        },
      );

      const fixed = extractFileContent(llmOutput);
      if (fixed) {
        await writeProjectFile(projectPath, relPath, fixed);
      }
    }
  }

  // Final check
  const remaining = await getTscErrors(projectPath);
  return { fixed: remaining.length === 0, remaining: remaining.length };
}
