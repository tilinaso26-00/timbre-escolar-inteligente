#ifndef SYNC_PROTOCOL_H
#define SYNC_PROTOCOL_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "schedule/ScheduleStore.h"

class SyncProtocol {
public:
    static bool parseAndStore(JsonDocument& doc, ScheduleStore* store);
    static String calculateHash(JsonDocument& doc);
    static bool validateVersion(JsonDocument& doc, int currentVersion);
};

#endif