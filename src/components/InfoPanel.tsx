import { useMemo, useState } from 'react'
import type { Building } from '@/types/sauna'
import { getAssembly } from '@/lib/assemblies'
import { computeShoppingList, type ShoppingList } from '@/lib/quantities'
import type { PricedItem } from '@/lib/pricing'

interface Props {
  building: Building
}

const ROOM_TYPE_ICONS: Record<string, string> = {
  entry: '🚪',
  changing: '👕',
  sauna: '🔥',
  shower: '🚿',
  wc: '🚽',
  storage: '📦',
}

const CATEGORY_LABELS: Record<PricedItem['category'], string> = {
  framing: 'Stomme',
  insulation: 'Isolering',
  cladding: 'Fasad',
  interior: 'Interiör',
  roofing: 'Tak',
  membrane: 'Duk & folie',
  openings: 'Dörrar & fönster',
  equipment: 'Utrustning',
  electrical: 'El',
  fasteners: 'Infästning',
}

const CATEGORY_ORDER: PricedItem['category'][] = [
  'framing', 'insulation', 'membrane', 'cladding', 'roofing',
  'interior', 'openings', 'equipment', 'electrical', 'fasteners',
]

export default function InfoPanel({ building }: Props) {
  const { dimensions, materials, roof, rooms } = building
  const [showCosts, setShowCosts] = useState(true)

  const totalOpenings = rooms.flatMap(r =>
    Object.values(r.walls).flatMap(w => w.openings)
  )
  const doors = totalOpenings.filter(o => o.type === 'door')
  const windows = totalOpenings.filter(o => o.type === 'window')

  const wallAssembly = building.assemblies?.exteriorWall ? getAssembly(building.assemblies.exteriorWall) : undefined
  const roofAssembly = building.assemblies?.roof ? getAssembly(building.assemblies.roof) : undefined

  const shoppingList = useMemo<ShoppingList | null>(() => {
    if (!wallAssembly && !roofAssembly) return null
    return computeShoppingList(building, wallAssembly, roofAssembly)
  }, [building, wallAssembly, roofAssembly])

  return (
    <div className="p-4 space-y-5 text-xs">

      {/* Building */}
      <section>
        <h2 className="uppercase tracking-widest text-stone-500 font-semibold mb-2">Building</h2>
        <div className="space-y-1 text-stone-300">
          <Row label="Width (E/W)" value={`${dimensions.width}m`} />
          <Row label="Length (N/S)" value={`${dimensions.length}m`} />
          <Row label="Wall height" value={`${dimensions.wallHeight}m`} />
          <div className="border-t border-stone-800 mt-1 pt-1">
            <Row label="Outer walls" value={cap(materials.outerWalls)} muted />
            <Row label="Foundation" value={cap(materials.foundation)} muted />
          </div>
        </div>
      </section>

      {/* Roof */}
      <section>
        <h2 className="uppercase tracking-widest text-stone-500 font-semibold mb-2">Roof</h2>
        <div className="space-y-1 text-stone-300">
          <Row label="Type" value={cap(roof.type)} />
          <Row label="Pitch" value={`${roof.pitch}°`} />
          <Row label="Material" value={cap(roof.material)} muted />
          <Row label="Overhang" value={`${roof.overhang}m`} muted />
        </div>
      </section>

      {/* Summary */}
      <section>
        <h2 className="uppercase tracking-widest text-stone-500 font-semibold mb-2">Summary</h2>
        <div className="space-y-1 text-stone-300">
          <Row label="Rooms" value={String(rooms.length)} />
          <Row label="Doors" value={String(doors.length)} />
          <Row label="Windows" value={String(windows.length)} />
        </div>
      </section>

      {/* Rooms */}
      <section>
        <h2 className="uppercase tracking-widest text-stone-500 font-semibold mb-2">Rooms</h2>
        <div className="space-y-3">
          {rooms.map(room => {
            const roomOpenings = Object.values(room.walls).flatMap(w => w.openings)
            const area = (room.dimensions.width * room.dimensions.length).toFixed(1)
            return (
              <div key={room.id} className="bg-stone-900 rounded p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                  <span>{ROOM_TYPE_ICONS[room.type] ?? '▪'}</span>
                  <span>{room.name}</span>
                </div>
                <div className="text-stone-400 space-y-0.5">
                  <Row label="Size" value={`${room.dimensions.width}×${room.dimensions.length}m (${area}m²)`} />
                  <Row label="Height" value={`${room.dimensions.height}m`} />
                  <Row label="Walls" value={cap(room.materials.innerWalls)} />
                  <Row label="Floor" value={cap(room.materials.floor)} />
                  {roomOpenings.length > 0 && (
                    <div className="pt-0.5 text-stone-500">
                      {roomOpenings.map(o => (
                        <div key={o.id}>
                          {cap(o.type)} · {wallForOpening(room, o.id)} wall · {o.width}×{o.height}m
                        </div>
                      ))}
                    </div>
                  )}
                  {room.heater && (
                    <div className="text-stone-500">Heater: {room.heater.type}</div>
                  )}
                  {room.benches && room.benches.length > 0 && (
                    <div className="text-stone-500">{room.benches.length} bench(es)</div>
                  )}
                  {room.fixtures && room.fixtures.length > 0 && (
                    <div className="text-stone-500">
                      {room.fixtures.map(f => cap(f.type)).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Material Cost Estimate */}
      {shoppingList && (
        <section>
          <button
            onClick={() => setShowCosts(v => !v)}
            className="uppercase tracking-widest text-stone-500 font-semibold mb-2 hover:text-stone-300 transition-colors flex items-center gap-1.5 w-full"
          >
            <span className={`text-[10px] transition-transform ${showCosts ? 'rotate-90' : ''}`}>▶</span>
            Material Cost
          </button>

          {showCosts && (
            <div className="space-y-3">
              {CATEGORY_ORDER.map(cat => {
                const catItems = shoppingList.items.filter(i => i.category === cat)
                if (catItems.length === 0) return null
                const catTotal = catItems.reduce((s, i) => s + i.qty * i.unitPrice, 0)
                return (
                  <CostGroup
                    key={cat}
                    title={CATEGORY_LABELS[cat]}
                    items={catItems}
                    total={catTotal}
                  />
                )
              })}

              {/* Grand total */}
              <div className="bg-amber-900/30 border border-amber-800/40 rounded p-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-amber-300 font-semibold text-[11px] uppercase tracking-wide">
                    Total (material)
                  </span>
                  <span className="text-amber-200 font-semibold">
                    {formatKr(shoppingList.totalCost)}
                  </span>
                </div>
                <div className="text-amber-400/60 text-[10px] mt-1">
                  Byggmax approx. prices, excl. delivery. +10% waste included on cut materials.
                </div>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  )
}

function CostGroup({ title, items, total }: {
  title: string
  items: PricedItem[]
  total: number
}) {
  return (
    <div className="bg-stone-900 rounded p-2.5 space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-stone-200 font-medium text-[11px] uppercase tracking-wide">{title}</span>
        <span className="text-stone-400 text-[11px] font-medium">{formatKr(total)}</span>
      </div>
      {items.map((item, i) => {
        const lineCost = item.qty * item.unitPrice
        return (
          <div key={i} className="text-stone-400 space-y-0.5">
            <div className="flex justify-between gap-2">
              <span className="text-stone-300 truncate">{item.name}</span>
              <span className="text-stone-500 shrink-0">{formatKr(lineCost)}</span>
            </div>
            <div className="text-stone-600 text-[10px] pl-2">
              {fmtQty(item.qty)} {unitLabel(item.unit)} × {item.unitPrice} kr/{unitLabel(item.unit, true)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className={muted ? 'text-stone-500' : ''}>{label}</span>
      <span className={`${muted ? 'text-stone-500' : 'text-stone-200'} text-right`}>{value}</span>
    </div>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}

function wallForOpening(room: Parameters<typeof InfoPanel>[0]['building']['rooms'][0], openingId: string) {
  for (const [wallName, wall] of Object.entries(room.walls)) {
    if (wall.openings.some(o => o.id === openingId)) return cap(wallName)
  }
  return '?'
}

function formatKr(amount: number): string {
  if (amount >= 1000) {
    return Math.round(amount).toLocaleString('sv-SE') + ' kr'
  }
  return Math.round(amount) + ' kr'
}

function fmtQty(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1)
}

function unitLabel(unit: PricedItem['unit'], singular = false): string {
  switch (unit) {
    case 'lm': return 'lm'
    case 'm²': return 'm²'
    case 'st': return 'st'
    case 'pkg': return singular ? 'pkg' : 'pkg'
    case 'roll': return singular ? 'rulle' : 'rullar'
  }
}
