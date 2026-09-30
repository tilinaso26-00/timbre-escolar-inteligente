# Manual de Instalación y Uso - Timbre Escolar Inteligente

## 1. Requisitos Previos

### Hardware
- ESP32 DevKit V1 (30 pines)
- Módulo relé 1 canal 5V (optoacoplado, active-low)
- DS3231 RTC (con batería CR2032)
- Buck converter 5V/2A (LM2596/MP1584)
- Caja IP65 180x130x85mm
- Bornes: 2P (AC) + 3P (Timbre)
- LEDs 3mm/5mm (Verde/Rojo) + 330Ω
- Pulsador reset M12
- Fuente 120/220V AC → 5V DC
- Cables: 1.5mm² (potencia), 0.5mm² (señal)

### Software
- Node.js 18+, npm 9+
- PlatformIO (VS Code extension)
- Navegador moderno (Chrome/Firefox/Edge/Safari)

---

## 2. Instalación Hardware

### 2.1 Montaje en Caja
1. Atornillar standoffs M3x10mm en base (ver `hardware/enclosure/README.md`)
2. Montar ESP32, Buck, Relé en standoffs
3. Instalar bornes AC (2P) y Timbre (3P) en pared lateral
4. Cablear según `hardware/wiring/README.md`
5. Instalar panel frontal: LEDs, botón reset
6. Colocar junta tórica, cerrar tapa, atornillar 8x M3x16mm
7. Instalar prensacables PG9 (cable AC + cable Timbre)

### 2.2 Conexión Eléctrica
```
RED AC (120/220V)          CAJA TIMBRE
┌──────────────┐           ┌─────────────────┐
│ L (Marrón)   │──────────►│ Fusible 2A      │
│ N (Azul)     │──────────►│ Buck IN-        │
│ PE (Verde/Amarillo) ────►│ Tierra (chasis) │
└──────────────┘           │ Buck OUT+ ──────┼──► ESP32 VIN
                           │                 ├──► Relé VCC
                           │ Buck OUT- ──────┼──► ESP32 GND
                           │                 └──► Relé GND
                           └─────────────────┘

TIMBRE ESCOLAR             ESP32 GPIO
┌──────────────┐           ┌─────────────────┐
│ L (Línea)    │──────────►│ Relé COM        │
│ Carga        │◄──────────│ Relé NO         │
│ N (Neutro)   │────────────│ (directo red)   │
└──────────────┘           └─────────────────┘
```

### 2.3 Checklist Conexiones
- [ ] Fusible 2A en línea L
- [ ] Buck OUT = 5.0V ±0.1V
- [ ] ESP32 3V3 = 3.3V
- [ ] Relé: GPIO23 LOW = ON (click)
- [ ] DS3231 I2C: 0x68 detectable
- [ ] BTN_RESET: GPIO0 a GND = reset
- [ ] LED_OK: GPIO2 HIGH = ON
- [ ] LED_ERROR: GPIO4 HIGH = ON
- [ ] Bornes Timbre: L→COM, Carga→NO, N→N red

---

## 3. Instalación Software

### 3.1 Aplicación Web
```bash
cd app
npm install
npm run build          # Genera dist/ (PWA lista para producción)
# Servir dist/ con nginx/Apache o:
npm run preview        # Puerto 4173 para pruebas
```

### 3.2 Firmware ESP32
```bash
cd firmware
# 1. Editar config.h con credenciales WiFi
# 2. Compilar y subir
pio run --target upload
# 3. Subir LittleFS (vacío inicial)
pio run --target uploadfs
# 4. Monitor serie (115200 baud)
pio device monitor
```

### 3.3 Configuración config.h
```cpp
#define WIFI_SSID "MI_COLEGIO_WIFI"
#define WIFI_PASSWORD "password_seguro"
#define WIFI_FALLBACK_AP true
#define AP_SSID "TimbreEscolar-Setup"
#define AP_PASSWORD "config1234"

#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"
#define TIMEZONE_OFFSET -6  // Guatemala UTC-6

#define RELAY_PIN 23
#define RELAY_ACTIVE_LOW true
#define RELAY_SAFETY_MAX_MS 60000
```

---

## 4. Primera Configuración

### 4.1 Acceso Inicial
1. Conectar alimentación AC
2. Esperar 30s: LED_OK verde fijo = conectado
3. Si LED_ERROR rojo parpadea: modo AP activado
   - Conectar a WiFi "TimbreEscolar-Setup" / "config1234"
   - Abrir http://192.168.4.1 → Configurar WiFi real

### 4.2 Acceso Web
- URL: `http://<IP_ESP32>` o `http://timbre-escolar.local` (mDNS)
- Login: `admin@colegio.edu` / `admin123`

