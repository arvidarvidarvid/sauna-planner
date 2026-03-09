# Insulation

> **Quick reference**
> | Element | Target U-value | Typical insulation | Thickness |
> |---------|---------------|-------------------|-----------|
> | Walls | ≤ 0.18 W/m²K | Stone wool (λ=0.036) | 195 mm in studs + 45 mm cross-batten |
> | Roof | ≤ 0.13 W/m²K | Stone wool + opt. PIR above rafters | 220 mm + 45 mm, or 200 mm PIR |
> | Floor (over terrace) | ≤ 0.18 W/m²K | Stone wool between joists | 195 mm |
> | Window | ≤ 1.2 W/m²K | Double or triple glazed | — |
> | Vapor barrier | Sd > 100 m | Aluminum-laminated PE, ≥ 0.20 mm | On hot (interior) side |

---

## Swedish regulatory context

BBR (Boverkets byggregler) chapter 9 (Energihushållning) sets U-value requirements for heated
buildings. The current consolidated version is BBR 29 (BFS 2011:6 with amendments through
BFS 2023:1).

**For small outbuildings** (< 50 m² Atemp): BBR 9:2 applies a simplified requirement — the
building must not have unnecessarily poor energy performance, but the strict prescriptive
U-value table in BBR 9:4 (for dwellings) doesn't bind in the same way. However, the moisture
requirements in **BBR 6:5 apply unconditionally** to all buildings.

**Attefallsåtgärder** (up to 15 m² floor area): no building permit needed in most municipalities,
but technical requirements under PBL still apply (PBL 8 kap 4 §).

In practice, these **guideline U-values** are used for small heated outbuildings in climate zone
III (southern Sweden):

| Component | Target U (W/m²K) |
|-----------|-----------------|
| Exterior wall | ≤ 0.18–0.20 |
| Roof/ceiling | ≤ 0.13–0.15 |
| Floor | ≤ 0.15–0.18 |
| Windows/doors | ≤ 1.2 |

For a sauna specifically: good insulation means faster heat-up and lower running cost,
so meeting dwelling-level U-values is strongly recommended regardless of strict legal obligation.

> **⚠ Verify:** From 1 July 2025, Sweden's building regulations are being restructured. During
> the transition period through 30 June 2026, builders may use either the old or new BBR.
> Check current BBR at boverket.se.

---

## Vapor barrier — the most critical detail

### Why on the interior (hot) side?

Moisture in warm air diffuses toward cold (dew point rule). In a sauna at 80–100°C with very
high humidity, the vapor pressure differential is extreme. The vapor barrier must stop
moisture-laden air before it reaches the cold outer parts of the wall where it would condense.

**Getting this wrong** means condensation forms inside the insulation. The mineral wool saturates,
loses R-value, and mold/rot develop in the framing within a few years. In a sauna this process
is dramatically faster than in a normal building.

### Material

| Material | Sd value | Notes |
|----------|----------|-------|
| Standard PE film (0.20 mm) | ~100 m | OK for normal buildings, marginal for saunas |
| **Aluminum-laminated PE** | > 200 m | **Recommended for saunas** |
| Aluminum foil (pure) | > 1000 m | Excellent but fragile, hard to tape |

Use **aluminum-laminated PE** (e.g. Jutafol AL, Isover Vario). The aluminum layer provides
near-zero vapor permeability and reflects radiant heat back into the room.

### Installation rules
- All joints overlap **≥ 200 mm** and sealed with vapor-tight tape (e.g. Pro Clima Tescon Vana)
- **No penetrations** — use surface-mounted, sauna-rated fittings for electrics
- Interior panel attached to **counter-batten** (25 mm) over the vapor barrier → creates air gap
  so the panel can breathe and dry between sessions

---

## Wall build-up (exterior → interior)

```
Exterior cladding (board/panel)        ── 22–25 mm
Ventilation gap on battens             ── 25 mm
Wind barrier / breather membrane       ── (e.g. Tyvek HomeWrap)
Structural frame (45×195 mm @ 600 c/c) ── 195 mm
Stone wool filling full cavity         ── 195 mm  (λ = 0.033–0.036)
Aluminum-laminated PE vapor barrier    ── taped, all seams
Counter-batten                         ── 25 mm  (creates air gap)
Interior aspen/alder panel (T&G)       ── 15–19 mm
```

**Total wall thickness: ~290 mm**

