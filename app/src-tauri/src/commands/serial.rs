use serde::{Deserialize, Serialize};
use tauri::{command, State};
use serialport::{SerialPort, SerialPortType};
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as TokioMutex;
use tokio_serial::SerialStream;
use std::sync::{Arc, Mutex as StdMutex};
use tokio::sync::Mutex as TokioMutex;
use tokio_serial::SerialStream;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;

pub struct SerialConnection {
    port: Option<Arc<StdMutex<Box<dyn SerialPort>>>>,
    reader_task: Option<tokio::task::JoinHandle<()>>,
}

impl Default for SerialConnection {
    fn default() -> Self {
        Self { port: None, reader_task: None }
    }
}

#[derive(Serialize, Deserialize)]
pub struct SerialConfig {
    pub port_name: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub stop_bits: u8,
    pub parity: String,
    pub flow_control: String,
}

#[derive(Serialize, Deserialize)]
pub struct SerialPortInfo {
    pub name: String,
    pub port_type: String,
}

#[tauri::command]
pub async fn serial_list_ports() -> Result<Vec<SerialPortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    Ok(ports.into_iter().map(|p| SerialPortInfo {
        name: p.port_name,
        port_type: format!("{:?}", p.port_type),
    }).collect())
}

#[tauri::command]
pub async fn serial_connect(
    config: SerialConfig,
    state: tauri::State<'_, crate::state::SerialConnection>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut conn = state.lock().await;

    // Close previous connection
    if let Some(task) = conn.reader_task.take() {
        task.abort();
    }
    conn.port = None;

    let builder = serialport::new(&config.port_name, config.baud_rate)
        .timeout(std::time::Duration::from_millis(1000));

    let port = builder.open().map_err(|e| e.to_string())?;
    let port = Arc::new(tokio::sync::Mutex::new(port));

    let port_clone = port.clone();
    let app_handle = app.clone();

    // Reader task
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
pub async fn serial_write(data: String, state: tauri::State<'_, crate::state::SerialConnection>) -> Result<(), String> {
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
pub async fn serial_disconnect(state: tauri::State<'_, crate::state::SerialConnection>) -> Result<(), String> {
    let mut conn = state.lock().await;
    if let Some(task) = conn.reader_task.take() {
        task.abort();
    }
    conn.port = None;
    Ok(())
}