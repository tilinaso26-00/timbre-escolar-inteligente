#include "Watchdog.h"
#include "utils/Logger.h"

Watchdog::Watchdog() {}

void Watchdog::init(unsigned long hwMs, unsigned long swMs) {
    hwTimeoutMs = hwMs;
    swTimeoutMs = swMs;

    esp_task_wdt_init(hwMs / 1000, true);
    esp_task_wdt_add(NULL);
    hwEnabled = true;

    lastFeed = millis();
    logger.info("Watchdog HW: %lu ms, SW: %lu ms", hwMs, swMs);
}

void Watchdog::feed() {
    lastFeed = millis();
    if (hwEnabled) {
        esp_task_wdt_reset();
    }
}

void Watchdog::loop() {
    if (millis() - lastFeed > swTimeoutMs) {
        logger.error("¡SW WATCHDOG! Loop bloqueado > %lu ms, reiniciando...", swTimeoutMs);
        delay(100);
        ESP.restart();
    }
}

void Watchdog::enableHW() {
    if (!hwEnabled) {
        esp_task_wdt_init(hwTimeoutMs / 1000, true);
        esp_task_wdt_add(NULL);
        hwEnabled = true;
    }
}

void Watchdog::disableHW() {
    if (hwEnabled) {
        esp_task_wdt_delete(NULL);
        hwEnabled = false;
    }
}