### 4.3 Configuración Inicial
1. **Configuración → General**: Zona horaria, formato hora, timbre por defecto
2. **Configuración → Red**: Verificar WiFi, NTP, AP fallback
3. **Configuración → Hardware**: Pin relé, active-low, safety max
4. **Jornadas**: Configurar Matutina y Vespertina independientemente
5. **Horarios**: Crear eventos (Entrada, Períodos, Recreos, Salida)
6. **Calendario**: Asignar excepciones (feriados, horarios especiales)
7. **Dispositivo → Prueba Timbre**: Verificar 1s/3s/5s
8. **Sincronizar**: Enviar config al ESP32

---

## 5. Uso Diario

### 5.1 Dashboard (Centro de Control)
- **Estado**: Conectado/Desconectado, WiFi, Última sync, Reloj dispositivo
- **Jornada Activa**: Matutina/Vespertina con selector rápido
- **Próximo Timbre**: Evento, hora, cuenta regresiva en tiempo real
- **Último Timbre**: Nombre, hora, tipo (Auto/Manual)
- **Timbre Manual**: Botón emergencia con selector 1/2/3/5s
- **Accesos Rápidos**: Horarios, Calendario, Plantillas, Historial, Dispositivo, Config

### 5.2 Editor de Horarios
1. Seleccionar Jornada (Matutina/Vespertina)
2. Agregar eventos: Entrada, Período, Recreo, Salida, Actividad
3. Editar inline: Nombre, Hora, Duración, Tipo, Días, Fijo
4. Drag & drop para reordenar
5. **Ajuste Períodos**: ±5/10/15min o personalizado (recalcula automáticos)
6. **Vista Previa**: Ver horario completo antes de guardar
7. **Guardar** → **Sincronizar**

### 5.3 Calendario Académico
- Vista mensual con colores por prioridad
- Click en día → Asignar: Normal, Corto, Largo, Examen, Actividades, Sin clases, Personalizado
- Excepciones tienen prioridad sobre horarios base
- Leyenda visual: Normal (verde), Corto (azul), Largo (púrpura), Examen (naranja), Actividades (rosa), Sin clases (rojo), Personalizado (gris), Plantilla día (amarillo), Defecto (gris claro)

### 5.4 Plantillas
- Guardar horario actual como plantilla (Normal, Corto, Largo, Examen, etc.)
- Aplicar plantilla a jornada con un click
- Exportar/Importar JSON para respaldo/transferencia

### 5.5 Historial
- Tabla filtrada: fecha, jornada, tipo, origen (auto/manual)
- Exportar CSV/JSON
- Limpiar todo o por fecha

### 5.6 Dispositivo
- Diagnóstico: Estado, WiFi, Sync, Reloj, Próximo, Último, Count, Relé
- Prueba Timbre: 1s / 3s / 5s / Personalizado
- Config Hardware: Pin, Active-low, Safety max, RTC
- Sincronización manual / Reconectar WS

### 5.7 Modo Demo (Presentaciones)
- **Configuración → Demo**: Velocidad 1s = 1..1440 min simulados
- Iniciar/Detener simulación
- Botones trigger: Entrada, Período, Recreo, Fin Recreo, Salida
- Forzar timbre manual
- Reiniciar a 7:00 AM

---

## 6. Respaldos y Restauración

### Exportar Configuración
- **Configuración → Respaldos → Exportar**
- JSON: Configuración completa (horarios, plantillas, excepciones, eventos, config)
- CSV: Tablas separadas para análisis Excel

### Importar Configuración
- **Configuración → Respaldos → Importar**
- Pegar JSON → Validar → Importar (sobrescribe actual)
- ⚠ Hacer export antes de importar

---

## 7. Actualizaciones

### Firmware ESP32 (OTA)
```bash
# OTA via PlatformIO
pio run --target upload --environment esp32dev-ota
# OTA URL: http://<IP>/update (si habilitado)
```

### Aplicación Web
```bash
cd app
git pull
npm install
npm run build
# Reemplazar dist/ en servidor web
```

---

## 7. Mantenimiento Preventivo

| Tarea | Frecuencia |
|-------|------------|
| Verificar LED_OK verde fijo | Diario |
| Probar timbre manual (3s) | Semanal |
| Verificar hora correcta (NTP/RTC) | Semanal |
| Revisar logs errores | Semanal |
| Limpiar caja (polvo/humedad) | Mensual |
| Probar botón reset + LEDs | Mensual |
| Verificar batería RTC (CR2032) | Anual (cambiar c/ 3 años) |
| Re-aplicar grasa silicona junta | Cada 2 años |
| Backup configuración completa | Antes de cambios mayores |

---

## 8. Contacto y Soporte

- **Documentación técnica**: `docs/architecture.md`
- **Esquemático**: `hardware/schematic/README.md`
- **Cableado**: `hardware/wiring/README.md`
- **Caja/3D**: `hardware/enclosure/README.md`
- **Issues/Reportes**: GitHub Issues del proyecto