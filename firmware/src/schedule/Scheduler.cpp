#include "Scheduler.h"
#include "config.h"
#include <ArduinoJson.h>

// 0 = matutina, 1 = vespertina, -1 = jornada desconocida
static int journeyIndex(const String& journey);
static bool templateAppliesOnDay(const String& eventsJson, int dayOfWeek);

Scheduler::Scheduler()
    : scheduleStore(nullptr), timeManager(nullptr), relay(nullptr), logger(nullptr),
      resolvedEvents(nullptr), resolvedCount(0), resolvedCapacity(0) {}

Scheduler::~Scheduler() {
    if (resolvedEvents) {
        delete[] resolvedEvents;
    }
    if (overrideEvents) {
        delete[] overrideEvents;
    }
}

void Scheduler::ensureResolvedCapacity(int needed) {
    if (needed >= resolvedCapacity) {
        resolvedCapacity = needed + 8;
        ResolvedEvent* newEvents = new ResolvedEvent[resolvedCapacity];
        if (resolvedEvents) {
            for (int i = 0; i < resolvedCount; i++) newEvents[i] = resolvedEvents[i];
            delete[] resolvedEvents;
        }
        resolvedEvents = newEvents;
    }
}

void Scheduler::ensureOverrideCapacity(int needed) {
    if (needed >= overrideCapacity) {
        int newCapacity = overrideCapacity == 0 ? 16 : overrideCapacity * 2;
        if (newCapacity < needed) newCapacity = needed;
        ScheduleEvent* newEvents = new ScheduleEvent[newCapacity];
        for (int i = 0; i < overrideCount; i++) newEvents[i] = overrideEvents[i];
        if (overrideEvents) delete[] overrideEvents;
        overrideEvents = newEvents;
        overrideCapacity = newCapacity;
    }
}

void Scheduler::addResolvedEvent(ScheduleEvent* event, int dayOfWeek) {
    ensureResolvedCapacity(resolvedCount + 1);
    resolvedEvents[resolvedCount].event = event;
    resolvedEvents[resolvedCount].dayOfWeek = dayOfWeek;
    resolvedEvents[resolvedCount].bellMinutes = event->bellHour * 60 + event->bellMin;
    resolvedCount++;
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
    if (today == lastResolvedDate) return;

    struct tm now = timeManager->getCurrentTimeStruct();
    int dayOfWeek = now.tm_wday;

    lastResolvedDate = today;
    resolvedCount = 0;
    overrideCount = 0;

    int eventCount = 0;
    ScheduleEvent* baseEvents = scheduleStore->getEvents(eventCount);
    int templateCount = 0;
    ScheduleTemplate* templates = scheduleStore->getTemplates(templateCount);
    int exceptionCount = 0;
    CalendarException* exceptions = scheduleStore->getExceptions(exceptionCount);

    const char* journeyNames[2] = {"matutina", "vespertina"};
    int baseCountByJourney[2] = {0, 0};
    for (int i = 0; i < eventCount; i++) {
        int j = journeyIndex(baseEvents[i].journey);
        if (j >= 0) baseCountByJourney[j]++;
    }

    // 1) Excepciones de hoy por jornada (fecha + jornada, igual que la app).
    //    Sustituyen SOLO al horario de su jornada: la otra jornada sigue normal.
    //    Antes una excepción mataba los timbres de las dos jornadas del día.
    bool overridesBase[2] = {false, false};
    for (int j = 0; j < 2; j++) {
        for (int i = 0; i < exceptionCount; i++) {
            CalendarException* exc = &exceptions[i];
            if (exc->date == today && exc->journey == journeyNames[j]) {
                overridesBase[j] = loadExceptionEvents(exc, today, dayOfWeek);
                if (!overridesBase[j]) {
                    logger->info("Hoy %s: excepción de %s no aporta eventos, uso horario base",
                                 today.c_str(), journeyNames[j]);
                }
                break;
            }
        }
    }

    //    Sin horario base para la jornada → plantilla que aplique hoy
    for (int j = 0; j < 2; j++) {
        if (overridesBase[j] || baseCountByJourney[j] > 0) continue;
        for (int i = 0; i < templateCount; i++) {
            if (templates[i].journey != journeyNames[j]) continue;
            if (!templateAppliesOnDay(templates[i].eventsJson, dayOfWeek)) continue;
            logger->info("Hoy %s: %s usa plantilla por día '%s'", today.c_str(),
                         journeyNames[j], templates[i].name.c_str());
            appendEventsFromJson(templates[i].eventsJson, dayOfWeek);
            break;
        }
    }

    // 2) Horario base de cada jornada, filtrado por el día de la semana.
    for (int i = 0; i < eventCount; i++) {
        ScheduleEvent* e = &baseEvents[i];
        int j = journeyIndex(e->journey);
        if (j >= 0 && overridesBase[j]) continue;
        if (isEventActiveToday(e, dayOfWeek)) addResolvedEvent(e, dayOfWeek);
    }

    // 3) Eventos de excepciones/plantillas ya parseados. Aquí overrideEvents ya
    //    no crece, así que los punteros anteriores siguen siendo válidos.
    for (int i = 0; i < overrideCount; i++) {
        addResolvedEvent(&overrideEvents[i], dayOfWeek);
    }

    // Orden por hora de timbre
    for (int i = 0; i < resolvedCount - 1; i++) {
        for (int j = i + 1; j < resolvedCount; j++) {
            if (resolvedEvents[i].bellMinutes > resolvedEvents[j].bellMinutes) {
                ResolvedEvent tmp = resolvedEvents[i];
                resolvedEvents[i] = resolvedEvents[j];
                resolvedEvents[j] = tmp;
            }
        }
    }

    logger->info("Scheduler rebuilt for %s: %d eventos resueltos", today.c_str(), resolvedCount);
}

