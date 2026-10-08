# Timbre Escolar Inteligente

Sistema completo de automatización de timbres escolares: **aplicación de escritorio**
(React + Tauri) que controla un **ESP32 + relé** para sonar la campana sola.

Repo: https://github.com/tilinaso26-00/timbre-escolar-inteligente (privada)

## Características

- **App de escritorio**: doble click, icono en bandeja, arranca con Windows, 24/7
  (el botón X solo oculta; para salir: clic derecho en bandeja → Salir)
- **Interfaz moderna**: React + TypeScript + Tailwind CSS
- **Horarios dinámicos**: cálculo automático de períodos con ajustes ±5/10/15 min
- **Calendario académico**: excepciones, días sin clases, plantillas por fecha
- **Controlador ESP32**: ejecución autónoma, hora en NVS (sobrevive apagones), offline
- **Modo Demo + mock**: presentaciones (1 s = 1 min) y simulador ESP32 (`npm run mock`)
- **Seguridad**: autenticación, validación, watchdog hardware

## Estructura del Proyecto

```
timbre-escolar-inteligente/
├── app/                    # Aplicación Web (React + Vite)
│   ├── src/
│   │   ├── core/           # Lógica pura (sin React)
│   │   ├── features/       # Módulos por funcionalidad
│   │   ├── shared/         # Componentes compartidos
│   │   └── styles/         # Estilos globales
│   └── package.json
├── firmware/               # Firmware ESP32 (PlatformIO)
│   ├── src/
│   │   ├── time/           # NTP + hora persistida en NVS
│   │   ├── schedule/       # Almacenamiento + Scheduler
│   │   ├── network/        # WiFi + WebServer + WebSocket
│   │   ├── hardware/       # Relé + Watchdog
│   │   └── sync/           # Protocolo de sincronización
│   └── platformio.ini
├── hardware/               # Documentación hardware
│   ├── schematic/
│   ├── enclosure/
│   └── wiring/
├── docs/                   # Documentación
└── scripts/                # Utilidades
```

## Requisitos

