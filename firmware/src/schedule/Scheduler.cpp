#include "Scheduler.h"
#include "config.h"
#include <ArduinoJson.h>

Scheduler::Scheduler()
    : scheduleStore(nullptr), timeManager(nullptr), relay(nullptr), logger(nullptr),
      resolvedEvents(nullptr), resolvedCount(0), resolvedCapacity(0) {}

Scheduler::~Scheduler() {
    if (resolvedEvents) {
        delete[] resolvedEvents;
    }
}

void Scheduler::ensureResolvedCapacity(int needed) {
    if (needed >= resolvedCapacity) {
        resolvedCapacity = needed + 8;
        ResolvedEvent* newEvents = new ResolvedEvent[resolvedCapacity];
        if (resolvedEvents) {
            memcpy(newEvents, resolvedEvents, resolvedCount * sizeof(ResolvedEvent));
            delete[] resolvedEvents;
        }
        resolvedEvents = newEvents;
    }
}

void Scheduler::init(ScheduleStore* store, TimeManager* tm, RelayControl* r, Logger* log) {
    scheduleStore = store;
    timeManager = tm;
    relay = r;
    logger = log;
    lastCheckedMinute = -1;
    forceRebuild();
}

void Scheduler::forceRebuild() {
    lastResolvedDate = "";
    rebuildResolvedSchedule();
}

