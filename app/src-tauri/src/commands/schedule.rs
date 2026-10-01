use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncPayload {
    pub version: i64,
    pub hash: String,
    pub timestamp: String,
    pub device_id: String,
    pub journeys: Vec<crate::state::JourneySchedule>,
    pub templates: Vec<crate::state::ScheduleTemplate>,
    pub exceptions: Vec<crate::state::CalendarException>,
    pub device_config: Option<crate::state::DeviceConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncResult {
    pub success: bool,
    pub version: i64,
}

#[tauri::command]
pub async fn sync_full(
    payload: serde_json::Value,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<SyncResult, String> {
    let payload: SyncPayload = serde_json::from_value(payload).map_err(|e| e.to_string())?;
    
    let mut state = state.lock().await;
    
    // Validate version
    if payload.version <= state.sync_version {
        return Err("Version older or equal to current".to_string());
    }

    // Save journeys
    for journey in payload.journeys {
        state.schedule_store.save_journey(journey).await.map_err(|e| e.to_string())?;
    }

    // Save templates
    for template in payload.templates {
        state.template_store.save(template).await.map_err(|e| e.to_string())?;
    }

    // Save exceptions
    for exception in payload.exceptions {
        state.exception_store.save(exception).await.map_err(|e| e.to_string())?;
    }

    // Update device config
    if let Some(config) = payload.device_config {
        state.device_config = Some(config);
    }

    state.sync_version = payload.version;
    state.sync_hash = payload.hash;

    // Persist to disk
    state.persist().await.map_err(|e| e.to_string())?;

    Ok(SyncResult { success: true, version: payload.version })
}

#[tauri::command]
pub async fn get_journeys(state: State<'_, crate::state::AppState>) -> Result<Vec<crate::state::JourneySchedule>, String> {
    let state = state.lock().await;
    Ok(state.schedule_store.get_all_journeys().await.map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn save_journey(
    journey: crate::state::JourneySchedule,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.schedule_store.save_journey(journey).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_journey(
    journey: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.schedule_store.delete_journey(&journey).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_templates(state: tauri::State<'_, crate::state::AppState>) -> Result<Vec<crate::state::ScheduleTemplate>, String> {
    let state = state.lock().await;
    Ok(state.template_store.get_all().await.map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn save_template(
    template: crate::state::ScheduleTemplate,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.template_store.save(template).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_template(
    id: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.template_store.delete(&id).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_exceptions(state: tauri::State<'_, crate::state::AppState>) -> Result<Vec<crate::state::CalendarException>, String> {
    let state = state.lock().await;
    Ok(state.exception_store.get_all().await.map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn save_exception(
    exception: crate::state::CalendarException,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.exception_store.save(exception).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_exception(
    id: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.exception_store.delete(&id).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_calendar_day(
    date: String,
    journey: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Option<crate::state::CalendarDayInfo>, String> {
    let state = state.lock().await;
    let resolved = state.resolve_schedule_for_date(&date, &journey).await.map_err(|e| e.to_string())?;
    Ok(resolved)
}

#[tauri::command]
pub async fn get_events_for_date(
    date: String,
    journey: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<Vec<crate::state::ScheduleEvent>, String> {
    let state = state.lock().await;
    let resolved = state.resolve_schedule_for_date(&date, &journey).await.map_err(|e| e.to_string())?;
    Ok(resolved.map(|day| day.events).unwrap_or_default())
}

#[tauri::command]
pub async fn add_event(
    date: String,
    journey: String,
    event: crate::state::ScheduleEvent,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.exception_store.add_event_for_date(&date, &journey, event).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_event(
    date: String,
    journey: String,
    event_id: String,
    event: crate::state::ScheduleEvent,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.exception_store.update_event_for_date(&date, &journey, &event_id, event).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_event(
    date: String,
    journey: String,
    event_id: String,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.exception_store.delete_event_for_date(&date, &journey, &event_id).await.map_err(|e| e.to_string())?;
    Ok(())
}