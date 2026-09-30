#ifndef AUTH_H
#define AUTH_H

#include <Arduino.h>

class Auth {
public:
    static bool verifyToken(const String& token);
    static bool verifyAuthHeader(WebServer& server);
    static bool verifyWSAuth(JsonDocument& doc);
    static String getToken();
};

#endif