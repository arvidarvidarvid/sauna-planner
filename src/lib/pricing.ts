/**
 * Byggmax-based pricing data for material cost estimation.
 * Prices in SEK, approximate as of early 2026.
 * See docs/byggmax-pricing.md for sources and details.
 */

export interface PricedItem {
  /** Short name shown in the UI */
  name: string
  /** How items are sold */
  unit: 'lm' | 'm²' | 'st' | 'pkg' | 'roll'
  /** Quantity needed */
  qty: number
  /** Price per unit (SEK) */
  unitPrice: number
  /** Category for grouping */
  category: 'framing' | 'insulation' | 'cladding' | 'interior' | 'roofing' | 'membrane' | 'openings' | 'equipment' | 'electrical' | 'fasteners'
}

// ── Unit prices ──────────────────────────────────────────────────────────────

export const PRICES = {
  // Lumber (kr/m)
  stud_45x95: 28,
  stud_45x145: 45,
  batten_45x45: 14,

  // Panels (kr/m)
  aspen_panel_15x90: 80,     // bastupanel asp
  pine_panel_14x95: 25,      // innerpanel furu
  exterior_board_22x120: 23, // ytterpanel

  // Bench boards (kr/m)
  bench_board_28x90: 100,    // bastulav asp

  // Roofing (kr/m²)
  metal_roof_tp20: 155,

  // Insulation (kr/m²)
  stone_wool_95: 70,
  stone_wool_145: 105,

  // Membranes (kr/roll)
  sauna_foil_roll: 300,      // ~18 m² per roll
  wind_barrier_roll: 500,    // ~34 m² per roll

  // Screws (kr/pack of 250)
  wood_screw_pack: 70,       // 4.5×50mm, 250st

  // Openings (kr/st) — specialty items, market estimates
  exterior_sauna_door: 4500,
  interior_glass_door: 3500,
  fixed_sauna_window: 3500,

  // Equipment
  electric_heater: 8000,     // mid-range 6-8kW
  sauna_stones: 500,

  // Electrical
  electrical_panel: 2000,    // small 4-6 group panel (gruppsäkringsskåp)
  rcd_breaker: 1000,         // ground fault breaker for sauna circuit
  heater_cable_per_m: 65,    // heat-rated silicone 5×2.5mm²
  led_strip: 400,            // behind-bench LED strip per room
  ceiling_fixture: 300,      // sauna-rated ceiling light per room
  sauna_dimmer: 400,         // sauna-rated switch/dimmer
  conduit_misc: 500,         // conduit, junction boxes, misc

  // Flooring
  duckboard_per_m2: 500,     // bastudäck sections
} as const

// ── Coverage constants ───────────────────────────────────────────────────────

/** Cover width of a single panel/board, accounting for tongue-and-groove overlap */
export const COVER_WIDTHS = {
  aspen_panel: 0.080,      // 90mm board, ~80mm visible
  pine_panel: 0.085,       // 95mm board, ~85mm visible
  exterior_board: 0.090,   // 120mm board with ~30mm overlap for board-on-board
} as const

/** m² per roll for membranes */
export const ROLL_COVERAGE = {
  sauna_foil: 18,
  wind_barrier: 34,
} as const

/** Screws per m² by application */
export const SCREWS_PER_M2 = {
  paneling: 25,
  cladding: 16,
} as const
