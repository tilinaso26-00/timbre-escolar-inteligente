# Manual de Instalación y Uso - Timbre Escolar Inteligente

> Guía para dejar el timbre funcionando **en 24/7 como una app normal de escritorio**:
> se instala con doble click, arranca con Windows y no necesita comandos ni servidor.

---

## 1. Requisitos Previos

### Hardware (lo necesario)
- ESP32 DevKit V1 (30 pines)
- Módulo relé 1 canal 5V (optoacoplado, Songle SRD-05VDC-SL-C, active-low)
- Timbre escolar (110V) conectado por el relé
- Fuente USB 5V para el ESP32 (o buck converter 5V/2A si va en caja)
- Cables: 1.5mm² (potencia/timbre), 0.5mm² (señal)

**No hace falta módulo RTC DS3231.** La hora se guarda en la memoria NVS del ESP32,
sobrevive a apagones y se refresca con NTP o desde la aplicación.

Opcionales (montaje en caja): caja IP65, bornes 2P+3P, fusible 2A, LEDs/botón.

### Software (usuario final)
- Windows 10/11 (64 bits)
- Nada más: los instaladores `.msi` / `.exe` traen todo incluido

### Software (solo desarrollo)

Instalar en este orden (PowerShell, usuario sin administrador salvo Build Tools):

| # | Programa | Para qué | Comando |
|---|----------|----------|---------|
| 1 | Git | clonar la repo | `winget install Git.Git` |
| 2 | Node.js 18+ (trae npm) | app React / app de escritorio | `winget install OpenJS.NodeJS.LTS` |
| 3 | **Python 3.11+** | PlatformIO se instala con pip | `winget install Python.Python.3.11` |
| 4 | Rust (rustup) | backend Tauri | `winget install Rustlang.Rust.GNU` |
| 5 | VS 2022 Build Tools (C++) | enlazar el Rust | `winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.NativeDesktop --quiet"` |
| 6 | PlatformIO | firmware ESP32 | `pip install platformio` |

- **Java no hace falta** (es del Arduino IDE clásico).
- **No hace falta** ESP-IDF ni Android Studio.
- ~6 GB de espacio libre. El instalador `.msi`/`.exe` de la app **no** necesita nada de esto.

---

## 2. Instalación Hardware

### 2.1 Montaje
1. Montar ESP32, relé (y buck, si aplica) — ver `hardware/enclosure/README.md`
2. Cablear según `hardware/wiring/README.md`
3. Bornes AC (L/N) y borne del timbre en la pared lateral de la caja
4. Cerrar la caja solo después de revisar todo desenchufado

### 2.2 Conexión Eléctrica
```
RED AC (110V)                 CAJA TIMBRE
┌──────────────┐           ┌─────────────────┐
│ L (Marrón)   │──────────►│ Fusible 2A      │
│ N (Azul)     │──────────►│ (fuente/buck)    │
│ PE (Verde/Amarillo) ────►│ Tierra (chasis) │
└──────────────┘           │ Fuente 5V ──────┼──► ESP32 VIN / USB
                           │                 ├──► Relé VCC
                           │                 └──► Relé GND
                           └─────────────────┘

TIMBRE ESCOLAR             RELÉ
┌──────────────┐           ┌─────────────────┐
│ L (Línea)    │──────────►│ COM             │
│ Carga        │◄──────────│ NO              │
│ N (Neutro)   │────────────│ (directo red)   │
└──────────────┘           └─────────────────┘
```

### 2.3 Checklist Conexiones
- [ ] Fusible 2A en línea L
- [ ] 5V en VCC del relé / VIN del ESP32
- [ ] ESP32 3V3 = 3.3V
- [ ] **GPIO23 → IN del relé**
- [ ] Relé: al probar desde la app se escucha el *click*
- [ ] Bornes Timbre: L→COM, Carga→NO, N→N de la red
- [ ] Tierra: continuidad carcasa ↔ borne PE

> ⚠ Trabajar siempre con la caja **desenchufada** y herramienta aislada en los bornes AC.

---

## 3. Instalación Software

### 3.1 Aplicación de escritorio (usuario final) — SIN comandos

