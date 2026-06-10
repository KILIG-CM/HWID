mod device;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            device::read_identifier,
            device::write_identifier,
            device::run_diagnostic,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
