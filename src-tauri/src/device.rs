//! Device identifier backend.
//!
//! On Windows the READ path queries the real registry + WMI for live device
//! identifiers. On other platforms (the Linux/macOS dev env) it returns empty
//! so the UI keeps its seed values.
//!
//! ⚠️ The WRITE path is intentionally a no-op simulation for now — see
//! `write_identifier`. No real system/hardware modification is performed.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagLine {
    pub lvl: String,
    pub msg: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct KeyVal {
    pub label: String,
    pub value: String,
}

/// A single real device identifier, fully described from the live machine.
#[derive(Debug, Clone, Serialize)]
pub struct IdentifierInfo {
    pub key: String,
    pub group: String, // 网络 / 硬件
    pub label: String,
    pub icon: String,
    pub desc: String,  // real model / description from the machine
    pub value: String, // current real value ("未知" if unreadable)
    pub kind: String,  // generator kind: mac|ip|disk|cpu|mb|uuid|mem|gpu
    pub locked: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeviceInfo {
    pub identifiers: Vec<IdentifierInfo>,
    pub system: Vec<KeyVal>,
}

/// Read all real device identifiers from the machine.
/// On non-Windows this returns empty so the UI keeps its seed/demo values.
#[tauri::command]
pub fn load_device_info() -> Result<DeviceInfo, String> {
    #[cfg(windows)]
    {
        // WMI needs a COM apartment (MTA) that conflicts with the STA already
        // set on Tauri's command thread (→ RPC_E_CHANGED_MODE / 0x80010106).
        // Run it on a fresh thread, which starts with no apartment set.
        std::thread::spawn(|| windows_impl::load_info().map_err(|e| e.to_string()))
            .join()
            .unwrap_or_else(|_| Err("读取线程异常退出".into()))
    }
    #[cfg(not(windows))]
    {
        Ok(DeviceInfo { identifiers: Vec::new(), system: Vec::new() })
    }
}

/// Write a single identifier value to the system.
///
/// SIMULATION ONLY — this performs NO real registry / hardware modification.
/// The UI uses it purely to demonstrate the apply flow.
///
/// TODO: implement real, elevated writes here when that feature is approved
/// (registry values, NIC NetworkAddress, etc.). Until then it is a safe no-op.
#[tauri::command]
pub fn write_identifier(key: String, value: String) -> Result<(), String> {
    let _ = (key, value);
    Ok(())
}

/// Run an environment diagnostic, returning the collected log lines.
#[tauri::command]
pub fn run_diagnostic() -> Vec<DiagLine> {
    #[cfg(windows)]
    {
        std::thread::spawn(windows_impl::diagnose)
            .join()
            .unwrap_or_else(|_| {
                vec![DiagLine { lvl: "warn".into(), msg: "诊断线程异常退出".into() }]
            })
    }
    #[cfg(not(windows))]
    {
        let line = |lvl: &str, msg: &str| DiagLine { lvl: lvl.into(), msg: msg.into() };
        vec![
            line("info", "开始环境诊断…"),
            line("warn", "非 Windows 环境，使用模拟诊断"),
            line("ok", "前端与后端通信正常"),
            line("ok", "诊断完成，未发现异常"),
        ]
    }
}

#[cfg(windows)]
mod windows_impl {
    use super::{DeviceInfo, DiagLine, IdentifierInfo, KeyVal};
    use std::collections::HashMap;
    use winreg::enums::*;
    use winreg::RegKey;
    use wmi::{COMLibrary, Variant, WMIConnection};

    type R<T> = Result<T, Box<dyn std::error::Error>>;

    const UNKNOWN: &str = "未知";

    fn vstr(v: Option<&Variant>) -> Option<String> {
        match v {
            Some(Variant::String(s)) if !s.trim().is_empty() => Some(s.trim().to_string()),
            _ => None,
        }
    }

    fn wmi_one(wmi: &WMIConnection, query: &str) -> Option<HashMap<String, Variant>> {
        wmi.raw_query::<HashMap<String, Variant>>(query).ok()?.into_iter().next()
    }

    fn is_virtual_adapter(name: &str, conn: &str) -> bool {
        let hay = format!("{name} {conn}").to_lowercase();
        const BAD: &[&str] = &[
            "virtual", "vmware", "virtualbox", "hyper-v", "vethernet", "loopback",
            "tap", "tunnel", "miniport", "pseudo", "teredo", "isatap", "bluetooth",
            "vpn", "wi-fi direct", "wifi direct", "wan", "ras", "npcap", "packet",
        ];
        BAD.iter().any(|b| hay.contains(b))
    }

