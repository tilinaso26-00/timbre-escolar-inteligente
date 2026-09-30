#ifndef SCHEDULE_STORE_H
#define SCHEDULE_STORE_H

#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

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

    void ensureCapacity();
    void ensureTemplateCapacity();
    void ensureExceptionCapacity();

public:
    ScheduleStore();
    ~ScheduleStore();

    void init();
    bool loadSchedule();
    bool saveSchedule(JsonDocument& doc);
    ScheduleEvent* getEvents(int& count);
    int getEventCount();
    ScheduleEvent* findEventByTime(int hour, int min, const char* journey);
    void clear();

    void addEvent(const ScheduleEvent& event);
    bool removeEvent(const String& id);

    // Templates
    bool loadTemplates();
    bool saveTemplates(JsonDocument& doc);
    ScheduleTemplate* getTemplates(int& count);
    int getTemplateCount();
    ScheduleTemplate* findTemplateById(const String& id);
    void clearTemplates();
    void addTemplate(const ScheduleTemplate& tmpl);
    bool removeTemplate(const String& id);

    // Exceptions
    bool loadExceptions();
    bool saveExceptions(JsonDocument& doc);
    CalendarException* getExceptions(int& count);
    int getExceptionCount();
    CalendarException* findExceptionByDateAndJourney(const String& date, const String& journey);
    void clearExceptions();
    void addException(const CalendarException& exc);
    bool removeException(const String& id);

    // Sync metadata
    void setSyncMetadata(int version, const String& hash);
    int getSyncVersion();
    String getSyncHash();

    // Full sync save (atomic)
    bool saveFullSync(JsonDocument& doc);
};

#endif