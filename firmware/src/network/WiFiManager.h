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

    bool staEnabled = true;
    bool apAlways = false;
    bool apActive = false;
    bool staAttempted = false;

    unsigned long lastReconnectAttempt = 0;
    unsigned long reconnectInterval = 5000;   // backoff: 5s -> 30s

public:
    WiFiManager();
    void init(const char* s, const char* pass, bool staOn, bool apOn,
              const char* apSsid, const char* apPass, int maxClients);
    void connect();
    void loop();

    bool isConnected();       // unido a la red del colegio (STA)
    bool isApActive();        // su propia red encendida
    String getIP();           // IP del colegio, o del AP si no hay STA
    String getApIP();
    String getApSSID();
    String getMode();         // "AP+STA" | "AP" | "STA"
    String getMAC();
    int getRSSI();

    void setCredentials(const char* s, const char* pass);
    void enableAPMode(bool enable);
};

#endif
