# Esquemático Eléctrico - Timbre Escolar Inteligente

## Lista de Componentes

| Ref | Componente | Valor/Especificación | Cantidad |
|-----|------------|---------------------|----------|
| U1 | ESP32-WROOM-32E | DevKit V1 (30 pines) | 1 |
| U2 | DS3231 | RTC I2C con batería CR2032 | 1 |
| K1 | Módulo Relé 1 canal | 5V, 10A, optoacoplado, active-low | 1 |
| D1 | Diodo 1N4007 | Protección relé (flyback) | 1 |
| C1, C2 | Capacitor cerámico | 100nF (0.1µF) | 2 |
| C3 | Capacitor electrolítico | 470µF / 16V | 1 |
| R1, R2 | Resistencia pull-up I2C | 4.7kΩ | 2 |
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
│                   GPIO21 │──────────────► DS3231_SDA (I2C)
│                   GPIO22 │──────────────► DS3231_SCL (I2C)
│                   GPIO2  │──────────────► LED_OK (via 330Ω)
│                   GPIO4  │──────────────► LED_ERROR (via 330Ω)
│                   GPIO0  │──────────────► BTN_RESET (a GND)
│                       3V3 │──────────────► DS3231_VCC, RELE_VCC (5V via buck)
│                       GND │──────────────► GND común
└─────────────────────────┘
```

### I2C Pull-ups (DS3231)
```
3V3 ──[4.7k]──┬── SDA (GPIO21)
              │
              └── SCL (GPIO22)
```

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
AC 120/220V ──[Fusible 2A]──► Buck Converter (LM2596) ──► 5V ──┬── ESP32 (VIN)
                                                                    ├── Relé (VCC)
                                                                    └── DS3231 (via 3V3 regulator ESP32)
GND ──────────────────────────────────────────────────────────────┘
```

---

## Diagrama de Bloques

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  FUENTE     │     │   ESP32     │     │   RELÉ      │
│  5V/2A      │────►│  (Control)  │────►│  (Salida)   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
              ┌────────────┴────────────┐      │
              ▼                         ▼      ▼
         ┌─────────┐              ┌─────────┐ ┌─────────┐
         │ DS3231  │              │ LED OK  │ │ TIMBRE  │
         │ (RTC)   │              │ LED ERR │ │ ESCOLAR │
         └─────────┘              └─────────┘ └─────────┘
         (I2C)                      (GPIO2)   (220V/10A)
                                   (GPIO4)
                                   
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
3. **Pull-ups I2C**: 4.7kΩ a 3V3 (no 5V) - ESP32 no es 5V tolerant
3. **Capacitores desacople**: 100nF cerca de pines VCC/GND de ESP32 y DS3231
4. **Batería RTC**: CR2032 en DS3231 para mantener hora sin alimentación
5. **Watchdog**: HW (30s) + SW loop (5s) para recuperación automática
6. **Carcasa**: IP65, disipador para buck converter si >1A

---

## Pines ESP32 Utilizados

| GPIO | Función | Tipo | Notas |
|------|---------|------|-------|
| 23 | Relé | Output | Active low |
| 21 | I2C SDA | I/O | Pull-up 4.7k |
| 22 | I2C SCL | I/O | Pull-up 4.7k |
| 2 | LED OK | Output | Verde |
| 4 | LED ERROR | Output | Rojo |
| 0 | Botón Reset | Input | Pull-up interno, activo low |
| VIN | Alimentación 5V | Power | Desde buck converter |
| 3V3 | Sensores 3.3V | Power | Máx 500mA |
| GND | Tierra común | Power | --- |

---

## Archivos de Diseño (Para KiCad/EasyEDA)

- `schematic.kicad_sch` - Esquemático
- `pcb.kicad_pcb` - PCB (2 capas, 1.6mm)
- `bom.csv` - Lista de materiales
- `gerber/` - Archivos de fabricación

*Generar con KiCad 7+ o EasyEDA*