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
| `JUGAAD_CLASSIFY_MODEL` | Model for file classification and for naming suggested categories, named exactly as `ollama list` shows it | `gemma4:12b-it-qat` (`src/lib/ai/models.ts`) |
| `JUGAAD_EMBED_MODEL` | Embedding model for category suggestions | `qwen3-embedding:0.6b` (`src/lib/ai/models.ts`) |
| `JUGAAD_VRAM_BUDGET_GB` | Cap on the VRAM Jugaad's models use together; the model manager also keeps to the card's real free memory | none — the card's free memory |
| `JUGAAD_DATA_DIR` | Folder holding `jugaad.db` (jobs, allow-list, index, plans, journal) | `%LOCALAPPDATA%\Jugaad` |

Test-only (not read by the app): `JUGAAD_LIVE_AI=1`, `JUGAAD_LIVE_MODEL` and
`JUGAAD_LIVE_EMBED_MODEL` switch on `src/lib/ai/live.test.ts` and `src/lib/organiser/live.test.ts`.

**Ollama settings on the PC** (in the Ollama app, not these variables): context length 32k —
the app's slider overrides `OLLAMA_CONTEXT_LENGTH`; "Expose Ollama to the network" off, so it
listens on `127.0.0.1` only.

The model per job is chosen on the settings page (`/settings`, stored in the database); these
variables are the defaults it falls back to. `.env.local` is read by the app (Next.js) and by
the worker (`src/worker/load-env-file.ts`).

**Local tools Jugaad calls** (no accounts; each one missing just means less is known about a
file): `powershell.exe` lists OneDrive online-only files in the folders a scan walked
(`src/lib/files/online-only.ts`) and reads a program's version info; Windows' own
`%SystemRoot%\System32\tar.exe` lists archive contents (Git's GNU `tar` on the PATH can't read
zip); `ffprobe` (installed with ffmpeg, winget `Gyan.FFmpeg`) reads a video's length and size
(`src/lib/files/external-readers.ts`); `nvidia-smi` reports the card's memory to the model
manager and the VRAM gauge — without it, Ollama's numbers stand in.

## AI providers — what data reaches them (§AI)

| Provider | Runs | Data sent | Account owner |
| --- | --- | --- | --- |
| Ollama | on this PC, `localhost` | **classifying:** per file — name, extension, size, modified date, up to 1,500 characters of extracted text or a photo's date and camera, the approved category list with up to 4 file names from each category folder that already exists. **Embedding:** per file — name, folder, type and up to 600 characters of that text. **Naming a group:** up to 12 file names with 200 characters of text each | the owner — no key; the app's ollama.com sign-in is not used by Jugaad |

Nothing leaves the machine. Cloud providers (Gemini, Claude) are a per-module setting in the
spec and are not wired; adding one adds a row here, its key name, and a `server-only` module.

## External accounts

| Service | Used for | Owner |
| --- | --- | --- |
| Trello board [Jugaad](https://trello.com/b/2poFG0U9/jugaad) | progress mirror (§TRELLO) | the owner |
| GitHub `Tanveerfb/jugaad` | repository — created at the first `git checkpoint` | the owner |
