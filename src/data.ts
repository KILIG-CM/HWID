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

export function buildIdentifiers(): Identifier[] {
  return [
    {
      key: 'machine_guid',
      group: '系统标识',
      label: '机器 GUID',
      icon: 'id',
      desc: 'MachineGuid · HKLM\\SOFTWARE\\Microsoft\\Cryptography',
      original: '5b1e2c40-3f8a-4d6e-9b21-7c0a55e1f9d4',
      value: '5b1e2c40-3f8a-4d6e-9b21-7c0a55e1f9d4',
      staged: null,
      locked: false,
      gen: genGuid,
    },
    {
      key: 'device_id',
      group: '系统标识',
      label: '设备 ID',
      icon: 'monitor',
      desc: 'SQM MachineId · 设备遥测标识',
      original: 'G:8a3f91b2-d4e6-4f01-bc77-21ee90af3c12',
      value: 'G:8a3f91b2-d4e6-4f01-bc77-21ee90af3c12',
      staged: null,
      locked: false,
      gen: () => 'G:' + genGuid(),
    },
    {
      key: 'product_id',
      group: '系统标识',
      label: '注册表产品标识',
      icon: 'shield',
      desc: 'ProductId · Windows 安装标识',
      original: '00330-80000-00000-AA127',
      value: '00330-80000-00000-AA127',
      staged: null,
      locked: false,
      gen: () => `00330-80000-00000-${rand(2, 'ABCDEFGHJKLMNP')}${rand(3)}`,
    },
    {
      key: 'mac_eth',
      group: '网络',
      label: 'MAC 地址 · 以太网',
      icon: 'network',
      desc: 'Realtek PCIe GbE Family Controller',
      original: 'A4-5E-60-C1-D2-77',
      value: 'A4-5E-60-C1-D2-77',
      staged: null,
      locked: false,
      gen: genMac,
    },
    {
      key: 'mac_wifi',
      group: '网络',
      label: 'MAC 地址 · 无线',
      icon: 'network',
      desc: 'Intel Wi-Fi 6 AX201 160MHz',
      original: 'E0-D5-5E-44-9A-3B',
      value: 'E0-D5-5E-44-9A-3B',
      staged: null,
      locked: true,
      gen: genMac,
    },
    {
      key: 'disk_serial',
      group: '硬件',
      label: '硬盘序列号',
      icon: 'disk',
      desc: 'Samsung SSD 980 PRO 1TB · NVMe',
      original: 'S5GXNF0R612043K',
      value: 'S5GXNF0R612043K',
      staged: null,
      locked: false,
      gen: () => 'S' + rand(13, '0123456789ABCDEFGHJKLMNPRTUVWXYZ'),
    },
    {
      key: 'cpu_id',
      group: '硬件',
      label: 'CPU 标识',
      icon: 'cpu',
      desc: '13th Gen Intel Core i7-13700K',
      original: 'BFEBFBFF000B0671',
      value: 'BFEBFBFF000B0671',
      staged: null,
      locked: false,
      gen: () => 'BFEBFBFF' + rand(8),
    },
    {
      key: 'mb_serial',
      group: '硬件',
      label: '主板序列号',
      icon: 'cpu',
      desc: 'ASUS ROG STRIX Z790-E · UEFI',
      original: '210482937401556',
      value: '210482937401556',
      staged: null,
      locked: false,
      gen: () => rand(15, '0123456789'),
    },
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
