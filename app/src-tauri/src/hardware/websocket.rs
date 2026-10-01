use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio::task::JoinHandle;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebSocketConfig {
    pub host: String,
    pub port: u16,
    pub path: Option<String>,
    pub token: String,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            host: "192.168.4.1".to_string(),
            port: 81,
            path: Some("/".to_string()),
            token: "timbre-escolar-2024".to_string(),
        }
    }
}

pub struct WebSocketClient {
    sender: Option<UnboundedSender<Message>>,
    task_handle: Option<JoinHandle<()>>,
    pub config: WebSocketConfig,
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
    pub fn url(&self) -> String {
        format!(
            "ws://{}:{}{}",
            self.config.host,
            self.config.port,
            self.config.path.as_deref().unwrap_or("/")
        )
    }

    pub fn is_connected(&self) -> bool {
        self.sender.is_some()
    }

    pub fn send(&self, event: &str, data: serde_json::Value) -> Result<(), String> {
        let payload = serde_json::json!({ "event": event, "data": data, "token": self.config.token });
        let text = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
        match &self.sender {
            Some(sender) => sender.send(Message::Text(text.into())).map_err(|e| e.to_string()),
            None => Err("Sin conexión con el dispositivo".to_string()),
        }
    }

    pub fn connect(&mut self, config: WebSocketConfig, app_handle: tauri::AppHandle) {
        self.disconnect();
        self.config = config;
        let url = self.url();

        let (tx, rx) = unbounded_channel::<Message>();
        self.sender = Some(tx);

        let handle = tokio::spawn(run_connection(url, rx, app_handle));
        self.task_handle = Some(handle);
    }

    pub fn disconnect(&mut self) {
        if let Some(handle) = self.task_handle.take() {
            handle.abort();
        }
        self.sender = None;
    }
}

async fn run_connection(url: String, mut rx: UnboundedReceiver<Message>, app_handle: tauri::AppHandle) {
    loop {
        match connect_async(url.as_str()).await {
            Ok((ws_stream, _)) => {
                tracing::info!("Conectado al ESP32 en {}", url);
                let _ = app_handle.emit("esp32:connected", true);
                let (mut write, mut read) = ws_stream.split();

                loop {
                    tokio::select! {
                        outbound = rx.recv() => {
                            match outbound {
                                Some(message) => {
                                    if write.send(message).await.is_err() {
                                        break;
                                    }
                                }
                                None => return,
                            }
                        }
                        inbound = read.next() => {
                            match inbound {
                                Some(Ok(Message::Text(text))) => forward(&app_handle, &text),
                                Some(Ok(_)) => {}
                                Some(Err(error)) => {
                                    tracing::error!("Error de WebSocket: {}", error);
                                    break;
                                }
                                None => break,
                            }
                        }
                    }
                }

                let _ = app_handle.emit("esp32:connected", false);
            }
            Err(error) => {
                tracing::warn!("No se pudo conectar al ESP32: {}", error);
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    }
}

fn forward(app_handle: &tauri::AppHandle, text: &str) {
    let Ok(payload) = serde_json::from_str::<serde_json::Value>(text) else {
        return;
    };
    let Some(event) = payload.get("event").and_then(|v| v.as_str()) else {
        return;
    };
    let data = payload.get("data").cloned();

    let channel = match event {
        "status" => "esp32:status",
        "sync:complete" => "sync:complete",
        "sync:error" => "sync:error",
        "bell:executed" => "bell:executed",
        "error" => "esp32:error",
        _ => return,
    };

    let _ = app_handle.emit(channel, data);
}
