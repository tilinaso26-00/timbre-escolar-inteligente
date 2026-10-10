#include "Logger.h"
#include "config.h"
#include <LittleFS.h>

Logger logger;

Logger::Logger() {}

void Logger::init() {
    Serial.begin(115200);
}

void Logger::initFileSink() {
    if (!LittleFS.begin(false)) {
        Serial.println("[ERROR] LittleFS no montado: logs de archivo desactivados");
        return;
    }
    if (!LittleFS.exists("/logs")) {
        LittleFS.mkdir("/logs");
    }
    fileSink = true;
    info("Logs de archivo activos en %s", LOG_FILE);
}

void Logger::writeToFile(const char* timestamp, const char* prefix, const char* buffer) {
    if (!fileSink) return;

    File f = LittleFS.open(LOG_FILE, "a");
    if (!f) return;

    if (f.size() >= LOG_FILE_MAX_BYTES) {
        f.close();
        LittleFS.remove(LOG_FILE);   // rotación simple: se empieza de nuevo
        f = LittleFS.open(LOG_FILE, "a");
        if (!f) return;
    }

    f.printf("[%s] %s %s\n", timestamp, prefix, buffer);
    f.close();
}

void Logger::setLevel(LogLevel level) {
    minLevel = level;
}

void Logger::log(LogLevel level, const char* prefix, const char* fmt, va_list args) {
    if (level < minLevel) return;

    char buffer[256];
    vsnprintf(buffer, sizeof(buffer), fmt, args);

    char timestamp[16];
    unsigned long ms = millis();
    unsigned long secs = ms / 1000;
    unsigned long mins = secs / 60;
    unsigned long hours = mins / 60;
    snprintf(timestamp, sizeof(timestamp), "%02lu:%02lu:%02lu",
             hours % 24, mins % 60, secs % 60);

    Serial.printf("[%s] %s %s\n", timestamp, prefix, buffer);

    if (level >= LOG_WARN) {
        writeToFile(timestamp, prefix, buffer);
    }
}

void Logger::debug(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    log(LOG_DEBUG, "[DEBUG]", fmt, args);
    va_end(args);
}

void Logger::info(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    log(LOG_INFO, "[INFO]", fmt, args);
    va_end(args);
}

void Logger::warn(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    log(LOG_WARN, "[WARN]", fmt, args);
    va_end(args);
}

void Logger::error(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    log(LOG_ERROR, "[ERROR]", fmt, args);
    va_end(args);
}

String Logger::getLastBellTime() {
    return lastBellTime;
}

void Logger::setLastBellTime(const String& time) {
    lastBellTime = time;
}