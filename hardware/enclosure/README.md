# Diseño de Caja IP65 - Timbre Escolar Inteligente

## Especificaciones Mecánicas

| Parámetro | Valor |
|-----------|-------|
| Dimensiones externas | 180 x 130 x 85 mm (L x A x P) |
| Dimensiones internas | 170 x 120 x 70 mm |
| Material | ABS + PC (UL94 V-0) / Policarbonato |
| Color | Gris RAL 7035 / Antracita RAL 7016 |
| Grado protección | IP65 (IEC 60529) |
| Temperatura operación | -10°C a +50°C |
| Montaje | Pared (4 tornillos M5) / Carril DIN (opcional) |
| Peso aprox | 450g (con electrónica) |

---

## Layout Interno

```
┌─────────────────────────────────────────────────────────────┐
│  VISTA SUPERIOR (Tapa abierta)                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [ESP32]          [BUCK]          [RELÉ]             │    │
│  │  ┌─────┐           ┌─────┐         ┌─────┐           │    │
│  │  │ USB │           │     │         │ IN  │           │    │
│  │  └─────┘           └─────┘         └─────┘           │    │
│  │                                                    │    │
│  │  [DS3231]         [BORNE AC]       [BORNE TIMBRE]  │    │
│  │  ┌─────┐          ┌─────────┐      ┌───────────┐   │    │
│  │  │     │          │ L  N    │      │ L  N  ⏚   │   │    │
│  │  └─────┘          └─────────┘      └───────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes y Posicionamiento

| Componente | Posición | Montaje | Espacio requerido |
|------------|----------|---------|-------------------|
| ESP32 DevKit V1 | Esquina superior izq | Tornillos M3 x 4 (standoffs 10mm) | 55 x 28 x 15mm |
| Buck Converter LM2596 | Centro superior | Tornillos M3 x 2 / Cinta 3M VHB | 43 x 21 x 14mm |
| Módulo Relé 1ch | Esquina superior der | Tornillos M3 x 2 | 35 x 25 x 18mm |
| DS3231 RTC | Junto a ESP32 | Pines header hembra / Socket | 14 x 10 x 8mm |
| Bornes AC (2P) | Lado inferior izq | Tornillos M3 en pared caja | 25 x 20 x 15mm |
| Bornes Timbre (3P) | Lado inferior der | Tornillos M3 en pared caja | 35 x 20 x 15mm |
| LEDs (OK/ERROR) | Panel frontal | A presión / Calor | 5mm Ø c/u |
| Botón Reset | Panel frontal | Rosca M12 / A presión | 12mm Ø |
| Fusible 2A | En línea con L (dentro caja) | Portafusible panel | 20 x 8mm |

---

## Panel Frontal (Mecanizado)

```
┌────────────────────────────────────────┐
│           PANEL FRONTAL (180 x 85mm)    │
│                                          │
│   ┌─────┐         ┌─────┐   ┌─────┐     │
│   │ ●OK │         │ ●ERR│   │ ○RST│     │
│   └─────┘         └─────┘   └─────┘     │
│   VERDE         ROJO        GRIS        │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │ TIMBRE ESCOLAR INTELIGENTE        │   │
│   │ v1.0.0  |  IP65  |  5V/2A        │   │
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │ BORNE TIMBRE (3P)                │   │
│   │ L   N   ⏚                        │   │
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │ ENTRADA AC (2P)                  │   │
│   │ L      N                         │   │
│   └──────────────────────────────────┘   │
└────────────────────────────────────────┘

