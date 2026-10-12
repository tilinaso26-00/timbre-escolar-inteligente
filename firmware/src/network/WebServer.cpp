#include "WebServer.h"
#include "config.h"
#include <ArduinoJson.h>
#include "sync/SyncProtocol.h"
#include "sync/Auth.h"

WebServerWrapper::WebServerWrapper() : server(80) {}

void WebServerWrapper::setDependencies(ScheduleStore* ss, TimeManager* tm, WiFiManager* wm, RelayControl* r, Logger* log, StateManager* sm, HistoryLog* hl) {
    scheduleStore = ss;
    timeManager = tm;
    wifiManager = wm;
    relay = r;
    logger = log;
    stateManager = sm;
    historyLog = hl;
}

void WebServerWrapper::init() {
    setupRoutes();
    server.begin();
    logger->info("Servidor HTTP iniciado en puerto 80");
}

void WebServerWrapper::loop() {
    server.handleClient();
}

bool WebServerWrapper::requireAuth() {
    if (!Auth::verifyAuthHeader(server)) {
        StaticJsonDocument<128> doc;
        doc["error"] = "Unauthorized";
        doc["message"] = "Token inválido o faltante";
        sendJSON(401, doc);
        return false;
    }
    return true;
}

void WebServerWrapper::setupRoutes() {
    // Preflight CORS: toda petición de la app lleva Authorization, así que el
    // navegador siempre manda OPTIONS antes del GET/POST real.
    const char* apiPaths[] = {
        "/api/status", "/api/schedule", "/api/config", "/api/bell/manual",
        "/api/bell/test", "/api/logs", "/api/history", "/api/reboot", "/api/factory-reset"
    };
    for (const char* path : apiPaths) {
        server.on(path, HTTP_OPTIONS, [this]() { handleOptions(); });
    }

    server.on("/api/status", HTTP_GET, [this]() { 
        if (requireAuth()) handleStatus(); 
    });
    server.on("/api/schedule", HTTP_GET, [this]() { 
        if (requireAuth()) handleScheduleGet(); 
    });
    server.on("/api/schedule", HTTP_POST, [this]() { 
        if (requireAuth()) handleSchedulePost(); 
    });
    server.on("/api/config", HTTP_GET, [this]() { 
        if (requireAuth()) handleConfigGet(); 
    });
    server.on("/api/config", HTTP_POST, [this]() { 
        if (requireAuth()) handleConfigPost(); 
    });
    server.on("/api/bell/manual", HTTP_POST, [this]() { 
        if (requireAuth()) handleManualBell(); 
    });
    server.on("/api/bell/test", HTTP_POST, [this]() { 
        if (requireAuth()) handleTestBell(); 
    });
    server.on("/api/logs", HTTP_GET, [this]() { 
        if (requireAuth()) handleLogs(); 
    });
    server.on("/api/history", HTTP_GET, [this]() {
        if (requireAuth()) handleHistory();
    });
    server.on("/api/reboot", HTTP_POST, [this]() { 
        if (requireAuth()) handleReboot(); 
    });
    server.on("/api/factory-reset", HTTP_POST, [this]() { 
        if (requireAuth()) handleFactoryReset(); 
    });

    server.onNotFound([this]() {
        if (server.method() == HTTP_OPTIONS) {
            handleOptions();
            return;
        }
        StaticJsonDocument<256> doc;
        doc["error"] = "Not found";
        sendJSON(404, doc);
    });
}

// El WebView de la app corre en http://tauri.localhost: sin estas cabeceras el
// navegador bloquea cualquier fetch al ESP32 por CORS (el fallback HTTP
// del estado/timbre manual moría con "No Access-Control-Allow-Origin").
void WebServerWrapper::corsHeaders() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

void WebServerWrapper::handleOptions() {
    corsHeaders();
    server.sendHeader("Access-Control-Max-Age", "86400");
    server.send(204, "text/plain", "");
}

