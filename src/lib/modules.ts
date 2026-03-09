import type { Building, WallName } from '@/types/sauna'
import type { ModuleCatalogEntry } from '@/types/module'
import type { InteriorWallStatus } from '@/lib/building'

const WALL_LABELS: Record<WallName, string> = {
  north: 'North Wall',
  south: 'South Wall',
  east: 'East Wall',
  west: 'West Wall',
}

export function buildModuleCatalog(
  building: Building,
  interiorWallMap: Map<string, Map<WallName, InteriorWallStatus>>,
): ModuleCatalogEntry[] {
  const entries: ModuleCatalogEntry[] = []

  // Structure: 4 exterior walls
  for (const wall of ['north', 'south', 'east', 'west'] as WallName[]) {
    entries.push({
      id: { type: 'exterior-wall', wall },
      label: WALL_LABELS[wall],
      category: 'structure',
    })
  }

  // Structure: roof
  entries.push({
    id: { type: 'roof' },
    label: 'Roof',
    category: 'structure',
  })

  // Structure: floor assembly
  if (building.assemblies?.floor) {
    entries.push({
      id: { type: 'floor-assembly' },
      label: 'Floor Assembly',
      category: 'structure',
    })
  }

  // Interior partitions per room (only 'owned' walls to avoid duplicates)
  for (const room of building.rooms) {
    const interiorWalls = interiorWallMap.get(room.id) ?? new Map<WallName, InteriorWallStatus>()
    for (const [wall, status] of interiorWalls) {
      if (status !== 'owned') continue
      entries.push({
        id: { type: 'interior-partition', roomId: room.id, wall },
        label: `${room.name} ${WALL_LABELS[wall]} Partition`,
        category: 'interior',
      })
    }
  }

  // Furniture per room
  for (const room of building.rooms) {
    room.benches?.forEach((bench, i) => {
      entries.push({
        id: { type: 'bench', roomId: room.id, benchIndex: i },
        label: `${room.name} ${bench.id.includes('upper') ? 'Upper' : bench.id.includes('lower') ? 'Lower' : ''} Bench`.replace(/\s+/g, ' '),
        category: 'furniture',
      })
    })

    if (room.heater) {
      entries.push({
        id: { type: 'heater', roomId: room.id },
        label: `${room.name} Heater`,
        category: 'furniture',
      })
    }

    room.fixtures?.forEach((fixture, i) => {
      const typeLabel = fixture.type.charAt(0).toUpperCase() + fixture.type.slice(1)
      entries.push({
        id: { type: 'fixture', roomId: room.id, fixtureIndex: i },
        label: `${room.name} ${typeLabel}`,
        category: 'furniture',
      })
    })
  }

  return entries
}
