/*
 * Loads `.env.local` into the worker, as Next.js does for the app — otherwise `npm run app`
 * gave the app the owner's settings and left the worker on the mock model (2026-10-17).
 * Imported first by `index.ts`, because `src/lib/env.ts` reads `process.env` as it loads.
 * Variables already set in the shell win: Node's loader never overwrites them, so a command
 * such as the sandbox's `JUGAAD_DATA_DIR=… npm run worker` still applies.
 */
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
