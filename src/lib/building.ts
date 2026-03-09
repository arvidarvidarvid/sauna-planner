import type { Building, WallName } from '@/types/sauna'

export type InteriorWallStatus = 'owned' | 'neighbor'

/**
 * Determines which walls of each room are interior (shared with another room).
 * Returns ownership: 'owned' means this room renders the partition,
 * 'neighbor' means the adjacent room owns it (skip rendering).
 * The room with the lower index in building.rooms owns the wall.
 */
export function computeInteriorWalls(building: Building): Map<string, Map<WallName, InteriorWallStatus>> {
  const result = new Map<string, Map<WallName, InteriorWallStatus>>()
  const { width: bw, length: bl } = building.dimensions
  const roomIndex = new Map(building.rooms.map((r, i) => [r.id, i]))

  for (const room of building.rooms) {
    const interior = new Map<WallName, InteriorWallStatus>()
    const { x, z } = room.position
    const { width: rw, length: rl } = room.dimensions
    const myIndex = roomIndex.get(room.id)!

    const isNorthExterior = Math.abs(z) < 0.01
    const isSouthExterior = Math.abs((z + rl) - bl) < 0.01
    const isEastExterior  = Math.abs((x + rw) - bw) < 0.01
    const isWestExterior  = Math.abs(x) < 0.01

    const checkWall = (wall: WallName, isExterior: boolean, findNeighbor: () => typeof room | undefined) => {
      if (isExterior) return
      const neighbor = findNeighbor()
      if (!neighbor) return
      const neighborIdx = roomIndex.get(neighbor.id)!
      interior.set(wall, myIndex <= neighborIdx ? 'owned' : 'neighbor')
    }

    checkWall('north', isNorthExterior, () =>
      building.rooms.find(other =>
        other.id !== room.id &&
        Math.abs((other.position.z + other.dimensions.length) - z) < 0.01 &&
        rangesOverlap(other.position.x, other.position.x + other.dimensions.width, x, x + rw)
      )
    )

    checkWall('south', isSouthExterior, () =>
      building.rooms.find(other =>
        other.id !== room.id &&
        Math.abs(other.position.z - (z + rl)) < 0.01 &&
        rangesOverlap(other.position.x, other.position.x + other.dimensions.width, x, x + rw)
      )
    )

    checkWall('east', isEastExterior, () =>
      building.rooms.find(other =>
        other.id !== room.id &&
        Math.abs(other.position.x - (x + rw)) < 0.01 &&
        rangesOverlap(other.position.z, other.position.z + other.dimensions.length, z, z + rl)
      )
    )

    checkWall('west', isWestExterior, () =>
      building.rooms.find(other =>
        other.id !== room.id &&
        Math.abs((other.position.x + other.dimensions.width) - x) < 0.01 &&
        rangesOverlap(other.position.z, other.position.z + other.dimensions.length, z, z + rl)
      )
    )

    result.set(room.id, interior)
  }

  return result
}

export function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && a2 > b1
}
