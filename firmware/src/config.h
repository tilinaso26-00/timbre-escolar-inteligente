#ifndef CONFIG_H
#define CONFIG_H

#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_NAME "TimbreEscolar"

// Pines
#define RELAY_PIN 23
#define LED_OK_PIN 2
#define LED_ERROR_PIN 4
#define RTC_SDA_PIN 21
#define RTC_SCL_PIN 22
#define BUTTON_RESET_PIN 0

// Configuración relé
#define RELAY_ACTIVE_LOW true
#define RELAY_SAFETY_MAX_MS 60000

// WiFi
#define WIFI_SSID "COLEGIO_WIFI"
#define WIFI_PASSWORD "colegio2024"
#define WIFI_FALLBACK_AP true
#define AP_SSID "TimbreEscolar-Setup"
#define AP_PASSWORD "Timbre#Escolar2026"

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