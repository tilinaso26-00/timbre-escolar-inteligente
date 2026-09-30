#include "TimeManager.h"
#include "utils/Logger.h"

TimeManager::TimeManager() : ntpClient(nullptr), syncInterval(3600000), timezoneOffset(-6) {
    strcpy(ntpServer1, "pool.ntp.org");
    strcpy(ntpServer2, "time.google.com");
}

TimeManager::~TimeManager() {
    delete ntpClient;
}

void TimeManager::init(const char* server1, const char* server2, unsigned long interval, int tzOffset) {
    syncInterval = interval;
    timezoneOffset = tzOffset;
    strncpy(ntpServer1, server1, sizeof(ntpServer1) - 1);
    strncpy(ntpServer2, server2, sizeof(ntpServer2) - 1);

    ntpClient = new NTPClient(ntpUDP, ntpServer1, timezoneOffset * 3600, syncInterval);
    ntpClient->begin();

    setupRTC();

    if (WiFi.isConnected()) {
        syncNow();
    }
}

void TimeManager::setupRTC() {
    if (rtc.begin()) {
        rtcAvailable = true;
        if (rtc.lostPower()) {
            logger.warn("RTC perdió alimentación, hora no confiable");
        }
    } else {
        logger.warn("RTC DS3231 no detectado, usando solo NTP");
        rtcAvailable = false;
    }
}

void TimeManager::loop() {
    if (ntpClient) {
        ntpClient->update();
    }

    if (millis() - lastSync >= syncInterval) {
        if (WiFi.isConnected()) {
            syncNow();
        }
    }
}

bool TimeManager::syncNow() {
    if (!WiFi.isConnected()) {
        if (rtcAvailable && rtc.now().isValid()) {
            logger.info("Sin WiFi, usando RTC");
            return true;
        }
        return false;
    }

    bool success = false;
    if (ntpClient->forceUpdate()) {
        time_t utc = ntpClient->getEpochTime();
        applyTimezone(utc);
        updateRTC(utc);
        lastSync = millis();
        logger.info("Hora sincronizada via NTP: %s", getCurrentTimeString().c_str());
        success = true;
    } else {
        logger.error("Fallo sincronización NTP");
        ntpClient->setPoolServerName(ntpServer2);
    }
    return success;
}

void TimeManager::applyTimezone(time_t& utc) {
    utc += timezoneOffset * 3600;
}

void TimeManager::updateRTC(time_t utc) {
    if (rtcAvailable) {
        rtc.adjust(DateTime(utc));
    }
}

String TimeManager::getCurrentTimeString() {
    time_t now;
    if (ntpClient && ntpClient->isTimeSet()) {
        now = ntpClient->getEpochTime();
        applyTimezone(now);
    } else if (rtcAvailable) {
        now = rtc.now().unixtime();
    } else {
        return "--:--:--";
    }

    struct tm* timeinfo = localtime(&now);
    char buffer[32];
    strftime(buffer, sizeof(buffer), "%H:%M:%S", timeinfo);
    return String(buffer);
}

String TimeManager::getCurrentDateString() {
    time_t now;
    if (ntpClient && ntpClient->isTimeSet()) {
        now = ntpClient->getEpochTime();
        applyTimezone(now);
    } else if (rtcAvailable) {
        now = rtc.now().unixtime();
    } else {
        return "----/--/--";
    }

    struct tm* timeinfo = localtime(&now);
    char buffer[32];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d", timeinfo);
    return String(buffer);
}

struct tm TimeManager::getCurrentTimeStruct() {
    time_t now;
    if (ntpClient && ntpClient->isTimeSet()) {
        now = ntpClient->getEpochTime();
        applyTimezone(now);
    } else if (rtcAvailable) {
        now = rtc.now().unixtime();
    } else {
        struct tm empty = {0};
        return empty;
    }
    return *localtime(&now);
}

bool TimeManager::isTimeValid() {
    return (ntpClient && ntpClient->isTimeSet()) || (rtcAvailable && rtc.now().isValid());
}

unsigned long TimeManager::getLastSyncTime() {
    return lastSync;
}

bool TimeManager::hasRTC() {
    return rtcAvailable;
}