void WebServerWrapper::sendJSON(int code, JsonDocument& doc) {
    String output;
    serializeJson(doc, output);
    corsHeaders();
    server.send(code, "application/json", output);
}

void WebServerWrapper::handleStatus() {
    StaticJsonDocument<512> doc;
    doc["deviceId"] = wifiManager->getMAC();
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["connected"] = wifiManager->isConnected() || wifiManager->isApActive();
    doc["wifi"] = wifiManager->isConnected() || wifiManager->isApActive();
    doc["ip"] = wifiManager->getIP();
    doc["rssi"] = wifiManager->getRSSI();
    doc["lastSync"] = stateManager ? stateManager->getLastSyncTime() : 0;
    doc["deviceTime"] = timeManager->getCurrentTimeString();
    doc["deviceDate"] = timeManager->getCurrentDateString();
    doc["nextEvent"] = scheduleStore ? scheduleStore->getEventCount() : 0;
    doc["scheduledCount"] = scheduleStore ? scheduleStore->getEventCount() : 0;
    doc["relayState"] = relay ? relay->getState() : false;
    doc["mode"] = wifiManager->getMode();
    doc["apSSID"] = wifiManager->getApSSID();
    doc["apIP"] = wifiManager->getApIP();
    doc["apActive"] = wifiManager->isApActive();
    doc["staConnected"] = wifiManager->isConnected();
    doc["historyCount"] = historyLog ? historyLog->count() : 0;
    doc["uptime"] = millis();
    doc["freeHeap"] = ESP.getFreeHeap();

    sendJSON(200, doc);
}

void WebServerWrapper::handleScheduleGet() {
    JsonDocument doc;
    int count;
    ScheduleEvent* events = scheduleStore->getEvents(count);

    JsonArray arr = doc.createNestedArray("events");
    for (int i = 0; i < count; i++) {
        JsonObject evt = arr.createNestedObject();
        evt["id"] = events[i].id;
        evt["name"] = events[i].name;
        evt["startTime"]["hours"] = events[i].startHour;
        evt["startTime"]["minutes"] = events[i].startMin;
        evt["durationMinutes"] = events[i].durationMin;
        evt["bellTime"]["hours"] = events[i].bellHour;
        evt["bellTime"]["minutes"] = events[i].bellMin;
        evt["bellDurationSeconds"] = events[i].bellDurationSec;
        evt["type"] = events[i].type;
        evt["journey"] = events[i].journey;
        evt["activeDays"] = events[i].activeDays;
        evt["isFixed"] = events[i].isFixed;
        evt["periodIndex"] = events[i].periodIndex;
    }
    doc["count"] = count;

    int templateCount;
    ScheduleTemplate* templates = scheduleStore->getTemplates(templateCount);
    JsonArray tmplArr = doc.createNestedArray("templates");
    for (int i = 0; i < templateCount; i++) {
        JsonObject t = tmplArr.createNestedObject();
        t["id"] = templates[i].id;
        t["name"] = templates[i].name;
        t["description"] = templates[i].description;
        t["journey"] = templates[i].journey;
        t["events"] = templates[i].eventsJson;
        t["createdAt"] = templates[i].createdAt;
        t["updatedAt"] = templates[i].updatedAt;
    }
    doc["templateCount"] = templateCount;

    int exceptionCount;
    CalendarException* exceptions = scheduleStore->getExceptions(exceptionCount);
    JsonArray excArr = doc.createNestedArray("exceptions");
    for (int i = 0; i < exceptionCount; i++) {
        JsonObject e = excArr.createNestedObject();
        e["id"] = exceptions[i].id;
        e["date"] = exceptions[i].date;
        e["journey"] = exceptions[i].journey;
        e["type"] = exceptions[i].type;
        e["scheduleId"] = exceptions[i].scheduleId;
        e["name"] = exceptions[i].name;
        e["description"] = exceptions[i].description;
        e["customEvents"] = exceptions[i].customEventsJson;
        e["createdAt"] = exceptions[i].createdAt;
    }
    doc["exceptionCount"] = exceptionCount;

    doc["syncVersion"] = scheduleStore->getSyncVersion();
    doc["syncHash"] = scheduleStore->getSyncHash();

    sendJSON(200, doc);
}

