#ifndef WEBSOCKET_SERVER_H
#define WEBSOCKET_SERVER_H

#include <Arduino.h>
#include <WebSocketsServer.h>
#include "schedule/ScheduleStore.h"
#include "schedule/HistoryLog.h"
#include "schedule/Scheduler.h"
#include "time/TimeManager.h"
#include "network/WiFiManager.h"
#include "hardware/RelayControl.h"
#include "utils/Logger.h"
#include "sync/StateManager.h"
#include "sync/SyncProtocol.h"

class WebSocketServerWrapper {
private:
    WebSocketsServer server;
    ScheduleStore* scheduleStore;
    TimeManager* timeManager;
    WiFiManager* wifiManager;
    RelayControl* relay;
    Logger* logger;
    StateManager* stateManager;
    Scheduler* scheduler;
    HistoryLog* historyLog;

    void onEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length);

public:
    WebSocketServerWrapper();
    void init(uint16_t port);
    void loop();
    void setDependencies(ScheduleStore* ss, TimeManager* tm, WiFiManager* wm, RelayControl* r, Logger* log, StateManager* sm, Scheduler* sched, HistoryLog* hl);
    void broadcast(const String& message);
    void broadcastHeartbeat();
    void sendTo(uint8_t num, const String& message);
};

#endif