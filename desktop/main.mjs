/*
 * Jugaad's desktop app (Electron; decisions.md 2026-10-18, locked design
 * docs/design/desktop-app.html). Shows the startup screen while the app and worker start, then
 * the app in its own window. Closing the window hides it — Jugaad keeps running in the tray
 * until Quit. If Jugaad is already running (`npm run app`), the window opens on that copy and
 * leaves its processes alone. `npm run desktop`, or the shortcut from `npm run desktop:shortcut`.
 */
import { app, BrowserWindow, ipcMain, Menu, Notification, shell, Tray } from "electron";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_URL, probeApp, StartError, startJugaad } from "./jugaad-processes.mjs";

const ROOT = join(import.meta.dirname, "..");
const ICON = join(import.meta.dirname, "assets", "icon.ico");
const TRAY_ICON = join(import.meta.dirname, "assets", "tray.png");

// the desktop app's own files sit beside the database, outside every allow-listed folder
const DATA = join(process.env.LOCALAPPDATA ?? app.getPath("appData"), "Jugaad", "desktop");
mkdirSync(DATA, { recursive: true });
app.setPath("userData", DATA);
const LOG = join(DATA, "jugaad.log");
const CLOSED_ONCE = join(DATA, "closed-once");

app.setName("Jugaad");
app.setAppUserModelId("com.tanveerfb.jugaad");
if (!app.requestSingleInstanceLock()) app.quit();

// title strip colours per theme (design-system.md tokens: bg, text-muted)
const STRIP = {
  dark: { color: "#061428", symbolColor: "#9db0c7" },
  light: { color: "#efe2d2", symbolColor: "#4f6075" },
};
const STRIP_HEIGHT = 32; // matches --titlebar-h in globals.css

/** @type {BrowserWindow | null} */ let splash = null;
/** @type {BrowserWindow | null} */ let main = null;
/** @type {Tray | null} */ let tray = null;
/** @type {{ stop(): Promise<void> } | null} */ let running = null;
let status = "Starting…";
let quitting = false;

const preload = join(import.meta.dirname, "preload.cjs");

function showSplash() {
  if (splash) return splash;
  splash = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    icon: ICON,
    title: "Jugaad",
    show: false,
    webPreferences: { preload, sandbox: true },
  });
  splash.loadFile(join(import.meta.dirname, "splash.html"));
  splash.once("ready-to-show", () => splash?.show());
  splash.on("closed", () => {
    splash = null;
    // closing the startup screen before the app opens means "don't start"
    if (!main && !quitting) quit();
  });
  return splash;
}

function sendState(state) {
  const target = showSplash();
  if (target.webContents.isLoading()) target.webContents.once("did-finish-load", () => target.webContents.send("state", state));
  else target.webContents.send("state", state);
}

function openMain() {
  if (main) {
    main.show();
    main.focus();
    return;
  }
  main = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 380,
    minHeight: 480,
    icon: ICON,
    title: "Jugaad",
    backgroundColor: STRIP.dark.color,
    titleBarStyle: "hidden",
    titleBarOverlay: { ...STRIP.dark, height: STRIP_HEIGHT },
    show: false,
    webPreferences: { preload, sandbox: true },
  });
  // the app shows its title strip when it sees this (layout.tsx)
  main.webContents.setUserAgent(`${main.webContents.getUserAgent()} JugaadDesktop`);
  main.loadURL(APP_URL);
  main.once("ready-to-show", () => {
    main?.show();
    splash?.destroy();
  });
  // anything that isn't the app opens in the owner's browser
  main.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) shell.openExternal(url);
    return { action: url.startsWith(APP_URL) ? "allow" : "deny" };
  });
  main.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  main.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    main?.hide();
    if (!existsSync(CLOSED_ONCE)) {
      writeFileSync(CLOSED_ONCE, new Date().toISOString());
      new Notification({ title: "Jugaad is still running", body: "It's in the tray. Right-click it to quit.", icon: ICON }).show();
    }
  });
  main.on("closed", () => (main = null));
}

ipcMain.on("theme", (event, theme) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win === main) win.setTitleBarOverlay({ ...(STRIP[theme] ?? STRIP.dark), height: STRIP_HEIGHT });
});
ipcMain.on("retry", () => void start());
ipcMain.on("open-log", () => void shell.openPath(LOG));

function setStatus(text) {
  status = text;
  tray?.setContextMenu(trayMenu());
  tray?.setToolTip(`Jugaad — ${text}`);
}

function trayMenu() {
  return Menu.buildFromTemplate([
    { label: "Jugaad", enabled: false },
    { label: status, enabled: false },
    { type: "separator" },
    { label: "Open Jugaad", click: () => (running || status.startsWith("Running") ? openMain() : showSplash().show()) },
    { type: "separator" },
    { label: "Quit Jugaad", click: () => void quit() },
  ]);
}

const STEP_LABELS = {
  build: "Building the app (first time, about a minute)",
  app: "Starting the app",
  worker: "Starting the worker",
};

/** The startup sequence; run again by Try again. */
async function start() {
  const needsBuild = !existsSync(join(ROOT, ".next", "BUILD_ID"));
  const order = [needsBuild ? "build" : "found", "app", "worker"];
  const labels = { ...STEP_LABELS, found: "App build found" };
  const report = (current) =>
    sendState({
      steps: order.map((step) => ({
        label: labels[step],
        state: order.indexOf(step) < order.indexOf(current) ? "done" : step === current ? "now" : "todo",
      })),
    });
  setStatus("Starting…");
  report(needsBuild ? "build" : "app");

  const found = await probeApp();
  if (found === "jugaad") {
    setStatus("Running from a terminal");
    openMain();
    return;
  }
  if (found === "other") {
    return failed("Port 3000 is in use by another program.", "Close it, or stop the other copy of Jugaad, then try again.");
  }
  try {
    running = await startJugaad({
      root: ROOT,
      logPath: LOG,
      onStep: report,
      onWorkerEvent: (event) => {
        if (event === "worker.started" || event === "job.done" || event === "job.failed" || event === "job.cancelled") {
          setStatus("Running · worker idle");
        } else if (event === "job.started") setStatus("Running · worker busy");
      },
      onExit: (name) => {
        void running?.stop();
        running = null;
        main?.hide();
        failed(`Jugaad stopped: the ${name} exited.`, "Try again to restart it, or open the log to see why.");
      },
    });
    openMain();
  } catch (error) {
    if (!(error instanceof StartError)) throw error;
    failed(error.message, "Open the log to see why, then try again.");
  }
}

function failed(lead, more) {
  setStatus("Stopped");
  sendState({ steps: [], error: { lead, more } });
  showSplash().show();
}

async function quit() {
  if (quitting) return;
  quitting = true;
  setStatus("Stopping…");
  await running?.stop();
  running = null;
  app.quit();
}

app.on("second-instance", () => (main ? openMain() : showSplash().show()));
app.on("window-all-closed", () => {
  // stay in the tray; only Quit ends Jugaad
});
app.on("before-quit", (event) => {
  if (!quitting && running) {
    event.preventDefault();
    void quit();
  }
});

app.whenReady().then(() => {
  tray = new Tray(TRAY_ICON);
  tray.on("click", () => (main ? openMain() : showSplash().show()));
  setStatus("Starting…");
  showSplash();
  void start();
});
