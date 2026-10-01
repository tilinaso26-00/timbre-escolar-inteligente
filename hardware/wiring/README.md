# Diagrama de Cableado - Timbre Escolar Inteligente

## Vista General de Conexiones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CABLEADO COMPLETO                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ALIMENTACIÓN AC                          ESP32 DEVKIT V1
┌─────────────────────┐                      ┌────────────────────────┐
│  L (Línea) ─────────┼──[Fusible 2A]──┬────►│ VIN (5V)              │
│                     │                │     │ GND ──────────────────┼──┐
│  N (Neutro) ────────┼────────────────┘     │ 3V3 ──────────────────┼──┤
│                     │                      └────────────────────────┘  │
│  Tierra (PE) ───────┼──────────────────────────────────────────────────┘
└─────────────────────┘

BUCK CONVERTER (5V/2A)
┌──────────────────────┐
│ IN+ ─────────────────┼── 5V (desde buck)
│ IN- ─────────────────┼── GND
│ OUT+ ────────────────┼──► 5V ──┬──► ESP32 VIN (o cable USB)
│ OUT- ────────────────┼──► GND ─┴──► GND común
└──────────────────────┘
       │
       └──────────────────────────► Relé VCC

MÓDULO RELÉ (1 Canal, 5V, Active Low)             TIMBRE ESCOLAR
┌─────────────────────────────┐                  ┌─────────────────────────┐
│ VCC ────────────────────────┼── 5V             │ L (Línea) ──────────────┼── RED AC
│ GND ────────────────────────┼── GND            │                         │
│ IN  ────────────────────────┼── GPIO23 (ESP32) │ COM (Relé) ─────────────┼──►
│                             │                  │ NO  (Relé) ─────────────┼──► Timbre
│ COM ────────────────────────┼──► L (Línea)     │                         │
│ NO  ────────────────────────┼──► Carga Timbre  │ N (Neutro) ─────────────┼──► RED AC
└─────────────────────────────┘                  └─────────────────────────┘

LEDs ESTADO                                    BOTÓN RESET
┌─────────────────┐                           ┌─────────────────┐
│ LED_OK (Verde)  │                           │ BTN_RESET       │
│ Anodo ──[330Ω]──┼── GPIO2                   │ Un lado ────────┼── GPIO0
│ Catodo ─────────┼── GND                     │ Otro lado ──────┼── GND
└─────────────────┘                           └─────────────────┘

│ LED_ERROR (Rojo) │
│ Anodo ──[330Ω]──┼── GPIO4
│ Catodo ─────────┼── GND
└─────────────────┘
```

---

## Tabla de Conexiones Detallada

| Origen | Destino | Cable | Color Estándar | Sección |
|--------|---------|-------|----------------|---------|
| Buck OUT+ | ESP32 VIN | 1x | Rojo | 1.5mm² |
| Buck OUT+ | Relé VCC | 1x | Rojo | 1.5mm² |
| Buck OUT- | ESP32 GND | 1x | Negro | 1.5mm² |
| Buck OUT- | Relé GND | 1x | Negro | 1.5mm² |
| ESP32 GPIO23 | Relé IN | 1x | Amarillo | 0.5mm² |
| ESP32 GPIO2 | LED_OK + 330Ω | 1x | Verde | 0.5mm² |
| ESP32 GPIO4 | LED_ERROR + 330Ω | 1x | Rojo | 0.5mm² |
| ESP32 GPIO0 | BTN_RESET | 1x | Gris | 0.5mm² |
| Relé COM | Timbre Línea (L) | 1x | Marrón | 1.5mm² |
| Relé NO | Timbre Carga | 1x | Negro | 1.5mm² |
| Red L (Línea) | Fusible → Buck IN+ | 1x | Marrón | 1.5mm² |
| Red N (Neutro) | Buck IN- | 1x | Azul | 1.5mm² |
| Red PE (Tierra) | Carcasa/Chasis | 1x | Verde/Amarillo | 1.5mm² |

---

## Esquema de Bornes en Caja

```
┌────────────────────────────────────────┐
│          CAJA IP65 (Frente)             │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ LED  │  │ LED  │  │ BTN  │          │
│  │ OK   │  | ERROR│  │ RST  │          │
│  └──────┘  └──────┘  └──────┘          │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ BORNES TIMBRE (3P)             │    │
│  │ L  ──►│ COM (Relé)            │    │
│  │ N  ──►│ Neutro directo        │    │
│  │ ⏚ ──►│ Tierra                │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌──────────────────┐                 │
│  │ ENTRADA AC (2P)  │                 │
│  │ L ──► Fusible    │                 │
│  │ N ──► Buck IN-   │                 │
│  └──────────────────┘                 │
└────────────────────────────────────────┘
```

---

## Checklist de Cableado

- [ ] Verificar continuidad todas las conexiones GND
- [ ] Verificar 5V en buck OUT+ (multímetro)
- [ ] Verificar 3V3 en ESP32 3V3 pin
- [ ] Probar relé: GPIO23 LOW = relé ON (click audible)
- [ ] Probar LED_OK: GPIO2 HIGH = LED encendido
- [ ] Probar LED_ERROR: GPIO4 HIGH = LED encendido
- [ ] Probar BTN_RESET: GPIO0 a GND = reset
- [ ] Probar timbre: Relé ON = timbre suena
- [ ] Verificar que la hora se conserva tras apagar y encender (NVS)
- [ ] Aislamiento: >10MΩ entre circuito control (5V) y potencia (110/220V)
- [ ] Tierra: continuidad carcasa ↔ borne PE

> **Nota:** no se usa módulo RTC DS3231. Los pines GPIO21/GND/SCL (22) quedan libres;
> el firmware conserva soporte opcional para un DS3231 si se conectara después.

---

## Notas de Seguridad

1. **NUNCA** trabajar con la caja abierta y alimentada
2. Usar herramienta aislada para bornes AC
3. Verificar polaridad buck converter antes de conectar ESP32
4. Relé debe ser **active-low** (GPIO LOW = ON) para fail-safe
5. Fusible 2A **obligatorio** en línea de entrada
6. Cable de tierra (PE) debe ser mismo calibre que L/N
7. Separación física: circuitos 5V/3V3 lejos de bornes 110/220V (>8mm)
8. Etiquetar todos los cables en ambos extremos