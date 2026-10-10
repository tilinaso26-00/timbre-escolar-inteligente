# Timbre Escolar Inteligente - Documentación de Arquitectura

## 1. Visión General

Sistema completo de automatización de timbres escolares compuesto por:
- **Aplicación de escritorio (Admin)**: Tauri 2 (Rust) + React + TypeScript + Vite + Tailwind CSS + PWA
- **Controlador Físico (ESP32)**: Firmware C++ con PlatformIO
- **Comunicación**: WebSocket (tiempo real) + REST API (configuración)
- **Almacenamiento**: IndexedDB (App, podada a 180 días / 5000 eventos) + LittleFS (ESP32)
- **24/7**: la app arranca con Windows, se minimiza a la bandeja y nunca duerme la PC

---

## 2. Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│              APLICACIÓN DE ESCRITORIO (TAURI + REACT)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Dashboard  │  │  Horarios   │  │ Calendario  │  │ Plantillas│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│         │               │               │               │          │
│         └───────────────┼───────────────┼───────────────┘          │
│                         ▼                                           │
│              ┌─────────────────────┐                               │
│              │   useSchedule Hook  │                               │
│              │  (Estado + Sync)    │                               │
│              └─────────────────────┘                               │
│                         │                                           │
│              ┌──────────┴──────────┐                               │
│              ▼                     ▼                               │
│    ┌─────────────────┐    ┌─────────────────┐                     │
│    │   WebSocket     │    │   IndexedDB     │                     │
│    │   (Tiempo Real) │    │   (Persistencia)│                     │
│    └─────────────────┘    └─────────────────┘                     │
└──────────────────────────┼────────────────────────────────────────┘
                           │ WebSocket / REST
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CONTROLADOR ESP32                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Scheduler  │  │  Schedule   │  │  TimeMgr    │  │  WiFi     │ │
│  │  (Minuto)   │◄─┤  Store      │  │  (NTP+NVS)   │  │  Manager  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│        │                │                │                │        │
│        ▼                ▼                ▼                ▼        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              LittleFS (Horarios + Plantillas + Excepciones)  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│        │                                                        │
│        ▼                                                        │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  Relay Control  │  │  Watchdog       │                       │
│  │  (Timbre Físico)│  │  (HW + SW)      │                       │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Módulos Principales

### 3.1 Aplicación de escritorio (App)

| Módulo | Tecnología | Responsabilidad |
|--------|------------|-----------------|
| **Shell (Tauri)** | Rust (tauri 2) | Ventana única, cerrar = ocultar, bandeja (tray) con Salir, arranque con Windows, guardado de tamaño/posición, logs en disco |
| **Core/Schedule-Engine** | TypeScript (puro) | Lógica de horarios, cálculo de períodos, validación, prioridades |
| **Core/Storage** | IndexedDB (Dexie) | Persistencia local: jornadas, plantillas, excepciones, eventos, config (con poda automática de historial) |
| **Core/History-Import** | TypeScript (puro) | Importa el historial guardado en el ESP32 con clave estable `deviceId|timestamp|evento|origen` (nunca duplica) |
| **Shared/UseWebSocket** | TypeScript | Puente WS: descubrimiento (`TimbreEscolar.local` → `192.168.4.1` → `localhost:81`), reintento con backoff, hora, importación de historial |
| **Features/Dashboard** | React + Tailwind | Vista principal: estado, próximo timbre, cuenta regresiva, timbre manual |
| **Features/Schedules** | React + @hello-pangea/dnd | Editor visual drag-drop, ajustes ±5/10/15min, vista previa |
| **Features/Calendar** | React + react-day-picker | Vista mensual, excepciones por fecha, prioridades |
| **Features/Templates** | React | CRUD plantillas, crear desde jornada, exportar/importar |
| **Features/History** | React | Tabla filtrada, exportar CSV/JSON, limpiar |
| **Features/Device** | React | Diagnóstico, prueba timbre, config hardware |
| **Features/Settings** | React | Usuario, red, respaldos, zona horaria, demo mode, seguridad |

### 3.2 Firmware ESP32 (Firmware)

