# Environment — Jugaad

Every environment variable and external service, with what it is for and who owns it —
**names only, never values** (`project-rules.md` §SECURITY, §DOCS). Who updates it: whoever
adds a variable or a service, in the same change. The starting file for a fresh clone is
`.env.example`; `src/lib/env.ts` parses them at startup.

## Variables

All optional. With none set, Jugaad runs on the mock model (no GPU needed).

| Variable | Purpose | Default |
| --- | --- | --- |
| `JUGAAD_AI_PROVIDER` | Model backend: `mock` or `ollama` | `mock` |
| `JUGAAD_OLLAMA_URL` | Ollama's OpenAI-compatible server | `http://localhost:11434/v1` |
| `JUGAAD_CLASSIFY_MODEL` | Model for file classification, named exactly as `ollama list` shows it | `gemma4:12b-it-qat` (`src/lib/ai/models.ts`) |
| `JUGAAD_DATA_DIR` | Folder holding `jugaad.db` (jobs, worker heartbeat; later the index and journal) | `%LOCALAPPDATA%\Jugaad` |

Test-only (not read by the app): `JUGAAD_LIVE_AI=1` and `JUGAAD_LIVE_MODEL` switch on
`src/lib/ai/live.test.ts`.

**Ollama settings on the PC** (in the Ollama app, not these variables): context length 32k —
the app's slider overrides `OLLAMA_CONTEXT_LENGTH`; "Expose Ollama to the network" off, so it
listens on `127.0.0.1` only.

Phase 1 moves the provider and model choice into in-app settings (spec); these variables
then become the defaults.

## AI providers — what data reaches them (§AI)

| Provider | Runs | Data sent | Account owner |
| --- | --- | --- | --- |
| Ollama | on this PC, `localhost` | per file: name, extension, size, modified date, up to 2,000 characters of extracted text, the approved category list | the owner — no key; the app's ollama.com sign-in is not used by Jugaad |

Nothing leaves the machine. Cloud providers (Gemini, Claude) are a per-module setting in the
spec and are not wired; adding one adds a row here, its key name, and a `server-only` module.

## External accounts

| Service | Used for | Owner |
| --- | --- | --- |
| Trello board [Jugaad](https://trello.com/b/2poFG0U9/jugaad) | progress mirror (§TRELLO) | the owner |
| GitHub `Tanveerfb/jugaad` | repository — created at the first `git checkpoint` | the owner |
