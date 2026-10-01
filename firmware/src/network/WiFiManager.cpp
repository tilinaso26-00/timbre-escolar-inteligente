#include "WiFiManager.h"
#include "config.h"
#include "utils/Logger.h"

WiFiManager::WiFiManager() : fallbackAP(false) {
    strcpy(ssid, "");
    strcpy(password, "");
    strcpy(apSSID, AP_SSID);
    strcpy(apPassword, AP_PASSWORD);
}

void WiFiManager::init(const char* s, const char* pass, bool fallback, const char* apSsid, const char* apPass) {
    strncpy(ssid, s, sizeof(ssid) - 1);
    strncpy(password, pass, sizeof(password) - 1);
    fallbackAP = fallback;
    strncpy(apSSID, apSsid, sizeof(apSSID) - 1);
    strncpy(apPassword, apPass, sizeof(apPassword) - 1);

    WiFi.mode(WIFI_STA);
    WiFi.setHostname("timbre-escolar");
}

void WiFiManager::connect() {
    if (strlen(ssid) == 0) {
        logger.warn("SSID vacío, iniciando modo AP");
        enableAPMode(true);
        return;
    }

    logger.info("Conectando a WiFi: %s", ssid);
    WiFi.begin(ssid, password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
        delay(500);
    }

    if (WiFi.status() == WL_CONNECTED) {
        logger.info("WiFi conectado: %s (RSSI: %d)", WiFi.localIP().toString().c_str(), WiFi.RSSI());
        apMode = false;
    } else {
        logger.error("Fallo conexión WiFi");
        if (fallbackAP) {
            enableAPMode(true);
        }
    }
}

void WiFiManager::loop() {
    if (WiFi.status() != WL_CONNECTED && !apMode) {
        if (millis() - lastReconnectAttempt >= reconnectInterval) {
            lastReconnectAttempt = millis();
            logger.info("Reintentando conexión WiFi...");
            WiFi.reconnect();
        }
    }
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED && !apMode;
}

String WiFiManager::getIP() {
    return WiFi.localIP().toString();
}

String WiFiManager::getMAC() {
    return WiFi.macAddress();
}

int WiFiManager::getRSSI() {
    return WiFi.RSSI();
}

void WiFiManager::setCredentials(const char* s, const char* pass) {
    strncpy(ssid, s, sizeof(ssid) - 1);
    strncpy(password, pass, sizeof(password) - 1);
}

void WiFiManager::enableAPMode(bool enable) {
    if (enable && !apMode) {
        WiFi.mode(WIFI_AP_STA);
        WiFi.softAP(apSSID, apPassword);
        logger.info("Modo AP activado: %s (%s)", apSSID, WiFi.softAPIP().toString().c_str());
        apMode = true;
    } else if (!enable && apMode) {
        WiFi.mode(WIFI_STA);
        apMode = false;
    }
}