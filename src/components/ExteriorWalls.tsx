import type { Building, Opening } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { ViewMode } from '@/App'
import { MATERIAL_PROPS } from '@/lib/materials'
import WallMesh from './WallMesh'
import AssemblyWallMesh from './AssemblyWallMesh'

interface Props {
  building: Building
  wallThickness: number
  viewMode: ViewMode
  wallAssembly?: Assembly
}

/**
 * Renders the four exterior walls of the building.
 */
export default function ExteriorWalls({ building, wallThickness, viewMode, wallAssembly }: Props) {
  const { width: bw, length: bl, wallHeight } = building.dimensions
  const outerMat = MATERIAL_PROPS[building.materials.outerWalls]

  const northOpenings: Opening[] = []
  const southOpenings: Opening[] = []
  const eastOpenings:  Opening[] = []
  const westOpenings:  Opening[] = []

  for (const room of building.rooms) {
    const { x, z } = room.position
    const { width: rw, length: rl } = room.dimensions
    // Room center in building-centered coords
    const roomCX = x + rw / 2 - bw / 2
    const roomCZ = z + rl / 2 - bl / 2

    if (Math.abs(z) < 0.01) {
      room.walls.north.openings.forEach(o => {
        northOpenings.push({ ...o, center: roomCX + o.center })
      })
    }
    if (Math.abs((z + rl) - bl) < 0.01) {
      room.walls.south.openings.forEach(o => {
        southOpenings.push({ ...o, center: -(roomCX + o.center) })
      })
    }
    if (Math.abs((x + rw) - bw) < 0.01) {
      room.walls.east.openings.forEach(o => {
        eastOpenings.push({ ...o, center: -(roomCZ + o.center) })
      })
    }
    if (Math.abs(x) < 0.01) {
      room.walls.west.openings.forEach(o => {
        westOpenings.push({ ...o, center: roomCZ + o.center })
      })
    }
  }

  const { color, roughness, metalness } = outerMat
  const cutaway = viewMode === 'cutaway'

  // wallThickness = frame depth only. Building dimensions = interior clear space.
  // Frames sit OUTSIDE the building dimensions. E/W walls wrap corners.
  const fd = wallThickness // frame depth
  const fd2 = fd / 2

  // N/S walls: full interior width (openings map 1:1)
  // E/W walls: full interior length + 2×fd to wrap around N/S frame ends
  const ewWidth = bl + 2 * fd

  // Shed roof: south wall is taller, E/W walls have sloped tops
  const pitchRad = (building.roof.pitch * Math.PI) / 180
  const rise = building.roof.type === 'shed' ? Math.tan(pitchRad) * ewWidth : 0

  const renderWall = (
    wallWidth: number,
    openings: Opening[],
    hidden = false,
    hLeft = wallHeight,
    hRight = wallHeight,
    claddingWidth?: number,
  ) => {
    if (wallAssembly) {
      return (
        <AssemblyWallMesh
          wallWidth={wallWidth}
          wallHeight={hLeft}
          wallHeightRight={hRight}
          claddingWidth={claddingWidth}
          openings={openings}
          assembly={wallAssembly}
          hidden={hidden}
          viewMode={viewMode}
        />
      )
    }
    return (
      <WallMesh
        wallWidth={wallWidth}
        wallHeight={hLeft}
        wallHeightRight={hRight}
        thickness={wallThickness}
        openings={openings}
        color={color}
        roughness={roughness}
        metalness={metalness}
        hidden={hidden}
      />
    )
  }

  return (
    <>
      {/* North wall (low side of shed roof) — cladding wraps corners */}
      <group position={[0, 0, -bl / 2 - fd2]} rotation={[0, 0, 0]}>
        {renderWall(bw, northOpenings, false, wallHeight, wallHeight, bw + 2 * fd)}
      </group>
      {/* South wall (high side of shed roof) — cladding wraps corners */}
      <group position={[0, 0, bl / 2 + fd2]} rotation={[0, Math.PI, 0]}>
        {renderWall(bw, southOpenings, cutaway, wallHeight + rise, wallHeight + rise, bw + 2 * fd)}
      </group>
      {/* East wall: local -X = north (low), local +X = south (high) */}
      <group position={[bw / 2 + fd2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {renderWall(ewWidth, eastOpenings, false, wallHeight, wallHeight + rise)}
      </group>
      {/* West wall: local -X = south (high), local +X = north (low) */}
      <group position={[-bw / 2 - fd2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {renderWall(ewWidth, westOpenings, false, wallHeight + rise, wallHeight)}
      </group>
    </>
  )
}
