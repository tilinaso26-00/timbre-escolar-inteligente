#include "WebSocketServer.h"
#include <ArduinoJson.h>
#include "schedule/Scheduler.h"
#include "sync/Auth.h"

Scheduler* gScheduler = nullptr;

WebSocketServerWrapper::WebSocketServerWrapper() : server(81) {}

void WebSocketServerWrapper::setDependencies(ScheduleStore* ss, TimeManager* tm, WiFiManager* wm, RelayControl* r, Logger* log, StateManager* sm, Scheduler* sched, HistoryLog* hl) {
    scheduleStore = ss;
    timeManager = tm;
    wifiManager = wm;
    relay = r;
    logger = log;
    stateManager = sm;
    scheduler = sched;
    historyLog = hl;
    gScheduler = sched;
}

void WebSocketServerWrapper::init(uint16_t port) {
    server.begin();
    server.onEvent([this](uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
        onEvent(num, type, payload, length);
    });
    logger->info("Servidor WebSocket iniciado en puerto %d", port);
}

void WebSocketServerWrapper::loop() {
    server.loop();
}

void WebSocketServerWrapper::onEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED: {
            IPAddress ip = server.remoteIP(num);
            logger->info("WS Cliente conectado: %d.%d.%d.%d", ip[0], ip[1], ip[2], ip[3]);
            broadcastHeartbeat();
            break;
        }
        case WStype_DISCONNECTED: {
            logger->info("WS Cliente desconectado: %d", num);
            break;
        }
        case WStype_TEXT: {
            String msg = String((char*)payload);
            logger->debug("WS Mensaje recibido: %s", msg.c_str());

            StaticJsonDocument<8192> doc;
            DeserializationError error = deserializeJson(doc, msg);
            if (error) {
                logger->warn("WS JSON inválido: %s", error.c_str());
                return;
            }

            if (!Auth::verifyWSAuth(doc)) {
                logger->warn("WS Auth fallido");
                StaticJsonDocument<128> resp;
                resp["event"] = "error";
                resp["code"] = "UNAUTHORIZED";
                resp["message"] = "Token inválido o faltante";
                String output;
                serializeJson(resp, output);
                sendTo(num, output);
                return;
            }

            const char* event = doc["event"];
            if (!event) return;

            if (strcmp(event, "sync:request") == 0) {
                JsonObject data = doc["data"].as<JsonObject>();
                if (!data.isNull()) {
                    logger->info("Sync request recibido vía WebSocket");
                    JsonDocument syncDoc;
                    syncDoc.set(data);
                    stateManager->handleFullSync(syncDoc);
                    String hash = SyncProtocol::calculateHash(syncDoc);
                    int version = data["version"] | 0;

                    StaticJsonDocument<256> resp;
                    resp["event"] = "sync:complete";
                    resp["data"]["version"] = version;
                    resp["data"]["hash"] = hash;
                    String output;
                    serializeJson(resp, output);
                    sendTo(num, output);
                } else {
                    logger->warn("Sync request sin data");
                }
            } else if (strcmp(event, "bell:manual") == 0) {
                int duration = doc["data"]["durationSec"] | 3;
                const char* eventName = doc["data"]["eventName"] | "Timbre manual";
                bool demo = doc["data"]["demo"] | false;
                relay->activate(duration * 1000);
                if (gScheduler) {
                    gScheduler->notifyBellExecuted(String(eventName), "manual", "matutina",
                                                   demo ? "demo" : "manual", duration);
                }
            } else if (strcmp(event, "bell:test") == 0) {
                int duration = doc["data"]["durationSec"] | 3;
                relay->activate(duration * 1000);
                if (gScheduler) {
                    gScheduler->notifyBellExecuted("Prueba de timbre", "manual", "matutina", "test", duration);
                }
            } else if (strcmp(event, "config:update") == 0) {
                // Handle config update
            } else if (strcmp(event, "time:sync") == 0) {
                JsonObject data = doc["data"].as<JsonObject>();
                bool applied = false;

                if (!data.isNull()) {
                    const char* timestamp = data["timestamp"] | (const char*)nullptr;
                    if (timestamp && strlen(timestamp) > 0) {
                        applied = timeManager->setFromApp(String(timestamp));
                    }

                    if (!applied) {
                        unsigned long epoch = data["epoch"] | 0UL;
                        if (epoch > 1000000000000UL) epoch /= 1000; // milisegundos
                        if (epoch > 0) applied = timeManager->setFromEpoch(epoch);
                    }
                }

                logger->info("time:sync %s", applied ? "aplicada" : "rechazada");

                StaticJsonDocument<256> resp;
                resp["event"] = "time:sync";
                resp["data"]["applied"] = applied;
                resp["data"]["deviceTime"] = timeManager->getCurrentTimeString();
                resp["data"]["date"] = timeManager->getCurrentDateString();
                resp["data"]["valid"] = timeManager->isTimeValid();
                String output;
                serializeJson(resp, output);
                sendTo(num, output);
            } else if (strcmp(event, "history:request") == 0) {
                // La app pide el historial guardado en el ESP32 (en chunks de 25)
                int offset = doc["data"]["offset"] | 0;
                int limit = doc["data"]["limit"] | 25;
                int total = historyLog ? historyLog->count() : 0;

                JsonDocument resp;
                resp["event"] = "history:events";
                // IMPORTANTE: crear "data" ANTES de asignarle campos
                // (.to<JsonObject>() borra lo que ya tuviera el objeto)
                JsonObject data = resp["data"].to<JsonObject>();
                int written = 0;
                if (historyLog) {
                    written = historyLog->writeChunk(data, offset, limit);
                }
                data["offset"] = offset;
                data["total"] = total;
                data["done"] = (offset + written >= total);

                String output;
                serializeJson(resp, output);
                sendTo(num, output);
                logger->info("history:events offset=%d escritos=%d total=%d", offset, written, total);
            } else if (strcmp(event, "demo:start") == 0) {
                // Demo mode
            } else if (strcmp(event, "demo:stop") == 0) {
            } else if (strcmp(event, "demo:trigger") == 0) {
            }
            break;
        }
        case WStype_BIN:
        case WStype_ERROR:
        case WStype_FRAGMENT_TEXT_START:
        case WStype_FRAGMENT_BIN_START:
        case WStype_FRAGMENT:
        case WStype_FRAGMENT_FIN:
            break;
    }
}

