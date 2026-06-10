/**
 * Persistent settings.
 *
 * In the desktop app, settings are saved to a JSON file in the app config dir
 * via the Rust backend (survives restarts). In the browser, they fall back to
 * localStorage so the preview also persists.
 */
import type { AppSettings } from '../types';

const DEFAULTS: AppSettings = { autoBackup: true, confirm: false, verboseLog: false };
const LS_KEY = 'device-id-manager.settings';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function loadSettings(): Promise<AppSettings> {
  if (isTauri()) {
    try {
      return await invoke<AppSettings>('load_settings');
    } catch {
      return DEFAULTS;
    }
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isTauri()) {
    try {
      await invoke<void>('save_settings', { settings });
    } catch {
      /* ignore persistence errors */
    }
    return;
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
