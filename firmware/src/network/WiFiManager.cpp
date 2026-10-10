#include "WiFiManager.h"
#include "config.h"
#include "utils/Logger.h"

WiFiManager::WiFiManager() {
    strcpy(ssid, "");
    strcpy(password, "");
    strcpy(apSSID, AP_SSID);
    strcpy(apPassword, AP_PASSWORD);
}

void WiFiManager::init(const char* s, const char* pass, bool staOn, bool apOn,
                       const char* apSsid, const char* apPass, int maxClients) {
    strncpy(ssid, s, sizeof(ssid) - 1);
    strncpy(password, pass, sizeof(password) - 1);
    staEnabled = staOn;
    apAlways = apOn;
    strncpy(apSSID, apSsid, sizeof(apSSID) - 1);
    strncpy(apPassword, apPass, sizeof(apPassword) - 1);
    if (maxClients < 1) maxClients = 1;

    // Red propia SIEMPRE encendida + unión al colegio si está habilitada.
    if (staEnabled && apAlways) {
        WiFi.mode(WIFI_AP_STA);
    } else if (apAlways) {
        WiFi.mode(WIFI_AP);
    } else {
        WiFi.mode(WIFI_STA);
    }

    if (apAlways) {
        WiFi.softAP(apSSID, apPassword, 1 /*canal*/, 0 /*oculto*/, maxClients);
        WiFi.softAPsetHostname("timbre-escolar");
        apActive = true;
        logger.info("Red propia encendida: %s (IP %s)",
                    apSSID, WiFi.softAPIP().toString().c_str());
    }

    WiFi.setHostname("timbre-escolar");
    WiFi.setAutoReconnect(true);
}

void WiFiManager::connect() {
    if (!staEnabled) {
        logger.info("Unión a red del colegio deshabilitada (solo AP)");
        return;
    }

    if (strlen(ssid) == 0) {
        logger.warn("SSID vacío: el ESP32 solo quedará en su red propia %s", apSSID);
        return;
    }

    logger.info("Conectando a WiFi: %s", ssid);
    staAttempted = true;
    WiFi.begin(ssid, password);
    lastReconnectAttempt = millis();
    reconnectInterval = 5000;
}

void WiFiManager::loop() {
    if (!staEnabled || !staAttempted) return;

    wl_status_t status = WiFi.status();
    if (status == WL_CONNECTED) {
        reconnectInterval = 5000;
        return;
    }
    // No interrumpir un intento de unión en curso (estado idle = begin hecho)
    if (status == WL_IDLE_STATUS) return;

    // Reintento con backoff (nunca bloquea el loop principal)
    if (millis() - lastReconnectAttempt >= reconnectInterval) {
        lastReconnectAttempt = millis();
        logger.info("Reintentando conexión WiFi a %s...", ssid);
        WiFi.reconnect();
        reconnectInterval = reconnectInterval * 2 < 30000 ? reconnectInterval * 2 : 30000;
    }
}

bool WiFiManager::isConnected() {
    return staEnabled && WiFi.status() == WL_CONNECTED;
}

bool WiFiManager::isApActive() {
    return apActive;
}

String WiFiManager::getIP() {
    if (isConnected()) return WiFi.localIP().toString();
    if (apActive) return WiFi.softAPIP().toString();
    return "0.0.0.0";
}

String WiFiManager::getApIP() {
    if (!apActive) return "";
    return WiFi.softAPIP().toString();
}

String WiFiManager::getApSSID() {
    if (!apActive) return "";
    return String(apSSID);
}

String WiFiManager::getMode() {
    if (apActive && isConnected()) return "AP+STA";
    if (apActive) return "AP";
    if (isConnected()) return "STA";
    return "OFF";
}

String WiFiManager::getMAC() {
    return WiFi.macAddress();
}

int WiFiManager::getRSSI() {
    if (!isConnected()) return 0;
    return WiFi.RSSI();
}

void WiFiManager::setCredentials(const char* s, const char* pass) {
    strncpy(ssid, s, sizeof(ssid) - 1);
    strncpy(password, pass, sizeof(password) - 1);
}

void WiFiManager::enableAPMode(bool enable) {
    if (enable == apActive) return;
    if (enable) {
        WiFi.mode(WIFI_AP_STA);
        WiFi.softAP(apSSID, apPassword);
        apActive = true;
        logger.info("Modo AP activado: %s (%s)", apSSID, WiFi.softAPIP().toString().c_str());
    } else {
        WiFi.mode(WIFI_STA);
        apActive = false;
    }
}
