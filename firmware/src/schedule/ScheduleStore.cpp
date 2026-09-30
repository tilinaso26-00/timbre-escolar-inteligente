#include "ScheduleStore.h"
#include "utils/Logger.h"
#include "config.h"

ScheduleStore::ScheduleStore() {}

ScheduleStore::~ScheduleStore() {
    clear();
    clearTemplates();
    clearExceptions();
}

void ScheduleStore::ensureCapacity() {
    if (eventCount >= capacity) {
        capacity = capacity == 0 ? 16 : capacity * 2;
        ScheduleEvent* newEvents = new ScheduleEvent[capacity];
        if (events) {
            memcpy(newEvents, events, eventCount * sizeof(ScheduleEvent));
            delete[] events;
        }
        events = newEvents;
    }
}

void ScheduleStore::ensureTemplateCapacity() {
    if (templateCount >= templateCapacity) {
        templateCapacity = templateCapacity == 0 ? 8 : templateCapacity * 2;
        ScheduleTemplate* newTemplates = new ScheduleTemplate[templateCapacity];
        if (templates) {
            memcpy(newTemplates, templates, templateCount * sizeof(ScheduleTemplate));
            delete[] templates;
        }
        templates = newTemplates;
    }
}

void ScheduleStore::ensureExceptionCapacity() {
    if (exceptionCount >= exceptionCapacity) {
        exceptionCapacity = exceptionCapacity == 0 ? 8 : exceptionCapacity * 2;
        CalendarException* newExceptions = new CalendarException[exceptionCapacity];
        if (exceptions) {
            memcpy(newExceptions, exceptions, exceptionCount * sizeof(CalendarException));
            delete[] exceptions;
        }
        exceptions = newExceptions;
    }
}

void ScheduleStore::init() {
    if (!LittleFS.begin(true)) {
        logger.error("Error montando LittleFS");
        return;
    }
    loadSchedule();
    loadTemplates();
    loadExceptions();
}

bool ScheduleStore::loadSchedule() {
    File file = LittleFS.open(SCHEDULE_FILE, "r");
    if (!file) {
        logger.warn("No existe archivo de horario");
        return false;
    }

    StaticJsonDocument<8192> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        logger.error("Error parseando horario: %s", error.c_str());
        return false;
    }

    return saveSchedule(doc);
}

bool ScheduleStore::saveSchedule(JsonDocument& doc) {
    clear();

    JsonArray journeys = doc["journeys"].as<JsonArray>();
    for (JsonObject journey : journeys) {
        const char* journeyName = journey["journey"];
        JsonArray eventsArray = journey["events"].as<JsonArray>();

        for (JsonObject evt : eventsArray) {
            ScheduleEvent e;
            e.id = evt["id"].as<String>();
            e.name = evt["name"].as<String>();
            e.startHour = evt["startTime"]["hours"];
            e.startMin = evt["startTime"]["minutes"];
            e.durationMin = evt["durationMinutes"];
            e.bellHour = evt["bellTime"]["hours"];
            e.bellMin = evt["bellTime"]["minutes"];
            e.bellDurationSec = evt["bellDurationSeconds"];
            e.type = evt["type"].as<String>();
            e.journey = evt["journey"].as<String>();
            e.activeDays = evt["activeDays"].as<uint8_t>();
            e.isFixed = evt["isFixed"] | false;
            e.periodIndex = evt["periodIndex"] | 0;

            addEvent(e);
        }
    }

    logger.info("Horario cargado: %d eventos", eventCount);
    return true;
}

ScheduleEvent* ScheduleStore::getEvents(int& count) {
    count = eventCount;
    return events;
}

int ScheduleStore::getEventCount() {
    return eventCount;
}

ScheduleEvent* ScheduleStore::findEventByTime(int hour, int min, const char* journey) {
    for (int i = 0; i < eventCount; i++) {
        if (events[i].bellHour == hour && events[i].bellMin == min &&
            events[i].journey == journey) {
            return &events[i];
        }
    }
    return nullptr;
}

void ScheduleStore::clear() {
    if (events) {
        delete[] events;
        events = nullptr;
    }
    eventCount = 0;
    capacity = 0;
}

void ScheduleStore::addEvent(const ScheduleEvent& event) {
    ensureCapacity();
    events[eventCount++] = event;
}

bool ScheduleStore::removeEvent(const String& id) {
    for (int i = 0; i < eventCount; i++) {
        if (events[i].id == id) {
            for (int j = i; j < eventCount - 1; j++) {
                events[j] = events[j + 1];
            }
            eventCount--;
            return true;
        }
    }
    return false;
}

bool ScheduleStore::loadTemplates() {
    File file = LittleFS.open(TEMPLATES_FILE, "r");
    if (!file) {
        logger.warn("No existe archivo de plantillas");
        return false;
    }

    StaticJsonDocument<8192> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        logger.error("Error parseando plantillas: %s", error.c_str());
        return false;
    }

    return saveTemplates(doc);
}

