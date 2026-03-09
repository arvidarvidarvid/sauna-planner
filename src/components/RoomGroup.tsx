import { useMemo } from 'react'
import type { Room, WallName, Building, Opening } from '@/types/sauna'
import type { ViewMode } from '@/App'
import { MATERIAL_PROPS } from '@/lib/materials'
import { generateWallFraming } from '@/lib/framing'
import { MEMBER_TYPE_COLORS } from './AssemblyWallMesh'
import WallMesh from './WallMesh'
import SaunaBench from './SaunaBench'
import SaunaHeater from './SaunaHeater'
import FixtureObject from './Fixture'
import { WallPanels, CeilingPanels } from './SaunaPanels'

interface Props {
  room: Room
  building: Building
  wallThickness: number
  interiorWalls: Set<WallName>
  viewMode: ViewMode
}

function PartitionFraming({ wallWidth, wallHeightLeft, wallHeightRight, openings, thickness }: {
  wallWidth: number; wallHeightLeft: number; wallHeightRight: number; openings: Opening[]; thickness: number;
}) {
  const members = useMemo(() =>
    generateWallFraming(wallWidth, wallHeightLeft, wallHeightRight, openings, {
      memberWidth: 0.045,
      spacing: 0.600,
      layerThickness: thickness,
    }), [wallWidth, wallHeightLeft, wallHeightRight, openings, thickness]);

  return (
    <>
      {members.map((member, i) => (
        <mesh
          key={i}
          position={[member.x, member.y, 0]}
          rotation={member.rotZ ? [0, 0, member.rotZ] : undefined}
          castShadow
        >
          <boxGeometry args={[member.width, member.height, member.depth]} />
          <meshStandardMaterial color={MEMBER_TYPE_COLORS[member.type]} roughness={0.75} />
        </mesh>
      ))}
    </>
  );
}

export default function RoomGroup({ room, building, wallThickness, interiorWalls, viewMode }: Props) {
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

  const partitionThickness = wallThickness * 0.6  // interior walls are thinner

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

      {/* Interior partition walls — offset by half thickness into the room to avoid
         z-fighting with the neighbor room's matching partition */}
      {/* North wall: z = -length/2, nudge south (into room) */}
      {interiorWalls.has('north') ? (
        <group position={[0, 0, -length / 2 + partitionThickness / 2]} rotation={[0, 0, 0]}>
          {isFrame
            ? <PartitionFraming wallWidth={width} wallHeightLeft={hNorthEdge} wallHeightRight={hNorthEdge} openings={wallOpenings('north')} thickness={partitionThickness} />
            : <WallMesh
                wallWidth={width}
                wallHeight={hNorthEdge}
                thickness={partitionThickness}
                openings={wallOpenings('north')}
                color={innerProps.color}
                roughness={innerProps.roughness}
                metalness={innerProps.metalness}
              />}
        </group>
      ) : null}

      {/* South wall: z = +length/2, nudge north (into room) */}
      {interiorWalls.has('south') ? (
        <group position={[0, 0, length / 2 - partitionThickness / 2]} rotation={[0, Math.PI, 0]}>
          {isFrame
            ? <PartitionFraming wallWidth={width} wallHeightLeft={hSouthEdge} wallHeightRight={hSouthEdge} openings={wallOpenings('south')} thickness={partitionThickness} />
            : <WallMesh
                wallWidth={width}
                wallHeight={hSouthEdge}
                thickness={partitionThickness}
                openings={wallOpenings('south')}
                color={innerProps.color}
                roughness={innerProps.roughness}
                metalness={innerProps.metalness}
              />}
        </group>
      ) : null}

      {/* East wall: x = +width/2, nudge west (into room) */}
      {interiorWalls.has('east') ? (
        <group position={[width / 2 - partitionThickness / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          {isFrame
            ? <PartitionFraming wallWidth={length} wallHeightLeft={hNorthEdge} wallHeightRight={hSouthEdge} openings={wallOpenings('east')} thickness={partitionThickness} />
            : <WallMesh
                wallWidth={length}
                wallHeight={hNorthEdge}
                wallHeightRight={hSouthEdge}
                thickness={partitionThickness}
                openings={wallOpenings('east')}
                color={innerProps.color}
                roughness={innerProps.roughness}
                metalness={innerProps.metalness}
              />}
        </group>
      ) : null}

      {/* West wall: x = -width/2, nudge east (into room) */}
      {interiorWalls.has('west') ? (
        <group position={[-width / 2 + partitionThickness / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {isFrame
            ? <PartitionFraming wallWidth={length} wallHeightLeft={hSouthEdge} wallHeightRight={hNorthEdge} openings={wallOpenings('west')} thickness={partitionThickness} />
            : <WallMesh
                wallWidth={length}
                wallHeight={hSouthEdge}
                wallHeightRight={hNorthEdge}
                thickness={partitionThickness}
                openings={wallOpenings('west')}
                color={innerProps.color}
                roughness={innerProps.roughness}
                metalness={innerProps.metalness}
              />}
        </group>
      ) : null}

      {/* Interior wall panels — sauna panelling on all room walls.
         Exterior walls: offset 45mm inward past assembly interior panel + counter-batten.
         Interior partition walls: offset past partition half-thickness + small gap. */}
      {!isFrame && (() => {
        const extOffset = 0.045  // inset for exterior walls (past assembly layers)
        const intOffset = partitionThickness + 0.005  // inset past full partition thickness + small gap
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
          distance={Math.max(width, length) * 2}
          color="#FFD090"
          castShadow={false}
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
