#ifndef MDNS_RESPONDER_H
#define MDNS_RESPONDER_H

#include <Arduino.h>
#include <ESPmDNS.h>

class MDNSResponder {
private:
    char hostname[32];
    bool started = false;

public:
    MDNSResponder();
    void init(const char* name);
    void loop();
    bool isRunning();
};

#endif