1. Buscar el instalador:
   `app\src-tauri\target\release\bundle\msi\Timbre Escolar Inteligente_1.0.1_x64_es-ES.msi`
   (alternativa: `bundle\nsis\Timbre Escolar Inteligente_1.0.1_x64-setup.exe`)
2. **Doble click → Sí (UAC) → Listo**
3. Abrir **Timbre Escolar Inteligente** desde el Menú Inicio
4. Login: `admin@colegio.edu` / `admin123`

**Qué queda configurado solo:**
- Acceso directo en el Menú Inicio
- Arranque automático con Windows (inicio con sesión)
- Icono en la bandeja del sistema (junto al reloj)
- Logs en `%LOCALAPPDATA%\com.timbre-escolar.inteligente\logs\logs.log`

**Cómo se cierra:** el botón **X solo oculta** la ventana (el timbre sigue vivo).
Para cerrar de verdad: **clic derecho en el icono de la bandeja → Salir**.

### 3.2 PC que no debe dormir (24/7)
La PC encargada del timbre se dejó **nunca dormir ni hibernar** (ya aplicado en este equipo):
```
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0
powercfg /change disk-timeout-ac 0
```
Para verificar o repetirlo en otra PC: *Panel de control → Opciones de energía →
Cambiar configuración del plan → Suspender/Hibernar = Nunca*.

### 3.3 Firmware ESP32 (desarrollo)
```bash
cd firmware
# 1. Editar src/config.h con el WiFi real del colegio
# 2. Compilar y subir por cable USB
pio run --target upload
# 3. Consola serie (115200 baud)
pio device monitor
```
Actualización inalámbrica (solo si ya está en la red):
```bash
pio run -e esp32dev-ota --target upload
```

### 3.4 Configuración `config.h`
```cpp
// WiFi del colegio (editar esto antes de subir el firmware)
#define WIFI_SSID "MI_COLEGIO_WIFI"
#define WIFI_PASSWORD "password_del_colegio"
#define WIFI_STA_ENABLED true      // unirse a la red del colegio
#define WIFI_AP_ALWAYS_ON true     // su propia red SIEMPRE encendida
#define WIFI_AP_MAX_CLIENTS 4
#define AP_SSID "TimbreEscolar-Setup"
#define AP_PASSWORD "Timbre#Escolar2026"

// Historial que guarda el propio ESP32 (sobrevive apagones)
#define HISTORY_FILE "/history.json"
#define HISTORY_MAX_EVENTS 150

#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"
#define TIMEZONE_OFFSET -6  // Guatemala UTC-6

#define RELAY_PIN 23
#define RELAY_ACTIVE_LOW true
#define RELAY_SAFETY_MAX_MS 60000
```

> **Decisión de diseño:** la red WiFi se cambia **editando `config.h` y re-subiendo el
> firmware** (no hay portal web de configuración). El ESP32 **siempre** enciende su red
> propia `TimbreEscolar-Setup` (`192.168.4.1`) además de unirse a la del colegio, así la
> app llega por cualquiera de las dos.
>
> ⚠️ Las credenciales de arriba son de prueba: cámbialas antes de operar y no las subas a
> repositorios públicos.

---

## 4. Primera Configuración

### 4.1 Encender y conectar
1. Conectar el ESP32 a la red del colegio (WiFi ya configurado) y darle energía
2. Encender la PC que correrá la app
3. Abrir la app **Timbre Escolar Inteligente** (Menú Inicio)

### 4.2 Conectar la app con el timbre
1. Abrir la app → login (`admin@colegio.edu` / `admin123`)
2. La app **busca sola** al ESP32: `TimbreEscolar.local` → `192.168.4.1` → `localhost:81`
3. El indicador del encabezado debe decir **Conectado** (muestra la URL usada)
4. Si no encuentra: **Dispositivo → Buscar timbre** (o Ajustes → Red → Buscar timbre)
5. Token: `timbre-escolar-2024` (Ajustes → Red, solo si lo cambias)

Al conectar, la app baja el **historial guardado en el ESP32** y muestra
"Historial importado: N eventos nuevos". Los timbres sonados con la app cerrada
aparecen automáticamente.

### 4.3 Control desde el celular
1. En la PC (con la misma WiFi/ala que el celular):
   ```bash
   npm run build     # genera app/dist
   npm run serve     # imprime http://<IP-de-la-PC>:4173
   ```
