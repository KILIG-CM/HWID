export interface Identifier {
  key: string;
  group: '网络' | '硬件' | '只读参考';
  label: string;
  icon: string;
  desc: string;
  original: string;
  value: string;
  staged: string | null;
  locked: boolean;
  /** 只读参考项（如 CPU / 显卡）：仅可复制，不参与生成 / 锁定 / 批量 / 应用 / 还原。 */
  readonly?: boolean;
  gen: () => string;
}

export interface LogEntry {
  t: string;
  lvl: 'info' | 'ok' | 'warn' | 'err';
  msg: string;
}

export interface AppSettings {
  autoBackup: boolean;
  confirm: boolean;
  verboseLog: boolean;
}

export interface ApplyItem {
  key: string;
  label: string;
  state: 'wait' | 'run' | 'done';
}

export interface DeviceInfo {
  /** full identifier records read from the machine */
  identifiers: Array<{
    key: string;
    group: string;
    label: string;
    icon: string;
    desc: string;
    value: string;
    kind: string;
    locked: boolean;
    readonly: boolean;
  }>;
  /** read-only system info rows */
  system: Array<{ label: string; value: string }>;
}
