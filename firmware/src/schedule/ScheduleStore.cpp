#include "ScheduleStore.h"
#include "sync/SyncProtocol.h"
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
        // Copia elemento a elemento: memcpy sobre structs con String y luego
        // delete[] (que llama ~String) dejaba los punteros nuevos colgando.
        int newCapacity = capacity == 0 ? 16 : capacity * 2;
        ScheduleEvent* newEvents = new ScheduleEvent[newCapacity];
        for (int i = 0; i < eventCount; i++) newEvents[i] = events[i];
        if (events) delete[] events;
        events = newEvents;
        capacity = newCapacity;
    }
}

void ScheduleStore::ensureTemplateCapacity() {
    if (templateCount >= templateCapacity) {
        int newCapacity = templateCapacity == 0 ? 8 : templateCapacity * 2;
        ScheduleTemplate* newTemplates = new ScheduleTemplate[newCapacity];
        for (int i = 0; i < templateCount; i++) newTemplates[i] = templates[i];
        if (templates) delete[] templates;
        templates = newTemplates;
        templateCapacity = newCapacity;
    }
}

void ScheduleStore::ensureExceptionCapacity() {
    if (exceptionCount >= exceptionCapacity) {
        int newCapacity = exceptionCapacity == 0 ? 8 : exceptionCapacity * 2;
        CalendarException* newExceptions = new CalendarException[newCapacity];
        for (int i = 0; i < exceptionCount; i++) newExceptions[i] = exceptions[i];
        if (exceptions) delete[] exceptions;
        exceptions = newExceptions;
        exceptionCapacity = newCapacity;
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

    // JsonDocument (heap): el horario completo supera con creces los 8 KB del
    // StaticJsonDocument viejo y el parseo fallaba en silencio.
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        logger.error("Error parseando horario: %s", error.c_str());
        return false;
    }

    return saveSchedule(doc.as<JsonVariantConst>());
}

bool ScheduleStore::saveSchedule(JsonVariantConst doc) {
    clear();

    JsonArrayConst journeys = doc["journeys"].as<JsonArrayConst>();
    for (JsonObjectConst journey : journeys) {
        const char* journeyName = journey["journey"];
        JsonArrayConst eventsArray = journey["events"].as<JsonArrayConst>();

        for (JsonObjectConst evt : eventsArray) {
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
            e.activeDays = parseActiveDays(evt["activeDays"]);
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

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        logger.error("Error parseando plantillas: %s", error.c_str());
        return false;
    }

    return saveTemplates(doc.as<JsonVariantConst>());
}

bool ScheduleStore::saveTemplates(JsonVariantConst doc) {
    clearTemplates();

    JsonArrayConst tmplArray = doc["templates"].as<JsonArrayConst>();
    if (!tmplArray.isNull()) {
        for (JsonObjectConst tmpl : tmplArray) {
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

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
        logger.error("Error parseando excepciones: %s", error.c_str());
        return false;
    }

    return saveExceptions(doc.as<JsonVariantConst>());
}

bool ScheduleStore::saveExceptions(JsonVariantConst doc) {
    clearExceptions();

    JsonArrayConst excArray = doc["exceptions"].as<JsonArrayConst>();
    if (!excArray.isNull()) {
        for (JsonObjectConst exc : excArray) {
            CalendarException e;
            e.id = exc["id"].as<String>();
            e.date = exc["date"].as<String>();
            e.journey = exc["journey"].as<String>();
            e.type = exc["type"].as<String>();
            e.scheduleId = exc["scheduleId"] | "";
            e.name = exc["name"].as<String>();
            e.description = exc["description"] | "";
            // customEvents es un array: serializarlo (igual que las plantillas)
            // en vez de `| ""`, que descartaba todos los eventos custom.
            if (exc["customEvents"].is<JsonArrayConst>()) {
                String customJson;
                serializeJson(exc["customEvents"], customJson);
                e.customEventsJson = customJson;
            } else {
                e.customEventsJson = "";
            }
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

void ScheduleStore::setChangeNotifier(std::function<void()> fn) {
    changeNotifier = fn;
}

// Escribe {"<key>": <valor>} en LittleFS serializando directo al archivo
// (sin copiar el array a otro documento: con ~25 KB de horario no cabe en RAM).
static bool writeWrappedJson(const char* path, const char* key, JsonVariantConst value) {
    File file = LittleFS.open(path, "w");
    if (!file) {
        logger.error("No se pudo abrir %s para escritura", path);
        return false;
    }
    file.print("{\"");
    file.print(key);
    file.print("\":");
    serializeJson(value, file);
    file.print("}");
    file.close();
    return true;
}

bool ScheduleStore::saveFullSync(JsonVariantConst doc) {
    if (!doc["journeys"].is<JsonArrayConst>()) {
        logger.error("Sync sin array 'journeys': ignorado");
        return false;
    }

    int version = doc["version"] | 0;
    String hash = SyncProtocol::calculateHash(doc);

    // Dedupe por contenido: si el hash no cambia no hay nada que recargar ni
    // que volver a escribir en flash (la app manda version=Date.now() siempre).
    if (hash == lastSyncHash && lastSyncVersion != 0) {
        logger.info("Sync duplicado (mismo contenido), ignorando");
        return true;
    }

    bool scheduleOk = saveSchedule(doc);
    bool templatesOk = saveTemplates(doc);
    bool exceptionsOk = saveExceptions(doc);

    if (scheduleOk && templatesOk && exceptionsOk) {
        // Persistir: sin esto, loadSchedule/loadTemplates/loadExceptions leen
        // archivos que nunca se escribían y el horario se perdía al reiniciar.
        bool persistOk = writeWrappedJson(SCHEDULE_FILE, "journeys", doc["journeys"]) &&
                         writeWrappedJson(TEMPLATES_FILE, "templates", doc["templates"]) &&
                         writeWrappedJson(EXCEPTIONS_FILE, "exceptions", doc["exceptions"]);

        if (!persistOk) {
            logger.error("Sync aplicado en RAM pero no persistido en LittleFS");
            return false;
        }

        setSyncMetadata(version, hash);
        logger.info("Sync completo guardado y persistido v%d hash=%s eventos=%d",
                    version, hash.c_str(), eventCount);

        if (changeNotifier) changeNotifier();
        return true;
    }

    logger.error("Error guardando sync completo");
    return false;
}