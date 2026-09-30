# Troubleshooting y FAQ - Timbre Escolar Inteligente

## 1. Diagnóstico Rápido (LEDs)

| LED OK (Verde) | LED ERROR (Rojo) | Significado | Acción |
|----------------|------------------|-------------|--------|
| ● Fijo | ○ Apagado | **Normal**: Conectado, sincronizado | Ninguna |
| ● Parpadeo lento | ○ Apagado | Conectando WiFi / NTP | Esperar 30s |
| ○ Apagado | ● Parpadeo rápido | **Error crítico**: Sin WiFi / Fallo HW | Ver §2 |
| ● Fijo | ● Fijo | Modo AP (Configuración) | Conectar a "TimbreEscolar-Setup" |
| ○ Apagado | ○ Apagado | Sin alimentación / ESP32 dormido | Ver §3 |
| ● Parpadeo rápido | ● Parpadeo rápido | Modo Demo activo | Normal si demo running |

---

## 2. Problemas de Conectividad

### 2.1 "ESP32 Desconectado" en Dashboard
| Causa | Verificación | Solución |
|-------|--------------|----------|
| WiFi caído | LED_ERROR parpadea | Reiniciar router / Verificar credenciales en config.h |
| IP cambiada | Ping a IP anterior | Usar mDNS `timbre-escolar.local` / Verificar DHCP lease |
| Firewall bloquea WS | `telnet <IP> 81` falla | Abrir puerto 81 (WebSocket) + 80 (REST) |
| ESP32 reiniciando | LED_OK parpadea cada 30s | Ver §3 (Watchdog / Alimentación) |
| LittleFS corrupto | Logs: "Mount failed" | `pio run -t erase_flash` + `pio run -t uploadfs` |

### 2.2 "Error de sincronización"
| Error | Causa | Solución |
|-------|-------|----------|
| "Token inválido" | Token mismatch | Verificar `AUTH_TOKEN` en config.h y App |
| "Versión antigua" | Version <= actual | Forzar sync: `localStorage.clear()` + recargar |
| "JSON inválido" | Payload corrupto | Revisar `SyncPayload` en DevTools Network |
| "LittleFS full" | Espacio agotado | `pio run -t erase_flash` + `uploadfs` |
| Timeout WS | `connect_error` | Aumentar `WS_HEARTBEAT_INTERVAL` / Verificar latencia |

### 2.3 Modo AP no levanta
| Verificación | Acción |
|--------------|--------|
| `WIFI_FALLBACK_AP = true` en config.h | Compilar y subir |
| GPIO0 (BTN_RESET) no cortocircuitado | Verificar soldadura / botón |
| Alimentación estable 5V | Medir buck OUT = 5.0V |

---

## 3. Problemas de Alimentación / Reinicios

### 3.1 ESP32 se reinicia aleatoriamente (Watchdog)
| Causa | Diagnóstico | Solución |
|-------|-------------|----------|
| Buck converter inestable | Medir 5V con osciloscopio | Cambiar buck / Añadir 470µF + 100nF en OUT |
| Relé provoca caída 5V | Medir 5V al activar relé | Diode flyback en relé / Buck mayor corriente |
| Brownout detector | Log: "Brownout detector triggered" | `CONFIG_ESP32_BROWNOUT_DET=0` en sdkconfig / Mejorar fuente |
| Loop bloqueado >5s | Log: "Loop watchdog" | Optimizar código / `yield()` en loops largos |
| Stack overflow | Log: "Stack overflow" | Aumentar `CONFIG_ESP32_STACK_SIZE` / Reducir recursion |

### 3.2 No enciende / Sin LEDs
| Verificación | Acción |
|--------------|--------|
| 220V en entrada AC | Multímetro en bornes AC |
| Fusible 2A intacto | Continuidad / Reemplazar |
| Buck OUT = 5V | Multímetro en buck OUT+/OUT- |
| ESP32 VIN = 5V | Multímetro en pin VIN |
| ESP32 3V3 = 3.3V | Multímetro en pin 3V3 |
| Cortocircuito GND-VCC | Continuidad (sin alimentar) |

---

## 4. Problemas de Timbre

