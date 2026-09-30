// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod commands;
pub mod hardware;
pub mod state;
pub mod utils;

use std::sync::Arc;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

mod commands;
mod hardware;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = state::AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::LogDir { file_name: Some("logs".to_string()) }),
            ])
            .build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard::init())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            // ESP32 commands
            commands::esp32::esp32_connect,
            commands::esp32::esp32_disconnect,
            commands::esp32::esp32_send_command,
            commands::esp32::esp32_get_status,
            commands::esp32::esp32_sync_full,
            // Serial commands
            commands::serial::serial_list_ports,
            commands::serial::serial_connect,
            commands::serial::serial_write,
            commands::serial::serial_disconnect,
            // Schedule commands
            commands::schedule::sync_full,
            commands::schedule::get_journeys,
            commands::schedule::save_journey,
            commands::schedule::delete_journey,
            commands::schedule::get_templates,
            commands::schedule::save_template,
            commands::schedule::delete_template,
            commands::schedule::get_exceptions,
            commands::schedule::save_exception,
            commands::schedule::delete_exception,
            commands::schedule::get_calendar_day,
            // Device commands
            commands::device::device_reboot,
            commands::device::device_get_info,
            commands::device::device_get_status,
            commands::device::device_test_bell,
            commands::device::device_manual_bell,
            commands::device::device_get_config,
            commands::device::device_set_config,
            // System commands
            commands::system::system_get_info,
            commands::system::system_reboot,
            commands::system::system_shutdown,
            // Schedule commands
            commands::schedule::get_events_for_date,
            commands::schedule::add_event,
            commands::schedule::update_event,
            commands::schedule::delete_event,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Initialize the ESP32 connection on startup if configured
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}