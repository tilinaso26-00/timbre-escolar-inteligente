#ifndef SCHEDULE_STORE_H
#define SCHEDULE_STORE_H

#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <functional>

// activeDays llega desde la aplicación como array [0..6] (0=domingo ... 6=sábado)
// y el ESP32 lo guarda como bitmask (bit 1<<día). Antes se hacía .as<uint8_t>()
// sobre el array, lo que daba 0 y desactivaba TODOS los timbres programados.
// Si falta o es inválido se usa Lun-Vie (bits 1..5 = 30).
inline uint8_t parseActiveDays(JsonVariantConst v) {
    if (v.isNull()) return 30;
    if (v.is<JsonArrayConst>()) {
        uint8_t mask = 0;
        for (JsonVariantConst day : v.as<JsonArrayConst>()) {
            int d = day.as<int>();
            if (d >= 0 && d <= 6) mask |= (uint8_t)(1 << d);
        }
        return mask ? mask : 30;
    }
    int n = v.as<int>();
    if (n > 0 && n <= 127) return (uint8_t)n;
    return 30;
}

struct ScheduleEvent {
    String id;
    String name;
    int startHour;
    int startMin;
    int durationMin;
    int bellHour;
    int bellMin;
    int bellDurationSec;
    String type;
    String journey;
    uint8_t activeDays;
    bool isFixed;
    int periodIndex;
};

struct ScheduleTemplate {
    String id;
    String name;
    String description;
    String journey;
    String eventsJson;
    String createdAt;
    String updatedAt;
};

struct CalendarException {
    String id;
    String date;
    String journey;
    String type;
    String scheduleId;
    String name;
    String description;
    String customEventsJson;
    String createdAt;
};

class ScheduleStore {
private:
    ScheduleEvent* events = nullptr;
    int eventCount = 0;
    int capacity = 0;

    ScheduleTemplate* templates = nullptr;
    int templateCount = 0;
    int templateCapacity = 0;

    CalendarException* exceptions = nullptr;
    int exceptionCount = 0;
    int exceptionCapacity = 0;

    String lastSyncHash = "";
    int lastSyncVersion = 0;

    // Se invoca tras un sync aplicado para que el Scheduler reconstruya su
    // lista del día (sin esto, el puntero a eventos queda colgando tras un sync)
    std::function<void()> changeNotifier;

    void ensureCapacity();
    void ensureTemplateCapacity();
    void ensureExceptionCapacity();

public:
    ScheduleStore();
    ~ScheduleStore();

    void init();
    bool loadSchedule();
    bool saveSchedule(JsonVariantConst doc);
    ScheduleEvent* getEvents(int& count);
    int getEventCount();
    ScheduleEvent* findEventByTime(int hour, int min, const char* journey);
    void clear();

    void addEvent(const ScheduleEvent& event);
    bool removeEvent(const String& id);

    // Templates
    bool loadTemplates();
    bool saveTemplates(JsonVariantConst doc);
    ScheduleTemplate* getTemplates(int& count);
    int getTemplateCount();
    ScheduleTemplate* findTemplateById(const String& id);
    void clearTemplates();
    void addTemplate(const ScheduleTemplate& tmpl);
    bool removeTemplate(const String& id);

    // Exceptions
    bool loadExceptions();
    bool saveExceptions(JsonVariantConst doc);
    CalendarException* getExceptions(int& count);
    int getExceptionCount();
    CalendarException* findExceptionByDateAndJourney(const String& date, const String& journey);
    void clearExceptions();
    void addException(const CalendarException& exc);
    bool removeException(const String& id);

    void setChangeNotifier(std::function<void()> fn);

    // Sync metadata
    void setSyncMetadata(int version, const String& hash);
    int getSyncVersion();
    String getSyncHash();

    // Full sync save (atomic)
    bool saveFullSync(JsonVariantConst doc);
};

#endif