### 4.1 Timbre no suena (Automático)
| Causa | Verificación | Solución |
|-------|--------------|----------|
| Relé no clickea | GPIO23 HIGH/LOW? | `digitalRead(23)` en monitor / `bell:test` via WS |
| Relé click pero sin sonido | Bornes Timbre: L→COM, Carga→NO | Revisar cableado timbre / Probar directo 220V |
| Timbre suena pero débil | Relé NO/NC invertido | Usar NO (Normalmente Abierto) |
| Safety timeout | Log: "Relé safety timeout" | Aumentar `RELAY_SAFETY_MAX_MS` / Verificar carga |
| Horario no coincide | Dashboard "Próximo timbre" | Verificar zona horaria / NTP sync |

### 4.2 Timbre suena a destiempo
| Causa | Solución |
|-------|----------|
| Zona horaria incorrecta | `TIMEZONE_OFFSET -6` (Guatemala) / Config Web → Zona horaria |
| NTP no sincronizado | Verificar `pool.ntp.org` accesible / `time.google.com` / DS3231 OK |
| DS3231 sin batería | Cambiar CR2032 / Verificar 3V en pines BAT |
| Reloj derivado | Logs: "NTP sync" cada hora / Forzar `time:sync` via WS |

### 4.3 Timbre manual no funciona
| Verificación | Acción |
|--------------|--------|
| WS conectado (LED_OK verde) | Reconectar WS / Verificar token |
| Botón "HACER SONAR" → Confirmar → Error | Ver DevTools Network: `bell:manual` payload + response |
| `bell:test` funciona pero `bell:manual` no | Verificar permisos usuario (rol admin) |
| Duration > 60s | Max 60s en firmware / App |

---

## 5. Problemas de Horarios / Calendario

### 5.1 "Próximo timbre" incorrecto
| Causa | Solución |
|-------|----------|
| Jornada incorrecta | Selector Matutina/Vespertina en Dashboard |
| Días activos mal configurados | Editor Horarios → Cada evento → Días activos (L-V) |
| Excepción no aplicada | Calendario → Verificar fecha + jornada + tipo |
| Prioridad mal resuelta | Ver `priority-resolver.ts` orden: Excepción > Fecha > Plantilla día > Jornada > Default |

### 5.2 Ajuste de períodos no recalcula
| Verificación | Acción |
|--------------|--------|
| Eventos marcados "Fijo" (🛡) | "Fijo" no se recalcula - desmarcar si debe ajustar |
| Solo "Cambio período" y "Actividad" se ajustan | Entrada, Salida, Recreos NO se recalculan |
| `defaultPeriodMinutes` actualizado | Ver en Editor → Jornada → Período base |

### 5.3 Excepción no aplica en fecha
| Verificación | Acción |
|--------------|--------|
| Fecha formato YYYY-MM-DD | `2024-09-20` no `20/09/2024` |
| Jornada correcta (Matutina/Vespertina) | Mismo selector que horario base |
| Tipo excepción: "no_classes" / "schedule" / "custom" | "schedule" requiere plantilla existente |
| Prioridad: Excepción fecha > Plantilla fecha > Plantilla día > Jornada | Correcto por diseño |

---

## 6. Problemas de Interfaz Web

### 6.1 PWA no instala / Offline no funciona
| Verificación | Solución |
|--------------|----------|
| HTTPS obligatorio (excepto localhost) | Usar `https://` o `http://localhost` / `http://<IP>` |
| `manifest.webmanifest` accesible | `curl -I https://<IP>/manifest.webmanifest` |
| Service Worker registrado | DevTools → Application → Service Workers |
| `vite-plugin-pwa` configurado | `vite.config.ts` → `VitePWA` |

### 6.2 Drag & Drop no funciona (Editor Horarios)
| Causa | Solución |
|-------|----------|
| @hello-pangea/dnd no instalado | `npm install @hello-pangea/dnd` |
| Touch device sin polyfill | `npm install @hello-pangea/dnd` (soporta touch nativo) |
| Navegador antiguo | Chrome 90+ / Firefox 88+ / Safari 15+ |

### 6.3 Calendario no muestra excepciones
| Verificación | Acción |
|--------------|--------|
| Jornada seleccionada correcta | Selector Matutina/Vespertina arriba |
| Excepción guardada en BD | `localStorage` → `exceptions` / DevTools Application |
| `resolveScheduleForDate` devuelve excepción | Consola: `useSchedule().getResolvedScheduleForDate('2024-09-20', 'matutina')` |

---

## 7. Problemas Firmware / Compilación