void Scheduler::rebuildResolvedSchedule() {
    if (!scheduleStore || !timeManager->isTimeValid()) return;

    String today = timeManager->getCurrentDateString();
    if (today == lastResolvedDate && resolvedCount > 0) return;

    lastResolvedDate = today;

    int dayOfWeek = 0;
    struct tm now = timeManager->getCurrentTimeStruct();
    dayOfWeek = now.tm_wday;

    resolvedCount = 0;

    int eventCount;
    ScheduleEvent* events = scheduleStore->getEvents(eventCount);

    int templateCount;
    ScheduleTemplate* templates = scheduleStore->getTemplates(templateCount);

    int exceptionCount;
    CalendarException* exceptions = scheduleStore->getExceptions(exceptionCount);

    CalendarException* dateException = nullptr;
    CalendarException* bestTemplateException = nullptr;

    for (int i = 0; i < exceptionCount; i++) {
        CalendarException* exc = &exceptions[i];
        if (exc->date == today) {
            if (exc->type == "no_classes") {
                dateException = exc;
                break;
            }
            if (exc->type == "custom" && exc->customEventsJson.length() > 0) {
                dateException = exc;
                break;
            }
            if (exc->type == "schedule" && exc->scheduleId.length() > 0) {
                if (!bestTemplateException) bestTemplateException = exc;
            }
        }
    }

    if (dateException && dateException->type == "no_classes") {
        logger->info("Hoy %s: Sin clases (excepción no_classes)", today.c_str());
        resolvedCount = 0;
        return;
    }

    ScheduleTemplate* selectedTemplate = nullptr;

    if (dateException && dateException->type == "custom") {
        logger->info("Hoy %s: Horario custom (excepción)", today.c_str());
    } else if (dateException && dateException->type == "schedule") {
        for (int i = 0; i < templateCount; i++) {
            if (templates[i].id == dateException->scheduleId) {
                selectedTemplate = &templates[i];
                break;
            }
        }
        logger->info("Hoy %s: Plantilla de excepción %s", today.c_str(), selectedTemplate ? selectedTemplate->name.c_str() : "no encontrada");
    } else {
        for (int i = 0; i < templateCount; i++) {
            if (templates[i].journey == "matutina" || templates[i].journey == "vespertina") {
                StaticJsonDocument<1024> doc;
                deserializeJson(doc, templates[i].eventsJson);
                JsonArray tmplEvents = doc.as<JsonArray>();
                for (JsonObject tmplEvt : tmplEvents) {
                    JsonArray activeDays = tmplEvt["activeDays"].as<JsonArray>();
                    for (JsonVariant day : activeDays) {
                        if (day.as<int>() == dayOfWeek) {
                            if (!selectedTemplate) selectedTemplate = &templates[i];
                        }
                    }
                }
            }
        }
        if (selectedTemplate) {
            logger->info("Hoy %s: Plantilla por día %s", today.c_str(), selectedTemplate->name.c_str());
        }
    }

    ScheduleEvent* sourceEvents = nullptr;
    int sourceCount = 0;
    bool isCustomException = false;
    String customEventsJson = "";

    if (dateException && dateException->type == "custom" && dateException->customEventsJson.length() > 0) {
        isCustomException = true;
        customEventsJson = dateException->customEventsJson;
    } else if (selectedTemplate) {
        sourceEvents = (ScheduleEvent*)malloc(sizeof(ScheduleEvent) * 64);
        sourceCount = 0;
        StaticJsonDocument<4096> doc;
        deserializeJson(doc, selectedTemplate->eventsJson);
        JsonArray tmplEvents = doc.as<JsonArray>();
        for (JsonObject tmplEvt : tmplEvents) {
            if (sourceCount >= 64) break;
            ScheduleEvent e;
            e.id = tmplEvt["id"] | "";
            e.name = tmplEvt["name"].as<String>();
            e.startHour = tmplEvt["startTime"]["hours"];
            e.startMin = tmplEvt["startTime"]["minutes"];
            e.durationMin = tmplEvt["durationMinutes"];
            e.bellHour = tmplEvt["bellTime"]["hours"];
            e.bellMin = tmplEvt["bellTime"]["minutes"];
            e.bellDurationSec = tmplEvt["bellDurationSeconds"];
            e.type = tmplEvt["type"].as<String>();
            e.journey = tmplEvt["journey"].as<String>();
            e.activeDays = tmplEvt["activeDays"].as<uint8_t>();
            e.isFixed = tmplEvt["isFixed"] | false;
            e.periodIndex = tmplEvt["periodIndex"] | 0;
            sourceEvents[sourceCount++] = e;
        }
    } else {
        sourceEvents = events;
        sourceCount = eventCount;
    }

    if (isCustomException) {
        StaticJsonDocument<4096> doc;
        deserializeJson(doc, customEventsJson);
        JsonArray customEvents = doc.as<JsonArray>();
        for (JsonObject tmplEvt : customEvents) {
            if (resolvedCount >= 64) break;
            ScheduleEvent e;
            e.id = tmplEvt["id"] | "";
            e.name = tmplEvt["name"].as<String>();
            e.startHour = tmplEvt["startTime"]["hours"];
            e.startMin = tmplEvt["startTime"]["minutes"];
            e.durationMin = tmplEvt["durationMinutes"];
            e.bellHour = tmplEvt["bellTime"]["hours"];
            e.bellMin = tmplEvt["bellTime"]["minutes"];
            e.bellDurationSec = tmplEvt["bellDurationSeconds"];
            e.type = tmplEvt["type"].as<String>();
            e.journey = tmplEvt["journey"].as<String>();
            e.activeDays = tmplEvt["activeDays"].as<uint8_t>();
            e.isFixed = tmplEvt["isFixed"] | false;
            e.periodIndex = tmplEvt["periodIndex"] | 0;

            if (e.activeDays & (1 << dayOfWeek)) {
                ensureResolvedCapacity(resolvedCount + 1);
                resolvedEvents[resolvedCount] = {nullptr, dayOfWeek, e.bellHour * 60 + e.bellMin};
                resolvedEvents[resolvedCount].event = new ScheduleEvent(e);
                resolvedCount++;
            }
        }
    } else {
        for (int i = 0; i < sourceCount; i++) {
            ScheduleEvent* e = &sourceEvents[i];
            if (e->activeDays & (1 << dayOfWeek)) {
                ensureResolvedCapacity(resolvedCount + 1);
                resolvedEvents[resolvedCount] = {e, dayOfWeek, e->bellHour * 60 + e->bellMin};
                resolvedCount++;
            }
        }
    }

    if (sourceEvents != events && sourceEvents != nullptr) {
        free(sourceEvents);
    }

    for (int i = 0; i < resolvedCount - 1; i++) {
        for (int j = i + 1; j < resolvedCount; j++) {
            if (resolvedEvents[i].bellMinutes > resolvedEvents[j].bellMinutes) {
                ResolvedEvent tmp = resolvedEvents[i];
                resolvedEvents[i] = resolvedEvents[j];
                resolvedEvents[j] = tmp;
            }
        }
    }

    logger->info("Scheduler rebuilt for %s: %d eventos resueltos (journey: %s)", today.c_str(), resolvedCount, selectedTemplate ? selectedTemplate->journey.c_str() : "base");
}

