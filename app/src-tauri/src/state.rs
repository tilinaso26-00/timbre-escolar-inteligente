use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::sync::Mutex as TokioMutex;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use std::path::PathBuf;
use tauri::Manager;
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeOnly {
    pub hours: u8,
    pub minutes: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
pub struct TimeOnly {
    pub hours: u8,
    pub minutes: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
pub struct TimeOnly {
    pub hours: u8,
    pub minutes: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
pub struct TimeOnly {
    pub hours: u8,
    pub minutes: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum EventType {
    Entrada,
    Salida,
    CambioPeriodo,
    RecreoInicio,
    RecreoFin,
    ActividadEspecial,
    Manual,
}