// Devuelve 0 para matutina, 1 para vespertina y -1 si la jornada es desconocida.
static int journeyIndex(const String& journey) {
    if (journey == "matutina") return 0;
    if (journey == "vespertina") return 1;
    return -1;
}

static bool templateAppliesOnDay(const String& eventsJson, int dayOfWeek) {
    JsonDocument doc;
    if (deserializeJson(doc, eventsJson)) return false;
    for (JsonObject evt : doc.as<JsonArray>()) {
        if (parseActiveDays(evt["activeDays"]) & (1 << dayOfWeek)) return true;
    }
    return false;
}

// Convierte los eventos JSON de una excepción/plantilla en eventos propios.
// Se filtra por el día de la semana: es la misma regla que usa la aplicación
// al mostrar "Hoy" (useSchedule.ts filtra por activeDays.includes(today)).
void Scheduler::appendEventsFromJson(const String& json, int dayOfWeek) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json);
    if (err) {
        logger->warn("Eventos ilegibles en JSON: %s", err.c_str());
        return;
    }

    for (JsonObject evt : doc.as<JsonArray>()) {
        ScheduleEvent e;
        e.id = evt["id"] | "";
        e.name = evt["name"].as<String>();
        e.startHour = evt["startTime"]["hours"] | 0;
        e.startMin = evt["startTime"]["minutes"] | 0;
        e.durationMin = evt["durationMinutes"] | 0;
        e.bellHour = evt["bellTime"]["hours"] | 0;
        e.bellMin = evt["bellTime"]["minutes"] | 0;
        e.bellDurationSec = evt["bellDurationSeconds"] | 3;
        e.type = evt["type"].as<String>();
        e.journey = evt["journey"].as<String>();
        e.activeDays = parseActiveDays(evt["activeDays"]);
        e.isFixed = evt["isFixed"] | false;
        e.periodIndex = evt["periodIndex"] | 0;

        if (!(e.activeDays & (1 << dayOfWeek))) continue;

        ensureOverrideCapacity(overrideCount + 1);
        overrideEvents[overrideCount++] = e;
    }
}

// Devuelve true si la excepción sustituye al horario base de su jornada.
bool Scheduler::loadExceptionEvents(CalendarException* exc, const String& today, int dayOfWeek) {
    if (!exc) return false;

    if (exc->type == "no_classes") {
        logger->info("Hoy %s: jornada %s sin clases (excepción)", today.c_str(), exc->journey.c_str());
        return true;
    }

    if (exc->type == "schedule" && exc->scheduleId.length() > 0) {
        ScheduleTemplate* tmpl = scheduleStore->findTemplateById(exc->scheduleId);
        if (!tmpl) {
            logger->warn("Plantilla %s de la excepción no encontrada", exc->scheduleId.c_str());
            return false;
        }
        logger->info("Hoy %s: jornada %s usa plantilla '%s'", today.c_str(),
                     exc->journey.c_str(), tmpl->name.c_str());
        appendEventsFromJson(tmpl->eventsJson, dayOfWeek);
        return true;
    }

    if (exc->type == "custom" && exc->customEventsJson.length() > 0) {
        logger->info("Hoy %s: jornada %s usa eventos custom de excepción",
                     today.c_str(), exc->journey.c_str());
        appendEventsFromJson(exc->customEventsJson, dayOfWeek);
        return true;
    }

    return false;
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

void Scheduler::setHistoryLog(HistoryLog* hl) {
    historyLog = hl;
}

void Scheduler::notifyBellExecuted(const String& eventName, const String& eventType, const String& journey,
                                   const char* triggeredBy, int durationSec) {
    // Una sola fuente de verdad para la hora: si el reloj no es válido no se
    // emite timestamp (evita "----/--/---T--:--:--" y la app usa su hora local)
    String ts;
    if (timeManager && timeManager->isTimeValid()) {
        ts = timeManager->getCurrentDateString() + "T" + timeManager->getCurrentTimeString();
    }

    // Se registra SIEMPRE en el historial propio, aunque no haya app conectada
    if (historyLog) {
        historyLog->record(eventName, eventType, journey,
                           triggeredBy ? triggeredBy : "automatic", durationSec, true, ts);
    }

    if (!bellNotifier) return;

    StaticJsonDocument<640> doc;
    doc["event"] = "bell:executed";
    doc["data"]["eventName"] = eventName;
    doc["data"]["eventType"] = eventType;
    doc["data"]["journey"] = journey;
    doc["data"]["triggeredBy"] = triggeredBy ? triggeredBy : "automatic";
    doc["data"]["executed"] = true;
    doc["data"]["durationSeconds"] = durationSec;

    if (ts.length() > 0) {
        doc["data"]["timestamp"] = ts;
        doc["data"]["actualBellTime"] = ts.substring(11);
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

int Scheduler::getResolvedCount() {
    return resolvedCount;
}