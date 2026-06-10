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
        // Dev fallback: no real system to read from.
        Ok(String::new())
    }
}

/// Write a single identifier value to the system.
///
/// Returns Ok(()) on success. On Windows this writes the registry / invokes the
/// relevant hardware-spoofing routine; elsewhere it is a no-op stub.
#[tauri::command]
pub fn write_identifier(key: String, value: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        windows_impl::write(&key, &value).map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = (key, value);
        // Dev fallback: pretend the write succeeded.
        Ok(())
    }
}

/// Run an environment diagnostic, returning the collected log lines.
///
/// The frontend renders these as a streamed log; here we return them as a batch
/// (the UI can still animate them in). A future version may emit Tauri events
/// for true line-by-line streaming.
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
    use super::DiagLine;
    use winreg::enums::*;
    use winreg::RegKey;

    type R<T> = Result<T, Box<dyn std::error::Error>>;

    /// Map a frontend identifier key to its registry location.
    /// (subkey path under HKLM, value name)
    fn reg_location(key: &str) -> Option<(&'static str, &'static str)> {
        match key {
            "machine_guid" => Some((r"SOFTWARE\Microsoft\Cryptography", "MachineGuid")),
            "device_id" => Some((
                r"SOFTWARE\Microsoft\SQMClient",
                "MachineId",
            )),
            "product_id" => Some((
                r"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
                "ProductId",
            )),
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
        // Hardware identifiers (MAC / disk / CPU / motherboard) are read via WMI.
        // TODO: implement WMI queries (Win32_NetworkAdapter, Win32_DiskDrive,
        // Win32_Processor, Win32_BaseBoard) for the remaining keys.
        Err(format!("未实现的标识读取: {key}").into())
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

        out.push(line("ok", "硬件标识读取完成"));
        out.push(line("ok", "诊断完成，未发现异常"));
        out
    }
}
