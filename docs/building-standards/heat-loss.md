# Heat Loss & Heater Sizing

> **Quick reference — our 2×2m sauna**
> | Parameter | Value |
> |-----------|-------|
> | Room volume | **8.4 m³** (2.0 × 2.0 × 2.1) |
> | Target interior temperature | **85°C** (design value) |
> | Design exterior temperature | **−15°C** (southern Sweden, DVUT) |
> | ΔT | **100 K** |
> | Total heat loss (steady state) | **~1.5–1.8 kW** |
> | Recommended heater size | **6–8 kW** (includes heat-up capacity) |
> | Rule of thumb | **1 kW per 1.0–1.5 m³** |

---

## The basic formula

Heat loss through each building element:

```
Q = U × A × ΔT
```

Where:
- **Q** = heat loss (watts)
- **U** = thermal transmittance (W/m²K) — lower is better
- **A** = area of the element (m²)
- **ΔT** = temperature difference, interior minus exterior (K or °C)

Total steady-state heat loss = sum of Q for all elements (walls, roof, floor, windows, door).

---

## Design temperatures

### Interior
Sauna rooms are typically heated to **80–100°C**. Use **85°C** as the design value — this is
the temperature at bench head height. Temperature stratifies: floor level may be 40–50°C,
ceiling 90–100°C.

