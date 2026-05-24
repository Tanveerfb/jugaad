import type { StackOption } from "@/types";

export const stackOptions: StackOption[] = [
  // ── Language Group A: Next.js + TypeScript (App Router, SSR, full-stack) ──
  {
    id: "nextjs",
    label: "Next.js",
    category: "language",
    default: true,
    docUrl: "https://nextjs.org/docs/app/api-reference/file-conventions",
    packageName: "next",
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "language",
    default: true,
    docUrl:
      "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    packageName: "typescript",
  },
  // ── Language Group B: React.js + JavaScript (Vite SPA, client-only) ───────
  {
    id: "reactjs",
    label: "React.js",
    category: "language",
    default: false,
    docUrl: "https://react.dev/reference/react",
    packageName: "react",
  },
  {
    id: "javascript",
    label: "JavaScript",
    category: "language",
    default: false,
    docUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference",
    packageName: "",
  },
  // ── Styling (auto-enforced by language group, not user-toggled) ───────────
  {
    id: "tailwind",
    label: "Tailwind CSS v4",
    category: "styling",
    default: true,
    docUrl: "https://tailwindcss.com/docs/installation",
    packageName: "tailwindcss",
  },
  {
    id: "bootstrap",
    label: "Bootstrap 5",
    category: "styling",
    default: false,
    docUrl: "https://getbootstrap.com/docs/5.3/getting-started/introduction/",
    packageName: "bootstrap",
  },
  // ── UI Components ─────────────────────────────────────────────────────────
  {
    id: "shadcn",
    label: "shadcn/ui",
    category: "ui",
    default: true,
    docUrl: "https://ui.shadcn.com/docs/components/button",
    packageName: "shadcn-ui",
  },
  {
    id: "mui",
    label: "Material UI",
    category: "ui",
    default: true,
    docUrl: "https://mui.com/material-ui/getting-started/",
    packageName: "@mui/material",
  },
  {
    id: "react-bootstrap",
    label: "React Bootstrap",
    category: "ui",
    default: false,
    docUrl:
      "https://react-bootstrap.netlify.app/docs/getting-started/introduction",
    packageName: "react-bootstrap",
  },
  // ── Database ──────────────────────────────────────────────────────────────
  {
    id: "firestore",
    label: "Cloud Firestore",
    category: "database",
    default: false,
    docUrl: "https://firebase.google.com/docs/firestore/quickstart",
    packageName: "firebase",
  },
  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    id: "nextauth",
    label: "NextAuth.js v5",
    category: "auth",
    default: false,
    docUrl: "https://authjs.dev/getting-started",
    packageName: "next-auth",
  },
  {
    id: "firebase-auth",
    label: "Firebase Auth",
    category: "auth",
    default: false,
    docUrl: "https://firebase.google.com/docs/auth/web/start",
    packageName: "firebase",
  },
  // ── Utilities ─────────────────────────────────────────────────────────────
  {
    id: "rhf",
    label: "React Hook Form",
    category: "utilities",
    default: true,
    docUrl: "https://react-hook-form.com/docs/useform",
    packageName: "react-hook-form",
  },
  {
    id: "zustand",
    label: "Zustand",
    category: "utilities",
    default: true,
    docUrl: "https://docs.pmnd.rs/zustand/getting-started/introduction",
    packageName: "zustand",
  },
  {
    id: "framer",
    label: "Framer Motion",
    category: "utilities",
    default: true,
    docUrl: "https://motion.dev/docs/react-quick-start",
    packageName: "framer-motion",
  },
  {
    id: "gemini",
    label: "Gemini AI",
    category: "utilities",
    default: false,
    docUrl: "https://ai.google.dev/gemini-api/docs/quickstart?lang=node",
    packageName: "@google/generative-ai",
  },
];

// ── Language groups ───────────────────────────────────────────────────────────
/** IDs that make up the Next.js group (always selected together). */
export const NEXTJS_GROUP = ["nextjs", "typescript"] as const;
/** IDs that make up the React.js group (always selected together). */
export const REACT_GROUP = ["reactjs", "javascript"] as const;

/** Styling that is automatically enforced when the given language anchor is active. */
export const STYLING_FOR: Record<string, string> = {
  nextjs: "tailwind",
  reactjs: "bootstrap",
};

/** Styling IDs — auto-managed, never manually toggleable. */
export const STYLING_IDS = ["tailwind", "bootstrap"];

/** IDs only available when the Next.js group is active. */
export const NEXTJS_ONLY_IDS = ["shadcn", "nextauth"];

/** IDs only available when the React.js group is active. */
export const REACT_ONLY_IDS = ["react-bootstrap"];

// ── Mutual exclusion ──────────────────────────────────────────────────────────
export const DB_IDS = ["firestore"];
export const AUTH_IDS = ["nextauth", "firebase-auth"];

/**
 * Legacy export — no hard-locked IDs anymore; language/styling are enforced
 * through group-switching logic in StackSelector.
 */
export const LOCKED_IDS: string[] = [];
