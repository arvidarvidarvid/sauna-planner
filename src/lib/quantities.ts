import type { Building } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import { generateWallFraming, generateRafters } from '@/lib/framing'
import {
  type PricedItem,
  PRICES,
  COVER_WIDTHS,
  ROLL_COVERAGE,
  SCREWS_PER_M2,
} from '@/lib/pricing'

// ── Legacy types (kept for backward compat) ──────────────────────────────────

export interface MaterialQuantity {
  layerName: string
  material: string
  area: number
  thickness: number
  volume: number
  framingLinearMeters?: number
  framingCount?: number
}

export interface QuantitySummary {
  walls: MaterialQuantity[]
  roof: MaterialQuantity[]
  floor: MaterialQuantity[]
}

// ── Shopping list ────────────────────────────────────────────────────────────

export interface ShoppingList {
  items: PricedItem[]
  totalCost: number
}

/** 10% waste factor applied to cut-to-length materials */
const WASTE = 1.10

function roundUp(n: number, precision = 1): number {
  return Math.ceil(n * precision) / precision
}

/**
 * Compute a purchasable shopping list with Byggmax pricing.
 * Excludes terrace (pre-existing) and floor assembly.
 */
export function computeShoppingList(
  building: Building,
  wallAssembly?: Assembly,
  roofAssembly?: Assembly,
): ShoppingList {
  const items: PricedItem[] = []
  const { width: bw, length: bl, wallHeight: wh } = building.dimensions

  // ── Exterior wall area ──────────────────────────────────────────────────

  // Unique exterior openings (deduplicate shared partition openings)
  const exteriorOpeningIds = new Set<string>()
  let openingArea = 0
  for (const room of building.rooms) {
    for (const wall of Object.values(room.walls)) {
      for (const o of wall.openings) {
        if (!exteriorOpeningIds.has(o.id)) {
          exteriorOpeningIds.add(o.id)
          openingArea += o.width * o.height
        }
      }
    }
  }

  const perimeter = 2 * (bw + bl)
  const grossWallArea = perimeter * wh
  const netWallArea = grossWallArea - openingArea

  // ── Wall assembly materials ─────────────────────────────────────────────

  if (wallAssembly) {
    for (const layer of wallAssembly.layers) {
      if (layer.material === 'air-gap') continue // ventilation gaps are just space

      if (layer.framing) {
        // Structural studs — generate for all 4 walls
        const opts = {
          memberWidth: layer.framing.memberWidth,
          spacing: layer.framing.spacing,
          layerThickness: layer.thickness,
        }
        const allMembers = [
          ...generateWallFraming(bw, wh, wh, [], opts),
          ...generateWallFraming(bw, wh, wh, [], opts),
          ...generateWallFraming(bl, wh, wh, [], opts),
          ...generateWallFraming(bl, wh, wh, [], opts),
        ]
        const totalLm = allMembers.reduce((s, m) => s + m.height, 0) * WASTE
        const dim = layer.thickness >= 0.12 ? '45×145' : '45×95'
        const price = layer.thickness >= 0.12 ? PRICES.stud_45x145 : PRICES.stud_45x95
        items.push({
          name: `Regel ${dim} (väggar)`,
          unit: 'lm',
          qty: roundUp(totalLm),
          unitPrice: price,
          category: 'framing',
        })

        // Insulation between studs
        const insulArea = netWallArea * WASTE
        const thick = layer.thickness * 1000
        const insulPrice = thick >= 120 ? PRICES.stone_wool_145 : PRICES.stone_wool_95
        items.push({
          name: `Stenull ${thick.toFixed(0)}mm (väggar)`,
          unit: 'm²',
          qty: roundUp(insulArea),
          unitPrice: insulPrice,
          category: 'insulation',
        })
      } else if (layer.material === 'exterior-board') {
        // Exterior cladding — convert area to linear meters
        const lm = (netWallArea / COVER_WIDTHS.exterior_board) * WASTE
        items.push({
          name: 'Ytterpanel 22×120',
          unit: 'lm',
          qty: roundUp(lm),
          unitPrice: PRICES.exterior_board_22x120,
          category: 'cladding',
        })
      } else if (layer.material === 'wind-barrier') {
        const rolls = Math.ceil(netWallArea / ROLL_COVERAGE.wind_barrier)
        items.push({
          name: 'Vindskydd (väggar)',
          unit: 'roll',
          qty: rolls,
          unitPrice: PRICES.wind_barrier_roll,
          category: 'membrane',
        })
      } else if (layer.material === 'aluminum-vapor-barrier') {
        // Sauna foil — covers walls only (ceiling foil counted under roof)
        const rolls = Math.ceil(netWallArea / ROLL_COVERAGE.sauna_foil)
        items.push({
          name: 'Bastufolie (väggar)',
          unit: 'roll',
          qty: rolls,
          unitPrice: PRICES.sauna_foil_roll,
          category: 'membrane',
        })
      } else if (layer.material === 'aspen-panel' || layer.material === 'pine-panel') {
        // Assembly interior panel — this covers the exterior walls from inside
        // (room-specific interior paneling is computed separately below)
        // Skip here to avoid double-counting; the assembly panel is the structural
        // backing, interior finish panels are computed per-room
      }
    }

    // Counter-battens (on walls) — need them on both sides of vapor barrier
    // Exterior: vertical battens for ventilation gap
    // Interior: horizontal battens for panel mounting
    // Estimate: perimeter × (wallHeight / 0.6 spacing) × 2 sides
    const battenRuns = perimeter * Math.ceil(wh / 0.6) * 2
    const battenLm = battenRuns * WASTE
    items.push({
      name: 'Läkt 45×45 (väggar)',
      unit: 'lm',
      qty: roundUp(battenLm),
      unitPrice: PRICES.batten_45x45,
      category: 'framing',
    })
  }

  // ── Roof assembly ───────────────────────────────────────────────────────

  const pitchRad = (building.roof.pitch * Math.PI) / 180
  const roofArea =
    (bw + 2 * building.roof.overhang) *
    (bl + 2 * building.roof.overhang) /
    Math.cos(pitchRad)

  if (roofAssembly) {
    for (const layer of roofAssembly.layers) {
      if (layer.material === 'air-gap') continue

      if (layer.material === 'metal-sheet') {
        items.push({
          name: 'Takplåt TP20 svart',
          unit: 'm²',
          qty: roundUp(roofArea * WASTE),
          unitPrice: PRICES.metal_roof_tp20,
          category: 'roofing',
        })
      } else if (layer.framing) {
        const rafters = generateRafters(bw, bl, building.roof.overhang, {
          memberWidth: layer.framing.memberWidth,
          spacing: layer.framing.spacing,
          layerThickness: layer.thickness,
        })
        const totalLm = rafters.reduce((s, r) => s + r.height, 0) * WASTE
        items.push({
          name: 'Regel 45×145 (takstolar)',
          unit: 'lm',
          qty: roundUp(totalLm),
          unitPrice: PRICES.stud_45x145,
          category: 'framing',
        })

        const insulArea = roofArea * WASTE
        items.push({
          name: 'Stenull 145mm (tak)',
          unit: 'm²',
          qty: roundUp(insulArea),
          unitPrice: PRICES.stone_wool_145,
          category: 'insulation',
        })
      } else if (layer.material === 'wind-barrier') {
        const rolls = Math.ceil(roofArea / ROLL_COVERAGE.wind_barrier)
        items.push({
          name: 'Vindskydd (tak)',
          unit: 'roll',
          qty: rolls,
          unitPrice: PRICES.wind_barrier_roll,
          category: 'membrane',
        })
      } else if (layer.material === 'aluminum-vapor-barrier') {
        const ceilingArea = bw * bl
        const rolls = Math.ceil(ceilingArea / ROLL_COVERAGE.sauna_foil)
        items.push({
          name: 'Bastufolie (tak)',
          unit: 'roll',
          qty: rolls,
          unitPrice: PRICES.sauna_foil_roll,
          category: 'membrane',
        })
      } else if (layer.material === 'aspen-panel') {
        // Roof interior panel — skip, counted per-room below
      }
    }

    // Roof battens (counter-battens under panels + battens above for vent gap)
    const roofBattenLm = (bw / 0.6) * bl * 2 * WASTE
    items.push({
      name: 'Läkt 45×45 (tak)',
      unit: 'lm',
      qty: roundUp(roofBattenLm),
      unitPrice: PRICES.batten_45x45,
      category: 'framing',
    })
  }

  // ── Interior finish per room ────────────────────────────────────────────

  for (const room of building.rooms) {
    const rw = room.dimensions.width
    const rl = room.dimensions.length
    const rh = room.dimensions.height

    // Room wall interior area (minus openings)
    const roomPerimeter = 2 * (rw + rl)
    let roomOpeningArea = 0
    for (const wall of Object.values(room.walls)) {
      for (const o of wall.openings) {
        roomOpeningArea += o.width * o.height
      }
    }
    const roomWallArea = roomPerimeter * rh - roomOpeningArea
    const roomCeilingArea = rw * rl

    const isAspen = room.materials.innerWalls === 'aspen'
    const panelPrice = isAspen ? PRICES.aspen_panel_15x90 : PRICES.pine_panel_14x95
    const coverWidth = isAspen ? COVER_WIDTHS.aspen_panel : COVER_WIDTHS.pine_panel
    const panelName = isAspen ? 'Bastupanel asp 15×90' : 'Innerpanel furu 14×95'

    // Wall panels
    const wallPanelLm = (roomWallArea / coverWidth) * WASTE
    items.push({
      name: `${panelName} (${room.name} väggar)`,
      unit: 'lm',
      qty: roundUp(wallPanelLm),
      unitPrice: panelPrice,
      category: 'interior',
    })

    // Ceiling panels
    const ceilingPanelLm = (roomCeilingArea / coverWidth) * WASTE
    items.push({
      name: `${panelName} (${room.name} tak)`,
      unit: 'lm',
      qty: roundUp(ceilingPanelLm),
      unitPrice: panelPrice,
      category: 'interior',
    })

    // Bench wood
    if (room.benches) {
      let benchLm = 0
      for (const bench of room.benches) {
        // Surface slats: depth / (slat_width + gap) * length
        const slatCount = Math.ceil(bench.depth / 0.053) // 45mm slat + 8mm gap
        benchLm += slatCount * bench.length
        // Backrest boards: ~3 boards × length
        benchLm += 3 * bench.length
        // Riser boards: ~3 boards × length
        benchLm += 3 * bench.length
        // Support structure: ~4 legs + 2 rails
        benchLm += 4 * bench.surfaceHeight + 2 * bench.depth
      }
      items.push({
        name: `Bastulav asp 28×90 (${room.name})`,
        unit: 'lm',
        qty: roundUp(benchLm * WASTE),
        unitPrice: PRICES.bench_board_28x90,
        category: 'interior',
      })
    }

    // Duckboard flooring
    if (room.materials.floor === 'duckboard') {
      const floorArea = rw * rl
      items.push({
        name: `Bastudäck (${room.name})`,
        unit: 'm²',
        qty: roundUp(floorArea * WASTE, 10) / 10,
        unitPrice: PRICES.duckboard_per_m2,
        category: 'interior',
      })
    }
  }

  // ── Doors & windows ─────────────────────────────────────────────────────

  // Collect unique physical openings.
  // Interior partition doors appear twice (once per room), so we deduplicate
  // by only taking the first room's side of each interior opening.
  const seenIds = new Set<string>()
  const uniqueOpenings: typeof building.rooms[0]['walls']['north']['openings'] = []
  for (const room of building.rooms) {
    for (const [wallName, wall] of Object.entries(room.walls)) {
      for (const o of wall.openings) {
        if (seenIds.has(o.id)) continue
        seenIds.add(o.id)
        // For interior openings, also mark the matching opening on the
        // adjacent room's opposite wall so we don't count it twice
        if (!isExteriorOpening(building, o.id)) {
          const partnerId = findPartnerOpeningId(building, room.id, wallName, o)
          if (partnerId) seenIds.add(partnerId)
        }
        uniqueOpenings.push(o)
      }
    }
  }

  const exteriorDoors = uniqueOpenings.filter(o => o.type === 'door' && isExteriorOpening(building, o.id))
  const interiorDoors = uniqueOpenings.filter(o => o.type === 'door' && !isExteriorOpening(building, o.id))
  const windows = uniqueOpenings.filter(o => o.type === 'window')

  for (const d of exteriorDoors) {
    items.push({
      name: `Ytterdörr ${(d.width * 100).toFixed(0)}×${(d.height * 100).toFixed(0)}`,
      unit: 'st',
      qty: 1,
      unitPrice: PRICES.exterior_sauna_door,
      category: 'openings',
    })
  }
  for (const d of interiorDoors) {
    items.push({
      name: `Glasdörr ${(d.width * 100).toFixed(0)}×${(d.height * 100).toFixed(0)}`,
      unit: 'st',
      qty: 1,
      unitPrice: PRICES.interior_glass_door,
      category: 'openings',
    })
  }
  for (const w of windows) {
    items.push({
      name: `Fast fönster ${(w.width * 100).toFixed(0)}×${(w.height * 100).toFixed(0)}`,
      unit: 'st',
      qty: 1,
      unitPrice: PRICES.fixed_sauna_window,
      category: 'openings',
    })
  }

  // ── Equipment ───────────────────────────────────────────────────────────

  const hasHeater = building.rooms.some(r => r.heater)
  if (hasHeater) {
    items.push({
      name: 'Bastuaggregat 6–8 kW',
      unit: 'st',
      qty: 1,
      unitPrice: PRICES.electric_heater,
      category: 'equipment',
    })
    items.push({
      name: 'Bastustenar 20 kg',
      unit: 'st',
      qty: 1,
      unitPrice: PRICES.sauna_stones,
      category: 'equipment',
    })
  }

  // ── Electrical ─────────────────────────────────────────────────────────

  items.push({
    name: 'Gruppcentral 4–6 grupper',
    unit: 'st',
    qty: 1,
    unitPrice: PRICES.electrical_panel,
    category: 'electrical',
  })
  items.push({
    name: 'Jordfelsbrytare (bastugrupp)',
    unit: 'st',
    qty: 1,
    unitPrice: PRICES.rcd_breaker,
    category: 'electrical',
  })

  if (hasHeater) {
    // Heater cable run — estimate ~12m for a small building
    const cableLength = Math.ceil((perimeter + wh) * 1.5)
    items.push({
      name: 'Värmekabel 5×2.5mm² (aggregat)',
      unit: 'lm',
      qty: cableLength,
      unitPrice: PRICES.heater_cable_per_m,
      category: 'electrical',
    })
  }

  // Lighting per room
  const roomCount = building.rooms.length
  const saunaRooms = building.rooms.filter(r => r.type === 'sauna')
  items.push({
    name: 'Takarmatur bastuklassad',
    unit: 'st',
    qty: roomCount,
    unitPrice: PRICES.ceiling_fixture,
    category: 'electrical',
  })
  if (saunaRooms.length > 0) {
    items.push({
      name: 'LED-list (bakom lav)',
      unit: 'st',
      qty: saunaRooms.length,
      unitPrice: PRICES.led_strip,
      category: 'electrical',
    })
    items.push({
      name: 'Dimmer bastuklassad',
      unit: 'st',
      qty: saunaRooms.length,
      unitPrice: PRICES.sauna_dimmer,
      category: 'electrical',
    })
  }
  items.push({
    name: 'Kabelkanal, dosa, diverse',
    unit: 'st',
    qty: 1,
    unitPrice: PRICES.conduit_misc,
    category: 'electrical',
  })

  // ── Fasteners ───────────────────────────────────────────────────────────

  // Interior paneling screws
  const totalInteriorArea = building.rooms.reduce((s, r) => {
    const rw = r.dimensions.width
    const rl = r.dimensions.length
    const rh = r.dimensions.height
    return s + 2 * (rw + rl) * rh + rw * rl // walls + ceiling
  }, 0)
  const panelScrewPacks = Math.ceil((totalInteriorArea * SCREWS_PER_M2.paneling) / 250)
  items.push({
    name: 'Träskruv 4.5×50 (panel)',
    unit: 'pkg',
    qty: panelScrewPacks,
    unitPrice: PRICES.wood_screw_pack,
    category: 'fasteners',
  })

  // Cladding screws
  const claddingScrewPacks = Math.ceil((netWallArea * SCREWS_PER_M2.cladding) / 250)
  items.push({
    name: 'Träskruv 5.0×80 (fasad)',
    unit: 'pkg',
    qty: claddingScrewPacks,
    unitPrice: 110,
    category: 'fasteners',
  })

  // ── Total ───────────────────────────────────────────────────────────────

  const totalCost = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)

  return { items, totalCost }
}

