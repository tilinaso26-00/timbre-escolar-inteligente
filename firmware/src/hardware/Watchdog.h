#ifndef WATCHDOG_H
#define WATCHDOG_H

#include <Arduino.h>
#include <esp_task_wdt.h>

class Watchdog {
private:
    unsigned long hwTimeoutMs;
    unsigned long swTimeoutMs;
    unsigned long lastFeed = 0;
    bool hwEnabled = false;

public:
    Watchdog();
    void init(unsigned long hwMs, unsigned long swMs);
    void feed();
    void loop();
    void enableHW();
    void disableHW();
};

#endif