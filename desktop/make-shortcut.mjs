/*
 * Puts a Jugaad shortcut on the desktop and in the Start menu, pointing at Electron in this
 * project with the project folder (package.json "main" is desktop/main.mjs).
 * `npm run desktop:shortcut`; run again if the project folder moves. Windows only.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const electron = join(root, "node_modules", "electron", "dist", "electron.exe");
const icon = join(import.meta.dirname, "assets", "icon.ico");
if (!existsSync(electron)) {
  console.error("Electron isn't downloaded yet — run `npx install-electron` first.");
  process.exit(1);
}

// paths go in as environment variables, so nothing in them is read as PowerShell
const script = `
$shell = New-Object -ComObject WScript.Shell
$places = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
foreach ($place in $places) {
  $link = $shell.CreateShortcut((Join-Path $place 'Jugaad.lnk'))
  $link.TargetPath = $env:J_ELECTRON
  $link.Arguments = '"' + $env:J_ROOT + '"'
  $link.WorkingDirectory = $env:J_ROOT
  $link.IconLocation = $env:J_ICON + ',0'
  $link.Description = 'Jugaad — a local AI workbench'
  $link.Save()
  Write-Output $link.FullName
}`;
const out = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
  env: { ...process.env, J_ELECTRON: electron, J_ROOT: root, J_ICON: icon },
  encoding: "utf8",
});
console.log(`Shortcuts written:\n${out.trim()}`);
