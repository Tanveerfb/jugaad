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

    const isRouteFile =
      /\/route\.(ts|tsx)$/.test(filePath) ||
      filePath === "route.ts" ||
      filePath === "route.tsx";
    const isPage = filePath.includes("page") || filePath.includes("layout");

    if (isPage && !/export\s+default\b/.test(content)) {
      return {
        valid: false,
        error: "page.tsx / layout.tsx must have a default export.",
      };
    }

    if (
      isRouteFile &&
      !/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(
        content,
      )
    ) {
      return {
        valid: false,
        error: "route.ts must export at least one of GET/POST/PUT/DELETE.",
      };
    }

    // "use client" check — any file using React hooks must have the directive
    if (!isRouteFile) {
      const hasHooks =
        /\buse(State|Effect|Ref|Callback|Memo|Context|Reducer|Id|Pathname|Router|SearchParams|Params)\s*[(<(]/.test(
          content,
        );
      const hasUseClient = /^\s*['"]use client['"]\s*;?\r?\n/.test(content);
      if (hasHooks && !hasUseClient) {
        return {
          valid: false,
          error:
            "\"use client\" directive is missing. This file uses React hooks (useState/useEffect/etc.) and must have 'use client' as its absolute first line.",
        };
      }
    }

    // next/router is deprecated — must use next/navigation
    if (/from ['"]next\/router['"]/.test(content)) {
      return {
        valid: false,
        error:
          'Do not import from "next/router". Use "next/navigation" instead (useRouter, usePathname, redirect, useParams, useSearchParams).',
      };
    }

    // Incomplete / placeholder code detection
    if (
      /\/\/\s*(\.\.\.(\s|$)|\[\.{3}\]|rest of (component|code|implementation|logic)|TODO[:：]|FIXME[:：]|your code here|implement (this|me|here)|add more (code|logic)|placeholder)/i.test(
        content,
      )
    ) {
      return {
        valid: false,
        error:
          "File contains placeholder or incomplete code (TODO / ellipsis comment). Generate the complete, working implementation.",
      };
    }

    // No TypeScript suppression — these mask real errors and violate strict mode
    if (/\/\/\s*@ts-(ignore|expect-error)/.test(content)) {
      return {
        valid: false,
        error:
          "Generated code contains @ts-ignore or @ts-expect-error. Fix the TypeScript error properly — do not suppress it.",
      };
    }

    // No ESLint suppression — write code that passes ESLint without disabling rules
    if (/\/[\/*]\s*eslint-disable/.test(content)) {
      return {
        valid: false,
        error:
          "Generated code contains eslint-disable comments. Fix the underlying issue instead of suppressing the lint rule.",
      };
    }
  }

  return { valid: true };
}