bool ScheduleStore::saveTemplates(JsonDocument& doc) {
    clearTemplates();

    JsonArray tmplArray = doc["templates"].as<JsonArray>();
    if (!tmplArray.isNull()) {
        for (JsonObject tmpl : tmplArray) {
            ScheduleTemplate t;
            t.id = tmpl["id"].as<String>();
            t.name = tmpl["name"].as<String>();
            t.description = tmpl["description"] | "";
            t.journey = tmpl["journey"].as<String>();

            String eventsJson;
            serializeJson(tmpl["events"], eventsJson);
            t.eventsJson = eventsJson;

            t.createdAt = tmpl["createdAt"] | "";
            t.updatedAt = tmpl["updatedAt"] | "";

            addTemplate(t);
        }
    }

    logger.info("Plantillas cargadas: %d", templateCount);
    return true;
}

ScheduleTemplate* ScheduleStore::getTemplates(int& count) {
    count = templateCount;
    return templates;
}

int ScheduleStore::getTemplateCount() {
    return templateCount;
}

ScheduleTemplate* ScheduleStore::findTemplateById(const String& id) {
    for (int i = 0; i < templateCount; i++) {
        if (templates[i].id == id) {
            return &templates[i];
        }
    }
    return nullptr;
}

void ScheduleStore::clearTemplates() {
    if (templates) {
        delete[] templates;
        templates = nullptr;
    }
    templateCount = 0;
    templateCapacity = 0;
}

void ScheduleStore::addTemplate(const ScheduleTemplate& tmpl) {
    ensureTemplateCapacity();
    templates[templateCount++] = tmpl;
}

bool ScheduleStore::removeTemplate(const String& id) {
    for (int i = 0; i < templateCount; i++) {
        if (templates[i].id == id) {
            for (int j = i; j < templateCount - 1; j++) {
                templates[j] = templates[j + 1];
            }
            templateCount--;
            return true;
        }
    }
    return false;
}

bool ScheduleStore::loadExceptions() {
    File file = LittleFS.open(EXCEPTIONS_FILE, "r");
    if (!file) {
        logger.warn("No existe archivo de excepciones");
        return false;
    }

    StaticJsonDocument<8192> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        logger.error("Error parseando excepciones: %s", error.c_str());
        return false;
    }

    return saveExceptions(doc);
}

bool ScheduleStore::saveExceptions(JsonDocument& doc) {
    clearExceptions();

    JsonArray excArray = doc["exceptions"].as<JsonArray>();
    if (!excArray.isNull()) {
        for (JsonObject exc : excArray) {
            CalendarException e;
            e.id = exc["id"].as<String>();
            e.date = exc["date"].as<String>();
            e.journey = exc["journey"].as<String>();
            e.type = exc["type"].as<String>();
            e.scheduleId = exc["scheduleId"] | "";
            e.name = exc["name"].as<String>();
            e.description = exc["description"] | "";
            e.customEventsJson = exc["customEvents"] | "";
            e.createdAt = exc["createdAt"] | "";

            addException(e);
        }
    }

    logger.info("Excepciones cargadas: %d", exceptionCount);
    return true;
}

CalendarException* ScheduleStore::getExceptions(int& count) {
    count = exceptionCount;
    return exceptions;
}

int ScheduleStore::getExceptionCount() {
    return exceptionCount;
}

CalendarException* ScheduleStore::findExceptionByDateAndJourney(const String& date, const String& journey) {
    for (int i = 0; i < exceptionCount; i++) {
        if (exceptions[i].date == date && exceptions[i].journey == journey) {
            return &exceptions[i];
        }
    }
    return nullptr;
}

void ScheduleStore::clearExceptions() {
    if (exceptions) {
        delete[] exceptions;
        exceptions = nullptr;
    }
    exceptionCount = 0;
    exceptionCapacity = 0;
}

void ScheduleStore::addException(const CalendarException& exc) {
    ensureExceptionCapacity();
    exceptions[exceptionCount++] = exc;
}

bool ScheduleStore::removeException(const String& id) {
    for (int i = 0; i < exceptionCount; i++) {
        if (exceptions[i].id == id) {
            for (int j = i; j < exceptionCount - 1; j++) {
                exceptions[j] = exceptions[j + 1];
            }
            exceptionCount--;
            return true;
        }
    }
    return false;
}

void ScheduleStore::setSyncMetadata(int version, const String& hash) {
    lastSyncVersion = version;
    lastSyncHash = hash;
}

int ScheduleStore::getSyncVersion() {
    return lastSyncVersion;
}

String ScheduleStore::getSyncHash() {
    return lastSyncHash;
}

bool ScheduleStore::saveFullSync(JsonDocument& doc) {
    int version = doc["version"] | 0;
    String hash = SyncProtocol::calculateHash(doc);

    if (version <= lastSyncVersion && hash == lastSyncHash) {
        logger.info("Sync duplicado, ignorando");
        return true;
    }

    bool scheduleOk = saveSchedule(doc);
    bool templatesOk = saveTemplates(doc);
    bool exceptionsOk = saveExceptions(doc);

    if (scheduleOk && templatesOk && exceptionsOk) {
        setSyncMetadata(version, hash);
        logger.info("Sync completo guardado v%d hash=%s", version, hash.c_str());
        return true;
    }

    logger.error("Error guardando sync completo");
    return false;
}