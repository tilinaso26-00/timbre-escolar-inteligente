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
|-------|----------|----------|
| La app no encuentra el timbre | Dispositivo → endpoint muestra `192.168.4.1` o `localhost` | Botón **Buscar timbre** (prueba mDNS → 192.168.4.1 → local); revisar que la PC esté en la misma red |
| WiFi del colegio caído | Tarjeta "WiFi del colegio: Sin señal" | El timbre **sigue sonando solo**; la red propia `TimbreEscolar-Setup` sigue activa (conecta la PC/celular a ella) |
| IP cambiada | Ping a IP anterior | Usar mDNS `TimbreEscolar.local` / Verificar DHCP lease |
| Firewall bloquea WS | `telnet <IP> 81` falla | Abrir puerto 81 (WebSocket) + 80 (REST) |
| ESP32 reiniciando | LED_OK parpadea cada 30s | Ver §3 (Watchdog / Alimentación) |
| LittleFS corrupto | Logs: "Mount failed" | `pio run -t erase_flash` + re-subir firmware (LittleFS se formatea solo al arrancar) |

### 2.2 "Error de sincronización"
| Error | Causa | Solución |
|-------|-------|----------|
| "Token inválido" | Token mismatch | Verificar `AUTH_TOKEN` en config.h y App |
| "Versión antigua" | Version <= actual | Forzar sync: `localStorage.clear()` + recargar |
| "JSON inválido" | Payload corrupto | Revisar `SyncPayload` en DevTools Network |
| "LittleFS full" | Espacio agotado | `POST /api/factory-reset` (borra LittleFS) o `pio run -t erase_flash` + re-subir firmware |
| Timeout WS | `connect_error` | Aumentar `WS_HEARTBEAT_INTERVAL` / Verificar latencia |

### 2.3 La red propia del timbre no levanta
| Verificación | Acción |
|--------------|--------|
| `WIFI_AP_ALWAYS_ON = true` en config.h | Compilar y subir (`pio run -t upload`) |
| La placa está encendida (LED OK) | Medir 5V en VIN |
| Otra red con el mismo nombre | Cambiar `AP_SSID` en config.h |
| 4 clientes ya conectados | Subir `WIFI_AP_MAX_CLIENTS` o desconectar uno |
| GPIO0 (BTN_RESET) no cortocircuitado | Verificar soldadura / botón |

### 2.4 La app no ve los timbres antiguos
| Verificación | Acción |
|--------------|--------|
| Aviso "Historial importado: N eventos nuevos" apareció al conectar | Ya está; revisa Historial |
| No apareció | Dispositivo → **Buscar timbre**; revisa en Network (DevTools) los frames `history:request` / `history:events` |
| El timbre lleva poco encendido | El ESP32 guarda solo los últimos 150 eventos (`HISTORY_MAX_EVENTS` en config.h) |
| Historial limpiado desde la app | La importación vuelve a copiar lo que siga en el ESP32 |

### 2.5 El celular no abre la app (`npm run serve`)
| Verificación | Acción |
|--------------|--------|
| `app/dist` no existe | Ejecutar `npm run build` en la raíz |
| Windows bloquea | Regla de firewall (PowerShell admin): `netsh advfirewall firewall add rule name="Timbre Escolar app" dir=in action=allow protocol=TCP localport=4173` |
| Celular en otra red/datos móviles | Conectar el celular a la MISMA WiFi que la PC |
| Puerto ocupado | `PORT=4174 npm run serve` |

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
| Zona horaria incorrecta | `TIMEZONE_OFFSET -6` (Guatemala) en config.h / Ajustes → Zona horaria |
| NTP no sincronizado | Verificar `pool.ntp.org` accesible / `time.google.com` |
| Hora no guardada | La hora vive en NVS: verificarla en Ajustes; re-sincronizar desde la app (`time:sync`) |
| Reloj derivado | Logs: "NTP sync" cada hora / Forzar `time:sync` desde la app |

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
| Subida falla (puerto COM) | Cerrar monitor serie / Reintentar con cable USB bueno / Botón EN del ESP32 |
| `CORE_DEBUG_LEVEL` warning | Normal (nivel 3 = info) |
| Partition table error | `board_build.partitions = default_4MB.csv` en platformio.ini |

### 7.2 OTA no funciona
| Verificación | Acción |
|--------------|--------|
| Comando correcto | `pio run -e esp32dev-ota -t upload` (el env por defecto sube por **USB serial**) |
| `upload_port` con la IP del ESP32 | IP correcta en platformio.ini |
| ESP32 en misma red | Ping a IP |
| Puerto 3232 UDP abierto | Firewall permitir |

---