### Exterior
Southern Sweden (Skåne, Blekinge, southern Småland): the dimensionerande vinterutetemperatur
(DVUT) is typically **−15°C to −18°C** depending on location. Use **−15°C** for a reasonable
design value. (For a sauna you don't need to be as conservative as for a dwelling since brief
cold snaps don't matter much — the heater just runs a bit harder.)

**ΔT = 85 − (−15) = 100 K**

---

## Typical U-values for sauna elements

| Element | U-value (W/m²K) | Notes |
|---------|-----------------|-------|
| Insulated wood-frame wall (195 mm mineral wool) | 0.18 | See insulation.md |
| Shed roof with insulation (220 mm + 45 mm cross) | 0.13 | |
| Floor over ventilated terrace (195 mm insulation) | 0.18 | |
| Double-glazed sauna window | 1.2 | Frame + glazing combined |
| Triple-glazed window | 0.8–1.0 | Better but more expensive |
| Insulated wood door | 1.0 | Solid wood ~40 mm + insulation |
| Glass door (tempered, single pane) | 5.0–5.5 | Very high loss — significant |

---

## Worked example: 2.0 × 2.0 × 2.1 m sauna room

### Element areas

The sauna room has openings: one door (0.8 × 1.9 m) on the west wall, one window (1.1 × 1.1 m)
on the south wall. We subtract opening areas from wall areas.

| Element | Gross area | Openings | Net area (m²) |
|---------|-----------|----------|---------------|
| North wall | 2.0 × 2.1 = 4.20 | — | 4.20 |
| South wall | 2.0 × 2.1 = 4.20 | Window 1.21 | 2.99 |
| East wall | 2.0 × 2.1 = 4.20 | — | 4.20 |
| West wall | 2.0 × 2.1 = 4.20 | Door 1.52 | 2.68 |
| **Total walls** | | | **14.07** |
| Roof/ceiling | 2.0 × 2.0 | — | 4.00 |
| Floor | 2.0 × 2.0 | — | 4.00 |
| Window | | | 1.21 |
| Door | | | 1.52 |

### Heat loss per element (ΔT = 100 K)

| Element | U | A | Q = U×A×ΔT |
|---------|---|---|-----------|
| Walls (insulated) | 0.18 | 14.07 | 253 W |
| Roof | 0.13 | 4.00 | 52 W |
| Floor | 0.18 | 4.00 | 72 W |
| Window (double glazed) | 1.2 | 1.21 | 145 W |
| Door (glass, single pane) | 5.0 | 1.52 | 760 W |
| **Total steady-state** | | | **~1280 W** |

### Add air infiltration losses

Air leaks and intentional ventilation (fresh air inlet) cause additional heat loss.
Estimate: 0.5–1.0 air changes per hour (ACH). For 8.4 m³ at 0.75 ACH:

```
Q_air = ρ × cp × V × ACH / 3600 × ΔT
      = 1.2 × 1005 × 8.4 × 0.75 / 3600 × 100
      ≈ 210 W
```

### Total steady-state heat loss

**~1280 + 210 ≈ 1500 W (1.5 kW)**

> **Note:** The glass door dominates — it accounts for ~50% of the envelope loss. If using a
> solid insulated door (U ≈ 1.0) instead, the door loss drops from 760 W to 152 W, and total
> drops to ~870 W. The choice of door matters enormously for a small sauna.

---

## Why the heater is much larger than the steady-state loss

The heater must:
1. **Heat up the room** from ambient to 85°C (thermal mass of walls, stones, benches)
2. **Overcome the steady-state loss** during use
3. **Generate löyly** (steam) — evaporating water on stones consumes ~2.3 MJ/kg

A 1.5 kW heater could theoretically maintain temperature once hot, but would take hours to
heat up. Sauna heaters are oversized to provide a 30–60 minute heat-up time.

### Rule of thumb: kW per m³

| Insulation quality | kW per m³ |
|-------------------|-----------|
| Well-insulated (U ≤ 0.18 walls) | 1.0 kW/m³ |
| Moderately insulated (U ≈ 0.25) | 1.2–1.3 kW/m³ |
| Log walls without insulation | 1.5–1.8 kW/m³ |
| Glass door or large window: add | +1.0–1.5 m³ equivalent per m² of glass |

Manufacturers (Harvia, Huum, Tylö) typically specify heater sizing as:
- Calculate room volume in m³
- Add **1.0–1.5 m³ per m² of uninsulated surface** (glass, stone, tile, log)
- Select heater matching the adjusted volume

### Our sauna

- Base volume: **8.4 m³**
- Glass door (1.52 m²): add 1.5 × 1.52 = **2.3 m³**
- Large window (1.21 m²): add 1.2 × 1.21 = **1.5 m³**
- Adjusted volume: **~12.2 m³**
- At 0.6–0.7 kW per adjusted-m³: **7–8 kW heater**

A **6 kW** heater is the minimum; **8 kW** provides comfortable heat-up times (30–45 min)
and good löyly. Most manufacturers would recommend 8 kW for this configuration.

---

## Heat-up time estimate

Rough formula:

```
t = (m × c × ΔT) / (P_heater − Q_loss)
```

Where:
- **m** = thermal mass to heat (kg) — walls, ceiling, benches, stones, air
- **c** = specific heat (~1000 J/kgK for wood, ~840 for stone)
- **P_heater** = heater power (W)
- **Q_loss** = steady-state loss (W)

For a rough estimate, the "effective thermal mass" of a small well-insulated sauna is
approximately **150–250 kg** (interior panel surfaces, bench wood, heater stones, air).
The deep wall insulation doesn't need to be heated through.

With an 8 kW heater, 1.5 kW steady-state loss, heating from 20°C to 85°C:
```
t = (200 × 1000 × 65) / (8000 − 1500) = 13,000,000 / 6,500 ≈ 2000 s ≈ 33 minutes
```

This aligns well with real-world experience: a well-insulated 8 m³ sauna with an 8 kW
heater reaches temperature in **30–45 minutes**.

---

## Effect of the glass door

The glass door is the biggest single factor in this sauna's thermal performance:

| Door type | U-value | Heat loss | % of total |
|-----------|---------|-----------|------------|
| Single-pane tempered glass | 5.0 | 760 W | 50% |
| Double-pane insulated glass | 2.0 | 304 W | 28% |
| Solid insulated wood | 1.0 | 152 W | 16% |

If using a glass door (which looks beautiful and is common), consider **double-pane insulated
glass** as a middle ground. Single-pane glass doors are popular in Finnish saunas but come with
a real energy cost.

---

## Sources

- **SMHI** — smhi.se, design temperatures for Swedish municipalities
- **Harvia heater sizing guide** — harvia.com, "Choose the right heater"
- **Huum sizing calculator** — huum.ee, sauna heater sizing tool
- **Tylö installation manuals** — tylo.com, heater selection tables
- **SS-EN ISO 6946** — SIS, thermal resistance and U-value calculation
- **BBR 9** — Boverket, energy requirements
