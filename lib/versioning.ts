/**
 * LATEST_VERSIONS: Pinned latest stable versions for all packages Jugaad supports.
 * Update this map whenever the ecosystem advances.
 * These versions are enforced post-generation — the LLM's guesses are always overridden.
 */
export const LATEST_VERSIONS: Record<string, string> = {
  // Core (always present)
  next: "16.2.6",
  react: "19.2.4",
  "react-dom": "19.2.4",
  typescript: "^5.9.3",

  // Tailwind v4 — note: no autoprefixer/postcss-loader needed in v4
  tailwindcss: "^4",
  "@tailwindcss/postcss": "^4.3.0",
  autoprefixer: "^10.5.0", // kept for projects that still use it

  // Type definitions
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",

  // ESLint
  eslint: "^9.39.4",
  "eslint-config-next": "16.2.6",

  // State management
  zustand: "^5.0.13",

  // Validation / Forms
  zod: "^4.4.3",
  "react-hook-form": "^7.76.0",

  // Animation
  "framer-motion": "^12.38.0",

  // Firebase
  firebase: "^12.13.0",

  // Auth
  "next-auth": "^4.24.14", // v5 is still beta; v4 is latest stable
  "@clerk/nextjs": "^7.3.5",

  // Database
  prisma: "^7.8.0",
  "@prisma/client": "^7.8.0",
  "drizzle-orm": "^0.45.2",
  "drizzle-kit": "^0.28.0",

  // Payments
  stripe: "^22.1.1",

  // File uploads
  uploadthing: "^7.7.4",
  "@uploadthing/react": "^7.1.0",

  // Email
  resend: "^6.12.3",

  // AI
  "@google/generative-ai": "^0.24.1",

  // GitHub
  "@octokit/rest": "^22.0.1",

  // UI utilities
  "lucide-react": "^1.16.0",
  clsx: "^2.1.1",
  "class-variance-authority": "^0.7.1",
  "tailwind-merge": "^3.6.0",
  "tw-animate-css": "^1.4.0",
};

/**
 * Replaces all version specifiers in a generated package.json with the pinned
 * latest versions from LATEST_VERSIONS. Unknown packages are left unchanged.
 * If the JSON is malformed, returns the original string unchanged.
 */
export function enforceLatestVersions(packageJsonContent: string): string {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(packageJsonContent);
  } catch {
    return packageJsonContent; // malformed — validator will catch it
  }

  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ] as const;
  for (const section of sections) {
    const deps = pkg[section] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (LATEST_VERSIONS[name]) {
        deps[name] = LATEST_VERSIONS[name];
      }
    }
  }

  return JSON.stringify(pkg, null, 2);
}
