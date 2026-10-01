use serde::{Deserialize, Serialize};
use serialport::SerialPort;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

pub struct SerialConnection {
    port: Option<Arc<Mutex<Box<dyn SerialPort>>>>,
    #[allow(dead_code)]
    reader_task: Option<tokio::task::JoinHandle<()>>,
}

impl Default for SerialConnection {
    fn default() -> Self {
        Self { port: None, reader_task: None }
    }
}

impl SerialConnection {
    pub async fn connect(&mut self, port_name: &str, baud_rate: u32) -> Result<(), String> {
        let builder =
            serialport::new(port_name, baud_rate).timeout(std::time::Duration::from_millis(1000));

        let port = builder.open().map_err(|e| e.to_string())?;
        self.port = Some(Arc::new(Mutex::new(port)));
        Ok(())
    }

    pub async fn disconnect(&mut self) {
        self.port = None;
    }

    pub async fn write(&mut self, data: &[u8]) -> Result<(), String> {
        if let Some(port) = &self.port {
            let mut port = port.lock().unwrap();
            port.write_all(data).map_err(|e| e.to_string())?;
            port.flush().map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("No serial connection active".to_string())
        }
    }

    pub fn read(&mut self, buf: &mut [u8]) -> Result<usize, String> {
        if let Some(port) = &self.port {
            let mut port = port.lock().unwrap();
            port.read(buf).map_err(|e| e.to_string())
        } else {
            Err("No serial connection active".to_string())
        }
    }

    pub fn is_connected(&self) -> bool {
        self.port.is_some()
    }

    pub fn list_ports() -> Result<Vec<SerialPortInfo>, String> {
        let ports = serialport::available_ports().map_err(|e| e.to_string())?;
        Ok(ports
            .into_iter()
            .map(|p| SerialPortInfo {
                name: p.port_name,
                port_type: format!("{:?}", p.port_type),
            })
            .collect())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialPortInfo {
    pub name: String,
    pub port_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialConfig {
    pub port_name: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub stop_bits: u8,
    pub parity: String,
    pub flow_control: String,
}
