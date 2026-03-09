import type { Building, Opening, WallName } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { ModuleId } from '@/types/module'
import { getAssembly, getFrameDepth, getExteriorDepth } from '@/lib/assemblies'
import { MATERIAL_PROPS } from '@/lib/materials'
import { DEFAULT_WALL_THICKNESS } from './BuildingGroup'
import { FloorAssemblyLayers } from './BuildingGroup'
import WallMesh from './WallMesh'
import AssemblyWallMesh from './AssemblyWallMesh'
import RoofGeometry from './RoofGeometry'
import SaunaBench from './SaunaBench'
import SaunaHeater from './SaunaHeater'
import FixtureObject from './Fixture'
import DimensionLine from './DimensionLine'

interface Props {
  building: Building
  selectedModule: ModuleId
  exploded: boolean
}

export default function ModuleViewer({ building, selectedModule, exploded }: Props) {
  const { width: bw, length: bl, wallHeight } = building.dimensions

  // Resolve assemblies
  const wallAssembly: Assembly | undefined = building.assemblies?.exteriorWall
    ? getAssembly(building.assemblies.exteriorWall)
    : undefined
  const roofAssembly: Assembly | undefined = building.assemblies?.roof
    ? getAssembly(building.assemblies.roof)
    : undefined
  const floorAssembly: Assembly | undefined = building.assemblies?.floor
    ? getAssembly(building.assemblies.floor)
    : undefined

  const wallThickness = wallAssembly
    ? getFrameDepth(wallAssembly)
    : DEFAULT_WALL_THICKNESS

  const fd = wallThickness
  const outerWidth = bw + 2 * fd
  const outerLength = bl + 2 * fd

  switch (selectedModule.type) {
    case 'exterior-wall':
      return <ExteriorWallModule
        building={building}
        wall={selectedModule.wall}
        wallThickness={wallThickness}
        wallAssembly={wallAssembly}
        exploded={exploded}
      />
    case 'roof':
      return <RoofGeometry
        roof={building.roof}
        buildingWidth={outerWidth}
        buildingLength={outerLength}
        wallHeight={wallHeight}
        roofAssembly={roofAssembly}
        viewMode="solid"
        exploded={exploded}
      />
    case 'floor-assembly':
      return floorAssembly ? (
        <FloorAssemblyLayers
          assembly={floorAssembly}
          viewMode="solid"
          outerWidth={outerWidth}
          outerLength={outerLength}
          exploded={exploded}
        />
      ) : null
    case 'interior-partition':
      return <InteriorPartitionModule
        building={building}
        roomId={selectedModule.roomId}
        wall={selectedModule.wall}
        wallThickness={wallThickness}
        exploded={exploded}
      />
    case 'bench':
      return <BenchModule
        building={building}
        roomId={selectedModule.roomId}
        benchIndex={selectedModule.benchIndex}
        wallThickness={wallThickness}
      />
    case 'heater':
      return <HeaterModule
        building={building}
        roomId={selectedModule.roomId}
      />
    case 'fixture':
      return <FixtureModule
        building={building}
        roomId={selectedModule.roomId}
        fixtureIndex={selectedModule.fixtureIndex}
      />
    default:
      return null
  }
}

/** Dimension lines for a wall's openings */
function OpeningDimensions({ openings }: { openings: Opening[] }) {
  return (
    <>
      {openings.map(o => {
        const oL = o.center - o.width / 2
        const oR = o.center + o.width / 2
        const oBot = o.fromFloor
        const oTop = o.fromFloor + o.height
        return (
          <group key={o.id}>
            {/* Opening width */}
            <DimensionLine
              from={[oL, oTop + 0.05, 0]}
              to={[oR, oTop + 0.05, 0]}
              offset={0.08}
              side="right"
            />
            {/* Opening height */}
            <DimensionLine
              from={[oR + 0.05, oBot, 0]}
              to={[oR + 0.05, oTop, 0]}
              offset={0.08}
              side="right"
            />
            {/* From floor (if window) */}
            {o.type === 'window' && o.fromFloor > 0.01 && (
              <DimensionLine
                from={[oR + 0.05, 0, 0]}
                to={[oR + 0.05, oBot, 0]}
                offset={0.18}
                side="right"
                color="#64748b"
              />
            )}
          </group>
        )
      })}
    </>
  )
}

