/**
 * Native window controls for the custom (frameless) titlebar.
 * No-ops in the browser; drives the real OS window inside Tauri.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function appWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export async function minimizeWindow() {
  if (!isTauri()) return;
  (await appWindow()).minimize();
}

export async function toggleMaximizeWindow() {
  if (!isTauri()) return;
  (await appWindow()).toggleMaximize();
}

export async function closeWindow() {
  if (!isTauri()) return;
  (await appWindow()).close();
}