// ── Legacy function (still used by old code paths) ───────────────────────────

export function computeQuantities(
  building: Building,
  wallAssembly?: Assembly,
  roofAssembly?: Assembly,
  floorAssembly?: Assembly,
): QuantitySummary {
  const { width: bw, length: bl, wallHeight: wh } = building.dimensions

  let openingArea = 0
  for (const room of building.rooms) {
    for (const wall of Object.values(room.walls)) {
      for (const o of wall.openings) {
        openingArea += o.width * o.height
      }
    }
  }
  const perimeter = 2 * (bw + bl)
  const grossWallArea = perimeter * wh
  const netWallArea = grossWallArea - openingArea

  const walls: MaterialQuantity[] = []
  if (wallAssembly) {
    for (const layer of wallAssembly.layers) {
      const q: MaterialQuantity = {
        layerName: layer.name,
        material: layer.material,
        area: netWallArea,
        thickness: layer.thickness,
        volume: netWallArea * layer.thickness,
      }
      if (layer.framing) {
        const opts = {
          memberWidth: layer.framing.memberWidth,
          spacing: layer.framing.spacing,
          layerThickness: layer.thickness,
        }
        const allMembers = [
          ...generateWallFraming(bw, wh, wh, [], opts),
          ...generateWallFraming(bw, wh, wh, [], opts),
          ...generateWallFraming(bl, wh, wh, [], opts),
          ...generateWallFraming(bl, wh, wh, [], opts),
        ]
        q.framingCount = allMembers.length
        q.framingLinearMeters = allMembers.reduce((sum, m) => sum + m.height, 0)
      }
      walls.push(q)
    }
  }

  const pitchRad = (building.roof.pitch * Math.PI) / 180
  const roofArea = (bw + 2 * building.roof.overhang) *
    (bl + 2 * building.roof.overhang) / Math.cos(pitchRad)

  const roof: MaterialQuantity[] = []
  if (roofAssembly) {
    for (const layer of roofAssembly.layers) {
      const q: MaterialQuantity = {
        layerName: layer.name,
        material: layer.material,
        area: roofArea,
        thickness: layer.thickness,
        volume: roofArea * layer.thickness,
      }
      if (layer.framing) {
        const rafters = generateRafters(bw, bl, building.roof.overhang, {
          memberWidth: layer.framing.memberWidth,
          spacing: layer.framing.spacing,
          layerThickness: layer.thickness,
        })
        q.framingCount = rafters.length
        q.framingLinearMeters = rafters.reduce((sum, r) => sum + r.height, 0)
      }
      roof.push(q)
    }
  }

  const floorArea = bw * bl
  const floor: MaterialQuantity[] = []
  if (floorAssembly) {
    for (const layer of floorAssembly.layers) {
      const q: MaterialQuantity = {
        layerName: layer.name,
        material: layer.material,
        area: floorArea,
        thickness: layer.thickness,
        volume: floorArea * layer.thickness,
      }
      floor.push(q)
    }
  }

  return { walls, roof, floor }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const OPPOSITE_WALL: Record<string, string> = { north: 'south', south: 'north', east: 'west', west: 'east' }

/** Find the matching opening ID on the adjacent room's opposite wall (for shared partition doors). */
function findPartnerOpeningId(
  building: Building,
  roomId: string,
  wallName: string,
  opening: { width: number; height: number },
): string | null {
  const opposite = OPPOSITE_WALL[wallName]
  if (!opposite) return null
  for (const other of building.rooms) {
    if (other.id === roomId) continue
    const otherWall = other.walls[opposite as keyof typeof other.walls]
    // Look for an opening of matching size on the opposite wall
    const match = otherWall.openings.find(
      o => Math.abs(o.width - opening.width) < 0.01 && Math.abs(o.height - opening.height) < 0.01,
    )
    if (match) return match.id
  }
  return null
}

/** Check if an opening is on an exterior wall (building perimeter) */
function isExteriorOpening(building: Building, openingId: string): boolean {
  const { width: bw, length: bl } = building.dimensions
  for (const room of building.rooms) {
    for (const [wallName, wall] of Object.entries(room.walls)) {
      if (!wall.openings.some(o => o.id === openingId)) continue
      const pos = room.position
      const rw = room.dimensions.width
      const rl = room.dimensions.length
      switch (wallName) {
        case 'north': return pos.z <= 0.01
        case 'south': return pos.z + rl >= bl - 0.01
        case 'west': return pos.x <= 0.01
        case 'east': return pos.x + rw >= bw - 0.01
      }
    }
  }
  return true // fallback: assume exterior
}
