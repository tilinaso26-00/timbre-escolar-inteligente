use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio::net::TcpStream;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio::net::TcpStream;
use futures_util::{SinkExt, StreamExt};
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as TokioMutex;
use tokio::sync::mpsc;
use tokio::sync::Mutex as TokioMutex;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};

pub struct WebSocketClient {
    sender: Option<mpsc::UnboundedSender<tokio_tungstenite::tungstenite::protocol::Message>>,
    task_handle: Option<tokio::task::JoinHandle<()>>,
    config: WebSocketConfig,
}

impl Default for WebSocketClient {
    fn default() -> Self {
        Self {
            sender: None,
            task_handle: None,
            config: WebSocketConfig::default(),
        }
    }
}

impl WebSocketClient {
    pub async fn connect(&mut self, config: WebSocketConfig, app_handle: tauri::AppHandle) -> Result<(), String> {
        self.config = config.clone();
        
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<Message>();
        self.sender = Some(tx);
        
        let config = self.config.clone();
        let app_handle = app_handle.clone();
        
        let handle = tokio::spawn(async move {
            loop {
                match Self::connect_with_retry(&config).await {
                    Ok((ws_stream, _)) => {
                        let (mut write, mut read) = ws_stream.split();
                        
                        // Send auth
                        let auth_msg = serde_json::json!({
                            "event": "auth",
                            "data": { "token": config.token }
                        });
                        if write.send(Message::Text(serde_json::to_string(&auth_msg).unwrap())).await.is_err() {
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
                                Ok(Message::Text(text)) => {
                                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                        if let Some(event) = json.get("event").and_then(|v| v.as_str()) {
                                            match event {
                                                "status" => {
                                                    if let Some(data) = json.get("data") {
                                                        let _ = app_handle.emit("esp32:status", data);
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
                }
            });
        }
    }
    
    async fn connect_with_retry(
        config: &WebSocketConfig,
    ) -> Result<(tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>, tokio_tungstenite::tungstenite::handshake::client::Response), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("ws://{}:{}{}", config.host, config.port, config.path.as_deref().unwrap_or(""));
        let request = url::Url::parse(&url)?.into_client_request()?;
        let (ws_stream, response) = tokio_tungstenite::connect_async(request).await?;
        Ok((ws_stream, response))
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct WebSocketConfig {
    pub host: String,
    pub port: u16,
    pub path: Option<String>,
    pub token: String,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            host: "192.168.1.100".to_string(),
            port: 81,
            path: Some("/".to_string()),
            token: "timbre-escolar-2024".to_string(),
        }
    }
}