void WebSocketServerWrapper::broadcast(const String& message) {
    String payload = message;
    server.broadcastTXT(payload);
}

void WebSocketServerWrapper::broadcastHeartbeat() {
    StaticJsonDocument<1024> doc;
    doc["event"] = "status";
    doc["data"]["connected"] = wifiManager->isConnected();
    doc["data"]["wifi"] = wifiManager->isConnected();
    doc["data"]["lastSync"] = stateManager ? stateManager->getLastSyncTime() : 0;
    doc["data"]["deviceTime"] = timeManager->getCurrentTimeString();
    doc["data"]["nextEvent"] = gScheduler ? gScheduler->getNextEvent() : "N/A";
    doc["data"]["lastBell"] = gScheduler ? gScheduler->getLastBellTime() : "--:--";
    doc["data"]["lastEvent"] = gScheduler ? gScheduler->getLastExecutedEvent() : "";
    doc["data"]["scheduledCount"] = scheduleStore ? scheduleStore->getEventCount() : 0;
    doc["data"]["relayState"] = relay ? relay->getState() : false;
    doc["data"]["mode"] = wifiManager->getMode();
    doc["data"]["apSSID"] = wifiManager->getApSSID();
    doc["data"]["apIP"] = wifiManager->getApIP();
    doc["data"]["staConnected"] = wifiManager->isConnected();
    doc["data"]["ip"] = wifiManager->getIP();
    doc["data"]["rssi"] = wifiManager->getRSSI();
    doc["data"]["uptime"] = millis();
    doc["data"]["freeHeap"] = ESP.getFreeHeap();
    doc["data"]["historyCount"] = historyLog ? historyLog->count() : 0;

    String output;
    serializeJson(doc, output);
    broadcast(output);
}

void WebSocketServerWrapper::sendTo(uint8_t num, const String& message) {
    String payload = message;
    server.sendTXT(num, payload);
}