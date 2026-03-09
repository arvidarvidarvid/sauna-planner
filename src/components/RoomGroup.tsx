import type { Room, WallName, Building } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { InteriorWallStatus } from '@/lib/building'
import type { ViewMode } from '@/App'
import { MATERIAL_PROPS } from '@/lib/materials'
import { getFrameDepth } from '@/lib/assemblies'
import WallMesh from './WallMesh'
import AssemblyWallMesh from './AssemblyWallMesh'
import SaunaBench from './SaunaBench'
import SaunaHeater from './SaunaHeater'
import FixtureObject from './Fixture'
import { WallPanels, CeilingPanels } from './SaunaPanels'

interface Props {
  room: Room
  building: Building
  wallThickness: number
  interiorWalls: Map<WallName, InteriorWallStatus>
  partitionAssembly?: Assembly
  viewMode: ViewMode
}

export default function RoomGroup({ room, building, wallThickness, interiorWalls, partitionAssembly, viewMode }: Props) {
  const { width, length, height } = room.dimensions
  const pos = room.position // SW corner in building space

  // Room center in world space (building centered at its geometric center)
  const bw = building.dimensions.width
  const bl = building.dimensions.length
  const cx = pos.x + width / 2 - bw / 2
  const cz = pos.z + length / 2 - bl / 2

  const mat = room.materials
  const innerProps = MATERIAL_PROPS[mat.innerWalls]
  const ceilingProps = MATERIAL_PROPS[mat.ceiling]
  const floorProps = MATERIAL_PROPS[mat.floor]
  const benchProps = MATERIAL_PROPS[mat.benches ?? 'aspen']

  const partitionThickness = partitionAssembly
    ? getFrameDepth(partitionAssembly)
    : wallThickness * 0.6

  // Shed roof slope: height varies along N→S (Z axis)
  const fd = wallThickness
  const ewWidth = bl + 2 * fd  // full E/W wall span (same as ExteriorWalls)
  const pitchRad = (building.roof.pitch * Math.PI) / 180
  const rise = building.roof.type === 'shed' ? Math.tan(pitchRad) * ewWidth : 0
  // Height at a given Z in building space — use building wallHeight (roof underside),
  // not room height, so panels reach up to the actual ceiling/roof surface
  const wallHeight = building.dimensions.wallHeight
  const heightAtZ = (z: number) => wallHeight + rise * (z + fd) / ewWidth

  // Interior wall heights following roof slope
  const hNorthEdge = heightAtZ(pos.z)           // room's north edge
  const hSouthEdge = heightAtZ(pos.z + length)  // room's south edge

  // Get openings for a wall, with centers corrected for wall rotation.
  // South (rotY=π) and East (rotY=-π/2) walls flip their local X axis,
  // so opening centers must be negated to land in the right place.
  const wallOpenings = (wall: WallName) => {
    const openings = room.walls[wall].openings
    if (wall === 'south' || wall === 'east') {
      return openings.map(o => ({ ...o, center: -o.center }))
    }
    return openings
  }

  const isFrame = viewMode === 'frame'
  const isCutaway = viewMode === 'cutaway'

  return (
    <group position={[cx, 0, cz]}>
      {/* Floor — hidden in frame mode (floor assembly layers handle this) */}
      {!isFrame && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.001, 0]}
          receiveShadow
        >
          <planeGeometry args={[width, length]} />
          <meshStandardMaterial
            color={floorProps.color}
            roughness={floorProps.roughness}
            metalness={floorProps.metalness}
          />
        </mesh>
      )}

      {/* Ceiling panels — tilted to follow shed roof slope, hidden in frame mode */}
      {!isFrame && (() => {
        const ceilingSlopeAngle = -Math.atan2(hSouthEdge - hNorthEdge, length)
        // Roof interior layers hang ~42mm below the heightAtZ line (vapor barrier + counter-batten + panel)
        const roofInteriorDrop = 0.042
        const ceilingMidY = (hNorthEdge + hSouthEdge) / 2 - roofInteriorDrop
        return (
          <group position={[0, ceilingMidY, 0]} rotation={[ceilingSlopeAngle, 0, 0]}>
            <CeilingPanels
              width={width}
              length={length}
              color={ceilingProps.color}
              roughness={ceilingProps.roughness}
            />
          </group>
        )
      })()}

      {/* Interior partition walls — only 'owned' walls render (deduplication).
         Wall is centered on the room boundary edge. */}
      {/* North wall */}
      {interiorWalls.get('north') === 'owned' && (
        <group position={[0, 0, -length / 2]} rotation={[0, 0, 0]}>
          {partitionAssembly ? (
            <AssemblyWallMesh
              wallWidth={width}
              wallHeight={hNorthEdge}
              openings={wallOpenings('north')}
              assembly={partitionAssembly}
              hidden={false}
              viewMode={viewMode}
            />
          ) : (
            <WallMesh
              wallWidth={width}
              wallHeight={hNorthEdge}
              thickness={partitionThickness}
              openings={wallOpenings('north')}
              color={innerProps.color}
              roughness={innerProps.roughness}
              metalness={innerProps.metalness}
            />
          )}
        </group>
      )}

      {/* South wall */}
      {interiorWalls.get('south') === 'owned' && (
        <group position={[0, 0, length / 2]} rotation={[0, Math.PI, 0]}>
          {partitionAssembly ? (
            <AssemblyWallMesh
              wallWidth={width}
              wallHeight={hSouthEdge}
              openings={wallOpenings('south')}
              assembly={partitionAssembly}
              hidden={false}
              viewMode={viewMode}
            />
          ) : (
            <WallMesh
              wallWidth={width}
              wallHeight={hSouthEdge}
              thickness={partitionThickness}
              openings={wallOpenings('south')}
              color={innerProps.color}
              roughness={innerProps.roughness}
              metalness={innerProps.metalness}
            />
          )}
        </group>
      )}

      {/* East wall */}
      {interiorWalls.get('east') === 'owned' && (
        <group position={[width / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          {partitionAssembly ? (
            <AssemblyWallMesh
              wallWidth={length}
              wallHeight={hNorthEdge}
              wallHeightRight={hSouthEdge}
              openings={wallOpenings('east')}
              assembly={partitionAssembly}
              hidden={false}
              viewMode={viewMode}
            />
          ) : (
            <WallMesh
              wallWidth={length}
              wallHeight={hNorthEdge}
              wallHeightRight={hSouthEdge}
              thickness={partitionThickness}
              openings={wallOpenings('east')}
              color={innerProps.color}
              roughness={innerProps.roughness}
              metalness={innerProps.metalness}
            />
          )}
        </group>
      )}

      {/* West wall */}
      {interiorWalls.get('west') === 'owned' && (
        <group position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {partitionAssembly ? (
            <AssemblyWallMesh
              wallWidth={length}
              wallHeight={hSouthEdge}
              wallHeightRight={hNorthEdge}
              openings={wallOpenings('west')}
              assembly={partitionAssembly}
              hidden={false}
              viewMode={viewMode}
            />
          ) : (
            <WallMesh
              wallWidth={length}
              wallHeight={hSouthEdge}
              wallHeightRight={hNorthEdge}
              thickness={partitionThickness}
              openings={wallOpenings('west')}
              color={innerProps.color}
              roughness={innerProps.roughness}
              metalness={innerProps.metalness}
            />
          )}
        </group>
      )}

      {/* Interior wall panels — sauna panelling on all room walls.
         Exterior walls: offset 45mm inward past assembly interior panel + counter-batten.
         Interior partition walls: offset past partition half-thickness + small gap. */}
      {!isFrame && (() => {
        const extOffset = 0.045  // inset for exterior walls (past assembly layers)
        const intOffset = partitionThickness / 2 + 0.005  // wall centered on boundary, so half-thickness + gap
        const nOff = interiorWalls.has('north') ? intOffset : extOffset
        const sOff = interiorWalls.has('south') ? intOffset : extOffset
        const eOff = interiorWalls.has('east') ? intOffset : extOffset
        const wOff = interiorWalls.has('west') ? intOffset : extOffset
        return (
          <>
            {/* North wall interior surface */}
            <group position={[0, 0, -length / 2 + nOff]} rotation={[0, 0, 0]}>
              <WallPanels wallWidth={width} wallHeight={hNorthEdge} openings={wallOpenings('north')} color={innerProps.color} roughness={innerProps.roughness} />
            </group>
            {/* South wall interior surface — hidden in cutaway if exterior */}
            {!(isCutaway && !interiorWalls.has('south')) && (
              <group position={[0, 0, length / 2 - sOff]} rotation={[0, Math.PI, 0]}>
                <WallPanels wallWidth={width} wallHeight={hSouthEdge} openings={wallOpenings('south')} color={innerProps.color} roughness={innerProps.roughness} />
              </group>
            )}
            {/* East wall interior surface */}
            <group position={[width / 2 - eOff, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <WallPanels wallWidth={length} wallHeight={hNorthEdge} wallHeightRight={hSouthEdge} openings={wallOpenings('east')} color={innerProps.color} roughness={innerProps.roughness} />
            </group>
            {/* West wall interior surface */}
            <group position={[-width / 2 + wOff, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <WallPanels wallWidth={length} wallHeight={hSouthEdge} wallHeightRight={hNorthEdge} openings={wallOpenings('west')} color={innerProps.color} roughness={innerProps.roughness} />
            </group>
          </>
        )
      })()}

      {/* Interior ceiling light */}
      {!isFrame && (
        <pointLight
          position={[0, height - 0.15, 0]}
          intensity={0.8}
          distance={height}
          decay={2}
          color="#FFD090"
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-camera-near={0.05}
          shadow-camera-far={height}
        />
      )}

      {/* Benches — hidden in frame mode */}
      {!isFrame && room.benches?.map(bench => {
        // Compute riser bottom: if another bench on the same wall sits below, stop at its surface
        const sameWallBenches = room.benches?.filter(b => b.wall === bench.wall && b.id !== bench.id) ?? []
        const lowerBench = sameWallBenches.find(b => b.surfaceHeight < bench.surfaceHeight)
        const riserBottom = lowerBench ? lowerBench.surfaceHeight : 0
        return (
          <SaunaBench
            key={bench.id}
            bench={bench}
            roomDimensions={room.dimensions}
            roomPosition={room.position}
            color={benchProps.color}
            wallThickness={wallThickness}
            riserBottom={riserBottom}
          />
        )
      })}

      {/* Heater — hidden in frame mode */}
      {!isFrame && room.heater && <SaunaHeater heater={room.heater} />}

      {/* Fixtures — hidden in frame mode */}
      {!isFrame && room.fixtures?.map(fixture => (
        <FixtureObject key={fixture.id} fixture={fixture} />
      ))}
    </group>
  )
}
