#include "HistoryLog.h"
#include "config.h"
#include <LittleFS.h>
#include "../time/TimeManager.h"
#include "../utils/Logger.h"

void HistoryLog::init(TimeManager* tm) {
    timeManager = tm;
    load();
}

void HistoryLog::load() {
    loaded = false;
    if (!LittleFS.exists(HISTORY_FILE)) {
        doc.clear();
        doc["events"].to<JsonArray>();
        loaded = true;
        return;
    }

    File f = LittleFS.open(HISTORY_FILE, "r");
    if (!f) {
        logger.error("No se pudo leer %s", HISTORY_FILE);
        doc.clear();
        doc["events"].to<JsonArray>();
        loaded = true;
        return;
    }

    DeserializationError err = deserializeJson(doc, f);
    f.close();
    if (err) {
        logger.warn("Historial corrupto (%s), se reinicia", err.c_str());
        doc.clear();
        doc["events"].to<JsonArray>();
    } else if (!doc["events"].is<JsonArray>()) {
        doc.clear();
        doc["events"].to<JsonArray>();
    }

    trim();
    loaded = true;
    logger.info("Historial cargado: %d eventos", count());
}

void HistoryLog::save() {
    File tmp = LittleFS.open(String(HISTORY_FILE) + ".tmp", "w");
    if (!tmp) {
        logger.error("No se pudo escribir historial temporal");
        return;
    }
    size_t written = serializeJson(doc, tmp);
    tmp.close();

    if (written == 0) {
        logger.error("Historial vacío al guardar");
        LittleFS.remove(String(HISTORY_FILE) + ".tmp");
        return;
    }

    LittleFS.remove(HISTORY_FILE);
    if (!LittleFS.rename(String(HISTORY_FILE) + ".tmp", HISTORY_FILE)) {
        logger.error("No se pudo renombrar historial");
    }
}

void HistoryLog::trim() {
    JsonArray events = doc["events"].as<JsonArray>();
    // se guardan en orden cronológico: recortamos los más viejos
    while ((int)events.size() > HISTORY_MAX_EVENTS) {
        events.remove(0);
    }
}

String HistoryLog::now() {
    if (!timeManager || !timeManager->isTimeValid()) return String("");
    return timeManager->getCurrentDateString() + "T" + timeManager->getCurrentTimeString();
}

void HistoryLog::record(const String& eventName, const String& type,
                        const String& journey, const char* origin,
                        int durationSec, bool executed) {
    if (!loaded) load();

    JsonArray events = doc["events"].as<JsonArray>();
    if (events.isNull()) {
        events = doc["events"].to<JsonArray>();
    }

    // Se guarda en orden cronológico (más viejo al inicio)
    JsonObject evt = events.add<JsonObject>();
    evt["timestamp"] = now();
    evt["eventName"] = eventName;
    evt["type"] = type;
    evt["journey"] = journey;
    evt["origin"] = origin;
    evt["durationSec"] = durationSec;
    evt["executed"] = executed;
    evt["deviceId"] = DEVICE_NAME;
    evt["firmwareVersion"] = FIRMWARE_VERSION;

    trim();
    save();
}

int HistoryLog::count() {
    if (!loaded) load();
    return doc["events"].as<JsonArray>().size();
}

int HistoryLog::maxEvents() {
    return HISTORY_MAX_EVENTS;
}

int HistoryLog::writeChunk(JsonObject out, int offset, int limit) {
    if (!loaded) load();
    if (offset < 0) offset = 0;
    if (limit < 1) limit = 1;
    if (limit > 25) limit = 25;

    JsonArray src = doc["events"].as<JsonArray>();
    int total = src.size();
    JsonArray items = out["items"].to<JsonArray>();

    // de más reciente a más viejo
    int written = 0;
    for (int i = total - 1 - offset; i >= 0 && written < limit; i--) {
        items.add(src[i]);
        written++;
    }
    return written;
}

void HistoryLog::writeAll(JsonDocument& out) {
    if (!loaded) load();
    JsonArray items = out["events"].to<JsonArray>();
    JsonArray src = doc["events"].as<JsonArray>();
    for (int i = src.size() - 1; i >= 0; i--) {
        items.add(src[i]);
    }
}

void HistoryLog::clear() {
    doc.clear();
    doc["events"].to<JsonArray>();
    save();
}
