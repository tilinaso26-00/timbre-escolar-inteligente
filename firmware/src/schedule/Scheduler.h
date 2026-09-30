#ifndef SCHEDULER_H
#define SCHEDULER_H

#include "ScheduleStore.h"
#include "time/TimeManager.h"
#include "hardware/RelayControl.h"
#include "utils/Logger.h"

class Scheduler {
private:
    ScheduleStore* scheduleStore;
    TimeManager* timeManager;
    RelayControl* relay;
    Logger* logger;

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

    void rebuildResolvedSchedule();
    void ensureResolvedCapacity(int needed);
    int getExceptionPriority(const CalendarException* exc);
    bool isExceptionActiveToday(const CalendarException* exc, const String& today, int dayOfWeek);
    CalendarException* findMatchingException(const String& today, const String& journey, int dayOfWeek);
    bool isNoClassesException(const CalendarException* exc);

public:
    Scheduler();
    ~Scheduler();
    void init(ScheduleStore* store, TimeManager* tm, RelayControl* r, Logger* log);
    void loop();
    String getNextEvent();
    String getLastBellTime();
    String getLastExecutedEvent();
    void forceRebuild();
};

#endif