/** Renders a single exterior wall centered at origin, facing +Z */
function ExteriorWallModule({ building, wall, wallThickness, wallAssembly, exploded }: {
  building: Building
  wall: WallName
  wallThickness: number
  wallAssembly?: Assembly
  exploded?: boolean
}) {
  const { width: bw, length: bl, wallHeight } = building.dimensions
  const outerMat = MATERIAL_PROPS[building.materials.outerWalls]
  const fd = wallThickness

  // Collect openings for this wall (same logic as ExteriorWalls.tsx)
  const openings: Opening[] = []
  for (const room of building.rooms) {
    const { x, z } = room.position
    const { width: rw, length: rl } = room.dimensions
    const roomCX = x + rw / 2 - bw / 2
    const roomCZ = z + rl / 2 - bl / 2

    if (wall === 'north' && Math.abs(z) < 0.01) {
      room.walls.north.openings.forEach(o => {
        openings.push({ ...o, center: roomCX + o.center })
      })
    }
    if (wall === 'south' && Math.abs((z + rl) - bl) < 0.01) {
      room.walls.south.openings.forEach(o => {
        openings.push({ ...o, center: -(roomCX + o.center) })
      })
    }
    if (wall === 'east' && Math.abs((x + rw) - bw) < 0.01) {
      room.walls.east.openings.forEach(o => {
        openings.push({ ...o, center: -(roomCZ + o.center) })
      })
    }
    if (wall === 'west' && Math.abs(x) < 0.01) {
      room.walls.west.openings.forEach(o => {
        openings.push({ ...o, center: roomCZ + o.center })
      })
    }
  }

  // Wall dimensions
  const ewWidth = bl + 2 * fd
  const extDepth = wallAssembly ? getExteriorDepth(wallAssembly) : 0
  const pitchRad = (building.roof.pitch * Math.PI) / 180
  const rise = building.roof.type === 'shed' ? Math.tan(pitchRad) * ewWidth : 0

  let wallWidth: number
  let hLeft: number
  let hRight: number
  let claddingWidth: number | undefined

  switch (wall) {
    case 'north':
      wallWidth = bw
      hLeft = wallHeight
      hRight = wallHeight
      claddingWidth = bw + 2 * (fd + extDepth)
      break
    case 'south':
      wallWidth = bw
      hLeft = wallHeight + rise
      hRight = wallHeight + rise
      claddingWidth = bw + 2 * (fd + extDepth)
      break
    case 'east':
      wallWidth = ewWidth
      hLeft = wallHeight
      hRight = wallHeight + rise
      claddingWidth = ewWidth + 2 * extDepth
      break
    case 'west':
      wallWidth = ewWidth
      hLeft = wallHeight + rise
      hRight = wallHeight
      claddingWidth = ewWidth + 2 * extDepth
      break
  }

  const hw = wallWidth / 2

  const wallMesh = wallAssembly ? (
    <AssemblyWallMesh
      wallWidth={wallWidth}
      wallHeight={hLeft}
      wallHeightRight={hRight}
      claddingWidth={claddingWidth}
      openings={openings}
      assembly={wallAssembly}
      hidden={false}
      viewMode="solid"
      exploded={exploded}
    />
  ) : (
    <WallMesh
      wallWidth={wallWidth}
      wallHeight={hLeft}
      wallHeightRight={hRight}
      thickness={wallThickness}
      openings={openings}
      color={outerMat.color}
      roughness={outerMat.roughness}
      metalness={outerMat.metalness}
      hidden={false}
    />
  )

  return (
    <group>
      {wallMesh}
      {/* Wall width */}
      <DimensionLine
        from={[-hw, -0.05, 0]}
        to={[hw, -0.05, 0]}
        offset={0.12}
        side="right"
      />
      {/* Wall height (left) */}
      <DimensionLine
        from={[-hw - 0.05, 0, 0]}
        to={[-hw - 0.05, hLeft, 0]}
        offset={0.12}
        side="left"
      />
      {/* Wall height (right, only if different) */}
      {Math.abs(hRight - hLeft) > 0.01 && (
        <DimensionLine
          from={[hw + 0.05, 0, 0]}
          to={[hw + 0.05, hRight, 0]}
          offset={0.12}
          side="right"
        />
      )}
      {/* Opening dimensions */}
      <OpeningDimensions openings={openings} />
    </group>
  )
}

