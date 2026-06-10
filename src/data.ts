import type { Identifier, Snapshot, LogEntry } from './types';

const HEX = '0123456789ABCDEF';
const rand = (n: number, set = HEX) =>
  Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');

function genGuid() {
  const h = (n: number) => rand(n, '0123456789abcdef');
  return `${h(8)}-${h(4)}-${h(4)}-${h(4)}-${h(12)}`;
}
function genMac() {
  return Array.from({ length: 6 }, () => rand(2)).join('-');
}
export function shortHash() {
  const h = '0123456789abcdef';
  return rand(16, h).replace(/(.{4})/g, '$1 ').trim();
}

/** Map a backend identifier `kind` to a random-value generator (simulation). */
export function genForKind(kind: string): () => string {
  switch (kind) {
    case 'mac': return genMac;
    case 'ip': return () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 254) + 1).join('.');
    case 'disk': return () => 'S' + rand(13, '0123456789ABCDEFGHJKLMNPRTUVWXYZ');
    case 'cpu': return () => 'BFEBFBFF' + rand(8);
    case 'mb': return () => rand(15, '0123456789');
    case 'uuid': return () => genGuid().toUpperCase();
    case 'mem': return () => rand(8, '0123456789ABCDEF');
    case 'gpu': return () => '4&' + rand(8, '0123456789abcdef') + '&0&0019';
    default: return genMac;
  }
}

// Seed identifiers — used only for the browser/dev preview. In the desktop app
// the list is built from real machine data (see App startup). No 系统标识 group.
export function buildIdentifiers(): Identifier[] {
  const mk = (
    key: string, group: Identifier['group'], label: string, icon: string,
    desc: string, value: string, kind: string, locked = false,
  ): Identifier => ({
    key, group, label, icon, desc, original: value, value, staged: null, locked,
    gen: genForKind(kind),
  });
  return [
    mk('mac_0', '网络', 'MAC 地址 · 以太网', 'network', 'Realtek PCIe GbE Family Controller', 'A4-5E-60-C1-D2-77', 'mac'),
    mk('mac_1', '网络', 'MAC 地址 · WLAN', 'network', 'Intel Wi-Fi 6 AX201 160MHz', 'E0-D5-5E-44-9A-3B', 'mac'),
    mk('public_ip', '网络', '公网 IP', 'network', '当前网络出口 IP · 实时查询', '未知', 'ip'),
    mk('disk_0', '硬件', '硬盘序列号', 'disk', 'Samsung SSD 980 PRO 1TB · NVMe', 'S5GXNF0R612043K', 'disk'),
    mk('cpu_id', '硬件', 'CPU 标识', 'cpu', '13th Gen Intel Core i7-13700K', 'BFEBFBFF000B0671', 'cpu'),
    mk('mb_serial', '硬件', '主板序列号', 'cpu', 'ASUS ROG STRIX Z790-E · UEFI', '210482937401556', 'mb'),
    mk('mb_uuid', '硬件', '主板 UUID', 'shield', '系统 UUID · SMBIOS', '4C4C4544-0042-5310-8052-B9C04F575233', 'uuid'),
    mk('mem_serial', '硬件', '内存序列号', 'cpu', 'Kingston KF560C36 · 32GB DDR5', '8A2B7C41', 'mem'),
    mk('gpu_serial', '硬件', '显卡序列号', 'monitor', 'NVIDIA GeForce RTX 4070', '4&1a2b3c4d&0&0019', 'gpu'),
  ];
}

export const SYSTEM_INFO = [
  { label: '操作系统', value: 'Windows 11 专业版 23H2' },
  { label: '系统版本', value: '22631.4317' },
  { label: '计算机名', value: 'WS-STUDIO-07' },
  { label: '主机名', value: 'ws-studio-07.local' },
  { label: '时区', value: '(UTC+08:00) 北京' },
  { label: '运行时长', value: '3 天 14 小时' },
];

export const SEED_LOGS: LogEntry[] = [
  { t: '09:41:02', lvl: 'info', msg: '服务已启动 · DeviceID Agent v2.4.1' },
  { t: '09:41:02', lvl: 'ok', msg: '已加载设备配置文件（8 项标识）' },
  { t: '09:41:03', lvl: 'info', msg: '权限检查通过 · 以管理员身份运行' },
  { t: '09:41:05', lvl: 'warn', msg: '无线网卡 MAC 已锁定，跳过扫描' },
  { t: '09:42:18', lvl: 'ok', msg: '基线快照已就绪（snapshot-base）' },
];

export const SEED_SNAPSHOTS: Snapshot[] = [
  { id: 'snap-base', name: '出厂基线', time: '今天 09:42', auto: true, changes: 0, note: '服务启动时自动创建' },
  { id: 'snap-3', name: '测试环境 A', time: '昨天 17:20', auto: false, changes: 3, note: 'GUID / 设备ID / 硬盘序列号' },
  { id: 'snap-2', name: '干净配置', time: '06-08 11:05', auto: false, changes: 5, note: '网络 + 硬件批量重置' },
  { id: 'snap-1', name: '原始备份', time: '06-05 14:33', auto: true, changes: 0, note: '首次安装自动备份' },
];
