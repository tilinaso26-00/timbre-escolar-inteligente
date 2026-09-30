use serde::{Deserialize, Serialize};
use tauri::{command, State, AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures_util::{SinkExt, StreamExt};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{command, State, AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex as TokioMutex};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio::net::TcpStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio::net::TcpStream;
use futures_util::{SinkExt, StreamExt};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{command, State, AppHandle, Emitter};

use crate::state::Esp32Connection;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Esp32Config {
    pub host: String,
    pub port: u16,
    pub path: Option<String>,
    pub token: String,
}

impl Default for Esp32Config {
    fn default() -> Self {
        Self {
            host: "192.168.1.100".to_string(),
            port: 81,
            path: Some("/".to_string()),
            token: "timbre-escolar-2024".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceStatus {
    pub connected: bool,
    pub wifi: bool,
    pub last_sync: String,
    pub device_time: String,
    pub next_event: Option<NextEvent>,
    pub last_bell: Option<String>,
    pub scheduled_count: u32,
    pub relay_state: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NextEvent {
    pub name: String,
    pub at: String,
    pub in_ms: i64,
}

#[tauri::command]
pub async fn esp32_connect(
    app: tauri::AppHandle,
    config: crate::state::Esp32Config,
    state: tauri::State<'_, crate::state::Esp32Connection>,
) -> Result<crate::state::DeviceStatus, String> {
    let mut conn = state.lock().await;
    conn.config = crate::state::Esp32Config {
        host: config.host,
        port: config.port,
        path: config.path,
        token: config.token,
    };

    // Cancel previous connection if exists
    if let Some(handle) = conn.task_handle.take() {
        handle.abort();
    }
    if let Some(sender) = conn.sender.take() {
        let _ = sender.send(tokio_tungstenite::tungstenite::protocol::Message::Close(None));
    }

    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<tokio_tungstenite::tungstenite::protocol::Message>();
    conn.sender = Some(tx);

    let config = crate::state::Esp32Config {
        host: config.host.clone(),
        port: config.port,
        path: config.path.clone(),
        token: config.token.clone(),
    };
    let status = conn.status.clone();
    let app_handle = tauri::AppHandle::clone(&tauri::AppHandle::current());

    let handle = tokio::spawn(async move {
        let url = format!("ws://{}:{}{}", config.host, config.port, config.path.unwrap_or_default());

        loop {
            match connect_with_retry(&url, &config.token).await {
                Ok((ws_stream, _)) => {
                    let (mut write, mut read) = ws_stream.split();

                    // Send auth
                    let auth_msg = serde_json::json!({
                        "event": "auth",
                        "data": { "token": config.token }
                    });
                    if write.send(tokio_tungstenite::tungstenite::protocol::Message::Text(serde_json::to_string(&auth_msg).unwrap())).await.is_err() {
                        continue;
                    }

                    // Spawn writer task
                    let write_task = tokio::spawn(async move {
                        while let Some(msg) = rx.recv().await {
                            if write.send(msg).await.is_err() {
                                break;
                            }
                        }
                    });

                    // Read loop
                    while let Some(msg) = read.next().await {
                        match msg {
                            Ok(tokio_tungstenite::tungstenite::protocol::Message::Text(text)) => {
                                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                    if let Some(event) = json.get("event").and_then(|v| v.as_str()) {
                                        match event {
                                            "status" => {
                                                if let Some(data) = json.get("data") {
                                                    if let Ok(status) = serde_json::from_value::<crate::state::DeviceStatus>(data.clone()) {
                                                        let mut status_lock = status.lock().await;
                                                        *status_lock = status;
                                                        let _ = app_handle.emit("esp32:status", status);
                                                    }
                                                }
                                            }
                                            "sync:complete" => {
                                                let _ = app_handle.emit("sync:complete", json.get("data"));
                                            }
                                            "sync:error" => {
                                                let _ = app_handle.emit("sync:error", json.get("data"));
                                            }
                                            "bell:executed" => {
                                                let _ = app_handle.emit("bell:executed", json.get("data"));
                                            }
                                            "error" => {
                                                let _ = app_handle.emit("esp32:error", json.get("data"));
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::error!("WS error: {}", e);
                                break;
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Connection failed: {}", e);
                        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    }
                }
            });
        }
    });

    conn.task_handle = Some(handle);

    // Return current status
    Ok(conn.status.lock().await.clone())
}

async fn connect_with_retry(
    url: &str,
    token: &str,
) -> Result<(tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>, tokio_tungstenite::tungstenite::handshake::client::Response), Box<dyn std::error::Error + Send + Sync>> {
    let request = url::Url::parse(url)?.into_client_request()?;
    let (ws_stream, response) = tokio_tungstenite::connect_async(request).await?;
    Ok((ws_stream, response))
}

#[tauri::command]
pub async fn esp32_disconnect(state: tauri::State<'_, crate::state::Esp32Connection>) -> Result<(), String> {
    let mut conn = state.lock().await;
    if let Some(sender) = conn.sender.take() {
        let _ = sender.send(tokio_tungstenite::tungstenite::protocol::Message::Close(None));
    }
    if let Some(handle) = conn.task_handle.take() {
        handle.abort();
    }
    let mut status = conn.status.lock().await;
    status.connected = false;
    Ok(())
}

#[tauri::command]
pub async fn esp32_send_command(
    command: String,
    data: serde_json::Value,
    state: tauri::State<'_, crate::state::Esp32Connection>,
) -> Result<(), String> {
    let conn = state.lock().await;
    if let Some(sender) = &conn.sender {
        let payload = serde_json::json!({
            "event": command,
            "data": data
        });
        sender.send(tokio_tungstenite::tungstenite::protocol::Message::Text(serde_json::to_string(&payload).unwrap()))
            .map_err(|e| format!("Error sending command: {}", e))
    } else {
        Err("Not connected to ESP32".to_string())
    }
}

#[tauri::command]
pub async fn esp32_get_status(state: tauri::State<'_, crate::state::Esp32Connection>) -> Result<crate::state::DeviceStatus, String> {
    let conn = state.lock().await;
    Ok(conn.status.lock().await.clone())
}

#[tauri::command]
pub async fn esp32_sync_full(
    payload: serde_json::Value,
    state: tauri::State<'_, crate::state::Esp32Connection>,
) -> Result<(), String> {
    let conn = state.lock().await;
    if let Some(sender) = &conn.sender {
        let payload = serde_json::json!({
            "event": "sync:request",
            "data": payload
        });
        sender.send(tokio_tungstenite::tungstenite::protocol::Message::Text(serde_json::to_string(&payload).unwrap()))
            .map_err(|e| format!("Error sending sync: {}", e))
    } else {
        Err("Not connected to ESP32".to_string())
    }
}

#[tauri::command]
pub async fn esp32_get_status(state: tauri::State<'_, crate::state::Esp32Connection>) -> Result<crate::state::DeviceStatus, String> {
    let conn = state.lock().await;
    Ok(conn.status.lock().await.clone())
}