| Módulo | Archivos | Responsabilidad |
|--------|----------|-----------------|
| **TimeManager** | `time/TimeManager.h/cpp` | NTP + hora persistida en NVS (sobrevive apagones), zona horaria Guatemala (UTC-6). Soporte opcional DS3231 si se conecta |
| **ScheduleStore** | `schedule/ScheduleStore.h/cpp` | LittleFS: horarios, plantillas, excepciones en memoria |
| **HistoryLog** | `schedule/HistoryLog.h/cpp` | Historial propio del ESP32 (`/history.json`, últimos 150 eventos), escritura atómica (tmp+rename) |
| **Scheduler** | `schedule/Scheduler.h/cpp` | Ejecución minuto a minuto, evalúa excepciones con prioridades; `notifyBellExecuted` registra en HistoryLog |
| **WiFiManager** | `network/WiFiManager.h/cpp` | `WIFI_AP_STA`: red propia SIEMPRE + unión al colegio sin bloquear, reintento con backoff 5→30 s |
| **WebServer** | `network/WebServer.h/cpp` | REST API: /api/status, /api/schedule, /api/bell/*, /api/history |
| **WebSocketServer** | `network/WebSocketServer.h/cpp` | Tiempo real: sync, bell:*, time:sync, history:request, heartbeat |
| **Logger** | `utils/Logger.h/cpp` | Serial + archivo en LittleFS (`/logs/timbre.log`, solo WARN/ERROR, rota a 32 KB) |
| **SyncProtocol** | `sync/SyncProtocol.h/cpp` | Parseo atómico, versionado, hash, validación |
| **StateManager** | `sync/StateManager.h/cpp` | Metadatos sync, versionado, config dispositivo |
| **RelayControl** | `hardware/RelayControl.h/cpp` | Control relé con safety timeout, active low/high |
| **Watchdog** | `hardware/Watchdog.h/cpp` | HW watchdog (30s) + SW loop watchdog (5s) |
| **Auth** | `sync/Auth.h/cpp` | Token Bearer simple para WS y REST |

---

## 4. Modelo de Datos

### 4.1 Entidades Principales

```typescript
// Jornada (Matutina/Vespertina)
JourneySchedule {
  journey: 'matutina' | 'vespertina';
  name: string;
  entryTime: TimeOnly;        // Hora entrada
  exitTime: TimeOnly;         // Hora salida
  defaultPeriodMinutes: number;
  defaultBellSeconds: number;
  activeDays: DayOfWeek[];    // 0=Dom..6=Sáb
  events: ScheduleEvent[];
  updatedAt: string;
}

// Evento de timbre
ScheduleEvent {
  id: string;
  name: string;
  startTime: TimeOnly;
  durationMinutes: number;
  bellTime: TimeOnly;         // Cuándo suena
  bellDurationSeconds: number;
  type: EventType;            // entrada, salida, cambio_periodo, recreo_inicio, recreo_fin, actividad_especial
  journey: 'matutina' | 'vespertina';
  activeDays: DayOfWeek[];
  isFixed: boolean;           // No recalcula con ajustes de período
  periodIndex?: number;
}

// Plantilla reutilizable
ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  journey: 'matutina' | 'vespertina';
  events: Omit<ScheduleEvent, 'id'|'createdAt'|'updatedAt'>[];
  createdAt: string;
  updatedAt: string;
}

// Excepción de calendario
CalendarException {
  id: string;
  date: string;               // YYYY-MM-DD
  journey: 'matutina' | 'vespertina';
  type: 'schedule' | 'no_classes' | 'custom';
  scheduleId?: string;        // Referencia a plantilla
  customEvents?: ScheduleEvent[];
  name: string;
  description?: string;
  createdAt: string;
}

// Log de evento ejecutado
BellEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  eventType: EventType;
  journey: 'matutina' | 'vespertina';
  triggeredBy: 'automatic' | 'manual' | 'demo' | 'test';
  executed: boolean;
  actualBellTime?: string;
  durationSeconds: number;
  deviceId: string;
  firmwareVersion: string;
}
```

### 4.2 Reglas de Prioridad (Implementadas en App + ESP32)

```
1. Excepción específica de fecha (no_classes / custom / schedule)
2. Horario asignado a fecha específica (via plantilla)
3. Plantilla asignada al día de semana
4. Horario base de la jornada
5. Configuración por defecto
```

---

## 5. Protocolo de Comunicación

### 5.1 WebSocket (Puerto 81)

**App → ESP32:**
```json
{ "event": "sync:request", "data": { ...SyncPayload }, "token": "timbre-escolar-2024" }
{ "event": "bell:manual", "data": { "durationSec": 3 }, "token": "..." }
{ "event": "bell:test", "data": { "durationSec": 3 }, "token": "..." }
{ "event": "config:update", "data": { ... }, "token": "..." }
{ "event": "time:sync", "data": { "timestamp": "2026-10-08T07:30:00" }, "token": "..." }
{ "event": "history:request", "data": { "offset": 0, "limit": 25 }, "token": "..." }
```

**ESP32 → App:**
```json
{ "event": "status", "data": { "connected": true, "wifi": true, "deviceTime": "12:34:56", "nextEvent": "...", "lastBell": "09:15", "scheduledCount": 12, "relayState": false, "mode": "AP+STA", "apSSID": "TimbreEscolar-Setup", "apIP": "192.168.4.1", "ip": "192.168.1.50", "rssi": -45, "historyCount": 37, "uptime": 123456, "freeHeap": 143000 } }
{ "event": "sync:complete", "data": { "version": 1234567890, "hash": "A1B2C3D4" } }
{ "event": "sync:error", "data": "Error message" }
{ "event": "time:sync", "data": { "applied": true, "deviceTime": "...", "date": "...", "valid": true } }
{ "event": "history:events", "data": { "offset": 0, "total": 37, "items": [ { "timestamp": "2026-10-08T07:00:00", "eventName": "Entrada", "type": "entrada", "journey": "matutina", "origin": "automatic", "durationSec": 3, "executed": true, "deviceId": "TimbreEscolar", "firmwareVersion": "1.1.0" } ], "done": false } }
{ "event": "bell:executed", "data": { "eventName": "Recreo", "timestamp": "2026-10-08T09:30:00", "triggeredBy": "automatic" } }
{ "event": "error", "code": "SYNC_FAILED", "message": "..." }
```

> El historial se transmite en **bloques de 25** (`history:request` → `history:events`);
> la app repite hasta `done: true` y luego importa todo con dedup local.
> Los eventos `demo:*` son **internos de la app y del simulador** (`npm run mock`);
> el firmware real no los conoce.

### 5.2 REST API (Puerto 80)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/status` | Estado dispositivo, modo red, IP, RSSI, uptime, heap, historial |
| GET | `/api/schedule` | Horarios + plantillas + excepciones + metadatos sync |
| POST | `/api/schedule` | Sync completo (SyncPayload) |
| GET | `/api/config` | Config dispositivo |
| POST | `/api/config` | Actualizar config |
| POST | `/api/bell/manual` | `{ "durationSec": 3 }` (queda registrado en el historial) |
| POST | `/api/bell/test` | `{ "durationSec": 3 }` |
| GET | `/api/history` | Historial guardado en LittleFS (más reciente primero) |
| GET | `/api/logs` | Alias de `/api/history` |
| POST | `/api/reboot` | Reiniciar ESP32 |
| POST | `/api/factory-reset` | Formatear LittleFS + reiniciar |

**Autenticación:** Header `Authorization: Bearer timbre-escolar-2024`

---

## 6. Sync Payload (App → ESP32)

```typescript
interface SyncPayload {
  version: number;           // timestamp ms
  hash: string;              // hash del contenido
  timestamp: string;         // ISO string
  deviceId: string;
  journeys: JourneySchedule[];
  templates: ScheduleTemplate[];
  exceptions: CalendarException[];
  deviceConfig: Partial<DeviceConfig>;
}
```

**Flujo:**
1. App envía `sync:request` con payload completo
2. ESP32 valida versión/hash, guarda atómicamente en LittleFS
3. ESP32 responde `sync:complete` con version/hash
4. App muestra toast "Sincronizado correctamente"
5. Si error: `sync:error` + reintento automático

---

## 7. Seguridad Eléctrica

### 7.1 Esquema de Conexión Relé

```
ESP32 (3.3V)          MÓDULO RELÉ (5V)           TIMBRE (120/220V)
┌─────────┐           ┌─────────────┐            ┌──────────┐
│ GPIO 23 │──────────►│ IN (Opto)   │            │          │
│ GND     │──────────►│ GND         │            │          │
│ 3.3V    │──────────►│ VCC (5V)    │            │          │
└─────────┘           │ COM         │────────────►│ L (Line) │
                      │ NO          │────────────►│ Timbre   │
                      └─────────────┘            │ N (Neut) │
                                                 └──────────┘
```

**Protecciones implementadas:**
- Relé con optoacoplador (aislamiento galvánico)
- Relé active-low (seguridad por defecto)
- Safety timeout máximo 60s (configurable)
- Watchdog HW 30s + SW 5s
- Fuente 5V 2A dedicada para relé + ESP32

---

## 8. Despliegue

### 8.1 Aplicación de escritorio (usuario final)
```bash
# Doble click en el instalador generado:
#   app/src-tauri/target/release/bundle/msi/Timbre Escolar Inteligente_1.0.1_x64_es-ES.msi
# o bundle/nsis/..._x64-setup.exe
# Sin comandos: instala acceso en Menú Inicio + arranque con Windows + logs.
```

### 8.2 Aplicación (desarrollo)
```bash
cd app
npm install
npm run dev          # web en http://localhost:3000
npm run tauri:dev    # ventana de escritorio
npm run tauri:build  # genera MSI + NSIS
```

### 8.3 Firmware ESP32
```bash
cd firmware
# Editar config.h con credenciales WiFi
pio run --target upload                   # subir por USB (por defecto)
pio run -e esp32dev-ota --target upload   # subir por WiFi (OTA)
```
> No existe `uploadfs`: LittleFS se monta/formatea en runtime (`LittleFS.begin(true)`).

### 8.4 Acceso
- App: icono en Menú Inicio o bandeja del sistema (no es una web servida)
- Dispositivo: WebSocket `ws://<IP_ESP32>:81` y REST `http://<IP_ESP32>/api/*`
- Login de la app: `admin@colegio.edu` / `admin123`

---

## 9. Escalabilidad Futura

- **Multi-dispositivo**: Agregar `deviceId` en payloads, discovery mDNS
- **Backend central**: PostgreSQL + WebSocket server para multi-colegio
- **App móvil nativa**: React Native / Flutter compartiendo `core/schedule-engine`
- **Integración LMS**: API para leer horarios de sistemas académicos
- **Notificaciones push**: Service Worker + Push API