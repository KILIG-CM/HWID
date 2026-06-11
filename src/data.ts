import type { Identifier } from './types';

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
    desc: string, value: string, kind: string, readonly = false, locked = false,
  ): Identifier => ({
    key, group, label, icon, desc, original: value, value, staged: null, locked, readonly,
    gen: genForKind(kind),
  });
  return [
    mk('mac_0', '网络', 'MAC 地址 · 以太网', 'network', 'Realtek PCIe GbE Family Controller', 'A4-5E-60-C1-D2-77', 'mac'),
    mk('mac_1', '网络', 'MAC 地址 · WLAN', 'network', 'Intel Wi-Fi 6 AX201 160MHz', 'E0-D5-5E-44-9A-3B', 'mac'),
    mk('disk_0', '硬件', '硬盘序列号', 'disk', 'Samsung SSD 980 PRO 1TB · NVMe', 'S5GXNF0R612043K', 'disk'),
    mk('mb_serial', '硬件', '主板序列号', 'cpu', 'ASUS ROG STRIX Z790-E · UEFI', '210482937401556', 'mb'),
    mk('mb_uuid', '硬件', '主板 UUID', 'shield', '系统 UUID · SMBIOS', '4C4C4544-0042-5310-8052-B9C04F575233', 'uuid'),
    mk('mem_serial', '硬件', '内存序列号', 'cpu', 'Kingston KF560C36 · 32GB DDR5', '8A2B7C41', 'mem'),
    // ===== 只读参考项（不可模拟修改，仅展示 / 复制）=====
    // 公网 IP：网络出口地址，实时查询，仅复制 / 刷新。
    mk('public_ip', '只读参考', '公网 IP', 'network', '当前网络出口 IP · 实时查询', '未知', 'ip', true),
    // CPU：ProcessorId 非唯一序列号，仅作参考。
    mk('cpu_id', '只读参考', 'CPU 标识', 'cpu', '13th Gen Intel Core i7-13700K · 非唯一序列号，仅作参考', 'BFEBFBFF000B0671', 'cpu', true),
    // 显卡：本阶段只识别 NVIDIA / AMD，来自 PNPDeviceID。
    mk('gpu_0', '只读参考', '显卡标识', 'monitor', 'NVIDIA GeForce RTX 4070 · 来自 PNPDeviceID，非保证唯一序列号', '4&1a2b3c4d&0&0019', 'gpu', true),
  ];
}