2. Abrir esa URL en el navegador del celular
3. Si Windows lo bloquea, ejecutar (PowerShell admin):
   ```powershell
   netsh advfirewall firewall add rule name="Timbre Escolar app" dir=in action=allow protocol=TCP localport=4173
   ```
4. La PC debe quedarse encendida (o en "nunca dormir", ver §3.2)

### 4.4 Configuración Inicial
1. **Jornadas**: Matutina y Vespertina
2. **Horarios**: eventos (Entrada, Períodos, Recreos, Salida) con drag & drop
3. **Calendario**: excepciones (feriados, días cortos, sin clases)
4. **Dispositivo → Probar timbre**: 1s / 3s / 5s (debe escucharse la campana)
5. **Sincronizar**: enviar horario y hora al ESP32

---

## 5. Uso Diario

### 5.1 Dashboard (Centro de Control)
- **Estado**: Conectado/Desconectado, WiFi, Última sync, Reloj dispositivo
- **Jornada Activa**: Matutina/Vespertina con selector rápido
- **Próximo Timbre**: evento, hora y cuenta regresiva
- **Último Timbre**: nombre, hora, tipo (Auto/Manual)
- **Timbre Manual**: selector 1/2/3/5s

### 5.2 Editor de Horarios
1. Seleccionar jornada → agregar eventos (Entrada, Período, Recreo, Salida…)
2. Editar inline: Nombre, Hora, Duración, Tipo, Días, Fijo
3. Drag & drop para reordenar
4. **Ajuste Períodos**: ±5/10/15 min (recalcula los automáticos)
5. **Guardar** → **Sincronizar**

### 5.3 Calendario Académico
- Vista mensual con colores por tipo de día
- Click en día → Normal, Corto, Largo, Examen, Actividades, Sin clases, Personalizado
- Las excepciones tienen prioridad sobre el horario base

### 5.4 Plantillas e Historial
- Plantillas: guardar/aplicar horarios, exportar/importar JSON
- Historial: tabla filtrable, exportación CSV/JSON, limpieza por fecha

### 5.5 Modo Demo (presentaciones)
- **Ajustes → Demo**: velocidad 1 s = 1..1440 min simulados
- Botones: Entrada, Período, Recreo, Fin Recreo, Salida

### 5.6 Modo sin hardware (pruebas)
```bash
npm run mock     # desde la raíz: simula el ESP32 en ws://localhost:81
```
La app usa `ws://localhost:81` por defecto, así que todo funciona sin el ESP32.

---

## 6. Respaldos y Restauración

- **Exportar**: Ajustes → Respaldos → Exportar (JSON con todo, o CSV por tabla)
- **Importar**: pegar JSON → validar → importar (sobrescribe lo actual; exportar antes)
- La historia de timbres se poda sola (180 días / 5000 eventos), por eso conviene
  exportar CSV si se quiere un archivo permanente

---

## 7. Actualizaciones

### Firmware (OTA)
```bash
pio run -e esp32dev-ota --target upload
```

### Aplicación de escritorio
1. Ejecutar el nuevo `.msi` (sobrescribe la versión instalada)
2. No requiere configuración extra: datos y arranque con Windows se conservan

### En desarrollo
```bash
git pull
cd app && npm install
npm run tauri:build
```

---

## 8. Mantenimiento Preventivo

| Tarea | Frecuencia |
|-------|------------|
| Verificar que la app esté abierta (icono en bandeja) | Diario |
| Probar timbre manual (3s) | Semanal |
| Verificar hora correcta en la app | Semanal |
| Revisar logs de errores | Semanal |
| Limpiar caja (polvo/humedad) | Mensual |
| Exportar respaldo de configuración | Antes de cambios mayores |

---

## 9. Contacto y Soporte

- **Documentación técnica**: `docs/architecture.md`
- **Solución de problemas**: `docs/troubleshooting.md`
- **Esquemático**: `hardware/schematic/README.md`
- **Cableado**: `hardware/wiring/README.md`
- **Caja/3D**: `hardware/enclosure/README.md`
- **Comandos (solo desarrollo)**: `COMANDOS_TIMBRE_ESCOLAR.txt`

Proyecto de **Edgar y Emmanuel**.
