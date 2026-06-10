export interface Identifier {
  key: string;
  group: '系统标识' | '网络' | '硬件';
  label: string;
  icon: string;
  desc: string;
  original: string;
  value: string;
  staged: string | null;
  locked: boolean;
  gen: () => string;
}

export interface Snapshot {
  id: string;
  name: string;
  time: string;
  auto: boolean;
  changes: number;
  note: string;
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
  /** identifier key -> live value read from the machine */
  identifiers: Record<string, string>;
  /** read-only system info rows */
  system: Array<{ label: string; value: string }>;
}