/** Renders a single interior partition wall centered at origin */
function InteriorPartitionModule({ building, roomId, wall, wallThickness, exploded }: {
  building: Building
  roomId: string
  wall: WallName
  wallThickness: number
  exploded?: boolean
}) {
  const room = building.rooms.find(r => r.id === roomId)
  if (!room) return null

  const partitionAssembly: Assembly | undefined = building.assemblies?.interiorPartition
    ? getAssembly(building.assemblies.interiorPartition)
    : undefined

  const innerProps = MATERIAL_PROPS[room.materials.innerWalls]
  const partitionThickness = partitionAssembly
    ? getFrameDepth(partitionAssembly)
    : wallThickness * 0.6
  const { width, length } = room.dimensions

  // Compute wall heights following shed roof slope
  const fd = wallThickness
  const ewWidth = building.dimensions.length + 2 * fd
  const pitchRad = (building.roof.pitch * Math.PI) / 180
  const rise = building.roof.type === 'shed' ? Math.tan(pitchRad) * ewWidth : 0
  const wh = building.dimensions.wallHeight
  const heightAtZ = (z: number) => wh + rise * (z + fd) / ewWidth

  const hNorthEdge = heightAtZ(room.position.z)
  const hSouthEdge = heightAtZ(room.position.z + length)

  // Get openings with correct sign convention
  const openings = room.walls[wall].openings.map(o =>
    (wall === 'south' || wall === 'east') ? { ...o, center: -o.center } : o
  )

  let wallW: number
  let hL: number
  let hR: number | undefined

  switch (wall) {
    case 'north':
      wallW = width; hL = hNorthEdge; break
    case 'south':
      wallW = width; hL = hSouthEdge; break
    case 'east':
      wallW = length; hL = hNorthEdge; hR = hSouthEdge; break
    case 'west':
      wallW = length; hL = hSouthEdge; hR = hNorthEdge; break
  }

  const hw = wallW / 2

  const wallMesh = partitionAssembly ? (
    <AssemblyWallMesh
      wallWidth={wallW}
      wallHeight={hL}
      wallHeightRight={hR}
      openings={openings}
      assembly={partitionAssembly}
      hidden={false}
      viewMode="solid"
      exploded={exploded}
    />
  ) : (
    <WallMesh
      wallWidth={wallW}
      wallHeight={hL}
      wallHeightRight={hR}
      thickness={partitionThickness}
      openings={openings}
      color={innerProps.color}
      roughness={innerProps.roughness}
      metalness={innerProps.metalness}
    />
  )

  return (
    <group>
      {wallMesh}
      {/* Wall width */}
      <DimensionLine
        from={[-hw, -0.05, 0]}
        to={[hw, -0.05, 0]}
        offset={0.10}
        side="right"
      />
      {/* Wall height */}
      <DimensionLine
        from={[-hw - 0.05, 0, 0]}
        to={[-hw - 0.05, hL, 0]}
        offset={0.10}
        side="left"
      />
      <OpeningDimensions openings={openings} />
    </group>
  )
}

/** Renders a single bench centered at origin */
function BenchModule({ building, roomId, benchIndex, wallThickness }: {
  building: Building
  roomId: string
  benchIndex: number
  wallThickness: number
}) {
  const room = building.rooms.find(r => r.id === roomId)
  if (!room || !room.benches?.[benchIndex]) return null

  const bench = room.benches[benchIndex]
  const benchProps = MATERIAL_PROPS[room.materials.benches ?? 'aspen']

  // Compute riser bottom
  const sameWallBenches = room.benches.filter(b => b.wall === bench.wall && b.id !== bench.id)
  const lowerBench = sameWallBenches.find(b => b.surfaceHeight < bench.surfaceHeight)
  const riserBottom = lowerBench ? lowerBench.surfaceHeight : 0

  return (
    <group>
      <SaunaBench
        bench={bench}
        roomDimensions={room.dimensions}
        roomPosition={room.position}
        color={benchProps.color}
        wallThickness={wallThickness}
        riserBottom={riserBottom}
      />
      {/* Bench height */}
      <DimensionLine
        from={[bench.length / 2 + 0.05, 0, 0]}
        to={[bench.length / 2 + 0.05, bench.surfaceHeight, 0]}
        offset={0.10}
        side="right"
      />
      {/* Bench length */}
      <DimensionLine
        from={[-bench.length / 2, bench.surfaceHeight + 0.05, 0]}
        to={[bench.length / 2, bench.surfaceHeight + 0.05, 0]}
        offset={0.08}
        side="right"
      />
      {/* Bench depth */}
      <DimensionLine
        from={[bench.length / 2 + 0.05, bench.surfaceHeight, -bench.depth / 2]}
        to={[bench.length / 2 + 0.05, bench.surfaceHeight, bench.depth / 2]}
        offset={0.08}
        side="right"
      />
    </group>
  )
}

/** Renders a heater at origin */
function HeaterModule({ building, roomId }: {
  building: Building
  roomId: string
}) {
  const room = building.rooms.find(r => r.id === roomId)
  if (!room?.heater) return null
  const h = room.heater

  return (
    <group>
      <SaunaHeater heater={h} />
      {/* Height */}
      <DimensionLine
        from={[h.x + h.width / 2 + 0.05, 0, h.z]}
        to={[h.x + h.width / 2 + 0.05, h.height, h.z]}
        offset={0.08}
        side="right"
      />
      {/* Width */}
      <DimensionLine
        from={[h.x - h.width / 2, -0.02, h.z + h.depth / 2 + 0.05]}
        to={[h.x + h.width / 2, -0.02, h.z + h.depth / 2 + 0.05]}
        offset={0.06}
        side="right"
      />
      {/* Depth */}
      <DimensionLine
        from={[h.x + h.width / 2 + 0.05, -0.02, h.z - h.depth / 2]}
        to={[h.x + h.width / 2 + 0.05, -0.02, h.z + h.depth / 2]}
        offset={0.06}
        side="right"
      />
    </group>
  )
}

/** Renders a fixture at origin */
function FixtureModule({ building, roomId, fixtureIndex }: {
  building: Building
  roomId: string
  fixtureIndex: number
}) {
  const room = building.rooms.find(r => r.id === roomId)
  if (!room?.fixtures?.[fixtureIndex]) return null
  return <FixtureObject fixture={room.fixtures[fixtureIndex]} />
}
