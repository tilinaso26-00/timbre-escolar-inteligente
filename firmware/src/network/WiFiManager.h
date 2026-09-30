#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>

class WiFiManager {
private:
    char ssid[64];
    char password[64];
    char apSSID[64];
    char apPassword[64];
    bool fallbackAP;
    bool apMode = false;
    unsigned long lastReconnectAttempt = 0;
    unsigned long reconnectInterval = 10000;

public:
    WiFiManager();
    void init(const char* ssid, const char* pass, bool fallback, const char* apSsid, const char* apPass);
    void connect();
    void loop();
    bool isConnected();
    String getIP();
    String getMAC();
    int getRSSI();
    void setCredentials(const char* ssid, const char* pass);
    void enableAPMode(bool enable);
};

#endif