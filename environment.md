# Environment — Jugaad

Every environment variable and external service, with what it is for and who owns it —
**names only, never values** (`project-rules.md` §SECURITY, §DOCS). Who updates it: whoever
adds a variable or a service, in the same change. The starting file for a fresh clone is
`.env.example`; `src/lib/env.ts` parses them at startup.

## Variables

All optional. With none set, Jugaad runs on the mock model (no GPU needed).

| Variable | Purpose | Default |
| --- | --- | --- |
| `JUGAAD_AI_PROVIDER` | Model backend: `mock`, `lmstudio` or `ollama` | `mock` |
| `JUGAAD_LMSTUDIO_URL` | LM Studio's OpenAI-compatible server | `http://localhost:1234/v1` |
| `JUGAAD_OLLAMA_URL` | Ollama's OpenAI-compatible server | `http://localhost:11434/v1` |
| `JUGAAD_CLASSIFY_MODEL` | Model for file classification, named exactly as LM Studio / `ollama list` shows it. Required unless the provider is `mock` | — |
| `JUGAAD_DATA_DIR` | Folder holding `jugaad.db` (jobs, worker heartbeat; later the index and journal) | `%LOCALAPPDATA%\Jugaad` |

Test-only (not read by the app): `JUGAAD_LIVE_AI=1`, `JUGAAD_LIVE_PROVIDER`,
`JUGAAD_LIVE_MODEL` switch on `src/lib/ai/live.test.ts`.

Phase 1 moves the provider and model choice into in-app settings (spec); these variables
then become the defaults.

## AI providers — what data reaches them (§AI)

| Provider | Runs | Data sent | Account owner |
| --- | --- | --- | --- |
| LM Studio | on this PC, `localhost` | per file: name, extension, size, modified date, up to 2,000 characters of extracted text, the approved category list | the owner — no account, no key |
| Ollama | on this PC, `localhost` | same as LM Studio | the owner — no account, no key |

Nothing leaves the machine. Cloud providers (Gemini, Claude) are a per-module setting in the
spec and are not wired; adding one adds a row here, its key name, and a `server-only` module.

## External accounts

| Service | Used for | Owner |
| --- | --- | --- |
| Trello board [Jugaad](https://trello.com/b/2poFG0U9/jugaad) | progress mirror (§TRELLO) | the owner |
| GitHub `Tanveerfb/jugaad` | repository — created at the first `git checkpoint` | the owner |