void WebServerWrapper::handleSchedulePost() {
    if (!server.hasArg("plain")) {
        StaticJsonDocument<256> doc;
        doc["error"] = "Falta payload";
        sendJSON(400, doc);
        return;
    }

    // Heap: el payload de sync supera los 8 KB del StaticJsonDocument viejo
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (error) {
        StaticJsonDocument<256> errDoc;
        errDoc["error"] = "JSON inválido";
        sendJSON(400, errDoc);
        return;
    }

    if (stateManager) {
        stateManager->handleFullSync(doc.as<JsonVariantConst>());
    } else if (scheduleStore) {
        scheduleStore->saveFullSync(doc.as<JsonVariantConst>());
    }

    StaticJsonDocument<256> resp;
    resp["status"] = "ok";
    resp["message"] = "Horario sincronizado correctamente";
    sendJSON(200, resp);
}

void WebServerWrapper::handleConfigGet() {
    StaticJsonDocument<512> doc;
    doc["deviceName"] = DEVICE_NAME;
    doc["bellDefaultSeconds"] = 3;
    doc["bellMaxSeconds"] = 60;
    doc["timezone"] = "America/Guatemala";
    doc["ntpServers"][0] = "pool.ntp.org";
    doc["ntpServers"][1] = "time.google.com";
    doc["ntpSyncIntervalMinutes"] = 60;
    doc["wifi"]["ssid"] = wifiManager->getMAC();
    doc["relay"]["pin"] = RELAY_PIN;
    doc["relay"]["activeLow"] = RELAY_ACTIVE_LOW;
    doc["relay"]["safetyMaxOnMs"] = RELAY_SAFETY_MAX_MS;
    sendJSON(200, doc);
}

void WebServerWrapper::handleConfigPost() {
    StaticJsonDocument<256> doc;
    if (server.hasArg("plain")) {
        StaticJsonDocument<512> req;
        deserializeJson(req, server.arg("plain"));
        doc["status"] = "ok";
        doc["message"] = "Configuración actualizada";
    } else {
        doc["error"] = "Falta payload";
        sendJSON(400, doc);
        return;
    }
    sendJSON(200, doc);
}

void WebServerWrapper::handleManualBell() {
    StaticJsonDocument<256> doc;
    if (server.hasArg("plain")) {
        StaticJsonDocument<128> req;
        deserializeJson(req, server.arg("plain"));
        int duration = req["durationSec"] | 3;
        if (duration < 1) duration = 1;
        if (duration > 60) duration = 60;
        relay->activate(duration * 1000);
        if (historyLog) {
            historyLog->record("Timbre manual", "manual", "matutina", "manual", duration, true);
        }
        doc["status"] = "ok";
        doc["message"] = "Timbre manual activado";
    } else {
        doc["error"] = "Falta durationSec";
        sendJSON(400, doc);
        return;
    }
    sendJSON(200, doc);
}

void WebServerWrapper::handleTestBell() {
    handleManualBell();
}

void WebServerWrapper::handleLogs() {
    handleHistory();
}

void WebServerWrapper::handleHistory() {
    JsonDocument doc;
    if (historyLog) {
        historyLog->writeAll(doc);
    } else {
        doc["events"].to<JsonArray>();
    }
    doc["count"] = doc["events"].as<JsonArray>().size();
    doc["max"] = historyLog ? historyLog->maxEvents() : 0;
    sendJSON(200, doc);
}

void WebServerWrapper::handleReboot() {
    StaticJsonDocument<128> doc;
    doc["status"] = "rebooting";
    sendJSON(200, doc);
    delay(100);
    ESP.restart();
}

void WebServerWrapper::handleFactoryReset() {
    StaticJsonDocument<128> doc;
    LittleFS.format();
    doc["status"] = "reset";
    sendJSON(200, doc);
    delay(100);
    ESP.restart();
}