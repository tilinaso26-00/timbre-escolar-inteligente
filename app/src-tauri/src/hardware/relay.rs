use std::sync::{Arc, Mutex};
use tauri::{command, State};
use std::sync::{Arc, Mutex};

pub struct RelayController {
    pin: u32,
    active_low: bool,
    safety_max_on_ms: u32,
    state: Arc<Mutex<bool>>,
}

impl Default for RelayController {
    fn default() -> Self {
        Self {
            pin: 23,
            active_low: true,
            safety_max_on_ms: 60000,
            state: Arc::new(Mutex::new(false)),
        }
    }
}

impl RelayController {
    pub fn new(pin: u32, active_low: bool, safety_max_on_ms: u32) -> Self {
        Self {
            pin,
            active_low,
            safety_max_on_ms,
            state: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn activate(&self, duration_ms: u32) -> Result<(), String> {
        let duration = std::cmp::min(duration_ms, self.safety_max_on_ms);
        
        // Here you would implement the actual GPIO control
        // For now, we just track the state
        let mut state = self.state.lock().await;
        *state = true;
        
        // Schedule automatic turn off
        let state_clone = self.state.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(duration as u64)).await;
            let mut state = state_clone.lock().await;
            *state = false;
        });
        
        Ok(())
    }

    pub async fn deactivate(&self) -> Result<(), String> {
        let mut state = self.state.lock().await;
        *state = false;
        Ok(())
    }

    pub async fn get_state(&self) -> bool {
        *self.state.lock().await
    }
}

#[tauri::command]
pub async fn relay_activate(duration_ms: u32, state: State<'_, RelayController>) -> Result<(), String> {
    state.activate(duration_ms).await
}

#[tauri::command]
pub async fn relay_deactivate(state: State<'_, RelayController>) -> Result<(), String> {
    state.deactivate().await
}

#[tauri::command]
pub async fn relay_get_state(state: State<'_, RelayController>) -> Result<bool, String> {
    Ok(state.get_state().await)
}