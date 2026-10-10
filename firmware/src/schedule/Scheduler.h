#ifndef SCHEDULER_H
#define SCHEDULER_H

#include "ScheduleStore.h"
#include "HistoryLog.h"
#include "time/TimeManager.h"
#include "hardware/RelayControl.h"
#include "utils/Logger.h"
#include <functional>

class Scheduler {
private:
    ScheduleStore* scheduleStore;
    TimeManager* timeManager;
    RelayControl* relay;
    Logger* logger;
    HistoryLog* historyLog = nullptr;

    int lastCheckedMinute = -1;
    String lastBellTime = "";
    String lastExecutedEvent = "";

    struct ResolvedEvent {
        ScheduleEvent* event;
        int dayOfWeek;
        int bellMinutes; // hour * 60 + min
    };

    ResolvedEvent* resolvedEvents = nullptr;
    int resolvedCount = 0;
    int resolvedCapacity = 0;
    String lastResolvedDate = "";
    std::function<void(const String&)> bellNotifier;

    void rebuildResolvedSchedule();
    void ensureResolvedCapacity(int needed);
    int getExceptionPriority(const CalendarException* exc);
    bool isExceptionActiveToday(const CalendarException* exc, const String& today, int dayOfWeek);
    CalendarException* findMatchingException(const String& today, const String& journey, int dayOfWeek);
    bool isNoClassesException(const CalendarException* exc);
    bool isEventActiveToday(ScheduleEvent* event, int dayOfWeek);
    void executeEvent(ScheduleEvent* event);

public:
    Scheduler();
    ~Scheduler();
    void init(ScheduleStore* store, TimeManager* tm, RelayControl* r, Logger* log);
    void loop();
    String getNextEvent();
    String getLastBellTime();
    String getLastExecutedEvent();
    void forceRebuild();

    // Historial propio del ESP32 (registrado en notifyBellExecuted)
    void setHistoryLog(HistoryLog* hl);

    // Aviso de timbre ejecutado hacia la aplicación (evento bell:executed)
    void setBellNotifier(std::function<void(const String&)> notifier);
    void notifyBellExecuted(const String& eventName, const String& eventType, const String& journey,
                            const char* triggeredBy, int durationSec);
};

#endif