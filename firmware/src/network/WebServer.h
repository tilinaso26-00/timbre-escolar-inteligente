#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <Arduino.h>
#include <WebServer.h>
#include "schedule/ScheduleStore.h"
#include "schedule/HistoryLog.h"
#include "time/TimeManager.h"
#include "network/WiFiManager.h"
#include "hardware/RelayControl.h"
#include "utils/Logger.h"
#include "sync/StateManager.h"

class WebServerWrapper {
private:
    WebServer server;
    ScheduleStore* scheduleStore;
    TimeManager* timeManager;
    WiFiManager* wifiManager;
    RelayControl* relay;
    Logger* logger;
    StateManager* stateManager;
    HistoryLog* historyLog;

public:
    WebServerWrapper();
    void init();
    void loop();
    void setDependencies(ScheduleStore* ss, TimeManager* tm, WiFiManager* wm, RelayControl* r, Logger* log, StateManager* sm, HistoryLog* hl);

private:
    void setupRoutes();
    void corsHeaders();
    void handleOptions();
    bool requireAuth();
    void handleStatus();
    void handleScheduleGet();
    void handleSchedulePost();
    void handleConfigGet();
    void handleConfigPost();
    void handleManualBell();
    void handleTestBell();
    void handleLogs();
    void handleHistory();
    void handleReboot();
    void handleFactoryReset();
    void sendJSON(int code, JsonDocument& doc);
};

#endif