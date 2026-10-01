#ifndef TIME_MANAGER_H
#define TIME_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <RTClib.h>
#include <Preferences.h>

class TimeManager {
private:
    WiFiUDP ntpUDP;
    NTPClient* ntpClient;
    RTC_DS3231 rtc;
    bool rtcAvailable = false;
    unsigned long lastSync = 0;
    unsigned long syncInterval;
    int timezoneOffset;
    char ntpServer1[64];
    char ntpServer2[64];

    // Hora impuesta por la aplicación (punto de acceso aislado, sin NTP)
    bool externalSet = false;
    unsigned long externalEpoch = 0;
    unsigned long externalMillis = 0;

public:
    TimeManager();
    ~TimeManager();

    void init(const char* server1, const char* server2, unsigned long interval, int tzOffset);
    void loop();
    bool syncNow();
    String getCurrentTimeString();
    String getCurrentDateString();
    struct tm getCurrentTimeStruct();
    bool isTimeValid();
    unsigned long getLastSyncTime();
    bool hasRTC();

    // Hora enviada por la app: ISO local "YYYY-MM-DDTHH:MM:SS"
    bool setFromApp(const String& isoTimestamp);
    bool setFromEpoch(unsigned long epochSeconds);

private:
    void setupRTC();
    void applyTimezone(time_t& utc);
    void updateRTC(time_t utc);
    bool localNow(time_t& out);
    void restoreTimeFromNvs();
    void persistTime(time_t localEpoch);
};

#endif