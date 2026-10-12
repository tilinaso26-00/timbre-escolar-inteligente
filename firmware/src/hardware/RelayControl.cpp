#include "RelayControl.h"
#include "utils/Logger.h"

RelayControl::RelayControl() : pin(-1), activeLow(true), safetyMaxMs(60000) {}

void RelayControl::init(int p, bool low, unsigned long maxMs) {
    pin = p;
    activeLow = low;
    safetyMaxMs = maxMs;
    pinMode(pin, OUTPUT);
    deactivate();
    logger.info("Relé inicializado en GPIO %d (activeLow=%d, maxMs=%lu)", pin, activeLow, safetyMaxMs);
}

void RelayControl::activate(unsigned long durationMs) {
    if (state) {
        logger.warn("Relé ya activado, ignorando");
        return;
    }

    if (durationMs > safetyMaxMs) {
        durationMs = safetyMaxMs;
        logger.warn("Duración limitada a %lu ms por seguridad", safetyMaxMs);
    }

    digitalWrite(pin, activeLow ? LOW : HIGH);
    state = true;
    activationStart = millis();
    activationDuration = durationMs;
    timerActive = true;

    logger.info("Relé ACTIVADO por %lu ms", durationMs);
}

void RelayControl::deactivate() {
    digitalWrite(pin, activeLow ? HIGH : LOW);
    state = false;
    timerActive = false;
    activationDuration = 0;
}

void RelayControl::loop() {
    if (timerActive && state) {
        unsigned long elapsed = millis() - activationStart;
        if (elapsed >= activationDuration) {
            deactivate();
            logger.info("Relé apagado tras %lu ms", elapsed);
            return;
        }
        if (elapsed >= safetyMaxMs) {
            logger.error("¡PROTECCIÓN! Relé forzado OFF tras %lu ms", elapsed);
            deactivate();
        }
    }
}

bool RelayControl::getState() {
    return state;
}

void RelayControl::setSafetyMax(unsigned long ms) {
    safetyMaxMs = ms;
}