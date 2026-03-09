# Snow Loads

> **Quick reference — our shed roof**
> | Parameter | Value |
> |-----------|-------|
> | Standard | **SS-EN 1991-1-3** + Swedish national annex **EKS** |
> | Characteristic snow load sk (southern Sweden) | **1.5–2.0 kN/m²** |
> | Shape coefficient μ₁ (shed roof 0–30°) | **0.8** |
> | Exposure coefficient Ce (normal terrain) | **1.0** |
> | Thermal coefficient Ct (heated building) | **1.0** (or 0.8 if poorly insulated) |
> | Design snow load on our roof (sk=1.5) | **1.2 kN/m²** ≈ 120 kg/m² |
> | Total roof area | **~3.2 × 2.0 = 6.4 m²** (excl overhang) |
> | Total design snow weight | **~770 kg** |

---

## The standard

Snow loads on structures in Sweden are governed by:

- **SS-EN 1991-1-3** (Eurokod 1, del 1-3) — Actions on structures: snow loads
- **EKS (Europeiska KonstruktionsStandarder)** — the Swedish national annex, issued by Boverket
  (currently EKS 11, verify for latest edition)

The Swedish national annex provides the characteristic ground snow load map (sk-values)
for Swedish municipalities and modifies certain Eurocode parameters.

---

## Characteristic ground snow load (sk)

The sk value is the weight of snow on the ground (not on the roof) with a 50-year return period.
Sweden is divided into snow load zones:

| Region | sk (kN/m²) | sk (kg/m²) |
|--------|-----------|------------|
| Skåne (coastal) | 1.0–1.5 | 100–150 |
| Skåne (inland), Blekinge | 1.5–2.0 | 150–200 |
| Southern Småland, Halland | 2.0–2.5 | 200–250 |
| Gothenburg area | 1.5–2.0 | 150–200 |
| Stockholm area | 2.0–2.5 | 200–250 |
| Northern Svealand | 2.5–3.5 | 250–350 |
| Norrland (coast) | 3.0–4.5 | 300–450 |
| Norrland (inland / mountains) | 4.5–7.0+ | 450–700+ |

> **⚠ Verify** your exact municipality's sk value in EKS Table B-1 (bilaga B) or use Boverket's
> online lookup tool. The table is municipality-specific.

---

## From ground load to roof load

The design snow load on the roof is:

```
s = μ × Ce × Ct × sk
```

Where:

### μ — shape coefficient

Depends on roof geometry and pitch:

| Roof type | Pitch α | μ₁ |
|-----------|---------|-----|
| Flat (0°) | 0° | 0.8 |
| Shed / monopitch | 0° ≤ α ≤ 30° | 0.8 |
| Shed / monopitch | 30° < α ≤ 60° | 0.8 × (60−α)/30 |
| Shed / monopitch | α > 60° | 0 |
| Gabled (symmetric) | 0° ≤ α ≤ 30° | 0.8 (both slopes) |
| Gabled (asymmetric load) | 0° ≤ α ≤ 30° | 0.8 one side + 0.4 other side |

**For our 5° shed roof: μ₁ = 0.8**

### Ce — exposure coefficient

Accounts for wind exposure of the site:

| Site type | Ce |
|-----------|-----|
| Windswept (no shelter, open terrain) | 0.8 |
| Normal (some shelter, suburban) | 1.0 |
| Sheltered (surrounded by trees/buildings) | 1.2 |

**For a terrace-mounted sauna in a garden: Ce = 1.0** (typical suburban)

### Ct — thermal coefficient

Accounts for heat loss through the roof melting snow:

| Roof type | Ct |
|-----------|-----|
| Well-insulated roof (U ≤ 0.2) | 1.0 |
| Poorly insulated / heated below | 0.8 |
| Unheated building | 1.0 |

For a well-insulated sauna roof: **Ct = 1.0** (the insulation prevents significant heat loss
through the roof, so snow doesn't melt). During active use the sauna is hot, but between
sessions it's cold — design for the worst case (cold, full snow load).

---

## Calculation for our sauna

Assuming southern Sweden, sk = 1.5 kN/m²:

```
s = 0.8 × 1.0 × 1.0 × 1.5 = 1.2 kN/m²
```

This is **120 kg/m²** — about 12 cm of wet heavy snow, or 40 cm of light powder.

### Total load on the roof structure

Roof plan area (excluding overhang for structural calculation):
- Building footprint: 3.2 × 2.0 = 6.4 m²
- Including overhang (0.3 m all sides): (3.2 + 0.6) × (2.0 + 0.6) = 9.88 m²

The snow sits on the full projected area including overhang:
```
Total snow load = 1.2 × 9.88 ≈ 11.9 kN ≈ 1210 kg
```

This is distributed across the rafters.

---

## Drift loads (for shed/flat roofs)

When a low building is adjacent to a taller structure (wall, fence), snow can drift and
accumulate deeper on the low side. Eurocode 1991-1-3 Annex B covers this.

**For our sauna:** If the sauna is freestanding on a terrace (not abutting a taller wall),
drift loads are not an issue. If there's a wall/fence on the north side (the low draining side
of the shed roof), drift accumulation should be checked.

Drift load at an obstruction:

```
μ_drift = min(2h/sk, 5, 2b/ls)  (simplified)
```

Where h = height difference, ls = drift length. For small buildings this rarely governs over
the uniform load case.

---

## Structural adequacy check (simplified)

### Rafter sizing

For our sauna with rafters spanning 2.0 m (north-south):

- Rafter spacing: 600 mm c/c
- Snow load per rafter: 1.2 kN/m² × 0.6 m = 0.72 kN/m (line load)
- Add self-weight of roof (~0.3–0.5 kN/m²): total ≈ 1.0 kN/m per rafter
- Span: 2.0 m (simple span, supported at both walls)

Maximum bending moment:
```
M = q × L² / 8 = 1.0 × 2.0² / 8 = 0.5 kNm
```

A **45 × 195 mm** C24 timber rafter has a moment capacity of approximately **2.5 kNm** —
well above the 0.5 kNm demand. The rafters are adequate with large margin.

Even a **45 × 145 mm** rafter (capacity ~1.4 kNm) would be sufficient.

For deflection: L/200 limit at a 2.0 m span with a 45×195 rafter → max deflection ~2 mm
under full snow load. No issue.

---

## Load combinations (Eurocode)

The design load for ultimate limit state (ULS):

```
Ed = 1.35 × Gk + 1.5 × Qk
```

Where Gk = permanent load (self-weight) and Qk = variable load (snow).

For our rafter:
```
Gk ≈ 0.3 kN/m (per rafter)
Qk ≈ 0.72 kN/m (snow)
Ed = 1.35 × 0.3 + 1.5 × 0.72 = 0.405 + 1.08 = 1.485 kN/m

M_Ed = 1.485 × 2.0² / 8 = 0.74 kNm
```

Still well within the capacity of a 45×195 rafter.

---

## Sources

- **SS-EN 1991-1-3** — SIS (sis.se), Eurokod 1: Laster på bärverk, Del 1-3: Snölast
- **EKS (Boverkets konstruktionsregler)** — boverket.se, currently EKS 11
- **Boverket's snow load municipality table** — boverket.se, bilaga B till EKS
- **SS-EN 1995-1-1** — Eurokod 5: timber design (for rafter capacity calculations)
- **Swedish Wood (Svenskt Trä)** — svenskttra.se, rafter span tables for C24 timber

> **⚠ Verify** your municipality's exact sk value before building. The values above are
> representative for southern Sweden but vary by municipality.
