//! Device identifier backend.
//!
//! On Windows these read/write the real registry + query WMI for hardware
//! identifiers. On other platforms (e.g. the Linux/macOS dev environment) the
//! commands fall back to mock behaviour so the app still compiles and runs.
//!
//! ⚠️ Writing hardware/registry identifiers is a privileged, system-level
//! operation. The app must run elevated (as Administrator) and only within an
//! authorized maintenance / testing context.

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
    pub group: String, // 系统标识 / 网络 / 硬件
    pub label: String, // display name (e.g. "MAC 地址 · 以太网")
    pub icon: String,
    pub desc: String,  // real model / description from the machine
    pub value: String, // current real value ("未知" if unreadable)
    pub kind: String,  // generator kind: guid|deviceid|productid|mac|disk|cpu|mb
    pub locked: bool,
}

/// Everything the app needs to display the *real* machine on startup.
#[derive(Debug, Clone, Serialize)]
pub struct DeviceInfo {
    pub identifiers: Vec<IdentifierInfo>,
    /// read-only system info rows (操作系统, 计算机名, …)
    pub system: Vec<KeyVal>,
}

/// Read all real device identifiers + system info from the machine.
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
#[tauri::command]
pub fn write_identifier(key: String, value: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        windows_impl::write(&key, &value).map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = (key, value);
        Ok(())
    }
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

    /// Map a system-identifier key to its registry location (subkey, value name).
    fn reg_location(key: &str) -> Option<(&'static str, &'static str)> {
        match key {
            "machine_guid" => Some((r"SOFTWARE\Microsoft\Cryptography", "MachineGuid")),
            "device_id" => Some((r"SOFTWARE\Microsoft\SQMClient", "MachineId")),
            "product_id" => Some((r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", "ProductId")),
            _ => None,
        }
    }

    fn read_reg(key: &str) -> Option<String> {
        let (path, name) = reg_location(key)?;
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let sub = hklm.open_subkey(path).ok()?;
        let val: String = sub.get_value(name).ok()?;
        if val.trim().is_empty() { None } else { Some(val.trim().to_string()) }
    }

    pub fn write(key: &str, value: &str) -> R<()> {
        if let Some((path, name)) = reg_location(key) {
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            let (sub, _) = hklm.create_subkey(path)?;
            sub.set_value(name, &value.to_string())?;
            return Ok(());
        }
        // Hardware identifiers require driver-level spoofing (e.g. MAC via the
        // adapter's NetworkAddress registry value, disk serial via vendor tools).
        // Not implemented — the UI treats this as a non-fatal warning.
        Err(format!("暂不支持写入该硬件标识: {key}").into())
    }

    fn vstr(v: Option<&Variant>) -> Option<String> {
        match v {
            Some(Variant::String(s)) if !s.trim().is_empty() => Some(s.trim().to_string()),
            _ => None,
        }
    }

    fn wmi_one(wmi: &WMIConnection, query: &str) -> Option<HashMap<String, Variant>> {
        wmi.raw_query::<HashMap<String, Variant>>(query).ok()?.into_iter().next()
    }

    /// Virtual / pseudo adapters that should never appear as a real NIC.
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

        // ---- System identifiers (registry) ----
        let sys_specs = [
            ("machine_guid", "机器 GUID", "id",
                "MachineGuid · HKLM\\SOFTWARE\\Microsoft\\Cryptography", "guid"),
            ("device_id", "设备 ID", "monitor",
                "SQM MachineId · 设备遥测标识", "deviceid"),
            ("product_id", "注册表产品标识", "shield",
                "ProductId · Windows 安装标识", "productid"),
        ];
        for (key, label, icon, desc, kind) in sys_specs {
            let value = read_reg(key).unwrap_or_else(|| UNKNOWN.to_string());
            ids.push(IdentifierInfo {
                key: key.into(), group: "系统标识".into(), label: label.into(),
                icon: icon.into(), desc: desc.into(), value, kind: kind.into(), locked: false,
            });
        }

        // ---- WMI ----
        let com = COMLibrary::new()?;
        let wmi = WMIConnection::new(com)?;

        // Network: only real, enabled, identifiable physical NICs.
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
                // Must have a real connection name (shown in 网络连接) and not be virtual.
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

        // Disks: real fixed disks with a model.
        if let Ok(rows) = wmi.raw_query::<HashMap<String, Variant>>(
            "SELECT Model, SerialNumber, MediaType, InterfaceType FROM Win32_DiskDrive",
        ) {
            let mut idx = 0;
            for row in &rows {
                let model = match vstr(row.get("Model")) { Some(m) => m, None => continue };
                let media = vstr(row.get("MediaType")).unwrap_or_default().to_lowercase();
                let iface = vstr(row.get("InterfaceType")).unwrap_or_default().to_lowercase();
                // Skip removable / USB media — keep fixed disks.
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
                key: "cpu_id".into(),
                group: "硬件".into(),
                label: "CPU 标识".into(),
                icon: "cpu".into(),
                desc: vstr(row.get("Name")).unwrap_or_else(|| UNKNOWN.to_string()),
                value: vstr(row.get("ProcessorId")).unwrap_or_else(|| UNKNOWN.to_string()),
                kind: "cpu".into(),
                locked: false,
            });
        }

        // Motherboard.
        if let Some(row) =
            wmi_one(&wmi, "SELECT Manufacturer, Product, SerialNumber FROM Win32_BaseBoard")
        {
            let mfr = vstr(row.get("Manufacturer")).unwrap_or_default();
            let prod = vstr(row.get("Product")).unwrap_or_default();
            let desc = format!("{mfr} {prod}").trim().to_string();
            ids.push(IdentifierInfo {
                key: "mb_serial".into(),
                group: "硬件".into(),
                label: "主板序列号".into(),
                icon: "cpu".into(),
                desc: if desc.is_empty() { UNKNOWN.to_string() } else { desc },
                value: vstr(row.get("SerialNumber")).unwrap_or_else(|| UNKNOWN.to_string()),
                kind: "mb".into(),
                locked: false,
            });
        }

        // ---- System info rows (real) ----
        if let Some(row) =
            wmi_one(&wmi, "SELECT Caption, BuildNumber FROM Win32_OperatingSystem")
        {
            if let Some(s) = vstr(row.get("Caption")) {
                system.push(KeyVal { label: "操作系统".into(), value: s.replace("Microsoft ", "") });
            }
            if let Some(s) = vstr(row.get("BuildNumber")) {
                system.push(KeyVal { label: "系统版本".into(), value: s });
            }
        }
        if let Ok(name) = std::env::var("COMPUTERNAME") {
            system.push(KeyVal { label: "计算机名".into(), value: name });
        }
        if let Some(row) = wmi_one(&wmi, "SELECT Caption FROM Win32_TimeZone") {
            if let Some(s) = vstr(row.get("Caption")) {
                system.push(KeyVal { label: "时区".into(), value: s });
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

        out.push(line("ok", "诊断完成"));
        out
    }
}
