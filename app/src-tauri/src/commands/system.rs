use serde::{Deserialize, Serialize};
use tauri::{command, State};
use crate::state::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub device_id: String,
    pub firmware_version: String,
    pub uptime: u64,
    pub free_heap: u32,
    pub wifi_rssi: i32,
    pub ip_address: String,
    pub total_memory: u64,
    pub used_memory: u64,
    pub cpu_usage: f32,
}

#[tauri::command]
pub async fn system_get_info(state: State<'_, crate::state::AppState>) -> Result<SystemInfo, String> {
    let state = state.lock().await;
    Ok(SystemInfo {
        device_id: state.device_config.as_ref().map(|c| c.device_id.clone()).unwrap_or_default(),
        firmware_version: state.device_config.as_ref().map(|c| c.firmware_version.clone()).unwrap_or_default(),
        uptime: 0,
        free_heap: 0,
        wifi_rssi: 0,
        ip_address: String::new(),
        total_memory: 0,
        used_memory: 0,
        cpu_usage: 0.0,
    })
}

#[tauri::command]
pub async fn system_reboot() -> Result<(), String> {
    // Send reboot command to ESP32 via WebSocket
    Ok(())
}

#[tauri::command]
pub async fn system_shutdown() -> Result<(), String> {
    // Send shutdown command to ESP32 via WebSocket
    Ok(())
}