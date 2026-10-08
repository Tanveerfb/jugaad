# Agent instructions — Jugaad


**Claude Code: `CLAUDE.md` is already loaded — ignore this file.**

Every other agent: this project's instructions are written for Claude Code, and they bind you
equally. Before any work, read in this order:

1. **`CLAUDE.md`** — this project's identity, commands, working agreement and traps.
2. **`project-rules.md`** — the fleet standard. `CLAUDE.md` imports it with an
   `@project-rules.md` line that only Claude Code expands, so read it yourself.
3. **`conventions.md`** — where this project deliberately departs from the standard.
4. **`docs/STATUS.md`** — the `Start here` block, for where the work is right now.
5. **Any `CLAUDE.md` in the folder you are about to work in**, and `docs/architecture.md` if
   it exists. Claude Code loads area files automatically; other agents must read them.

Where these files name a Claude Code tool, use your equivalent — `project-rules.md` §TOOLS
has the mapping. Where you have no equivalent, say so rather than skipping the rule.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
