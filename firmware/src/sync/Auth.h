#ifndef AUTH_H
#define AUTH_H

#include <Arduino.h>
#include <WebServer.h>
#include <ArduinoJson.h>

class Auth {
public:
    static bool verifyToken(const String& token);
    static bool verifyAuthHeader(WebServer& server);
    static bool verifyWSAuth(JsonDocument& doc);
    static String getToken();
};

#endif