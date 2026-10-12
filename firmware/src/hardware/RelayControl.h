#ifndef RELAY_CONTROL_H
#define RELAY_CONTROL_H

#include <Arduino.h>

class RelayControl {
private:
    int pin;
    bool activeLow;
    unsigned long safetyMaxMs;
    bool state = false;
    unsigned long activationStart = 0;
    unsigned long activationDuration = 0;
    bool timerActive = false;

public:
    RelayControl();
    void init(int p, bool low, unsigned long maxMs);
    void activate(unsigned long durationMs);
    void deactivate();
    void loop();
    bool getState();
    void setSafetyMax(unsigned long ms);
};

#endif