### A) Solo usar la app en otro PC — **no se instala nada más**
- Windows 10/11 64 bits
- Descargar el instalador de la última **Release**
  (https://github.com/tilinaso26-00/timbre-escolar-inteligente/releases/latest)
  → doble click → **Listo**

### B) Programas para compilar/desarrollar
| Programa | Para qué | Instalación |
|----------|----------|-------------|
| **Git** | clonar la repo | `winget install Git.Git` |
| **Node.js 18+** (con npm) | app React / Tauri | `winget install OpenJS.NodeJS.LTS` |
| **Rust** (rustup) | backend de la app | `winget install Rustlang.Rust.GNU` |
| **VS 2022 Build Tools** | compilar el Rust de Windows | `winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.NativeDesktop --quiet"` |
| **PlatformIO** | compilar/subir el ESP32 | extensión de VS Code o `pip install platformio` |

Ver comandos exactos en [COMANDOS_TIMBRE_ESCOLAR.txt](COMANDOS_TIMBRE_ESCOLAR.txt).

### C) Firmware ESP32
- PlatformIO (VS Code extension o CLI)
- ESP32 DevKit V1

### D) Hardware (montaje físico del timbre)
- ESP32-WROOM-32 DevKit V1
- Módulo relé 5V 1 canal (optoacoplado, Songle SRD-05VDC-SL-C)
- Timbre/escolar a 110V
- Fuente 5V USB o 5V 2A
- (Opcional) Módulo RTC DS3231: **no necesario**, la hora vive en NVS del ESP32 y se refresca con NTP

## Instalación

### Aplicación de escritorio (otro PC) — sin comandos, 3 pasos

1. Abrir la última Release:
   https://github.com/tilinaso26-00/timbre-escolar-inteligente/releases/latest
2. Descargar `Timbre Escolar Inteligente_1.0.0_x64_es-ES.msi` (o el `.exe`/NSIS)
   y hacer **doble click → Sí (UAC) → Listo**
3. Abrir **Timbre Escolar Inteligente** desde el Menú Inicio.

> Listo: queda en la bandeja, arranca con Windows y **nunca se cierra sola**
> (el X solo oculta; para salir: clic derecho en el icono de bandeja → Salir).

Si prefieres compilarlo desde el código: `cd app && npm install && npm run tauri:build`
(el instalador queda en `app/src-tauri/target/release/bundle/`).

Detalles completos en [docs/installation-guide.md](docs/installation-guide.md).

### Aplicación Web (desarrollo)

```bash
cd app
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Firmware ESP32

1. Abrir `firmware/` en VS Code con PlatformIO
2. Configurar credenciales WiFi en `src/config.h`
3. Compilar y subir (sube por cable USB): `pio run --target upload`
4. (Opcional, OTA) `pio run -e esp32dev-ota --target upload`

> LittleFS se formatea/monta en runtime (`LittleFS.begin(true)`), no existe paso `uploadfs`.

## Instalación hardware (resumen)

Piezas: **ESP32 DevKit V1 + módulo relé 5V (Songle SRD-05VDC-SL-C, optoacoplado)
+ timbre 110V + fuente 5V** (no hace falta RTC DS3231).

1. `GPIO23` del ESP32 → **IN** del relé; `GND` → GND del relé; `5V` → VCC del relé
2. Relé **COM** → línea (L) de la red; relé **NO** → el timbre; neutro (N) → timbre
3. Fusible 2A en la línea; tierra al chasis; **nunca trabajar enchufado**
4. WiFi del colegio: editar `firmware/src/config.h` (`WIFI_SSID`/`WIFI_PASSWORD`)
5. Subir firmware por USB: `pio run --target upload`

Detalle e imágenes: [hardware/wiring/README.md](hardware/wiring/README.md),
[hardware/schematic/README.md](hardware/schematic/README.md),
[docs/installation-guide.md](docs/installation-guide.md).

## Configuración

### WiFi
Editar `firmware/src/config.h`:
```cpp
#define WIFI_SSID "TU_SSID"
#define WIFI_PASSWORD "TU_PASSWORD"
```

### Zona Horaria
Por defecto: Guatemala (UTC-6)
```cpp
#define TIMEZONE_OFFSET -6
```

### Relé
```cpp
#define RELAY_PIN 23
#define RELAY_ACTIVE_LOW true
#define RELAY_SAFETY_MAX_MS 60000
```

## Uso

1. **Abrir la app** desde el Menú Inicio (o acceso directo en el escritorio, si se creó)
2. **Login**: `admin@colegio.edu` / `admin123`
3. **Configurar jornadas**: Matutina / Vespertina
4. **Crear horarios**: Editor visual con drag & drop
5. **Calendario**: Asignar horarios por fecha
6. **Conectar el timbre**: en Ajustes → WebSocket, poner la IP del ESP32
   (`ws://<IP_ESP32>:81`) y el token (`timbre-escolar-2024`)
7. **Sincronizar**: botón "Sincronizar" → ESP32
8. **Probar**: botón "Probar timbre" en panel Dispositivo

### Modo sin hardware (presentaciones / pruebas)

```bash
npm run mock        # en la raíz: simula el ESP32 en ws://localhost:81
```

La app usa `ws://localhost:81` por defecto, así que con el mock corriendo todo funciona
sin tocar el ESP32. También existe el **Modo Demo** en la app (1 s = 1 min).

## API REST (ESP32)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/status` | Estado del dispositivo |
| GET | `/api/schedule` | Horario actual |
| POST | `/api/schedule` | Recibir nuevo horario |
| POST | `/api/bell/manual` | Timbre manual |
| POST | `/api/bell/test` | Prueba de timbre |
| GET | `/api/logs` | Historial de eventos |
| GET/POST | `/api/config` | Configuración del dispositivo |
| POST | `/api/reboot` | Reiniciar ESP32 |
| POST | `/api/factory-reset` | Formatear LittleFS + reiniciar |

## WebSocket Events

**App → ESP32:**
- `sync:request` - Enviar horario completo
- `bell:manual` - Activar timbre manual
- `bell:test` - Prueba de timbre
- `config:update` - Actualizar configuración

**ESP32 → App:**
- `status` - Estado periódico (cada 5s)
- `sync:complete` - Sincronización exitosa
- `time:sync` - Hora enviada al reconectar
- `bell:executed` - Timbre ejecutado en tiempo real
- `error` - Errores del sistema

## Desarrollo

### Comandos útiles

```bash
# App (desde app/)
npm run dev        # Desarrollo
npm run build      # Producción
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run test       # Vitest

# App de escritorio (desde app/)
npm run tauri:dev      # Desarrollo con backend Rust
npm run tauri:build    # Genera MSI + NSIS instaladores

# Simulador ESP32 (desde la raíz)
npm run mock           # ws://localhost:81

# Firmware (desde firmware/)
pio run                 # Compilar
pio run -t upload       # Subir firmware (USB serial)
pio run -e esp32dev-ota -t upload   # Subir por OTA (WiFi)
pio device monitor      # Monitor serial
```

## Arquitectura

Ver [docs/architecture.md](docs/architecture.md) para detalles técnicos.

## Licencia

MIT License

## Créditos

Proyecto creado por **Edgar y Emmanuel**. Timbre escolar inteligente para automatizar
campanas y horarios de clase (ESP32 + relé + aplicación de escritorio).