## 8. Problemas de la App de Escritorio (Tauri)

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Doble click no abre nada | Falta runtime / instalación incompleta | Re-ejecutar el `.msi` (no requiere comandos) |
| No aparece la ventana | Se minimizó a la bandeja | Clic en el icono junto al reloj (o "Mostrar iconos ocultos" ▲) → clic izquierdo en la app |
| Cerré la ventana y "no apagó" | **Es correcto**: el botón X solo oculta | Para salir: clic derecho en el icono de bandeja → **Salir** |
| No arranca con Windows | Autostart desactivado | Configuración de Windows → Aplicaciones de inicio → activar "Timbre Escolar Inteligente" |
| "Desconectado" en el encabezado | No hay ESP32 ni mock | Correr `npm run mock` (desarrollo) o poner la IP del ESP32 en Ajustes → WebSocket |
| La PC duerme y no suena el timbre | Plan de energía suspende | `powercfg /change standby-timeout-ac 0` (ya aplicado en este equipo) |
| Ver logs | - | `%LOCALAPPDATA%\com.timbre-escolar.inteligente\logs\logs.log` (hora en UTC) |
| Muy lenta / historial gigante | IndexedDB sin poda | La poda (180 días / 5000 eventos) corre sola cada 6 h y al abrir |

---

## 9. Logs y Depuración

### 9.1 Monitor Serie (115200 baud)
```bash
pio device monitor
# Filtrar:
pio device monitor --filter log_level=debug
```

### 9.2 Logs Importantes
| Tag | Significado |
|-----|-------------|
| `[INFO]` | Operación normal (sync, bell, wifi) |
| `[WARN]` | Recuperable (reconnect, retry) |
| `[ERROR]` | Crítico (fallo HW, sync failed, crash) |
| `[DEBUG]` | Verbose (loop timing, I2C, WS frames) |

El propio ESP32 guarda además sus advertencias en **`/logs/timbre.log`** (LittleFS,
solo WARN/ERROR, rota a 32 KB). El historial de timbres está en `GET /api/history`
o la app lo baja sola por WS al conectar.

### 9.3 Logs de la App
- Instalada: `%LOCALAPPDATA%\com.timbre-escolar.inteligente\logs\logs.log`
- Desarrollo: pestaña Console del navegador (errores JS, frames WS)
- **Network → WS**: frames `sync:request`, `status`, `bell:executed`, `history:request`, `history:events`
- **Application → IndexedDB**: `TimbreEscolarDB` → journeys, templates, exceptions, events
- **Application → LocalStorage**: `auth-storage`, `timbre.wsUrl` (manual),
  `timbre.wsUrlAuto` (última URL que funcionó), `timbre.wsToken`, preferencias

---

## 10. FAQ (Preguntas Frecuentes)

### General
**P: ¿Funciona sin Internet?**
R: Sí. Horarios guardados en LittleFS (ESP32) e IndexedDB (App). La hora sale de NTP; si no hay red, se restaura desde la NVS del ESP32. Solo la sincronización y el NTP requieren red.

**P: ¿Funciona si se va la luz?**
R: Sí. El ESP32 guarda la hora en NVS y los horarios en LittleFS; al volver, sigue donde estaba. La PC debe quedar configurada para no dormir (ya aplicado).

**P: ¿Cuántos horarios/plantillas soporta?**
R: Limitado por LittleFS (~1MB) e IndexedDB (~50MB). Prácticamente: 100s de eventos, 50 plantillas, 365 excepciones/año.

**P: ¿Se puede usar en múltiples edificios?**
R: Un ESP32 por timbre físico. App puede gestionar múltiples dispositivos (futuro: multi-device en misma App).

### Hardware
**P: ¿Qué relé comprar?**
R: Módulo 1 canal 5V 10A con optoacoplador, active-low (ej. KY-019, SRD-05VDC-SL-C). NO conectar 110V directo a ESP32.

**P: ¿Es obligatorio el DS3231?**
R: No. Este montaje **no lo lleva**: la hora se guarda en la NVS del ESP32 y se refresca con NTP o desde la app. El firmware igual detecta un DS3231 si se conectara después (pines 21/22 libres).

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

## 11. Contacto y Recursos

| Recurso | Ubicación |
|---------|-----------|
| Arquitectura | `docs/architecture.md` |
| Esquemático | `hardware/schematic/README.md` |
| Cableado | `hardware/wiring/README.md` |
| Caja/3D | `hardware/enclosure/README.md` |
| Instalación | `docs/installation-guide.md` |
| Comandos (desarrollo) | `COMANDOS_TIMBRE_ESCOLAR.txt` |
| Licencia | MIT |

---

## 12. Changelog Resumido

| Versión | Fecha | Cambios Principales |
|---------|-------|---------------------|
| v1.0.1 | 2026-10 | ESP32 autónomo: red propia `TimbreEscolar-Setup` siempre encendida + unión al WiFi del colegio (`WIFI_AP_STA`), historial propio guardado en LittleFS (`HistoryLog`, 150 eventos, `/api/history` + WS `history:request`), app con descubrimiento automático (mDNS → 192.168.4.1 → local) e importación de historial con dedup, control desde el celular (`npm run serve`), logs WARN/ERROR en `/logs/timbre.log`, docs de requisitos completos (Python, Git, Rust, Build Tools) |
| v1.0.0 | 2026-09 | App de escritorio Tauri (bandeja, arranque con Windows, ventana única, logs, poda del historial), Dashboard, Editor Horarios, Calendario, Plantillas, Historial, Dispositivo, Config, Demo Mode, Sync WS/REST, Auth, PWA, mock ESP32 (`npm run mock`), firmware con hora en NVS, subida serial por defecto + OTA opcional |

---

*Última actualización: 2026-10-09 | Versión documento: 1.2*