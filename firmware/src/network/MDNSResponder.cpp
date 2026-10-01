#include "MDNSResponder.h"
#include "utils/Logger.h"

MdnsService::MdnsService() {
    strcpy(hostname, "timbre-escolar");
}

void MdnsService::init(const char* name) {
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

void MdnsService::loop() {
    // ESP32 core 3.x actualiza mDNS en segundo plano
}

bool MdnsService::isRunning() {
    return started;
}