**U-value estimate:**
- Insulation: R = 0.195 / 0.036 = 5.42 m²K/W
- Add surface resistances + cladding + panel: ~0.4 m²K/W
- Derate for stud bridging (~15% area): effective R ≈ 5.1
- Total R ≈ 5.5 → **U ≈ 0.18 W/m²K** ✓

### Optional: cross-batten insulation layer

For colder regions or to eliminate stud thermal bridging:
- Add 45 mm cross-batten layer with mineral wool inside the studs (before vapor barrier)
- Total insulation: 195 + 45 = 240 mm → U ≈ 0.14 W/m²K

### Mineral wool choice

Use **stone wool (stenull)** — dimensionally stable at elevated temperatures and handles
condensation better than glass wool. Avoid glass wool with organic binders that may off-gas
at sauna temperatures.

Products: Rockwool Saferock, Rockwool Skiva 35, Paroc Extra.
Lambda: **0.033–0.036 W/mK**.

---

## Roof insulation (shed metal roof)

A metal sheet is essentially vapor-tight. The assembly below must be carefully detailed.

### Cold roof design (recommended — includes ventilation gap):

```
Standing-seam metal roofing            ── 0.5–0.7 mm steel
Ventilation gap on battens             ── ≥ 50 mm (air flows eaves → ridge)
Wind barrier / underlay                ── (e.g. Divoroll Top)
Rafters (45×220 mm)                    ── 220 mm
Stone wool between rafters             ── 220 mm
Cross-batten layer (optional)          ── 45 mm
Aluminum-laminated PE vapor barrier    ── taped, continuous
Counter-batten                         ── 25 mm
Interior aspen/alder ceiling panel     ── 15 mm
```

**U-value (220 mm + 45 mm cross-batten):**
- Effective R ≈ 7.0 (with rafter bridging) → **U ≈ 0.14 W/m²K** ✓

### Why the ventilation gap above insulation?
Without it, moisture that gets past the vapor barrier condenses on the cold metal underside.
The vent gap lets this moisture evaporate and escape. This is critical for metal roofs.

### Minimum roof pitch for standing-seam metal
Typically **3–5°** minimum — check the specific product (Lindab, Plannja).
Our 5° shed roof is at the lower limit.

---

## Floor: sauna on existing terrace

The terrace provides a ventilated sub-floor. No concrete slab needed.

### Build-up (terrace → interior):

```
Existing terrace boards (with gaps)    ── existing
EPDM pads or plastic spacers          ── 10–20 mm (moisture separation)
Floor joists (45×195 mm @ 400–600 c/c) ── 195 mm
Stone wool between joists              ── 195 mm
Aluminum-laminated PE vapor barrier    ── above insulation (warm side)
Plywood structural deck                ── 18–22 mm
Duckboard sections (removable)         ── ~44 mm
```

### Key details:
- **Spacers** between terrace and joists prevent capillary moisture transfer and allow the
  terrace to dry. EPDM pads or stainless steel brackets work.
- **Vapor barrier above insulation** (warm side) — prevents sauna humidity soaking downward
- Wind barrier below joists optional but recommended to protect insulation from underneath
- **Plywood deck** painted with waterproof primer before duckboards are laid
- **Duckboards must be removable** for cleaning and drying

**U-value (195 mm stone wool):** ~0.18 W/m²K ✓

---

## Thermal bridging

### Corners
At 90° wall corners, one wall's frame member runs right to the edge and is exposed to cold.
**Fix:** use three-stud corners leaving room for insulation in the cavity. Or accept it — the
bridge is minor for a small sauna.

### Window frames
Use thermally broken frames (wood/aluminium composite or plastbrygga). Target U ≤ 1.2 W/m²K
for the whole window unit (frame + glazing).

### Rafter ends at eaves
The rafter-to-wall-plate junction is a classic cold bridge. Ensure insulation is continuous
or use rigid insulation blocks at the eaves junction.

---

## BBR references

| Reference | Content |
|-----------|---------|
| BBR 9:1 | Scope, definitions of Atemp |
| BBR 9:2 | Specific energy use (applies to buildings > 50 m² Atemp) |
| BBR 9:4 | U-value table (dwellings) — used as guideline for outbuildings |
| BBR 6:5 | Moisture requirements (applies to ALL buildings) |
| BBR 6:5322 | Wet room (våtrum) requirements |
| SS-EN ISO 6946 | U-value calculation method |
| SS-EN ISO 13788 | Hygrothermal performance / dew point analysis |
| PBL 8 kap 4 § | Technical requirements apply to permit-exempt buildings |
| AMA Hus | Swedish construction specification detailing standard |
