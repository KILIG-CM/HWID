//! Persistent app settings.
//!
//! Stored as JSON in the platform app-config directory so toggles survive
//! restarts. The frontend calls `load_settings` on startup and `save_settings`
//! whenever a toggle changes.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(rename = "autoBackup")]
    pub auto_backup: bool,
    pub confirm: bool,
    #[serde(rename = "verboseLog")]
    pub verbose_log: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings { auto_backup: true, confirm: false, verbose_log: false }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

/// Load saved settings, or defaults if none exist yet.
#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).map_err(|e| e.to_string()),
        Err(_) => Ok(AppSettings::default()), // first run: no file yet
    }
}

/// Persist settings to disk.
#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app)?;
    let text = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, text).map_err(|e| e.to_string())
}
