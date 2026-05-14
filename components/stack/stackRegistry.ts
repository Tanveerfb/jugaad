import type { StackOption } from "@/types";

export const stackOptions: StackOption[] = [
  // Always included (locked)
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
  {
    id: "tailwind",
    label: "Tailwind CSS v4",
    category: "styling",
    default: true,
    docUrl: "https://tailwindcss.com/docs/installation",
    packageName: "tailwindcss",
  },
  // Toggleable
  {
    id: "shadcn",
    label: "shadcn/ui",
    category: "ui",
    default: true,
    docUrl: "https://ui.shadcn.com/docs/components/button",
    packageName: "shadcn-ui",
  },
  {
    id: "cossui",
    label: "coss ui",
    category: "ui",
    default: false,
    docUrl: "https://coss.com/ui/docs/get-started.md",
    packageName: "coss-ui",
  },
  {
    id: "prisma",
    label: "Prisma ORM",
    category: "database",
    default: false,
    docUrl: "https://www.prisma.io/docs/orm/reference/prisma-schema-reference",
    packageName: "prisma",
  },
  {
    id: "drizzle",
    label: "Drizzle ORM",
    category: "database",
    default: false,
    docUrl: "https://orm.drizzle.team/docs/overview",
    packageName: "drizzle-orm",
  },
  {
    id: "nextauth",
    label: "NextAuth.js v5",
    category: "auth",
    default: false,
    docUrl: "https://authjs.dev/getting-started",
    packageName: "next-auth",
  },
  {
    id: "clerk",
    label: "Clerk",
    category: "auth",
    default: false,
    docUrl: "https://clerk.com/docs/quickstarts/nextjs",
    packageName: "@clerk/nextjs",
  },
  {
    id: "stripe",
    label: "Stripe",
    category: "utilities",
    default: false,
    docUrl: "https://docs.stripe.com/api",
    packageName: "stripe",
  },
  {
    id: "zod",
    label: "Zod",
    category: "utilities",
    default: true,
    docUrl: "https://zod.dev/?id=basic-usage",
    packageName: "zod",
  },
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
    default: false,
    docUrl: "https://docs.pmnd.rs/zustand/getting-started/introduction",
    packageName: "zustand",
  },
  {
    id: "framer",
    label: "Framer Motion",
    category: "utilities",
    default: false,
    docUrl: "https://motion.dev/docs/react-quick-start",
    packageName: "framer-motion",
  },
  {
    id: "uploadthing",
    label: "UploadThing",
    category: "utilities",
    default: false,
    docUrl: "https://docs.uploadthing.com/getting-started/appdir",
    packageName: "uploadthing",
  },
  {
    id: "resend",
    label: "Resend",
    category: "utilities",
    default: false,
    docUrl: "https://resend.com/docs/send-with-nextjs",
    packageName: "resend",
  },
];

// Mutual exclusion groups
export const DB_IDS = ["prisma", "drizzle"];
export const AUTH_IDS = ["nextauth", "clerk"];
// Locked options that cannot be deselected
export const LOCKED_IDS = ["nextjs", "typescript", "tailwind"];
