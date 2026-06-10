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
  readIdentifier(key: string): Promise<string>;
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

  async readIdentifier(key: string): Promise<string> {
    return tauriInvoke<string>('read_identifier', { key });
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
    return { identifiers: {}, system: [] };
  }

  async writeIdentifier(_key: string, _value: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 420));
  }

  async readIdentifier(_key: string): Promise<string> {
    return '';
  }

  async runDiagnostic(onLine: (lvl: string, msg: string) => void): Promise<void> {
    const lines: Array<[string, string]> = [
      ['info', '开始环境诊断…'],
      ['ok', '管理员权限：已获取'],
      ['ok', '注册表访问：正常'],
      ['info', '枚举网络适配器（2 个）…'],
      ['warn', '无线网卡 MAC 已锁定'],
      ['ok', '硬件标识读取完成'],
      ['ok', '诊断完成，未发现异常'],
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