bool Scheduler::isEventActiveToday(ScheduleEvent* event, int dayOfWeek) {
    return (event->activeDays & (1 << dayOfWeek)) != 0;
}

void Scheduler::loop() {
    if (!timeManager->isTimeValid()) return;

    struct tm now = timeManager->getCurrentTimeStruct();
    String today = timeManager->getCurrentDateString();
    int dayOfWeek = now.tm_wday;
    int currentMinute = now.tm_hour * 60 + now.tm_min;

    if (today != lastResolvedDate) {
        rebuildResolvedSchedule();
    }

    if (currentMinute != lastCheckedMinute) {
        lastCheckedMinute = currentMinute;

        for (int i = 0; i < resolvedCount; i++) {
            ResolvedEvent* re = &resolvedEvents[i];
            if (re->bellMinutes == currentMinute) {
                if (isEventActiveToday(re->event, dayOfWeek)) {
                    executeEvent(re->event);
                }
            }
        }
    }
}

void Scheduler::executeEvent(ScheduleEvent* event) {
    char timeStr[16];
    snprintf(timeStr, sizeof(timeStr), "%02d:%02d", event->bellHour, event->bellMin);
    lastBellTime = timeStr;
    lastExecutedEvent = event->name;

    logger->info("EJECUTANDO: %s (%s) - Jornada: %s - Duración: %ds",
                event->name.c_str(), event->type.c_str(), event->journey.c_str(), event->bellDurationSec);

    relay->activate(event->bellDurationSec * 1000);

    notifyBellExecuted(event->name, event->type, event->journey, "automatic", event->bellDurationSec);
}

void Scheduler::setBellNotifier(std::function<void(const String&)> notifier) {
    bellNotifier = notifier;
}

void Scheduler::notifyBellExecuted(const String& eventName, const String& eventType, const String& journey,
                                   const char* triggeredBy, int durationSec) {
    if (!bellNotifier) return;

    StaticJsonDocument<640> doc;
    doc["event"] = "bell:executed";
    doc["data"]["eventName"] = eventName;
    doc["data"]["eventType"] = eventType;
    doc["data"]["journey"] = journey;
    doc["data"]["triggeredBy"] = triggeredBy ? triggeredBy : "automatic";
    doc["data"]["executed"] = true;
    doc["data"]["durationSeconds"] = durationSec;

    if (timeManager) {
        String timestamp = timeManager->getCurrentDateString() + "T" + timeManager->getCurrentTimeString();
        doc["data"]["timestamp"] = timestamp;
        doc["data"]["actualBellTime"] = timeManager->getCurrentTimeString();
    }

    doc["data"]["deviceId"] = DEVICE_NAME;
    doc["data"]["firmwareVersion"] = FIRMWARE_VERSION;

    String output;
    serializeJson(doc, output);
    bellNotifier(output);
}

String Scheduler::getNextEvent() {
    if (!scheduleStore || !timeManager->isTimeValid()) return "N/A";

    struct tm now = timeManager->getCurrentTimeStruct();
    int currentMinutes = now.tm_hour * 60 + now.tm_min;
    int dayOfWeek = now.tm_wday;

    if (resolvedCount == 0) {
        return "No hay eventos hoy";
    }

    int minDiff = 1440;
    ScheduleEvent* next = nullptr;

    for (int i = 0; i < resolvedCount; i++) {
        ResolvedEvent* re = &resolvedEvents[i];
        if (!isEventActiveToday(re->event, dayOfWeek)) continue;

        int diff = re->bellMinutes - currentMinutes;
        if (diff < 0) diff += 1440;

        if (diff < minDiff) {
            minDiff = diff;
            next = re->event;
        }
    }

    if (next) {
        char buf[64];
        snprintf(buf, sizeof(buf), "%s a %02d:%02d (en %d min)",
                 next->name.c_str(), next->bellHour, next->bellMin, minDiff);
        return String(buf);
    }

    return "No hay eventos";
}

String Scheduler::getLastBellTime() {
    return lastBellTime;
}

String Scheduler::getLastExecutedEvent() {
    return lastExecutedEvent;
}