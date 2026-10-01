use serde_json::Value;
use tauri::State;

use crate::state::{DeviceStatus, Esp32Config, Esp32Connection, Esp32State};

/// La conexión WebSocket con el ESP32 la mantiene la interfaz (puente nativo
/// del navegador). Estos comandos sólo guardan la configuración del dispositivo.
#[tauri::command]
pub async fn esp32_connect(
    config: Esp32Config,
    state: State<'_, Esp32Connection>,
) -> Result<DeviceStatus, String> {
    let mut conn = state.lock().await;
    if let Some(handle) = conn.task_handle.take() {
        handle.abort();
    }
    conn.sender = None;
    conn.config = config;
    Ok(conn.status.lock().await.clone())
}

#[tauri::command]
pub async fn esp32_disconnect(state: State<'_, Esp32Connection>) -> Result<(), String> {
    let mut conn = state.lock().await;
    if let Some(handle) = conn.task_handle.take() {
        handle.abort();
    }
    conn.sender = None;
    let mut status = conn.status.lock().await;
    status.connected = false;
    Ok(())
}

#[tauri::command]
pub async fn esp32_send_command(
    _event: String,
    _data: Value,
    state: State<'_, Esp32Connection>,
) -> Result<(), String> {
    let conn = state.lock().await;
    match &conn.sender {
        Some(_) => Ok(()),
        None => Err(
            "Sin conexión Rust↔ESP32: la app usa el puente WebSocket de la interfaz".to_string(),
        ),
    }
}

#[tauri::command]
pub async fn esp32_get_status(state: State<'_, Esp32Connection>) -> Result<DeviceStatus, String> {
    let conn = state.lock().await;
    Ok(conn.status.lock().await.clone())
}

#[tauri::command]
pub async fn esp32_sync_full(_payload: Value) -> Result<Value, String> {
    Err("La sincronización se realiza desde la interfaz (evento sync:request)".to_string())
}

impl Esp32State {
    pub fn is_configured(&self) -> bool {
        !self.config.host.is_empty()
    }
}
