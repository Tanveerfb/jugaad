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

    // Require an actual TypeScript export declaration — not just the word
    // "export" appearing anywhere in comments or text.
    const hasExport =
      /\bexport\s+(default\b|type\b|interface\b|function\b|const\b|let\b|var\b|class\b|enum\b|abstract\b|async\b|\{)/.test(
        content,
      );
    if (!hasExport) {
      return {
        valid: false,
        error:
          "TypeScript file has no export declaration (export function / export const / export default / etc.).",
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

    // "use client" check — any file using React hooks must have the directive.
    // Exception: pure .ts files that are not custom hooks (hooks/use*.ts) are
    // utility/store files — they should NOT use React hooks at all.
    if (!isRouteFile) {
      const hasHooks =
        /\buse(State|Effect|Ref|Callback|Memo|Context|Reducer|Id|Pathname|Router|SearchParams|Params)\s*[(<(]/.test(
          content,
        );
      const hasUseClient = /^\s*['"]use client['"]\s*;?\r?\n/.test(content);
      const isReactComponentFile =
        ext === "tsx" ||
        filePath.includes("components/") ||
        filePath.includes("app/") ||
        /\/hooks\/use[A-Z]/.test(filePath);

      if (hasHooks && !hasUseClient) {
        if (isReactComponentFile) {
          return {
            valid: false,
            error:
              "\"use client\" directive is missing. This file uses React hooks (useState/useEffect/etc.) and must have 'use client' as its absolute first line.",
          };
        } else {
          // .ts utility / store / lib file — hooks are forbidden here
          return {
            valid: false,
            error:
              "React hooks (useState/useEffect/etc.) must not be used in utility or store .ts files. " +
              "Rewrite this file as pure TypeScript functions with no React dependencies.",
          };
        }
      }
    }

    // In Next.js 16, "middleware.ts" is renamed to "proxy.ts". Flag the wrong filename.
    if (
      filePath === "middleware.ts" ||
      filePath === "middleware.js" ||
      filePath.endsWith("/middleware.ts") ||
      filePath.endsWith("/middleware.js")
    ) {
      return {
        valid: false,
        error:
          'In Next.js 16, Middleware is renamed to Proxy. Use "proxy.ts" instead of "middleware.ts". Export a named function "proxy" (not "middleware"). Runtime must be "nodejs" (edge not supported).',
      };
    }

    // next/router is deprecated — must use next/navigation
    if (/from ['"]next\/router['"]/.test(content)) {
      return {
        valid: false,
        error:
          'Do not import from "next/router". Use "next/navigation" instead (useRouter, usePathname, redirect, useParams, useSearchParams).',
      };
    }

    // Relative imports are forbidden — all local imports must use "@/"
    // Matches: from "./foo", from "../foo", from "./foo/bar", from "../../foo"
    if (/from\s+['"]\.\.?\//.test(content)) {
      return {
        valid: false,
        error:
          'Relative import path detected (e.g. from "./X" or from "../X"). Use the "@/" alias for all local imports.',
      };
    }

    // Template artifact leaked into output — LLM left an unfilled placeholder tag
    if (/<unused\d+>/.test(content)) {
      return {
        valid: false,
        error:
          "Output contains template artifact '<unusedN>'. Remove it completely — do not include unfilled placeholder tags.",
      };
    }

    // TypeScript type union used as a runtime value, e.g.:
    //   castlingRights: 'wK' | 'wQ'   ← in an object literal value position
    // This evaluates to 0 at runtime (bitwise OR on strings → NaN | NaN = 0).
    // Detect the pattern: colon, optional space, quoted string, pipe, quoted string
    if (/:\s*'[^']+'\s*\|/.test(content) || /:\s*"[^"]+"\s*\|/.test(content)) {
      return {
        valid: false,
        error:
          "TypeScript type union syntax used as a runtime value (e.g. `key: 'a' | 'b'`). " +
          "Assign a single concrete string value instead. Type annotations belong in `type`/`interface` declarations, not object literal values.",
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
