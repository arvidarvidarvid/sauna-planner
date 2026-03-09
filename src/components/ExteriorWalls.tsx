import type { Building, Opening } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { ViewMode } from '@/App'
import { MATERIAL_PROPS } from '@/lib/materials'
import WallMesh from './WallMesh'
import AssemblyWallMesh from './AssemblyWallMesh'

interface Props {
  building: Building
  wallThickness: number
  exteriorDepth: number
  viewMode: ViewMode
  wallAssembly?: Assembly
}

/**
 * Renders the four exterior walls of the building.
 */
export default function ExteriorWalls({ building, wallThickness, exteriorDepth, viewMode, wallAssembly }: Props) {
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

  const isFrame = viewMode === 'frame'
  const ed = exteriorDepth

  // Corner trim boards — two boards meeting at 90° at each building corner
  const CORNER_WIDTH = 0.120   // 120mm face width
  const CORNER_THICK = 0.028   // 28mm thick (slightly proud of cladding)
  const CORNER_COLOR = '#F5F0E8'

  // Heights at north and south edges
  const hN = wallHeight
  const hS = wallHeight + rise

  // 4 corner positions: [xSign, zSign, height]
  const corners: { x: number; z: number; h: number }[] = [
    { x:  1, z: -1, h: hN }, // NE
    { x: -1, z: -1, h: hN }, // NW
    { x:  1, z:  1, h: hS }, // SE
    { x: -1, z:  1, h: hS }, // SW
  ]

  return (
    <>
      {/* North wall (low side of shed roof) — cladding wraps corners */}
      <group position={[0, 0, -bl / 2 - fd2]} rotation={[0, 0, 0]}>
        {renderWall(bw, northOpenings, false, wallHeight, wallHeight, bw + 2 * (fd + exteriorDepth))}
      </group>
      {/* South wall (high side of shed roof) — cladding wraps corners */}
      <group position={[0, 0, bl / 2 + fd2]} rotation={[0, Math.PI, 0]}>
        {renderWall(bw, southOpenings, cutaway, wallHeight + rise, wallHeight + rise, bw + 2 * (fd + exteriorDepth))}
      </group>
      {/* East wall: local -X = north (low), local +X = south (high) */}
      <group position={[bw / 2 + fd2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {renderWall(ewWidth, eastOpenings, false, wallHeight, wallHeight + rise, ewWidth + 2 * exteriorDepth)}
      </group>
      {/* West wall: local -X = south (high), local +X = north (low) */}
      <group position={[-bw / 2 - fd2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {renderWall(ewWidth, westOpenings, false, wallHeight + rise, wallHeight, ewWidth + 2 * exteriorDepth)}
      </group>

      {/* Corner trim boards — positioned proud of outermost cladding surface */}
      {!isFrame && corners.map(({ x: xs, z: zs, h }, i) => {
        // fd2 + ed gets us to the outer face of the cladding layer nominal position.
        // Add CORNER_THICK so the board sits fully in front of the cladding.
        const cx = xs * (bw / 2 + fd2 + ed + CORNER_THICK)
        const cz = zs * (bl / 2 + fd2 + ed + CORNER_THICK)
        // Board A: faces N/S (runs along X), sits on the E/W wall's cladding face
        // Board B: faces E/W (runs along Z), sits on the N/S wall's cladding face
        return (
          <group key={`corner-${i}`}>
            {/* Board along N/S face (width in X, proud of N/S cladding) */}
            <mesh
              position={[
                cx - xs * (CORNER_WIDTH / 2 - CORNER_THICK / 2),
                h / 2,
                cz + zs * CORNER_THICK / 2,
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[CORNER_WIDTH, h, CORNER_THICK]} />
              <meshStandardMaterial color={CORNER_COLOR} roughness={0.5} />
            </mesh>
            {/* Board along E/W face (width in Z, proud of E/W cladding) */}
            <mesh
              position={[
                cx + xs * CORNER_THICK / 2,
                h / 2,
                cz - zs * (CORNER_WIDTH / 2 - CORNER_THICK / 2),
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[CORNER_THICK, h, CORNER_WIDTH]} />
              <meshStandardMaterial color={CORNER_COLOR} roughness={0.5} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
