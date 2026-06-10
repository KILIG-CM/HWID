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
use std::collections::HashMap;

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

/// Everything the dashboard needs to display the *real* machine on startup.
#[derive(Debug, Clone, Serialize)]
pub struct DeviceInfo {
    /// identifier key (machine_guid, mac_eth, …) -> live value
    pub identifiers: HashMap<String, String>,
    /// read-only system info rows (操作系统, 计算机名, …)
    pub system: Vec<KeyVal>,
}

/// Read all real device identifiers + system info from the machine.
/// On non-Windows this returns empty so the UI keeps its seed/demo values.
#[tauri::command]
pub fn load_device_info() -> Result<DeviceInfo, String> {
    #[cfg(windows)]
    {
        windows_impl::load_info().map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        Ok(DeviceInfo {
            identifiers: HashMap::new(),
            system: Vec::new(),
        })
    }
}

/// Read the live value of a single identifier from the system.
#[tauri::command]
pub fn read_identifier(key: String) -> Result<String, String> {
    #[cfg(windows)]
    {
        windows_impl::read(&key).map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = key;
        Ok(String::new())
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
        windows_impl::diagnose()
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
    use super::{DeviceInfo, DiagLine, KeyVal};
    use std::collections::HashMap;
    use winreg::enums::*;
    use winreg::RegKey;
    use wmi::{COMLibrary, Variant, WMIConnection};

    type R<T> = Result<T, Box<dyn std::error::Error>>;

    /// Map a frontend identifier key to its registry location.
    /// (subkey path under HKLM, value name)
    fn reg_location(key: &str) -> Option<(&'static str, &'static str)> {
        match key {
            "machine_guid" => Some((r"SOFTWARE\Microsoft\Cryptography", "MachineGuid")),
            "device_id" => Some((r"SOFTWARE\Microsoft\SQMClient", "MachineId")),
            "product_id" => Some((r"SOFTWARE\Microsoft\Windows NT\CurrentVersion", "ProductId")),
            _ => None,
        }
    }

    pub fn read(key: &str) -> R<String> {
        if let Some((path, name)) = reg_location(key) {
            let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
            let sub = hklm.open_subkey(path)?;
            let val: String = sub.get_value(name)?;
            return Ok(val);
        }
        // Hardware identifiers come from WMI — read them in bulk via load_info.
        Err(format!("单项读取暂不支持该标识: {key}（请用整机读取）").into())
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
        // TODO: implement per-identifier write routines.
        Err(format!("未实现的标识写入: {key}").into())
    }

    /// Extract a non-empty string from a WMI Variant.
    fn vstr(v: Option<&Variant>) -> Option<String> {
        match v {
            Some(Variant::String(s)) if !s.trim().is_empty() => Some(s.trim().to_string()),
            _ => None,
        }
    }

    /// Run a WMI query and return the first row, if any.
    fn wmi_one(wmi: &WMIConnection, query: &str) -> Option<HashMap<String, Variant>> {
        wmi.raw_query::<HashMap<String, Variant>>(query)
            .ok()?
            .into_iter()
            .next()
    }

    pub fn load_info() -> R<DeviceInfo> {
        let mut ids: HashMap<String, String> = HashMap::new();
        let mut system: Vec<KeyVal> = Vec::new();
        let push = |s: &mut Vec<KeyVal>, label: &str, value: String| {
            s.push(KeyVal { label: label.into(), value })
        };

        // ---- Registry-based identifiers ----
        for key in ["machine_guid", "device_id", "product_id"] {
            if let Ok(v) = read(key) {
                ids.insert(key.into(), v);
            }
        }

        // ---- WMI: hardware identifiers + system info ----
        let com = COMLibrary::new()?;
        let wmi = WMIConnection::new(com)?;

        // Network adapters → pick one ethernet + one wireless MAC.
        if let Ok(rows) = wmi.raw_query::<HashMap<String, Variant>>(
            "SELECT Name, NetConnectionID, MACAddress FROM Win32_NetworkAdapter WHERE MACAddress IS NOT NULL",
        ) {
            let mut eth: Option<String> = None;
            let mut wifi: Option<String> = None;
            for row in &rows {
                let mac = match vstr(row.get("MACAddress")) {
                    Some(m) => m.replace(':', "-"),
                    None => continue,
                };
                let name = vstr(row.get("Name")).unwrap_or_default().to_lowercase();
                let conn = vstr(row.get("NetConnectionID")).unwrap_or_default().to_lowercase();
                let is_wifi = ["wireless", "wi-fi", "wifi", "wlan", "802.11"]
                    .iter()
                    .any(|k| name.contains(k) || conn.contains(k));
                if is_wifi {
                    if wifi.is_none() {
                        wifi = Some(mac);
                    }
                } else if eth.is_none() {
                    eth = Some(mac);
                }
            }
            if let Some(m) = eth {
                ids.insert("mac_eth".into(), m);
            }
            if let Some(m) = wifi {
                ids.insert("mac_wifi".into(), m);
            }
        }

        // Disk serial (first physical disk).
        if let Some(row) = wmi_one(&wmi, "SELECT SerialNumber FROM Win32_DiskDrive") {
            if let Some(s) = vstr(row.get("SerialNumber")) {
                ids.insert("disk_serial".into(), s);
            }
        }
        // CPU.
        if let Some(row) = wmi_one(&wmi, "SELECT ProcessorId FROM Win32_Processor") {
            if let Some(s) = vstr(row.get("ProcessorId")) {
                ids.insert("cpu_id".into(), s);
            }
        }
        // Motherboard.
        if let Some(row) = wmi_one(&wmi, "SELECT SerialNumber FROM Win32_BaseBoard") {
            if let Some(s) = vstr(row.get("SerialNumber")) {
                ids.insert("mb_serial".into(), s);
            }
        }

        // ---- System info rows ----
        if let Some(row) =
            wmi_one(&wmi, "SELECT Caption, Version, BuildNumber FROM Win32_OperatingSystem")
        {
            if let Some(s) = vstr(row.get("Caption")) {
                push(&mut system, "操作系统", s.replace("Microsoft ", ""));
            }
            if let Some(s) = vstr(row.get("BuildNumber")) {
                push(&mut system, "系统版本", s);
            }
        }
        if let Ok(name) = std::env::var("COMPUTERNAME") {
            push(&mut system, "计算机名", name.clone());
            push(&mut system, "主机名", format!("{}.local", name.to_lowercase()));
        }
        if let Some(row) = wmi_one(&wmi, "SELECT Caption FROM Win32_TimeZone") {
            if let Some(s) = vstr(row.get("Caption")) {
                push(&mut system, "时区", s);
            }
        }

        Ok(DeviceInfo { identifiers: ids, system })
    }

    pub fn diagnose() -> Vec<DiagLine> {
        let line = |lvl: &str, msg: &str| DiagLine { lvl: lvl.into(), msg: msg.into() };
        let mut out = vec![line("info", "开始环境诊断…")];

        // Admin check: writing to HKLM\...\Cryptography requires elevation.
        match RegKey::predef(HKEY_LOCAL_MACHINE)
            .open_subkey_with_flags(r"SOFTWARE\Microsoft\Cryptography", KEY_READ)
        {
            Ok(_) => out.push(line("ok", "注册表访问：正常")),
            Err(_) => out.push(line("warn", "注册表访问受限，请以管理员身份运行")),
        }

        // WMI reachability.
        match COMLibrary::new().and_then(WMIConnection::new) {
            Ok(_) => out.push(line("ok", "WMI 服务连接正常")),
            Err(_) => out.push(line("warn", "WMI 连接失败")),
        }

        out.push(line("ok", "诊断完成"));
        out
    }
}
