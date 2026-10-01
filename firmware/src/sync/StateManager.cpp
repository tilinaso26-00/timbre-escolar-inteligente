#include "StateManager.h"
#include "sync/SyncProtocol.h"
#include "time/TimeManager.h"

StateManager::StateManager() {}

void StateManager::init(ScheduleStore* ss, TimeManager* tm, WiFiManager* wm, Logger* log) {
    scheduleStore = ss;
    timeManager = tm;
    wifiManager = wm;
    logger = log;
}

void StateManager::loop() {
    // Periodic state checks
}

void StateManager::onSyncReceived(JsonDocument& doc) {
    logger->info("Sync recibido, versión: %d", doc["version"] | 0);

    if (SyncProtocol::validateVersion(doc, currentVersion)) {
        // Store will be updated by ScheduleStore::saveFullSync
        // We just acknowledge
    }
}

void StateManager::onSyncComplete(int version, const String& hash) {
    currentVersion = version;
    currentHash = hash;
    lastSyncTime = millis();
    logger->info("Sync completado v%d hash=%s", version, hash.c_str());
}

void StateManager::handleFullSync(JsonDocument& doc) {
    logger->info("Procesando sync completo v%d", doc["version"] | 0);

    if (scheduleStore && scheduleStore->saveFullSync(doc)) {
        int version = doc["version"] | 0;
        String hash = SyncProtocol::calculateHash(doc);
        onSyncComplete(version, hash);

        // Update device config if present
        if (doc["deviceConfig"].is<JsonObject>()) {
            applyDeviceConfig(doc["deviceConfig"]);
        }
    } else {
        logger->error("Error procesando sync completo");
    }
}

void StateManager::applyDeviceConfig(JsonObject config) {
    if (timeManager && config["timezone"].is<const char*>()) {
        // Timezone would require NTP restart, log for now
        logger->info("Config timezone: %s", config["timezone"].as<const char*>());
    }
    if (config["ntpSyncIntervalMinutes"].is<int>()) {
        logger->info("Config ntpSyncInterval: %d min", config["ntpSyncIntervalMinutes"].as<int>());
    }
}

unsigned long StateManager::getLastSyncTime() {
    return lastSyncTime;
}

int StateManager::getCurrentVersion() {
    return currentVersion;
}

String StateManager::getCurrentHash() {
    return currentHash;
}

bool StateManager::needsSync(int version, const String& hash) {
    return version > currentVersion || hash != currentHash;
}