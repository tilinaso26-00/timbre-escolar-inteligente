use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;
use tokio::sync::mpsc::UnboundedSender;
use tokio::task::JoinHandle;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct TimeOnly {
    pub hours: u8,
    pub minutes: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum EventType {
    Entrada,
    Salida,
    CambioPeriodo,
    RecreoInicio,
    RecreoFin,
    ActividadEspecial,
    Manual,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduleEvent {
    pub id: String,
    pub name: String,
    pub start_time: TimeOnly,
    pub duration_minutes: u32,
    pub bell_time: TimeOnly,
    pub bell_duration_seconds: u32,
    pub event_type: EventType,
    pub journey: String,
    pub active_days: Vec<u8>,
    pub is_fixed: bool,
    pub period_index: Option<u32>,
    pub template_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JourneySchedule {
    pub journey: String,
    pub name: String,
    pub entry_time: TimeOnly,
    pub exit_time: TimeOnly,
    pub default_period_minutes: u32,
    pub default_bell_seconds: u32,
    pub active_days: Vec<u8>,
    pub events: Vec<ScheduleEvent>,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScheduleTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub journey: String,
    pub events: Vec<ScheduleEvent>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarException {
    pub id: String,
    pub date: String,
    pub journey: String,
    pub exception_type: String,
    pub schedule_id: Option<String>,
    pub custom_events: Option<Vec<ScheduleEvent>>,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CalendarDayInfo {
    pub date: String,
    pub journey: String,
    pub exception: Option<CalendarException>,
    pub resolved_source: String,
    pub resolved_template: Option<ScheduleTemplate>,
    pub has_custom_events: bool,
    pub is_no_classes: bool,
    pub events: Vec<ScheduleEvent>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WifiConfig {
    pub ssid: String,
    pub password: String,
    pub fallback_ap: bool,
    pub ap_ssid: String,
    pub ap_password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RelayConfig {
    pub pin: u32,
    pub active_low: bool,
    pub safety_max_on_ms: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RtcConfig {
    pub enabled: bool,
    pub i2c_address: u32,
    pub sda_pin: u32,
    pub scl_pin: u32,
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
    pub wifi: WifiConfig,
    pub relay: RelayConfig,
    pub rtc: RtcConfig,
    pub firmware_version: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NextEvent {
    pub name: String,
    pub at: String,
    pub in_ms: i64,
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

impl Default for DeviceStatus {
    fn default() -> Self {
        Self {
            connected: false,
            wifi: false,
            last_sync: String::new(),
            device_time: String::new(),
            next_event: None,
            last_bell: None,
            scheduled_count: 0,
            relay_state: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Esp32Config {
    pub host: String,
    pub port: u16,
    pub path: Option<String>,
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SerialConfig {
    pub port_name: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub stop_bits: u8,
    pub parity: String,
    pub flow_control: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialPortInfo {
    pub name: String,
    pub port_type: String,
}

// ---------------------------------------------------------------- stores

#[derive(Default)]
pub struct JourneyStore {
    items: HashMap<String, JourneySchedule>,
}

impl JourneyStore {
    pub async fn save_journey(&mut self, journey: JourneySchedule) -> Result<(), String> {
        self.items.insert(journey.journey.clone(), journey);
        Ok(())
    }

    pub async fn get_all_journeys(&self) -> Result<Vec<JourneySchedule>, String> {
        Ok(self.items.values().cloned().collect())
    }

    pub async fn delete_journey(&mut self, journey: &str) -> Result<(), String> {
        self.items.remove(journey);
        Ok(())
    }
}

#[derive(Default)]
pub struct TemplateStore {
    items: HashMap<String, ScheduleTemplate>,
}

impl TemplateStore {
    pub async fn save(&mut self, template: ScheduleTemplate) -> Result<(), String> {
        self.items.insert(template.id.clone(), template);
        Ok(())
    }

    pub async fn get_all(&self) -> Result<Vec<ScheduleTemplate>, String> {
        Ok(self.items.values().cloned().collect())
    }

    pub async fn delete(&mut self, id: &str) -> Result<(), String> {
        self.items.remove(id);
        Ok(())
    }
}

#[derive(Default)]
pub struct ExceptionStore {
    items: HashMap<String, CalendarException>,
    custom_events: HashMap<(String, String), Vec<ScheduleEvent>>,
}

impl ExceptionStore {
    pub async fn save(&mut self, exception: CalendarException) -> Result<(), String> {
        if let Some(events) = exception.custom_events.clone() {
            self.custom_events
                .insert((exception.date.clone(), exception.journey.clone()), events);
        }
        self.items.insert(exception.id.clone(), exception);
        Ok(())
    }

    pub async fn get_all(&self) -> Result<Vec<CalendarException>, String> {
        Ok(self.items.values().cloned().collect())
    }

    pub async fn delete(&mut self, id: &str) -> Result<(), String> {
        if let Some(exception) = self.items.remove(id) {
            self.custom_events
                .remove(&(exception.date, exception.journey));
        }
        Ok(())
    }

    fn slot(&mut self, date: &str, journey: &str) -> &mut Vec<ScheduleEvent> {
        self.custom_events.entry((date.to_string(), journey.to_string())).or_default()
    }

    pub async fn add_event_for_date(
        &mut self,
        date: &str,
        journey: &str,
        event: ScheduleEvent,
    ) -> Result<(), String> {
        self.slot(date, journey).push(event);
        Ok(())
    }

    pub async fn update_event_for_date(
        &mut self,
        date: &str,
        journey: &str,
        event_id: &str,
        event: ScheduleEvent,
    ) -> Result<(), String> {
        let events = self.slot(date, journey);
        let position = events.iter().position(|e| e.id == event_id);
        match position {
            Some(index) => {
                events[index] = event;
                Ok(())
            }
            None => Err(format!("Evento {} no encontrado", event_id)),
        }
    }

    pub async fn delete_event_for_date(
        &mut self,
        date: &str,
        journey: &str,
        event_id: &str,
    ) -> Result<(), String> {
        let events = self.slot(date, journey);
        let position = events.iter().position(|e| e.id == event_id);
        match position {
            Some(index) => {
                events.remove(index);
                Ok(())
            }
            None => Err(format!("Evento {} no encontrado", event_id)),
        }
    }

    fn find_for_date(&self, date: &str, journey: &str) -> Option<&CalendarException> {
        self.items.values().find(|e| e.date == date && e.journey == journey)
    }
}

// ------------------------------------------------------- conexión ESP32

pub struct Esp32State {
    pub config: Esp32Config,
    pub sender: Option<UnboundedSender<tokio_tungstenite::tungstenite::protocol::Message>>,
    pub task_handle: Option<JoinHandle<()>>,
    pub status: Arc<TokioMutex<DeviceStatus>>,
}

impl Default for Esp32State {
    fn default() -> Self {
        Self {
            config: Esp32Config {
                host: "192.168.4.1".to_string(),
                port: 81,
                path: Some("/".to_string()),
                token: "timbre-escolar-2024".to_string(),
            },
            sender: None,
            task_handle: None,
            status: Arc::new(TokioMutex::new(DeviceStatus::default())),
        }
    }
}

pub type Esp32Connection = Arc<TokioMutex<Esp32State>>;

pub struct SerialConnectionInner {
    pub port: Option<Arc<TokioMutex<Box<dyn serialport::SerialPort>>>>,
    pub reader_task: Option<JoinHandle<()>>,
}

impl Default for SerialConnectionInner {
    fn default() -> Self {
        Self { port: None, reader_task: None }
    }
}

pub type SerialConnection = Arc<TokioMutex<SerialConnectionInner>>;

// ------------------------------------------------------------- app state

#[derive(Default)]
pub struct AppStateInner {
    pub device_config: Option<DeviceConfig>,
    pub esp32_connection: Esp32Connection,
    pub sync_version: i64,
    pub sync_hash: String,
    pub schedule_store: JourneyStore,
    pub template_store: TemplateStore,
    pub exception_store: ExceptionStore,
}

#[derive(Serialize, Deserialize)]
struct PersistedState {
    device_config: Option<DeviceConfig>,
    sync_version: i64,
    sync_hash: String,
    journeys: Vec<JourneySchedule>,
    templates: Vec<ScheduleTemplate>,
    exceptions: Vec<CalendarException>,
}

fn state_file() -> Result<std::path::PathBuf, String> {
    let base = dirs::data_dir().ok_or_else(|| "No se encontró el directorio de datos".to_string())?;
    Ok(base.join("timbre-escolar").join("state.json"))
}

impl AppStateInner {
    pub async fn persist(&self) -> Result<(), String> {
        let path = state_file()?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let data = PersistedState {
            device_config: self.device_config.clone(),
            sync_version: self.sync_version,
            sync_hash: self.sync_hash.clone(),
            journeys: self.schedule_store.get_all_journeys().await.map_err(|e| e.to_string())?,
            templates: self.template_store.get_all().await.map_err(|e| e.to_string())?,
            exceptions: self.exception_store.get_all().await.map_err(|e| e.to_string())?,
        };
        let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())
    }

    pub async fn resolve_schedule_for_date(
        &self,
        date: &str,
        journey: &str,
    ) -> Result<Option<CalendarDayInfo>, String> {
        let exception = self.exception_store.find_for_date(date, journey).cloned();
        let custom = self
            .exception_store
            .custom_events
            .get(&(date.to_string(), journey.to_string()))
            .cloned();

        let is_no_classes = exception.as_ref().map(|e| e.exception_type == "no_classes").unwrap_or(false);
        let has_custom_events = custom.as_ref().map(|events| !events.is_empty()).unwrap_or(false);

        let events = if has_custom_events {
            custom.clone().unwrap_or_default()
        } else {
            self.schedule_store
                .items
                .get(journey)
                .map(|j| j.events.clone())
                .unwrap_or_default()
                .into_iter()
                .filter(|event| {
                    event
                        .active_days
                        .iter()
                        .any(|day| *day == weekday_of(date))
                })
                .collect()
        };

        Ok(Some(CalendarDayInfo {
            date: date.to_string(),
            journey: journey.to_string(),
            exception,
            resolved_source: if has_custom_events {
                "custom_events".to_string()
            } else {
                "journey".to_string()
            },
            resolved_template: None,
            has_custom_events,
            is_no_classes,
            events,
        }))
    }
}

fn weekday_of(date: &str) -> u8 {
    // "YYYY-MM-DD" -> 0 = domingo .. 6 = sábado
    let parts: Vec<u32> = date.split('-').filter_map(|p| p.parse().ok()).collect();
    if parts.len() != 3 {
        return 0;
    }
    let (year, month, day) = (parts[0], parts[1], parts[2]);
    let (y, m) = if month <= 2 { (year - 1, month + 12) } else { (year, month) };
    let century = y / 100;
    let year_of_century = y % 100;
    let weekday = (day + (13 * (m + 1)) / 5 + year_of_century + year_of_century / 4 + century / 4 + 5 * century) % 7;
    // Zeller: 0 = sábado, convertimos a 0 = domingo
    ((weekday + 6) % 7) as u8
}

pub type AppState = Arc<TokioMutex<AppStateInner>>;
