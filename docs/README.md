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

```bash
# 1. App Web
cd app
npm install
npm run dev          # Desarrollo: http://localhost:3000
npm run build        # Producción: genera dist/

# 2. Firmware ESP32
cd firmware
# Editar config.h con WiFi
pio run --target upload
pio run --target uploadfs

# 3. Acceso
# http://<IP_ESP32> o http://timbre-escolar.local
# admin@colegio.edu / admin123
```

---

## Estructura del Proyecto

```
timbre-escolar-inteligente/
├── app/                    # Aplicación Web (React + TS + Vite)
│   ├── src/
│   │   ├── core/           # Lógica pura (schedule-engine, storage)
│   │   ├── features/       # Módulos por funcionalidad
│   │   ├── shared/         # Componentes/UI/Hooks compartidos
│   │   └── styles/         # Tailwind + globals
│   └── package.json
├── firmware/               # Firmware ESP32 (PlatformIO)
│   ├── src/
│   │   ├── time/           # NTP + DS3231 RTC
│   │   ├── schedule/       # Store + Scheduler
│   │   ├── network/        # WiFi + WebServer + WebSocket
│   │   ├── hardware/       # Relay + Watchdog
│   │   ├── sync/           # Protocol + State + Auth
│   │   └── main.cpp
│   └── platformio.ini
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
| Estado | Zustand, React Hook Form, Zod |
| UI | Lucide React, react-hot-toast, @hello-pangea/dnd, react-day-picker |
| DB Local | IndexedDB (Dexie.js) |
| Backend/Firmware | ESP32 (Arduino), PlatformIO |
| RTOS | FreeRTOS (Arduino ESP32) |
| Comunicación | WebSocket (tiempo real) + REST API |
| Almacenamiento ESP32 | LittleFS |
| Tiempo | NTP + DS3231 RTC (I2C) |
| Seguridad | Token Bearer simple |

---

## Funcionalidades Principales

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

MIT License - Ver [LICENSE](../LICENSE)

---

## Autor

Desarrollado para automatización de timbres escolares.