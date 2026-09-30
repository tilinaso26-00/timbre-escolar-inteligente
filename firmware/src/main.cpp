#include <Arduino.h>
#include "config.h"
#include "time/TimeManager.h"
#include "schedule/ScheduleStore.h"
#include "schedule/Scheduler.h"
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
WiFiManager wifiManager;
WebServer webServer;
WebSocketServer wsServer;
MDNSResponder mdns;
RelayControl relay;
Watchdog watchdog;
SyncProtocol syncProtocol;
StateManager stateManager;
Logger logger;

unsigned long lastHeartbeat = 0;
unsigned long lastStatusBroadcast = 0;
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
    timeManager.init(NTP_SERVER_1, NTP_SERVER_2, NTP_SYNC_INTERVAL_MS, TIMEZONE_OFFSET);

    wifiManager.init(WIFI_SSID, WIFI_PASSWORD, WIFI_FALLBACK_AP, AP_SSID, AP_PASSWORD);
    wifiManager.connect();

    mdns.init(DEVICE_NAME);
    webServer.init();
    wsServer.init(WS_PORT);

    scheduler.init(&scheduleStore, &timeManager, &relay, &logger);
    stateManager.init(&scheduleStore, &timeManager, &wifiManager, &logger);

    webServer.setDependencies(&scheduleStore, &timeManager, &wifiManager, &relay, &logger, &stateManager);
    wsServer.setDependencies(&scheduleStore, &timeManager, &wifiManager, &relay, &logger, &stateManager, &scheduler);

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
        wsServer.broadcastHeartbeat();
    }

    if (now - lastStatusBroadcast >= 10000) {
        lastStatusBroadcast = now;
        broadcastStatus();
    }

    lastLoopTime = now;
}

void broadcastStatus() {
    StaticJsonDocument<512> doc;
    doc["type"] = "status";
    doc["connected"] = wifiManager.isConnected();
    doc["wifi"] = wifiManager.isConnected();
    doc["lastSync"] = stateManager.getLastSyncTime();
    doc["deviceTime"] = timeManager.getCurrentTimeString();
    doc["nextEvent"] = scheduler.getNextEvent();
    doc["lastBell"] = scheduler.getLastBellTime();
    doc["lastEvent"] = scheduler.getLastExecutedEvent();
    doc["scheduledCount"] = scheduleStore.getEventCount();
    doc["relayState"] = relay.getState();

    String output;
    serializeJson(doc, output);
    wsServer.broadcast(output);
}