### 7.1 Errores PlatformIO
| Error | Solución |
|-------|----------|
| `platformio.ini` not found | `cd firmware` antes de `pio` |
| `esp32dev` not found | `pio platform install espressif32` |
| `AsyncTCP` / `ESPAsyncWebServer` missing | `pio lib install "me-no-dev/ESPAsyncWebServer@^3.4.1"` |
| `LittleFS` upload failed | `pio run -t erase_flash` → `pio run -t uploadfs` |
| `CORE_DEBUG_LEVEL` warning | Normal (nivel 3 = info) |
| Partition table error | `board_build.partitions = default_4MB.csv` en platformio.ini |

### 7.2 OTA no funciona
| Verificación | Acción |
|--------------|--------|
| `upload_protocol = espota` en platformio.ini | IP correcta en `upload_port` |
| ESP32 en misma red | Ping a IP |
| Puerto 3232 UDP abierto | Firewall permitir |
| `ARDUINO_OTA_ENABLED=1` | `pio run -e esp32dev-ota -t upload` |

---

## 8. Logs y Depuración

### 8.1 Monitor Serie (115200 baud)
```bash
pio device monitor
# Filtrar:
pio device monitor --filter log_level=debug
```

### 8.2 Logs Importantes
| Tag | Significado |
|-----|-------------|
| `[INFO]` | Operación normal (sync, bell, wifi) |
| `[WARN]` | Recuperable (reconnect, retry) |
| `[ERROR]` | Crítico (fallo HW, sync failed, crash) |
| `[DEBUG]` | Verbose (loop timing, I2C, WS frames) |

### 8.2 Logs Web (DevTools)
- **Console**: Errores JS, WS messages
- **Network → WS**: Frames `sync:request`, `status`, `bell:executed`
- **Application → IndexedDB**: `TimbreEscolarDB` → journeys, templates, exceptions, events
- **Application → LocalStorage**: `auth-storage`, preferencias

---

## 9. FAQ (Preguntas Frecuentes)

### General
**P: ¿Funciona sin Internet?**
R: Sí. Horarios guardados en LittleFS (ESP32) e IndexedDB (App). NTP/RTC para hora. Solo sincronización y acceso remoto requieren red.

**P: ¿Cuántos horarios/plantillas soporta?**
R: Limitado por LittleFS (~1MB) e IndexedDB (~50MB). Prácticamente: 100s de eventos, 50 plantillas, 365 excepciones/año.

**P: ¿Se puede usar en múltiples edificios?**
R: Un ESP32 por timbre físico. App puede gestionar múltiples dispositivos (futuro: multi-device en misma App).

### Hardware
**P: ¿Qué relé comprar?**
R: Módulo 1 canal 5V 10A con optoacoplador, active-low (ej. KY-019, SRD-05VDC-SL-C). NO conectar 220V directo a ESP32.

**P: ¿DS3231 obligatorio?**
R: No, pero recomendado. Sin RTC, si falla WiFi+NTP, hora deriva. Con RTC: autonomía años (batería CR2032).

**P: ¿Caja IP65 obligatoria?**
R: Recomendada para exterior/humedad. Interior seco: caja IP20 suficiente.

### Software
**P: ¿Cómo cambiar usuario/contraseña?**
R: Configuración → Seguridad → Cambiar contraseña. O editar `useAuth.ts` → `DEMO_USER` para hardcode.

**P: ¿Cómo agregar jornada nocturna?**
R: Editar `types.ts` → `JourneyType` + `JOURNEY_LABELS` + lógica en `useSchedule` + UI.

**P: ¿Backup automático?**
R: No implementado aún. Manual: Config → Respaldos → Exportar JSON. Futuro: auto-sync a GitHub/Drive.

**P: ¿Idiomas?**
R: Solo Español. i18n preparado: Config → General → Idioma (preparado para ES/EN).

---

## 10. Contacto y Recursos

| Recurso | Ubicación |
|---------|-----------|
| Arquitectura | `docs/architecture.md` |
| Esquemático | `hardware/schematic/README.md` |
| Cableado | `hardware/wiring/README.md` |
| Caja/3D | `hardware/enclosure/README.md` |
| Instalación | `docs/installation-guide.md` |
| Código fuente | GitHub repo |
| Issues/Bugs | GitHub Issues |
| Licencia | MIT (ver LICENSE) |

---

## 11. Changelog Resumido

| Versión | Fecha | Cambios Principales |
|---------|-------|---------------------|
| v1.0.0 | 2024-09 | Release inicial: Dashboard, Editor Horarios, Calendario, Plantillas, Historial, Dispositivo, Config, Demo Mode, Sync WS/REST, Auth, PWA, Firmware ESP32 completo |

---

*Última actualización: 2024-09-20 | Versión documento: 1.0*