export type ValidationResult = { valid: boolean; error?: string };

function countChar(str: string, char: string): number {
  return str.split(char).length - 1;
}

export function validateOutput(
  filePath: string,
  content: string,
): ValidationResult {
  if (!content || content.trim() === "") {
    return { valid: false, error: "File content is empty." };
  }

  if (content.includes("```")) {
    return {
      valid: false,
      error:
        "Content contains markdown fence (```). Return raw file content only.",
    };
  }

  const ext = filePath.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    try {
      JSON.parse(content);
    } catch (e) {
      return { valid: false, error: `Invalid JSON: ${(e as Error).message}` };
    }
    return { valid: true };
  }

  if (ext === "css") {
    if (content.trim() === "")
      return { valid: false, error: "CSS file is empty." };
    const open = countChar(content, "{");
    const close = countChar(content, "}");
    if (open !== close) {
      return {
        valid: false,
        error: `CSS brace mismatch: ${open} '{' vs ${close} '}'.`,
      };
    }
    return { valid: true };
  }

  if (ext === "ts" || ext === "tsx") {
    if (content.trimStart().startsWith("```")) {
      return { valid: false, error: "Output starts with a markdown fence." };
    }

    const hasExport = /\bexport\b/.test(content);
    if (!hasExport) {
      return {
        valid: false,
        error: "TypeScript file has no export statement.",
      };
    }

    const open = countChar(content, "{");
    const close = countChar(content, "}");
    if (Math.abs(open - close) > 2) {
      return {
        valid: false,
        error: `Brace mismatch: ${open} '{' vs ${close} '}'.`,
      };
    }

    const isPage = filePath.includes("page") || filePath.includes("layout");
    const isRoute = filePath.includes("route");

    if (isPage && !/export\s+default\b/.test(content)) {
      return {
        valid: false,
        error: "page.tsx / layout.tsx must have a default export.",
      };
    }

    if (
      isRoute &&
      !/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(
        content,
      )
    ) {
      return {
        valid: false,
        error: "route.ts must export at least one of GET/POST/PUT/DELETE.",
      };
    }
  }

  return { valid: true };
}
