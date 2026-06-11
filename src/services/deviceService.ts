/**
 * Device service.
 *
 * When running inside Tauri (the desktop app) these calls are forwarded to the
 * Rust backend via `invoke`, which performs the real Windows registry / WMI
 * operations. When running in a plain browser (e.g. `npm run dev` without
 * Tauri) they fall back to a mock so the UI is still fully explorable.
 */

import type { DeviceInfo } from '../types';

export interface IDeviceService {
  /** Read all real identifiers + system info from the machine (empty in browser). */
  loadDeviceInfo(): Promise<DeviceInfo>;
  writeIdentifier(key: string, value: string): Promise<void>;
  runDiagnostic(onLine: (lvl: string, msg: string) => void): Promise<void>;
}

/** True when running inside the Tauri webview. */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Lazily import the Tauri API so the browser build doesn't choke on it. */
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

class TauriDeviceService implements IDeviceService {
  async loadDeviceInfo(): Promise<DeviceInfo> {
    return tauriInvoke<DeviceInfo>('load_device_info');
  }

  async writeIdentifier(key: string, value: string): Promise<void> {
    await tauriInvoke<void>('write_identifier', { key, value });
  }

  async runDiagnostic(onLine: (lvl: string, msg: string) => void): Promise<void> {
    const lines = await tauriInvoke<Array<{ lvl: string; msg: string }>>('run_diagnostic');
    for (const l of lines) {
      onLine(l.lvl, l.msg);
      await new Promise((r) => setTimeout(r, 380));
    }
  }
}

class MockDeviceService implements IDeviceService {
  async loadDeviceInfo(): Promise<DeviceInfo> {
    // Browser/dev: no real machine — keep the UI's seed values.
    return { identifiers: [], system: [] };
  }

  async writeIdentifier(): Promise<void> {
    // 模拟：仅延时，不做任何真实写入。
    await new Promise((r) => setTimeout(r, 420));
  }

  async runDiagnostic(onLine: (lvl: string, msg: string) => void): Promise<void> {
    // 浏览器环境无法读取真实硬件，全部为模拟输出，逐条明确标注「模拟」。
    const lines: Array<[string, string]> = [
      ['info', '（模拟）开始环境诊断…'],
      ['warn', '（模拟）浏览器环境，无法读取真实硬件信息'],
      ['ok', '（模拟）前端与后端通信正常'],
      ['info', '（模拟）当前为模拟修改模式，不会写入真实系统'],
      ['ok', '（模拟）诊断完成'],
    ];
    for (const [lvl, msg] of lines) {
      onLine(lvl, msg);
      await new Promise((r) => setTimeout(r, 380));
    }
  }
}

export const deviceService: IDeviceService = isTauri()
  ? new TauriDeviceService()
  : new MockDeviceService();
