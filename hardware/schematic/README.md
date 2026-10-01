# Esquemático Eléctrico - Timbre Escolar Inteligente

## Lista de Componentes

| Ref | Componente | Valor/Especificación | Cantidad |
|-----|------------|---------------------|----------|
| U1 | ESP32-WROOM-32E | DevKit V1 (30 pines) | 1 |
| K1 | Módulo Relé 1 canal | 5V, 10A, optoacoplado, active-low | 1 |
| D1 | Diodo 1N4007 | Protección relé (flyback) | 1 |
| C1, C2 | Capacitor cerámico | 100nF (0.1µF) | 2 |
| C3 | Capacitor electrolítico | 470µF / 16V | 1 |
| R3 | Resistencia LED estado | 330Ω | 1 |
| LED1 | LED verde | 3mm/5mm (OK) | 1 |
| LED2 | LED rojo | 3mm/5mm (ERROR) | 1 |
| SW1 | Pulsador reset | Normalmente abierto | 1 |
| J1 | Conector bornes 3p | Timbre (L, N, Timbre) | 1 |
| J2 | Conector bornes 2p | Alimentación 5V | 1 |
| U3 | Regulador 5V | LM2596 / MP1584 (buck) | 1 |
| F1 | Fusible reseteable | 2A (PTC) | 1 |

---

## Esquema de Conexiones

### ESP32 → Periféricos

```
ESP32 (DevKit V1)                 Periférico
┌─────────────────────────┐
│                   GPIO23 │──────────────► RELE_IN (K1)
│                   GPIO2  │──────────────► LED_OK (via 330Ω)
│                   GPIO4  │──────────────► LED_ERROR (via 330Ω)
│                   GPIO0  │──────────────► BTN_RESET (a GND)
│                       3V3 │──────────────► (libre; reservado si se agrega DS3231)
│                       GND │──────────────► GND común
└─────────────────────────┘
```

> GPIO21/GPIO22 quedan libres (reservados para un RTC I2C opcional DS3231 que **no** es
> parte de este montaje: la hora vive en NVS y se refresca con NTP).

### Módulo Relé (Active Low)
```
5V ──────────────────┬── RELE_VCC
                     │
ESP32 GPIO23 ────────┼── RELE_IN (optoacoplador interno)
                     │
GND ─────────────────┴── RELE_GND

Salida Relé (COM/NO):
  COM ──────────────────► Bornes Timbre (Línea)
  NO  ──────────────────► Bornes Timbre (Carga)
```

### Alimentación
```
AC 110V ──[Fusible 2A]──► Buck Converter (LM2596) ──► 5V ──┬── ESP32 (VIN)
                                                             └── Relé (VCC)
GND ─────────────────────────────────────────────────────────┘
```

> En la versión más simple el ESP32 se alimenta directo por cable USB y solo el relé
> recibe 5V de la fuente.

---

## Diagrama de Bloques

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  FUENTE     │     │   ESP32     │     │   RELÉ      │
│  5V/2A      │────►│  (Control)  │────►│  (Salida)   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           ▼                   ▼
                      ┌─────────┐        ┌─────────┐
                      │ LED OK  │        │ TIMBRE  │
                      │ LED ERR │        │ ESCOLAR │
                      └─────────┘        └─────────┘
                       (GPIO2/4)          (110V)

                      ┌─────────┐
                      │ BTN     │
                      │ RESET   │
                      └─────────┘
                      (GPIO0)
```

---

## Consideraciones de Diseño

1. **Aislamiento**: Relé con optoacoplador integrado - NO conectar carga de alta tensión directamente a ESP32
2. **Protección Flyback**: Diodo 1N4007 en paralelo con bobina del relé (si módulo no lo incluye)
3. **Capacitores desacople**: 100nF cerca de pines VCC/GND de ESP32
4. **Hora sin alimentación**: garantizada por la **NVS del ESP32** (no requiere batería RTC)
5. **Watchdog**: HW (30s) + SW loop (5s) para recuperación automática
6. **Carcasa**: IP65, disipador para buck converter si >1A

---

## Pines ESP32 Utilizados

| GPIO | Función | Tipo | Notas |
|------|---------|------|-------|
| 23 | Relé | Output | Active low |
| 2 | LED OK | Output | Verde |
| 4 | LED ERROR | Output | Rojo |
| 0 | Botón Reset | Input | Pull-up interno, activo low |
| 21 | (libre) | I/O | Reservado I2C SDA (RTC opcional) |
| 22 | (libre) | I/O | Reservado I2C SCL (RTC opcional) |
| VIN | Alimentación 5V | Power | Desde buck converter o USB |
| 3V3 | 3.3V | Power | Máx 500mA |
| GND | Tierra común | Power | --- |

---

## Archivos de Diseño (planeados)

> Aún **no existen** en el repositorio; esta es la lista objetivo para KiCad/EasyEDA:

- `schematic.kicad_sch` - Esquemático
- `pcb.kicad_pcb` - PCB (2 capas, 1.6mm)
- `bom.csv` - Lista de materiales
- `gerber/` - Archivos de fabricación

*Generar con KiCad 7+ o EasyEDA*