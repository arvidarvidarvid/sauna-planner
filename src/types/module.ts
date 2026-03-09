import type { WallName } from './sauna'

export type ModuleId =
  | { type: 'exterior-wall'; wall: WallName }
  | { type: 'roof' }
  | { type: 'floor-assembly' }
  | { type: 'interior-partition'; roomId: string; wall: WallName }
  | { type: 'bench'; roomId: string; benchIndex: number }
  | { type: 'heater'; roomId: string }
  | { type: 'fixture'; roomId: string; fixtureIndex: number }

export interface ModuleCatalogEntry {
  id: ModuleId
  label: string
  category: 'structure' | 'interior' | 'furniture'
}

export function moduleKey(id: ModuleId): string {
  switch (id.type) {
    case 'exterior-wall': return `ext-wall-${id.wall}`
    case 'roof': return 'roof'
    case 'floor-assembly': return 'floor-assembly'
    case 'interior-partition': return `int-wall-${id.roomId}-${id.wall}`
    case 'bench': return `bench-${id.roomId}-${id.benchIndex}`
    case 'heater': return `heater-${id.roomId}`
    case 'fixture': return `fixture-${id.roomId}-${id.fixtureIndex}`
  }
}

export function modulesEqual(a: ModuleId, b: ModuleId): boolean {
  return moduleKey(a) === moduleKey(b)
}
