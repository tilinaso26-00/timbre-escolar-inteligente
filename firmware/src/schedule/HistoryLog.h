#ifndef HISTORY_LOG_H
#define HISTORY_LOG_H

#include <Arduino.h>
#include <ArduinoJson.h>

class TimeManager;

// Historial de timbres del propio ESP32.
// Se guarda en LittleFS (sobrevive reinicios y apagones) y el tamaño
// de memoria se mantiene bajo escribiendo el JSON directo al archivo.
class HistoryLog {
public:
    void init(TimeManager* tm);

    // Registra un timbre; lo pone al inicio y recorta a HISTORY_MAX_EVENTS
    void record(const String& eventName, const String& type, const String& journey,
                const char* origin, int durationSec, bool executed);

    int count();
    int maxEvents();

    // Serializa eventos [offset, offset+limit) en out["items"];
    // devuelve cuántos escribió (máx 25 por chunk).
    int writeChunk(JsonObject out, int offset, int limit);
    void writeAll(JsonDocument& out);   // para GET /api/history

    void clear();

private:
    JsonDocument doc;
    bool loaded = false;
    TimeManager* timeManager = nullptr;

    void load();
    void save();
    void trim();
    String now();
};

#endif
