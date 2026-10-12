#ifndef CONFIG_H
#define CONFIG_H

#define FIRMWARE_VERSION "1.0.1"
#define DEVICE_NAME "TimbreEscolar"

// Pines
#define RELAY_PIN 23
#define LED_OK_PIN 2
#define LED_ERROR_PIN 4
#define RTC_SDA_PIN 21
#define RTC_SCL_PIN 22
#define BUTTON_RESET_PIN 0

// Configuración relé
// JQC-3FF-S-Z en PCB roja (módulo azul): activo en HIGH — IN HIGH = relé ON.
// activeLow=false => apagar escribe LOW (foco/timbre apagado en reposo).
#define RELAY_ACTIVE_LOW false
#define RELAY_SAFETY_MAX_MS 60000

// WiFi
// NOTA DE SEGURIDAD: estas credenciales son de PRUEBA. Antes de dejarlo
// operativo hay que cambiarlas y NO subirlas a ningún repositorio público.
#define WIFI_SSID "COLEGIO_WIFI"
#define WIFI_PASSWORD "colegio2024"
#define WIFI_STA_ENABLED false     // false = solo AP estable (pruebas en casa); true = unirse a la red del colegio
#define WIFI_AP_ALWAYS_ON true     // SIEMPRE encender su propia red
#define WIFI_AP_MAX_CLIENTS 4      // PC + celular + margen
#define AP_SSID "TimbreEscolar-Setup"
#define AP_PASSWORD "Timbre#Escolar2026"

// Historial de timbres (se guarda en LittleFS: sobrevive reinicios/apagones)
#define HISTORY_FILE "/history.json"
#define HISTORY_MAX_EVENTS 150     // cuántos eventos recuerda el ESP32

// Logs del sistema (solo WARN/ERROR) en LittleFS
#define LOG_FILE "/logs/timbre.log"
#define LOG_FILE_MAX_BYTES 32768   // rota al llegar a 32 KB

// NTP
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"
#define NTP_SYNC_INTERVAL_MS 3600000
#define TIMEZONE_OFFSET -6

// LittleFS
#define SCHEDULE_FILE "/schedule.json"
#define TEMPLATES_FILE "/templates.json"
#define EXCEPTIONS_FILE "/exceptions.json"
#define CONFIG_FILE "/config.json"
#define LOG_DIR "/logs/"

// Watchdog
#define WDT_TIMEOUT_MS 30000
#define LOOP_WATCHDOG_MS 5000

// WebSocket
#define WS_PORT 81
#define WS_HEARTBEAT_INTERVAL 5000

// Auth
#define AUTH_TOKEN "timbre-escolar-2024"
#define AUTH_ENABLED true

#endif