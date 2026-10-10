#include <Arduino.h>
#include "config.h"
#include "time/TimeManager.h"
#include "schedule/ScheduleStore.h"
#include "schedule/Scheduler.h"
#include "schedule/HistoryLog.h"
#include "network/WiFiManager.h"
#include "network/WebServer.h"
#include "network/WebSocketServer.h"
#include "network/MDNSResponder.h"
#include "hardware/RelayControl.h"
#include "hardware/Watchdog.h"
#include "sync/SyncProtocol.h"
#include "sync/StateManager.h"
#include "utils/Logger.h"

TimeManager timeManager;
ScheduleStore scheduleStore;
Scheduler scheduler;
HistoryLog historyLog;
WiFiManager wifiManager;
WebServerWrapper webServer;
WebSocketServerWrapper wsServer;
MdnsService mdns;
RelayControl relay;
Watchdog watchdog;
SyncProtocol syncProtocol;
StateManager stateManager;

unsigned long lastHeartbeat = 0;
unsigned long lastLoopTime = 0;

void setup() {
    Serial.begin(115200);
    delay(100);
    logger.init();
    logger.info("=== Timbre Escolar Inteligente v%s ===", FIRMWARE_VERSION);

    pinMode(LED_OK_PIN, OUTPUT);
    pinMode(LED_ERROR_PIN, OUTPUT);
    digitalWrite(LED_OK_PIN, LOW);
    digitalWrite(LED_ERROR_PIN, LOW);

    relay.init(RELAY_PIN, RELAY_ACTIVE_LOW, RELAY_SAFETY_MAX_MS);
    watchdog.init(WDT_TIMEOUT_MS, LOOP_WATCHDOG_MS);

    scheduleStore.init();
    logger.initFileSink();   // WARN/ERROR del sistema en LittleFS
    timeManager.init(NTP_SERVER_1, NTP_SERVER_2, NTP_SYNC_INTERVAL_MS, TIMEZONE_OFFSET);
    historyLog.init(&timeManager);   // historial propio (sobrevive apagones)

    // AP propio SIEMPRE encendido + unión a la red del colegio
    wifiManager.init(WIFI_SSID, WIFI_PASSWORD, WIFI_STA_ENABLED, WIFI_AP_ALWAYS_ON,
                     AP_SSID, AP_PASSWORD, WIFI_AP_MAX_CLIENTS);
    wifiManager.connect();

    mdns.init(DEVICE_NAME);
    webServer.init();
    wsServer.init(WS_PORT);

    scheduler.init(&scheduleStore, &timeManager, &relay, &logger);
    scheduler.setHistoryLog(&historyLog);
    stateManager.init(&scheduleStore, &timeManager, &wifiManager, &logger);

    webServer.setDependencies(&scheduleStore, &timeManager, &wifiManager, &relay, &logger, &stateManager, &historyLog);
    wsServer.setDependencies(&scheduleStore, &timeManager, &wifiManager, &relay, &logger, &stateManager, &scheduler, &historyLog);

    // Los timbres ejecutados se publican a la aplicación (evento bell:executed)
    scheduler.setBellNotifier([](const String& payload) { wsServer.broadcast(payload); });

    logger.info("Sistema inicializado correctamente");
}

void loop() {
    watchdog.feed();

    wifiManager.loop();
    timeManager.loop();
    mdns.loop();
    webServer.loop();
    wsServer.loop();
    scheduler.loop();
    stateManager.loop();

    unsigned long now = millis();
    if (now - lastHeartbeat >= WS_HEARTBEAT_INTERVAL) {
        lastHeartbeat = now;
        // Estado completo (incluye RSSI, uptime, memoria) cada 5 s.
        // Antes había un segundo broadcast cada 10 s con campos faltantes
        // que hacía parpadear la pantalla de Dispositivo.
        wsServer.broadcastHeartbeat();
    }

    lastLoopTime = now;
}