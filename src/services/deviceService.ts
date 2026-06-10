/**
 * Device service interface + mock implementation.
 *
 * Replace MockDeviceService with a real implementation that calls the
 * Electron IPC / native addon / backend API once ready.
 *
 * The UI imports ONLY IDeviceService — swapping the implementation
 * requires no changes to components.
 */

export interface IDeviceService {
  /** Write a single identifier value to the system */
  writeIdentifier(key: string, value: string): Promise<void>;
  /** Read the live value of a single identifier from the system */
  readIdentifier(key: string): Promise<string>;
  /** Run the environment diagnostic and stream log lines via a callback */
  runDiagnostic(onLine: (lvl: string, msg: string) => void): Promise<void>;
}

export class MockDeviceService implements IDeviceService {
  async writeIdentifier(_key: string, _value: string): Promise<void> {
    // TODO: replace with real registry/hardware write via IPC
    await new Promise((r) => setTimeout(r, 420));
  }

  async readIdentifier(_key: string): Promise<string> {
    // TODO: replace with real registry/hardware read via IPC
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

export const deviceService: IDeviceService = new MockDeviceService();
