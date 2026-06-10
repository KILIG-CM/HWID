/* ============================================================
   数据层 + 图标 + 工具函数
   ============================================================ */

/* ---- 图标（线性 SVG，stroke=currentColor） ---- */
function Icon({ name, size = 18, stroke = 1.7, style }) {
  const P = ICON_PATHS[name] || ICON_PATHS.dot;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" style={style} aria-hidden="true">
      {P}
    </svg>
  );
}

const ICON_PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  fingerprint: <><path d="M12 11v3a8 8 0 0 1-2 5"/><path d="M8.5 8.5a5 5 0 0 1 8 4v1.5"/><path d="M5.5 11a7 7 0 0 1 1.8-4.7"/><path d="M12 4a8 8 0 0 1 8 8v1"/><path d="M16.5 16a14 14 0 0 1-.5 4"/><path d="M12 8a4 4 0 0 0-4 4v2a6 6 0 0 1-1 3.3"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></>,
  network: <><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5l-5 5M12 11.5l5 5"/></>,
  disk: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="M18 7h.01"/></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3.2 3.2 0 0 1 6 0"/><path d="M14 9h4M14 12h4M14 15h2.5"/></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
  dice: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  check: <path d="M5 12l5 5L20 6"/>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  unlock: <><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></>,
  restore: <><path d="M3 7v5h5"/><path d="M3.5 12a8.5 8.5 0 1 1 2 6"/><path d="M12 8v4l3 2"/></>,
  save: <><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/></>,
  zap: <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>,
  alert: <><path d="M12 3l9.5 16.5H2.5z"/><path d="M12 10v4M12 17.5h.01"/></>,
  info: <><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5M12 8h.01"/></>,
  x: <path d="M6 6l12 12M18 6L6 18"/>,
  min: <path d="M5 12h14"/>,
  max: <rect x="5" y="5" width="14" height="14" rx="2"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
  download: <><path d="M12 3v12M7 11l5 4 5-4"/><path d="M5 21h14"/></>,
  chevron: <path d="M9 6l6 6-6 6"/>,
  dot: <circle cx="12" cy="12" r="3"/>,
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4z"/>,
  monitor: <><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
};

/* ---- 工具：随机标识生成 ---- */
const HEX = "0123456789ABCDEF";
const rand = (n, set = HEX) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");
function genGuid() {
  const h = (n) => rand(n, "0123456789abcdef");
  return `${h(8)}-${h(4)}-${h(4)}-${h(4)}-${h(12)}`;
}
function genMac() { return Array.from({ length: 6 }, () => rand(2)).join("-"); }
function genSerial(prefix) { return `${prefix}${rand(4)}-${rand(4)}-${rand(4)}`; }
function shortHash() { const h="0123456789abcdef"; return rand(16, h).replace(/(.{4})/g,"$1 ").trim(); }

/* ---- 设备标识种子数据 ---- */
function buildIdentifiers() {
  return [
    { key: "machine_guid", group: "系统标识", label: "机器 GUID", icon: "id",
      desc: "MachineGuid · HKLM\\SOFTWARE\\Microsoft\\Cryptography",
      original: "5b1e2c40-3f8a-4d6e-9b21-7c0a55e1f9d4", value: "5b1e2c40-3f8a-4d6e-9b21-7c0a55e1f9d4",
      gen: genGuid, locked: false },
    { key: "device_id", group: "系统标识", label: "设备 ID", icon: "monitor",
      desc: "SQM MachineId · 设备遥测标识",
      original: "G:8a3f91b2-d4e6-4f01-bc77-21ee90af3c12", value: "G:8a3f91b2-d4e6-4f01-bc77-21ee90af3c12",
      gen: () => "G:" + genGuid(), locked: false },
    { key: "product_id", group: "系统标识", label: "注册表产品标识", icon: "shield",
      desc: "ProductId · Windows 安装标识",
      original: "00330-80000-00000-AA127", value: "00330-80000-00000-AA127",
      gen: () => `00330-80000-00000-${rand(2,"ABCDEFGHJKLMNP")}${rand(3)}`, locked: false },
    { key: "mac_eth", group: "网络", label: "MAC 地址 · 以太网", icon: "network",
      desc: "Realtek PCIe GbE Family Controller",
      original: "A4-5E-60-C1-D2-77", value: "A4-5E-60-C1-D2-77", gen: genMac, locked: false },
    { key: "mac_wifi", group: "网络", label: "MAC 地址 · 无线", icon: "network",
      desc: "Intel Wi-Fi 6 AX201 160MHz",
      original: "E0-D5-5E-44-9A-3B", value: "E0-D5-5E-44-9A-3B", gen: genMac, locked: true },
    { key: "disk_serial", group: "硬件", label: "硬盘序列号", icon: "disk",
      desc: "Samsung SSD 980 PRO 1TB · NVMe",
      original: "S5GXNF0R612043K", value: "S5GXNF0R612043K",
      gen: () => "S" + rand(13, "0123456789ABCDEFGHJKLMNPRTUVWXYZ"), locked: false },
    { key: "cpu_id", group: "硬件", label: "CPU 标识", icon: "cpu",
      desc: "13th Gen Intel Core i7-13700K",
      original: "BFEBFBFF000B0671", value: "BFEBFBFF000B0671",
      gen: () => "BFEBFBFF" + rand(8), locked: false },
    { key: "mb_serial", group: "硬件", label: "主板序列号", icon: "cpu",
      desc: "ASUS ROG STRIX Z790-E · UEFI",
      original: "210482937401556", value: "210482937401556",
      gen: () => rand(15, "0123456789"), locked: false },
  ];
}

/* ---- 系统信息（只读展示） ---- */
const SYSTEM_INFO = [
  { label: "操作系统", value: "Windows 11 专业版 23H2" },
  { label: "系统版本", value: "22631.4317" },
  { label: "计算机名", value: "WS-STUDIO-07" },
  { label: "主机名", value: "ws-studio-07.local" },
  { label: "时区", value: "(UTC+08:00) 北京" },
  { label: "运行时长", value: "3 天 14 小时" },
];

/* ---- 初始日志 ---- */
const SEED_LOGS = [
  { t: "09:41:02", lvl: "info", msg: "服务已启动 · DeviceID Agent v2.4.1" },
  { t: "09:41:02", lvl: "ok", msg: "已加载设备配置文件（8 项标识）" },
  { t: "09:41:03", lvl: "info", msg: "权限检查通过 · 以管理员身份运行" },
  { t: "09:41:05", lvl: "warn", msg: "无线网卡 MAC 已锁定，跳过扫描" },
  { t: "09:42:18", lvl: "ok", msg: "基线快照已就绪（snapshot-base）" },
];

/* ---- 初始备份快照 ---- */
const SEED_SNAPSHOTS = [
  { id: "snap-base", name: "出厂基线", time: "今天 09:42", auto: true, changes: 0, note: "服务启动时自动创建" },
  { id: "snap-3", name: "测试环境 A", time: "昨天 17:20", auto: false, changes: 3, note: "GUID / 设备ID / 硬盘序列号" },
  { id: "snap-2", name: "干净配置", time: "06-08 11:05", auto: false, changes: 5, note: "网络 + 硬件批量重置" },
  { id: "snap-1", name: "原始备份", time: "06-05 14:33", auto: true, changes: 0, note: "首次安装自动备份" },
];

Object.assign(window, {
  Icon, ICON_PATHS, genGuid, genMac, genSerial, shortHash,
  buildIdentifiers, SYSTEM_INFO, SEED_LOGS, SEED_SNAPSHOTS,
});
