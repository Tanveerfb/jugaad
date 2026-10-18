# Jugaad

A local AI workbench for one Windows PC. One Next.js app, a background worker and local models
(Ollama) doing narrow, reliable jobs. Private by default: it reads only folders you allow, and it
never deletes a file.

**Built:** the **Organiser**. Add a folder, and Jugaad scans it and suggests categories. You edit
and approve them, it builds a plan, and you approve that. Only then does it move files. Every move
is journalled and can be undone, in full or just the files taken out of your own folders. Also
built: a settings page (a model per job, free the GPU's memory) and a desktop app.
**Planned:** Voice, Ask my files, Auditor.

## Run it

Needs Node 24 (`.nvmrc`), and [Ollama](https://ollama.com) for real models. Without Ollama,
Jugaad runs on a built-in mock.

```bash
npm ci
npx install-electron      # Electron's program file, for the desktop app
npm run desktop:shortcut  # Jugaad on the Desktop and in the Start menu
```

Then open **Jugaad** from the shortcut. The first start builds the app (about a minute). Closing
the window keeps Jugaad running in the tray; right-click the tray icon and choose Quit to stop it.

Other ways to run it:

```bash
npm run desktop   # the same desktop app, from a terminal
npm run app       # app and worker in a terminal, at http://127.0.0.1:3000
npm run dev       # development: next dev — run `npm run worker` beside it
```

To use Ollama, copy `.env.example` to `.env.local` and set `JUGAAD_AI_PROVIDER=ollama`. Every
variable is described in `.env.example` and `environment.md`. Data lives in
`%LOCALAPPDATA%\Jugaad` (the database, and the desktop app's log).

## Develop

```bash
npm test          # unit tests, mock model only
npm run lint
npm run build     # the check before every commit
```

Start with `CLAUDE.md` (working agreement and traps), `docs/STATUS.md` (where things are) and
`docs/architecture.md` (the map). Locked designs are in `docs/design/`.
