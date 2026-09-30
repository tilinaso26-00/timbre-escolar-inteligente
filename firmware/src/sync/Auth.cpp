#include "Auth.h"
#include "config.h"

bool Auth::verifyToken(const String& token) {
    if (!AUTH_ENABLED) return true;
    return token == AUTH_TOKEN;
}

String Auth::getToken() {
    return AUTH_TOKEN;
}

bool Auth::verifyAuthHeader(WebServer& server) {
    if (!AUTH_ENABLED) return true;

    if (!server.hasHeader("Authorization")) {
        return false;
    }

    String authHeader = server.header("Authorization");
    if (!authHeader.startsWith("Bearer ")) {
        return false;
    }

    String token = authHeader.substring(7);
    return verifyToken(token);
}

bool Auth::verifyWSAuth(JsonDocument& doc) {
    if (!AUTH_ENABLED) return true;

    const char* token = doc["token"];
    if (!token) return false;

    return verifyToken(String(token));
}