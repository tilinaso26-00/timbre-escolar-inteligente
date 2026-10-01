use std::io::{Read, Write};
use tauri::{Emitter, State};

use crate::state::{SerialConfig, SerialConnection, SerialPortInfo};

#[tauri::command]
pub async fn serial_list_ports() -> Result<Vec<SerialPortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    Ok(ports
        .into_iter()
        .map(|p| SerialPortInfo {
            name: p.port_name,
            port_type: format!("{:?}", p.port_type),
        })
        .collect())
}

#[tauri::command]
pub async fn serial_connect(
    config: SerialConfig,
    state: State<'_, SerialConnection>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut conn = state.lock().await;

    if let Some(task) = conn.reader_task.take() {
        task.abort();
    }
    conn.port = None;

    let builder =
        serialport::new(&config.port_name, config.baud_rate).timeout(std::time::Duration::from_millis(1000));

    let port = builder.open().map_err(|e| e.to_string())?;
    let port = std::sync::Arc::new(tokio::sync::Mutex::new(port));

    let port_clone = port.clone();
    let app_handle = app.clone();

    let task = tokio::spawn(async move {
        let mut buf = vec![0u8; 1024];
        loop {
            let mut port = port_clone.lock().await;
            match port.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buf[..n]);
                    let _ = app_handle.emit("serial:data", data.to_string());
                }
                Err(e) => {
                    let _ = app_handle.emit("serial:error", e.to_string());
                    break;
                }
                _ => {}
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
    });

    conn.port = Some(port);
    conn.reader_task = Some(task);
    Ok(())
}

#[tauri::command]
pub async fn serial_write(data: String, state: State<'_, SerialConnection>) -> Result<(), String> {
    let conn = state.lock().await;
    if let Some(port) = &conn.port {
        let mut port = port.lock().await;
        port.write(data.as_bytes()).map_err(|e| e.to_string())?;
        port.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No serial connection active".to_string())
    }
}

#[tauri::command]
pub async fn serial_disconnect(state: State<'_, SerialConnection>) -> Result<(), String> {
    let mut conn = state.lock().await;
    if let Some(task) = conn.reader_task.take() {
        task.abort();
    }
    conn.port = None;
    Ok(())
}

#[allow(unused_imports)]
use serde_json as _unused_json;
