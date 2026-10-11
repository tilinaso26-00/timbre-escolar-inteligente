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
    restoreTimeFromNvs();

    if (WiFi.isConnected()) {
        syncNow();
    }
}

void TimeManager::restoreTimeFromNvs() {
    Preferences stored;
    if (!stored.begin("timbre-time", true)) {
        logger.warn("No se pudo leer NVS");
        return;
    }
    bool valid = stored.getBool("valid", false);
    uint32_t epoch = stored.getULong("epoch", 0);
    stored.end();

    if (!valid || epoch < 1600000000UL) {
        logger.info("NVS sin hora guardada, esperando NTP o la aplicación");
        return;
    }

    externalEpoch = epoch;
    externalMillis = millis();
    externalSet = true;
    lastSync = millis();
    logger.info("Hora restaurada desde NVS: %s", getCurrentTimeString().c_str());
}

void TimeManager::persistTime(time_t localEpoch) {
    if (localEpoch <= 0) return;

    Preferences stored;
    if (!stored.begin("timbre-time", false)) {
        logger.warn("No se pudo guardar la hora en NVS");
        return;
    }
    stored.putULong("epoch", (uint32_t)localEpoch);
    stored.putBool("valid", true);
    stored.end();
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
    // Sin WiFi no hay DNS: NTPClient spamea "could not get host from dns"
    if (ntpClient && WiFi.isConnected()) {
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
        externalSet = false; // NTP toma el control de la hora
        persistTime(utc);
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
    if (!localNow(now)) return "--:--:--";

    struct tm* timeinfo = localtime(&now);
    char buffer[32];
    strftime(buffer, sizeof(buffer), "%H:%M:%S", timeinfo);
    return String(buffer);
}

String TimeManager::getCurrentDateString() {
    time_t now;
    if (!localNow(now)) return "----/--/--";

    struct tm* timeinfo = localtime(&now);
    char buffer[32];
    strftime(buffer, sizeof(buffer), "%Y-%m-%d", timeinfo);
    return String(buffer);
}

struct tm TimeManager::getCurrentTimeStruct() {
    time_t now;
    if (!localNow(now)) {
        struct tm empty = {0};
        return empty;
    }
    return *localtime(&now);
}

bool TimeManager::isTimeValid() {
    if (externalSet) return true;
    return (ntpClient && ntpClient->isTimeSet()) || (rtcAvailable && rtc.now().isValid());
}

bool TimeManager::localNow(time_t& out) {
    if (externalSet) {
        unsigned long elapsed = (millis() - externalMillis) / 1000UL;
        out = (time_t)((unsigned long)externalEpoch + elapsed);
        return true;
    }
    if (ntpClient && ntpClient->isTimeSet()) {
        time_t now = ntpClient->getEpochTime();
        applyTimezone(now);
        out = now;
        return true;
    }
    if (rtcAvailable && rtc.now().isValid()) {
        out = rtc.now().unixtime();
        return true;
    }
    return false;
}

bool TimeManager::setFromEpoch(unsigned long epochSeconds) {
    if (epochSeconds == 0) return false;

    externalEpoch = epochSeconds;
    externalMillis = millis();
    externalSet = true;
    lastSync = millis();

    time_t local = (time_t)epochSeconds;
    updateRTC(local);
    persistTime(local);
    logger.info("Hora recibida de la aplicación: %s", getCurrentTimeString().c_str());
    return true;
}

bool TimeManager::setFromApp(const String& isoTimestamp) {
    String value = isoTimestamp;
    value.trim();
    if (value.isEmpty()) return false;

    value.replace(" ", "T");
    int dot = value.indexOf('.');
    if (dot >= 0) value = value.substring(0, dot);
    if (value.endsWith("Z")) value = value.substring(0, value.length() - 1);

    struct tm parsed;
    memset(&parsed, 0, sizeof(parsed));
    if (strptime(value.c_str(), "%Y-%m-%dT%H:%M:%S", &parsed) == NULL) {
        logger.warn("time:sync con formato inválido: %s", isoTimestamp.c_str());
        return false;
    }
    parsed.tm_isdst = -1;
    time_t local = mktime(&parsed);
    if (local == (time_t)-1 || local == 0) {
        logger.warn("time:sync no interpretable: %s", isoTimestamp.c_str());
        return false;
    }

    externalEpoch = (unsigned long)local;
    externalMillis = millis();
    externalSet = true;
    lastSync = millis();
    updateRTC(local);
    persistTime(local);
    logger.info("Hora recibida de la aplicación: %s", getCurrentTimeString().c_str());
    return true;
}

unsigned long TimeManager::getLastSyncTime() {
    return lastSync;
}

bool TimeManager::hasRTC() {
    return rtcAvailable;
}