Taladros:
- 2x Ø5mm (LEDs) - Centros a 30mm del borde superior
- 1x Ø12mm (Botón reset) - Centrado abajo
- 1x Bornes timbre 3P - 3x Ø4mm + 2 tornillos M3
- 1x Bornes AC 2P - 2x Ø4mm + 2 tornillos M3
- 4x Ø5.5mm esquinas (tornillos M5 montaje pared)
```

---

## Archivos 3D (Impresión 3D / CNC)

### Formatos disponibles
- `enclosure.step` - Modelo STEP (editable en FreeCAD, Fusion 360, SolidWorks)
- `enclosure.stl` - Malla para impresión 3D (FDM/SLA)
- `enclosure.fcstd` - FreeCAD nativo (paramétrico)
- `panel_front.dxf` - Perfil frontal para láser/CNC

### Parámetros de impresión 3D (FDM)
| Parámetro | Valor |
|-----------|-------|
| Material | ASA / ABS (resistente UV/calor) / PETG |
| Altura capa | 0.2mm |
| Relleno | 30% (gyroid) |
| Paredes | 3 perímetros (1.2mm) |
| Soportes | Solo tapas bornes / reset |
| Temperatura nozzle | 240°C (ASA) / 260°C (ABS) |
| Temperatura cama | 100°C (ASA/ABS) / 80°C (PETG) |
| Tiempo estimado | 6-8 horas (cuerpo + tapa) |

### Post-procesamiento
1. Lijar superficies de contacto (tapa/cuerpo) para sellado IP65
2. Aplicar grasa silicona en junta tórica
3. Tornillos M3x16mm acero inoxidable (x8) + arandelas
6. Junta tórica: Ø160mm x 3mm (EPDM 70 ShA)
7. Prensaestopas PG9 para cables (x2: AC + Timbre)

---

## Ensamblaje Paso a Paso

1. **Preparar PCB/Componentes**
   - Soldar headers en ESP32, DS3231, Relé, Buck
   - Verificar continuidad y cortocircuitos

2. **Montar en base**
   - Atornillar standoffs M3x10mm en base (4x ESP32, 2x Buck, 2x Relé)
   - Colocar ESP32, Buck, Relé en standoffs
   - Atornillar bornes AC y Timbre en pared lateral

3. **Cableado interno**
   - Seguir diagrama `wiring/README.md`
   - Usar ferrules en cables >0.5mm²
   - Etiquetar cada cable (L, N, GND, 5V, GPIOxx)

4. **Panel frontal**
   - Instalar LEDs (OK verde, ERROR rojo) con 330Ω
   - Instalar botón reset M12
   - Cablear a GPIO2, GPIO4, GPIO0 + GND

5. **Sellado y cierre**
   - Limpiar superficies de junta con alcohol isopropílico
   - Colocar junta tórica EPDM en ranura de tapa
   - Aplicar grasa silicona ligera en junta
   - Cerrar tapa, atornillar 8x M3x16mm (orden cruzado, 0.5Nm)

6. **Prensacables**
   - PG9 para cable AC (L+N+PE, 3x1.5mm²)
   - PG9 para cable Timbre (L+N+PE, 3x1.5mm²)
   - Apretar tuercas de seguridad

7. **Pruebas finales**
   - Verificar IP65: inmersión 30s en agua (sin electrónica)
   - Hi-pot test: 1500V AC 1min entre circuitos 5V y bornes AC
   - Encender, verificar LEDs, WiFi, timbre

---

## Archivos CAD

```
hardware/enclosure/
├── enclosure.step          # Modelo 3D completo (STEP AP214)
├── enclosure.stl           # Para impresión 3D (cuerpo + tapa)
├── enclosure.fcstd         # FreeCAD 0.21+ (paramétrico)
├── panel_front.dxf         # Perfil frontal (láser/CNC)
├── standoffs.step          # Standoffs M3x10mm
├── gasket_profile.dxf      # Perfil junta tórica
├── mounting_template.pdf   # Plantilla taladros pared (1:1)
└── bom_enclosure.csv       # Lista materiales mecánicos
```

---

## Variantes

| Variante | Descripción | Cambios |
|----------|-------------|---------|
| **Standard** | Caja base | Como arriba |
| **DIN Rail** | Montaje carril DIN 35mm | Clips DIN en parte trasera |
| **Outdoor+** | Exterior directo | Ventila con filtro IP54, disipador externo |
| **PoE** | Alimentación PoE | Añadir módulo PoE 5V/2A, RJ45 sellado |

---

## Certificaciones Objetivo

- **IP65**: IEC 60529 (polvo + chorros agua)
- **IK08**: Impacto 5J (caja ABS/PC)
- **CE**: LVD 2014/35/UE, EMC 2014/30/UE
- **RoHS**: 2011/65/UE
- **UL94 V-0**: Autoextinguible (material)

---

## Mantenimiento

| Acción | Frecuencia |
|--------|------------|
| Verificar sellado junta | Anual |
| Limpiar ventilación (si aplica) | Semestral |
| Probar botón reset + LEDs | Mensual |
| Verificar batería RTC (CR2032) | Anual (cambiar c/ 3 años) |
| Re-aplicar grasa silicona junta | Cada 2 años |