#include "SyncProtocol.h"
#include "ScheduleStore.h"
#include "utils/Logger.h"

bool SyncProtocol::parseAndStore(JsonDocument& doc, ScheduleStore* store) {
    if (!doc["journeys"].is<JsonArray>()) {
        logger.error("Sync: falta array 'journeys'");
        return false;
    }

    return store->saveFullSync(doc);
}

String SyncProtocol::calculateHash(JsonDocument& doc) {
    String jsonStr;
    serializeJson(doc, jsonStr);

    unsigned long hash = 5381;
    for (size_t i = 0; i < jsonStr.length(); i++) {
        hash = ((hash << 5) + hash) + jsonStr[i];
    }

    char buf[16];
    snprintf(buf, sizeof(buf), "%08lX", hash);
    return String(buf);
}

bool SyncProtocol::validateVersion(JsonDocument& doc, int currentVersion) {
    int version = doc["version"] | 0;
    return version > currentVersion;
}