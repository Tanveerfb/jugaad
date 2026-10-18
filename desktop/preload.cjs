/*
 * Runs in both desktop windows. The startup screen gets its state and its two buttons; the app
 * window reports its theme, so the Windows buttons over the title strip follow dark/light.
 * Sandboxed preloads must be CommonJS.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a sandboxed preload can only require()
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jugaadDesktop", {
  onState: (callback) => ipcRenderer.on("state", (_event, state) => callback(state)),
  retry: () => ipcRenderer.send("retry"),
  openLog: () => ipcRenderer.send("open-log"),
});

window.addEventListener("DOMContentLoaded", () => {
  const html = document.documentElement;
  const send = () => ipcRenderer.send("theme", html.dataset.theme === "light" ? "light" : "dark");
  send();
  new MutationObserver(send).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
});
