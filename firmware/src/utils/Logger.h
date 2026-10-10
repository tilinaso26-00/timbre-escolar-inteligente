#ifndef LOGGER_H
#define LOGGER_H

#include <Arduino.h>

enum LogLevel { LOG_DEBUG, LOG_INFO, LOG_WARN, LOG_ERROR };

class Logger {
private:
    LogLevel minLevel = LOG_INFO;
    String lastBellTime = "";
    bool fileSink = false;

    void writeToFile(const char* timestamp, const char* prefix, const char* buffer);

public:
    Logger();
    void init();
    // Escribe WARN/ERROR en LittleFS (se llama tras montar el filesystem)
    void initFileSink();
    void setLevel(LogLevel level);
    void debug(const char* fmt, ...);
    void info(const char* fmt, ...);
    void warn(const char* fmt, ...);
    void error(const char* fmt, ...);
    void log(LogLevel level, const char* prefix, const char* fmt, va_list args);
    String getLastBellTime();
    void setLastBellTime(const String& time);
};

extern Logger logger;

#endif