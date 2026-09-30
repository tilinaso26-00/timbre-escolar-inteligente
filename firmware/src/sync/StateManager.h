#ifndef STATE_MANAGER_H
#define STATE_MANAGER_H

#include <Arduino.h>
#include "schedule/ScheduleStore.h"
#include "time/TimeManager.h"
#include "network/WiFiManager.h"
#include "utils/Logger.h"

class StateManager {
private:
    ScheduleStore* scheduleStore;
    TimeManager* timeManager;
    WiFiManager* wifiManager;
    Logger* logger;
    unsigned long lastSyncTime = 0;
    int currentVersion = 0;
    String currentHash = "";

public:
    StateManager();
    void init(ScheduleStore* ss, TimeManager* tm, WiFiManager* wm, Logger* log);
    void loop();
    void onSyncReceived(JsonDocument& doc);
    void handleFullSync(JsonDocument& doc);
    void onSyncComplete(int version, const String& hash);
    unsigned long getLastSyncTime();
    int getCurrentVersion();
    String getCurrentHash();
    bool needsSync(int version, const String& hash);
};

#endif