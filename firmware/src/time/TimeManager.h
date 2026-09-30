#ifndef TIME_MANAGER_H
#define TIME_MANAGER_H

#include <Arduino.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <RTClib.h>

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

private:
    void setupRTC();
    void applyTimezone(time_t& utc);
    void updateRTC(time_t utc);
};

#endif