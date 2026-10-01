use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceInfo {
    pub device_id: String,
    pub firmware_version: String,
    pub uptime: u64,
    pub free_heap: u32,
    pub wifi_rssi: i32,
    pub ip_address: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceConfig {
    pub device_id: String,
    pub name: String,
    pub bell_default_seconds: u32,
    pub bell_max_seconds: u32,
    pub timezone: String,
    pub ntp_servers: Vec<String>,
    pub ntp_sync_interval_minutes: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceStatus {
    pub connected: bool,
    pub wifi: bool,
    pub last_sync: String,
    pub device_time: String,
    pub next_event: Option<String>,
    pub last_bell: Option<String>,
    pub scheduled_count: u32,
    pub relay_state: bool,
}

#[tauri::command]
pub async fn device_reboot() -> Result<(), String> {
    // Send reboot command to ESP32 via WebSocket
    // This would be sent via WebSocket command
    Ok(())
}

#[tauri::command]
pub async fn device_get_info(state: tauri::State<'_, crate::state::AppState>) -> Result<DeviceInfo, String> {
    let state = state.lock().await;
    let config = state.device_config.as_ref();
    Ok(DeviceInfo {
        device_id: config.map(|c| c.device_id.clone()).unwrap_or_default(),
        firmware_version: config.map(|c| c.firmware_version.clone()).unwrap_or_default(),
        uptime: 0,
        free_heap: 0,
        wifi_rssi: 0,
        ip_address: String::new(),
    })
}

#[tauri::command]
pub async fn device_get_status(state: tauri::State<'_, crate::state::AppState>) -> Result<crate::state::DeviceStatus, String> {
    let state = state.lock().await;
    let conn = state.esp32_connection.lock().await;
    Ok(conn.status.lock().await.clone())
}

#[tauri::command]
pub async fn device_test_bell(
    duration: u32,
    state: tauri::State<'_, crate::state::Esp32Connection>,
) -> Result<(), String> {
    let conn = state.lock().await;
    if let Some(sender) = &conn.sender {
        let payload = serde_json::json!({
            "event": "bell:test",
            "data": { "durationSec": duration }
        });
        sender.send(tokio_tungstenite::tungstenite::protocol::Message::Text(
            serde_json::to_string(&payload).unwrap().into(),
        ))
        .map_err(|e| format!("Error sending test bell: {}", e))
    } else {
        Err("Not connected to ESP32".to_string())
    }
}

#[tauri::command]
pub async fn device_manual_bell(
    duration: u32,
    state: tauri::State<'_, crate::state::Esp32Connection>,
) -> Result<(), String> {
    let conn = state.lock().await;
    if let Some(sender) = &conn.sender {
        let payload = serde_json::json!({
            "event": "bell:manual",
            "data": { "durationSec": duration }
        });
        sender.send(tokio_tungstenite::tungstenite::protocol::Message::Text(
            serde_json::to_string(&payload).unwrap().into(),
        ))
        .map_err(|e| format!("Error sending manual bell: {}", e))
    } else {
        Err("Not connected to ESP32".to_string())
    }
}

#[tauri::command]
pub async fn device_get_config(state: tauri::State<'_, crate::state::AppState>) -> Result<Option<crate::state::DeviceConfig>, String> {
    let state = state.lock().await;
    Ok(state.device_config.clone())
}

#[tauri::command]
pub async fn device_set_config(
    config: crate::state::DeviceConfig,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.device_config = Some(config.clone());
    state.persist().await.map_err(|e| e.to_string())?;
    Ok(())
}