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
│   │   ├── time/           # NTP + RTC
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
- ESP32-WROOM-32E
- Módulo relé 5V 1 canal (optoacoplado)
- Fuente 5V 2A
- DS3231 RTC (opcional, recomendado)
- Caja IP65

## Instalación

### Aplicación Web

```bash
cd app
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Firmware ESP32

1. Abrir `firmware/` en VS Code con PlatformIO
2. Configurar credenciales WiFi en `src/config.h`
3. Compilar y subir: `pio run --target upload`
4. Subir archivos LittleFS: `pio run --target uploadfs`

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

1. **Acceder a la web**: `http://<IP_ESP32>` o `http://timbre-escolar.local`
2. **Login**: `admin@colegio.edu` / `admin123`
3. **Configurar jornadas**: Matutina / Vespertina
4. **Crear horarios**: Editor visual con drag & drop
5. **Calendario**: Asignar horarios por fecha
6. **Sincronizar**: Botón "Sincronizar" → ESP32
7. **Probar**: Botón "Probar timbre" en panel Dispositivo

## API REST (ESP32)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/status` | Estado del dispositivo |
| GET | `/api/schedule` | Horario actual |
| POST | `/api/schedule` | Recibir nuevo horario |
| POST | `/api/bell/manual` | Timbre manual |
| POST | `/api/bell/test` | Prueba de timbre |
| GET | `/api/logs` | Historial de eventos |
| POST | `/api/reboot` | Reiniciar ESP32 |

## WebSocket Events

**App → ESP32:**
- `sync:request` - Enviar horario completo
- `bell:manual` - Activar timbre manual
- `bell:test` - Prueba de timbre
- `config:update` - Actualizar configuración

**ESP32 → App:**
- `status` - Estado periódico (cada 5s)
- `sync:complete` - Sincronización exitosa
- `bell:executed` - Timbre ejecutado en tiempo real
- `error` - Errores del sistema

## Desarrollo

### Comandos útiles

```bash
# App
cd app
npm run dev        # Desarrollo
npm run build      # Producción
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run test       # Vitest

# Firmware
cd firmware
pio run            # Compilar
pio run -t upload  # Subir firmware
pio run -t uploadfs # Subir LittleFS
pio device monitor # Monitor serial
```

## Arquitectura

Ver [docs/architecture.md](docs/architecture.md) para detalles técnicos.

## Licencia

MIT License - Ver [LICENSE](LICENSE)

## Autor

Desarrollado para automatización de timbres escolares.