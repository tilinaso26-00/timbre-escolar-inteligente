#include "MDNSResponder.h"
#include "utils/Logger.h"

MDNSResponder::MDNSResponder() {
    strcpy(hostname, "timbre-escolar");
}

void MDNSResponder::init(const char* name) {
    strncpy(hostname, name, sizeof(hostname) - 1);

    if (MDNS.begin(hostname)) {
        MDNS.addService("http", "tcp", 80);
        MDNS.addService("ws", "tcp", 81);
        started = true;
        logger.info("mDNS iniciado: %s.local", hostname);
    } else {
        logger.error("Error iniciando mDNS");
    }
}

void MDNSResponder::loop() {
    if (started) {
        MDNS.update();
    }
}

bool MDNSResponder::isRunning() {
    return started;
}