    pub fn load_info() -> R<DeviceInfo> {
        let mut ids: Vec<IdentifierInfo> = Vec::new();
        let mut system: Vec<KeyVal> = Vec::new();

        let com = COMLibrary::new()?;
        let wmi = WMIConnection::new(com)?;

        // ===== 网络 =====
        // Real, enabled, identifiable physical NICs only.
        if let Ok(rows) = wmi.raw_query::<HashMap<String, Variant>>(
            "SELECT Name, NetConnectionID, MACAddress, PhysicalAdapter, NetEnabled \
             FROM Win32_NetworkAdapter WHERE PhysicalAdapter = TRUE AND MACAddress IS NOT NULL",
        ) {
            let mut idx = 0;
            for row in &rows {
                let mac = match vstr(row.get("MACAddress")) {
                    Some(m) => m.replace(':', "-"),
                    None => continue,
                };
                let name = vstr(row.get("Name")).unwrap_or_default();
                let conn = vstr(row.get("NetConnectionID")).unwrap_or_default();
                if name.is_empty() || conn.is_empty() || is_virtual_adapter(&name, &conn) {
                    continue;
                }
                ids.push(IdentifierInfo {
                    key: format!("mac_{idx}"),
                    group: "网络".into(),
                    label: format!("MAC 地址 · {conn}"),
                    icon: "network".into(),
                    desc: name,
                    value: mac,
                    kind: "mac".into(),
                    locked: false,
                });
                idx += 1;
            }
        }
        // 公网 IP — value is filled by the frontend via a live network query.
        ids.push(IdentifierInfo {
            key: "public_ip".into(),
            group: "网络".into(),
            label: "公网 IP".into(),
            icon: "network".into(),
            desc: "当前网络出口 IP · 实时查询".into(),
            value: UNKNOWN.into(),
            kind: "ip".into(),
            locked: false,
        });

        // ===== 硬件 =====
        // Disks (real fixed disks).
        if let Ok(rows) = wmi.raw_query::<HashMap<String, Variant>>(
            "SELECT Model, SerialNumber, MediaType, InterfaceType FROM Win32_DiskDrive",
        ) {
            let mut idx = 0;
            for row in &rows {
                let model = match vstr(row.get("Model")) { Some(m) => m, None => continue };
                let media = vstr(row.get("MediaType")).unwrap_or_default().to_lowercase();
                let iface = vstr(row.get("InterfaceType")).unwrap_or_default().to_lowercase();
                if media.contains("removable") || iface.contains("usb") {
                    continue;
                }
                let serial = vstr(row.get("SerialNumber")).unwrap_or_else(|| UNKNOWN.to_string());
                ids.push(IdentifierInfo {
                    key: format!("disk_{idx}"),
                    group: "硬件".into(),
                    label: if idx == 0 { "硬盘序列号".into() } else { format!("硬盘序列号 · {}", idx + 1) },
                    icon: "disk".into(),
                    desc: model,
                    value: serial,
                    kind: "disk".into(),
                    locked: false,
                });
                idx += 1;
            }
        }
        // CPU.
        if let Some(row) = wmi_one(&wmi, "SELECT Name, ProcessorId FROM Win32_Processor") {
            ids.push(IdentifierInfo {
                key: "cpu_id".into(), group: "硬件".into(), label: "CPU 标识".into(), icon: "cpu".into(),
                desc: vstr(row.get("Name")).unwrap_or_else(|| UNKNOWN.to_string()),
                value: vstr(row.get("ProcessorId")).unwrap_or_else(|| UNKNOWN.to_string()),
                kind: "cpu".into(), locked: false,
            });
        }
        // Motherboard serial.
        if let Some(row) =
            wmi_one(&wmi, "SELECT Manufacturer, Product, SerialNumber FROM Win32_BaseBoard")
        {
            let mfr = vstr(row.get("Manufacturer")).unwrap_or_default();
            let prod = vstr(row.get("Product")).unwrap_or_default();
            let desc = format!("{mfr} {prod}").trim().to_string();
            ids.push(IdentifierInfo {
                key: "mb_serial".into(), group: "硬件".into(), label: "主板序列号".into(), icon: "cpu".into(),
                desc: if desc.is_empty() { UNKNOWN.to_string() } else { desc },
                value: vstr(row.get("SerialNumber")).unwrap_or_else(|| UNKNOWN.to_string()),
                kind: "mb".into(), locked: false,
            });
        }
        // Motherboard / system UUID (SMBIOS).
        if let Some(row) = wmi_one(&wmi, "SELECT UUID FROM Win32_ComputerSystemProduct") {
            ids.push(IdentifierInfo {
                key: "mb_uuid".into(), group: "硬件".into(), label: "主板 UUID".into(), icon: "shield".into(),
                desc: "系统 UUID · SMBIOS".into(),
                value: vstr(row.get("UUID")).unwrap_or_else(|| UNKNOWN.to_string()),
                kind: "uuid".into(), locked: false,
            });
        }
        // Memory serial (first stick with a serial).
        if let Ok(rows) = wmi.raw_query::<HashMap<String, Variant>>(
            "SELECT SerialNumber, Manufacturer, PartNumber FROM Win32_PhysicalMemory",
        ) {
            if let Some(row) = rows.iter().find(|r| vstr(r.get("SerialNumber")).is_some()) {
                let mfr = vstr(row.get("Manufacturer")).unwrap_or_default();
                let part = vstr(row.get("PartNumber")).unwrap_or_default();
                let desc = format!("{mfr} {part}").trim().to_string();
                ids.push(IdentifierInfo {
                    key: "mem_serial".into(), group: "硬件".into(), label: "内存序列号".into(), icon: "cpu".into(),
                    desc: if desc.is_empty() { "内存模组".into() } else { desc },
                    value: vstr(row.get("SerialNumber")).unwrap_or_else(|| UNKNOWN.to_string()),
                    kind: "mem".into(), locked: false,
                });
            }
        }
        // GPU (real display adapter; pseudo-serial from PNP instance id).
        if let Ok(rows) = wmi.raw_query::<HashMap<String, Variant>>(
            "SELECT Name, PNPDeviceID FROM Win32_VideoController",
        ) {
            let pick = rows.iter().find(|r| {
                vstr(r.get("Name")).map(|n| !n.to_lowercase().contains("basic display")).unwrap_or(false)
            }).or_else(|| rows.first());
            if let Some(row) = pick {
                let pnp = vstr(row.get("PNPDeviceID")).unwrap_or_default();
                let serial = pnp.rsplit('\\').next().unwrap_or("").trim().to_string();
                ids.push(IdentifierInfo {
                    key: "gpu_serial".into(), group: "硬件".into(), label: "显卡序列号".into(), icon: "monitor".into(),
                    desc: vstr(row.get("Name")).unwrap_or_else(|| UNKNOWN.to_string()),
                    value: if serial.is_empty() { UNKNOWN.into() } else { serial },
                    kind: "gpu".into(), locked: false,
                });
            }
        }

        // ===== 系统信息（保留供后续使用） =====
        if let Some(row) = wmi_one(&wmi, "SELECT Caption, BuildNumber FROM Win32_OperatingSystem") {
            if let Some(s) = vstr(row.get("Caption")) {
                system.push(KeyVal { label: "操作系统".into(), value: s.replace("Microsoft ", "") });
            }
            if let Some(s) = vstr(row.get("BuildNumber")) {
                system.push(KeyVal { label: "系统版本".into(), value: s });
            }
        }

        Ok(DeviceInfo { identifiers: ids, system })
    }

    pub fn diagnose() -> Vec<DiagLine> {
        let line = |lvl: &str, msg: &str| DiagLine { lvl: lvl.into(), msg: msg.into() };
        let mut out = vec![line("info", "开始环境诊断…")];

        match RegKey::predef(HKEY_LOCAL_MACHINE)
            .open_subkey_with_flags(r"SOFTWARE\Microsoft\Cryptography", KEY_READ)
        {
            Ok(_) => out.push(line("ok", "注册表访问：正常")),
            Err(_) => out.push(line("warn", "注册表访问受限，请以管理员身份运行")),
        }
        match COMLibrary::new().and_then(WMIConnection::new) {
            Ok(_) => out.push(line("ok", "WMI 服务连接正常")),
            Err(_) => out.push(line("warn", "WMI 连接失败")),
        }
        out.push(line("info", "当前为模拟修改模式，不会写入真实系统"));
        out.push(line("ok", "诊断完成"));
        out
    }
}
