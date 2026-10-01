# Documentación - Timbre Escolar Inteligente

## Índice

| Documento | Descripción |
|-----------|-------------|
| [architecture.md](architecture.md) | Arquitectura completa del sistema |
| [installation-guide.md](installation-guide.md) | Guía de instalación y uso |
| [troubleshooting.md](troubleshooting.md) | Diagnóstico y solución de problemas |

---

## Hardware

| Documento | Descripción |
|-----------|-------------|
| [hardware/schematic/README.md](../hardware/schematic/README.md) | Esquemático eléctrico y lista de componentes |
| [hardware/wiring/README.md](../hardware/wiring/README.md) | Diagrama de cableado detallado |
| [hardware/enclosure/README.md](../hardware/enclosure/README.md) | Diseño caja IP65 + archivos 3D |

---

## Inicio Rápido

### Usuario final (sin comandos)
1. Doble click en `app/src-tauri/target/release/bundle/msi/Timbre Escolar Inteligente_1.0.0_x64_es-ES.msi`
2. Aceptar UAC → abrir **Timbre Escolar Inteligente** desde el Menú Inicio
3. Login: `admin@colegio.edu` / `admin123`

### Desarrollo
```bash
# 1. Dependencias
cd app
npm install

# 2. App (2 terminales)
npm run dev          # web: http://localhost:3000
# ...en la raíz:
npm run mock         # simulador ESP32: ws://localhost:81

# También: npm run tauri:dev (ventana escritorio) / npm run tauri:build (MSI + NSIS)

# 3. Firmware ESP32 (editar config.h con el WiFi real)
cd firmware
pio run --target upload          # subida serial (por defecto)
pio run -e esp32dev-ota -t upload  # subida OTA
```

---

## Estructura del Proyecto

```
timbre-escolar-inteligente/
├── app/                    # Aplicación (React + TS + Vite + Tauri)
│   ├── src/
│   │   ├── core/           # Lógica pura (schedule-engine, storage)
│   │   ├── features/       # Módulos por funcionalidad
│   │   ├── shared/         # Componentes/UI/Hooks compartidos
│   │   └── styles/         # Tailwind + globals
│   ├── src-tauri/          # Shell de escritorio (Rust): bandeja, autostart, logs
│   └── package.json
├── firmware/               # Firmware ESP32 (PlatformIO)
│   ├── src/
│   │   ├── time/           # NTP + hora en NVS
│   │   ├── schedule/       # Store + Scheduler
│   │   ├── network/        # WiFi + WebServer + WebSocket
│   │   ├── hardware/       # Relay + Watchdog
│   │   ├── sync/           # Protocol + State + Auth
│   │   └── main.cpp
│   └── platformio.ini
├── scripts/                # mock-esp32.mjs (simulador), dev-setup.bat
├── hardware/               # Documentación hardware
│   ├── schematic/          # Esquemático + BOM
│   ├── wiring/             # Cableado + bornes
│   └── enclosure/          # Caja IP65 + 3D
├── docs/                   # Documentación
│   ├── architecture.md
│   ├── installation-guide.md
│   └── troubleshooting.md
└── README.md
```

---

## Tecnologías Clave

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, PWA |
| Escritorio | Tauri 2 (Rust): bandeja, arranque con Windows, ventana única, logs |
| Estado | Zustand, React Hook Form, Zod |
| UI | Lucide React, @hello-pangea/dnd, react-day-picker |
| DB Local | IndexedDB (Dexie.js), poda 180 días / 5000 eventos |
| Backend/Firmware | ESP32 (Arduino), PlatformIO |
| RTOS | FreeRTOS (Arduino ESP32) |
| Comunicación | WebSocket (tiempo real) + REST API |
| Almacenamiento ESP32 | LittleFS |
| Tiempo | NTP + hora persistida en NVS (sin RTC externo) |
| Simulación | `npm run mock` (ESP32 falso en ws://localhost:81) |
| Seguridad | Token Bearer simple |

---

## Funcionalidades Principales

- ✅ App de escritorio: doble click, bandeja, arranca con Windows, nunca duerme la PC
- ✅ Dashboard tiempo real (estado, próximo timbre, cuenta regresiva)
- ✅ Editor horarios drag-drop (Matutina/Vespertina independientes)
- ✅ Períodos dinámicos (±5/10/15min + personalizado, respeta fijos)
- ✅ Calendario académico con excepciones y prioridades
- ✅ Plantillas reutilizables (Normal, Corto, Largo, Examen, etc.)
- ✅ Historial con filtros, export CSV/JSON, limpieza
- ✅ Diagnóstico dispositivo + prueba timbre + config hardware
- ✅ Configuración: usuario, red, respaldos, demo mode, seguridad
- ✅ Modo Demo (aceleración tiempo 1s=1..1440min + triggers)
- ✅ Sync atómico WS/REST con versionado/hash
- ✅ Funcionamiento offline (LittleFS + IndexedDB)
- ✅ PWA instalable, responsive

---

## Licencia

MIT License

---

## Autor

Proyecto de **Edgar y Emmanuel** — automatización de timbres escolares
(ESP32 + relé + aplicación de escritorio).