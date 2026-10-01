# Timbre Escolar Inteligente

Sistema completo de automatización de timbres escolares con interfaz web moderna y controlador ESP32.

## Características

- **Interfaz Web Moderna**: React + TypeScript + Tailwind CSS
- **Horarios Dinámicos**: Cálculo automático de períodos con ajustes ±5/10/15 min
- **Calendario Académico**: Excepciones, días sin clases, plantillas por fecha
- **Controlador ESP32**: Ejecución autónoma, sincronización WiFi, funcionamiento offline
- **Modo Demo**: Aceleración de tiempo para presentaciones (1s = 1min)
- **PWA**: Instalable, funciona offline
- **Seguridad**: Autenticación, validación, watchdog hardware

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

### Desarrollo Web
- Node.js 18+
- npm 9+

### Firmware ESP32
- PlatformIO (VS Code extension o CLI)
- ESP32 DevKit V1

### Hardware
- ESP32-WROOM-32 DevKit V1
- Módulo relé 5V 1 canal (optoacoplado, Songle SRD-05VDC-SL-C)
- Timbre/escolar a 110V
- Fuente 5V USB o 5V 2A
- (Opcional) Módulo RTC DS3231: **no necesario**, la hora vive en NVS del ESP32 y se refresca con NTP

## Instalación

### Aplicación de escritorio (usuario final) — sin comandos

1. Ejecutar `app/src-tauri/target/release/bundle/msi/Timbre Escolar Inteligente_1.0.0_x64_es-ES.msi`
   (doble click → Sí en el UAC → Listo). También hay un instalador NSIS (`.exe`) en `bundle/nsis/`.
2. Abrir **Timbre Escolar Inteligente** desde el Menú Inicio.
3. Listo: arranca con Windows, se minimiza a la bandeja y **nunca se cierra sola**
   (el botón de cerrar solo oculta la ventana; para salir: clic derecho en el icono de bandeja → Salir).

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