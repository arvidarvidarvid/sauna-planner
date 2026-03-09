# Heater Placement

> **Quick reference**
> | Parameter | Value | Notes |
> |-----------|-------|-------|
> | Heater to combustible wall (no shielding) | **500 mm** | Manufacturer manual is legally binding |
> | With one fire shield | **250 mm** | 50% reduction per shield layer |
> | With double shielding | **125 mm** | |
> | Heater to ceiling (above stones) | **1000–1200 mm** | |
> | Chimney above roof covering | **≥ 1000 mm** | BBR |
> | Uninsulated flue to combustible (sides) | **≥ 500 mm** | 250 mm with shield |
> | Insulated chimney to combustible in roof | **≥ 100 mm** air gap | |
> | Minimum ceiling height | **1900 mm** | Some heaters require 2300 mm |
> | IP class in sauna (all zones) | **IP24 minimum** | SS 436 40 00 / IEC 60364-7-703 |
> | Luminaire temp rating (Zone 1/2) | **125°C** | |
> | Cable temp rating (Zone 1/2) | **170°C** | |

---

## Standards

**Electric heaters:** The governing product standard is **SS-EN 60335-2-53** (Swedish adoption of
IEC/EN 60335-2-53). The manufacturer's CE-marked installation manual is the legally controlling
document — distances in it cannot be reduced by adding shields after the fact.

Note: SS 9240-10 does not appear to be a currently active or publicly referenced standard. The
relevant standard is definitively SS-EN 60335-2-53.

**Wood-burning stoves:** Fall under general _eldstad_ (fireplace/stove) rules in **BBR** (Boverkets
byggregler), enforced under Plan- och Bygglagen (PBL).

**Electrical installations:** **SS 436 40 00 utg 4:2023** (Swedish low-voltage installation rules,
implementing IEC 60364). Section 703 covers sauna rooms specifically.

---

## Safety distances — electric heaters

The manufacturer's manual always takes precedence. These are typical industry values:

| Surface | No shielding | With one radiation shield |
|---------|-------------|--------------------------|
| Rear wall (combustible) | 200–500 mm | 100–250 mm |
| Side walls (combustible) | 200–500 mm | 100–250 mm |
| Ceiling (above stones) | 1000–1200 mm | 500–600 mm |
| Benches (lateral) | Per manual, typically 500 mm | — |

The widely cited Swedish baseline is **500 mm to combustible materials** without shielding.
One certified fire-protection shield (brandskyddsskiva) halves this to 250 mm, double shielding
halves again to ~125 mm.

---

## Safety distances — wood-burning stoves

Under BBR general eldstad rules:

| Element | Clearance |
|---------|-----------|
| Side clearance to combustible | 500 mm free air, or 250 mm with 8 mm steel/fiber cement shield |
| With EI 60-rated fire wall | 50 mm |
| Above stove top to combustible | 1000 mm, or 500 mm with shielding (if surface temp stays < 90°C) |
| Hearth/floor protection | Non-combustible material required under and in front of firebox |

### Chimney requirements

| Parameter | Requirement |
|-----------|-------------|
| Height above roof covering | ≥ 1000 mm |
| Roof pitch 5°–20° | ≥ 400 mm above ridge, or ≥ 1000 mm above penetration point |
| Uninsulated flue to combustible (sides) | ≥ 500 mm (250 mm with shield) |
| Insulated modular chimney to combustible in roof | ≥ 100 mm air gap |
| Roof penetration | Certified roof penetration kit (takgenomföring) mandatory |
| Inspection before first use | **Sotaren (chimney sweep) must inspect** — legal requirement |

### Combustion air

A dedicated combustion air inlet is not strictly legally required to be separate from the sauna
room's general ventilation, but it must be functionally adequate. Standard approach:

- Air supply opening **low, near or directly below the stove** (floor level)
- The chimney provides exhaust draft during firing
- In airtight insulated construction, a dedicated floor-level vent (100–200 cm²) directly
  serving the stove is best practice and may be required
- In loose log/plank construction, air infiltration is often sufficient

---

## Electrical zones in sauna rooms

IEC 60364-7-703 / SS 436 40 00 §703 defines three zones:

```
┌──────────────────────────────────────┐
│            ZONE 1                    │ ceiling
│  (above heater to ceiling,          │
│   and 0.5m radius around heater)    │
├──────────────────────────────────────┤ 1.0–1.5m height
│                                      │
│            ZONE 2                    │
│  (rest of sauna interior)           │
│                                      │
├──────────────────────────────────────┤ floor
│  ZONE 3: outside sauna, 1m from door │
└──────────────────────────────────────┘
```

| Zone | IP class | What's permitted |
|------|----------|-----------------|
| Zone 1 | IP24 + 125°C rated | **Only** the heater itself and its integral controls |
| Zone 2 | IP24 + 125°C rated | Sauna luminaires (purpose-designed). No sockets or switches. |
| Zone 3 | IP24 | Standard bathroom-grade fittings, light switches |

### Key electrical rules

- **No sockets or switches** inside the sauna room
- All sauna wiring (except heater circuit) protected by **30 mA RCD (jordfelsbrytare)**
- Heater requires a **dedicated circuit**, hard-wired (not plug-connected)
- Heaters > ~3 kW: typically **400V three-phase**
- Cables must run on the cold side of insulation where possible; heat-resistant cables (170°C)
  on the warm side
- All work must be performed by a **registered electrical contractor**
- The heater's own control panel/timer is the only exception to the "no switches inside" rule

---

## Placement relative to benches — best practice

### Corner placement (recommended for small saunas)

Best for rooms up to ~8–10 m³ (like our 2×2m sauna). The heater goes in a corner, maximizing
bench space. Heat radiates in a ~90° arc.

**Corner on the door wall** is especially effective:
- Hot air mass stays away from the door → less heat loss when door opens
- Clean convective loop: hot air rises at heater → across ceiling → descends along far walls →
  returns low to heater

### Center-wall placement

Better for larger saunas (10+ m³). More symmetric löyly distribution. Requires more floor space.

### Heater-to-bench relationship

- Never place the heater directly under or adjacent to the upper bench
- Heater should be at **bench-end level** (beside the bench platform)
- Benches run along walls perpendicular to the heater wall, or on the opposite wall

### The "Rule of 230"

Upper bench surface should be **1000–1100 mm below ceiling** for optimal heat. Target ceiling
height 2100–2300 mm. This puts the bathers' heads in the hottest zone (heat stratifies upward).

---

## Sources

- **SS-EN 60335-2-53** — SIS (sis.se), product safety standard for electric sauna heaters
- **SS 436 40 00 utg 4:2023** — SEK Svensk Elstandard (elstandard.se), section 703
- **IEC 60364-7-703:2004** — IEC Webstore (webstore.iec.ch)
- **Tukes (Finnish safety authority)** — tukes.fi, harmonized Nordic electrical installation rules for saunas
- **Elsäkerhetsverket** — elsakerhetsverket.se, installation of electrics in wet rooms
- **Boverket PBL kunskapsbanken** — boverket.se, sections on eldstäder och kanaler, skorstenshöjd
- **BBR (Boverkets byggregler)** — brandskydd / förbränningsgaser chapters

> **⚠ Verify:** SS-EN 60335-2-53 and SS 436 40 00 are behind paywalls at SIS/SEK. The values
> here are from publicly available previews, Tukes (harmonized with Sweden), and Swedish trade
> sources. Always check the actual purchased standard and your specific heater's installation
> manual before building.
