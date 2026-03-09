import { useMemo } from 'react'
import type { Building } from '@/types/sauna'
import type { ModuleId, ModuleCatalogEntry } from '@/types/module'
import { modulesEqual } from '@/types/module'
import { computeInteriorWalls } from '@/lib/building'
import { buildModuleCatalog } from '@/lib/modules'

interface Props {
  building: Building
  selectedModule: ModuleId
  onSelect: (id: ModuleId) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  structure: 'Structure',
  interior: 'Interior',
  furniture: 'Furniture',
}

const CATEGORY_ORDER = ['structure', 'interior', 'furniture']

export default function ModuleBrowser({ building, selectedModule, onSelect }: Props) {
  const interiorWallMap = useMemo(() => computeInteriorWalls(building), [building])
  const catalog = useMemo(() => buildModuleCatalog(building, interiorWallMap), [building, interiorWallMap])

  const grouped = useMemo(() => {
    const groups = new Map<string, ModuleCatalogEntry[]>()
    for (const entry of catalog) {
      const list = groups.get(entry.category) ?? []
      list.push(entry)
      groups.set(entry.category, list)
    }
    return groups
  }, [catalog])

  return (
    <div className="p-3 text-xs">
      <h2 className="text-stone-400 uppercase tracking-wider text-[10px] font-semibold mb-3">
        Module Browser
      </h2>

      {CATEGORY_ORDER.map(cat => {
        const entries = grouped.get(cat)
        if (!entries?.length) return null
        return (
          <div key={cat} className="mb-4">
            <h3 className="text-stone-500 uppercase tracking-wider text-[10px] font-medium mb-1.5">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="flex flex-col gap-0.5">
              {entries.map(entry => {
                const isActive = modulesEqual(entry.id, selectedModule)
                return (
                  <button
                    key={entryKey(entry.id)}
                    onClick={() => onSelect(entry.id)}
                    className={`text-left px-2 py-1.5 rounded transition-colors ${
                      isActive
                        ? 'bg-amber-800/40 text-amber-300'
                        : 'text-stone-400 hover:bg-stone-800 hover:text-stone-300'
                    }`}
                  >
                    {entry.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <ModuleInfo building={building} selectedModule={selectedModule} />
    </div>
  )
}

function ModuleInfo({ building, selectedModule }: { building: Building; selectedModule: ModuleId }) {
  const info = getModuleInfo(building, selectedModule)
  if (!info.length) return null

  return (
    <div className="mt-4 pt-3 border-t border-stone-800">
      <h3 className="text-stone-500 uppercase tracking-wider text-[10px] font-medium mb-2">
        Details
      </h3>
      <dl className="space-y-1">
        {info.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-stone-500">{label}</dt>
            <dd className="text-stone-300">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function getModuleInfo(building: Building, mod: ModuleId): [string, string][] {
  const { width: bw, length: bl, wallHeight } = building.dimensions
  const fd = 0.095 // approximate frame depth

  switch (mod.type) {
    case 'exterior-wall': {
      const ewWidth = bl + 2 * fd
      const pitchRad = (building.roof.pitch * Math.PI) / 180
      const rise = building.roof.type === 'shed' ? Math.tan(pitchRad) * ewWidth : 0
      const isNS = mod.wall === 'north' || mod.wall === 'south'
      const w = isNS ? bw : ewWidth
      const h = mod.wall === 'south' ? wallHeight + rise
             : mod.wall === 'north' ? wallHeight
             : wallHeight // E/W have sloped tops
      return [
        ['Width', `${(w * 1000).toFixed(0)} mm`],
        ['Height', `${(h * 1000).toFixed(0)} mm`],
        ['Material', building.materials.outerWalls],
      ]
    }
    case 'roof':
      return [
        ['Type', building.roof.type],
        ['Pitch', `${building.roof.pitch}\u00B0`],
        ['Material', building.roof.material],
        ['Overhang', `${(building.roof.overhang * 1000).toFixed(0)} mm`],
      ]
    case 'floor-assembly':
      return [
        ['Width', `${((bw + 2 * fd) * 1000).toFixed(0)} mm`],
        ['Length', `${((bl + 2 * fd) * 1000).toFixed(0)} mm`],
      ]
    case 'interior-partition': {
      const room = building.rooms.find(r => r.id === mod.roomId)
      if (!room) return []
      const isNS = mod.wall === 'north' || mod.wall === 'south'
      return [
        ['Width', `${((isNS ? room.dimensions.width : room.dimensions.length) * 1000).toFixed(0)} mm`],
        ['Material', room.materials.innerWalls],
      ]
    }
    case 'bench': {
      const room = building.rooms.find(r => r.id === mod.roomId)
      const bench = room?.benches?.[mod.benchIndex]
      if (!bench) return []
      return [
        ['Length', `${(bench.length * 1000).toFixed(0)} mm`],
        ['Depth', `${(bench.depth * 1000).toFixed(0)} mm`],
        ['Height', `${(bench.surfaceHeight * 1000).toFixed(0)} mm`],
        ['Wall', bench.wall],
      ]
    }
    case 'heater': {
      const room = building.rooms.find(r => r.id === mod.roomId)
      if (!room?.heater) return []
      return [
        ['Type', room.heater.type],
        ['Size', `${(room.heater.width * 1000).toFixed(0)} x ${(room.heater.depth * 1000).toFixed(0)} mm`],
      ]
    }
    case 'fixture': {
      const room = building.rooms.find(r => r.id === mod.roomId)
      const fixture = room?.fixtures?.[mod.fixtureIndex]
      if (!fixture) return []
      return [['Type', fixture.type]]
    }
  }
}

function entryKey(id: ModuleId): string {
  switch (id.type) {
    case 'exterior-wall': return `ext-${id.wall}`
    case 'roof': return 'roof'
    case 'floor-assembly': return 'floor'
    case 'interior-partition': return `int-${id.roomId}-${id.wall}`
    case 'bench': return `bench-${id.roomId}-${id.benchIndex}`
    case 'heater': return `heater-${id.roomId}`
    case 'fixture': return `fixture-${id.roomId}-${id.fixtureIndex}`
  }
}
