import type { Building, WallName } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { ViewMode } from '@/App'
import { getAssembly, getTotalThickness, getFrameDepth } from '@/lib/assemblies'
import { generateJoists } from '@/lib/framing'
import ExteriorWalls from './ExteriorWalls'
import RoofGeometry from './RoofGeometry'
import RoomGroup from './RoomGroup'
import Terrace from './Terrace'

interface Props {
  building: Building
  viewMode: ViewMode
}

const DEFAULT_WALL_THICKNESS = 0.12

/**
 * Determines which walls of each room are interior (shared with another room).
 * Interior walls are rendered as partition walls inside RoomGroup.
 * Exterior walls are handled by ExteriorWalls and NOT rendered inside RoomGroup.
 */
function computeInteriorWalls(building: Building): Map<string, Set<WallName>> {
  const result = new Map<string, Set<WallName>>()
  const { width: bw, length: bl } = building.dimensions

  for (const room of building.rooms) {
    const interior = new Set<WallName>()
    const { x, z } = room.position
    const { width: rw, length: rl } = room.dimensions

    const isNorthExterior = Math.abs(z) < 0.01
    const isSouthExterior = Math.abs((z + rl) - bl) < 0.01
    const isEastExterior  = Math.abs((x + rw) - bw) < 0.01
    const isWestExterior  = Math.abs(x) < 0.01

    if (!isNorthExterior) {
      const hasNeighbor = building.rooms.some(other => {
        if (other.id === room.id) return false
        return (
          Math.abs((other.position.z + other.dimensions.length) - z) < 0.01 &&
          rangesOverlap(other.position.x, other.position.x + other.dimensions.width, x, x + rw)
        )
      })
      if (hasNeighbor) interior.add('north')
    }

    if (!isSouthExterior) {
      const hasNeighbor = building.rooms.some(other => {
        if (other.id === room.id) return false
        return (
          Math.abs(other.position.z - (z + rl)) < 0.01 &&
          rangesOverlap(other.position.x, other.position.x + other.dimensions.width, x, x + rw)
        )
      })
      if (hasNeighbor) interior.add('south')
    }

    if (!isEastExterior) {
      const hasNeighbor = building.rooms.some(other => {
        if (other.id === room.id) return false
        return (
          Math.abs(other.position.x - (x + rw)) < 0.01 &&
          rangesOverlap(other.position.z, other.position.z + other.dimensions.length, z, z + rl)
        )
      })
      if (hasNeighbor) interior.add('east')
    }

    if (!isWestExterior) {
      const hasNeighbor = building.rooms.some(other => {
        if (other.id === room.id) return false
        return (
          Math.abs((other.position.x + other.dimensions.width) - x) < 0.01 &&
          rangesOverlap(other.position.z, other.position.z + other.dimensions.length, z, z + rl)
        )
      })
      if (hasNeighbor) interior.add('west')
    }

    result.set(room.id, interior)
  }

  return result
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && a2 > b1
}

export default function BuildingGroup({ building, viewMode }: Props) {
  const { width: bw, length: bl, wallHeight } = building.dimensions
  const interiorWallMap = computeInteriorWalls(building)

  // Resolve assembly presets
  const wallAssembly: Assembly | undefined = building.assemblies?.exteriorWall
    ? getAssembly(building.assemblies.exteriorWall)
    : undefined
  const roofAssembly: Assembly | undefined = building.assemblies?.roof
    ? getAssembly(building.assemblies.roof)
    : undefined
  const floorAssembly: Assembly | undefined = building.assemblies?.floor
    ? getAssembly(building.assemblies.floor)
    : undefined

  // Wall thickness for positioning = frame depth only (cladding extends beyond)
  const wallThickness = wallAssembly
    ? getFrameDepth(wallAssembly)
    : DEFAULT_WALL_THICKNESS

  // Outer footprint = interior dims + frame on each side
  const outerWidth = bw + 2 * wallThickness
  const outerLength = bl + 2 * wallThickness

  return (
    <group>
      {/* Exterior skin */}
      <ExteriorWalls
        building={building}
        wallThickness={wallThickness}
        viewMode={viewMode}
        wallAssembly={wallAssembly}
      />

      {/* Roof */}
      <RoofGeometry
        roof={building.roof}
        buildingWidth={outerWidth}
        buildingLength={outerLength}
        wallHeight={wallHeight}
        roofAssembly={roofAssembly}
        viewMode={viewMode}
      />

      {/* Floor assembly layers */}
      {floorAssembly && (
        <FloorAssemblyLayers
          assembly={floorAssembly}
          viewMode={viewMode}
          outerWidth={outerWidth}
          outerLength={outerLength}
        />
      )}

      {/* Terrace deck beneath the building */}
      {building.terrace && (
        <Terrace
          terrace={building.terrace}
          deckY={floorAssembly ? -getTotalThickness(floorAssembly) : 0}
          centerOffset={{
            // Terrace SW corner in world = building outer SW corner − offset
            // Building outer SW corner in world = (−outerWidth/2, −outerLength/2)
            // Terrace center in world = terrace SW corner + (tw/2, tl/2)
            x: -outerWidth / 2 - building.terrace.buildingOffset.x + building.terrace.width / 2,
            z: -outerLength / 2 - building.terrace.buildingOffset.z + building.terrace.length / 2,
          }}
        />
      )}

      {/* Room interiors */}
      {building.rooms.map(room => (
        <RoomGroup
          key={room.id}
          room={room}
          building={building}
          wallThickness={wallThickness}
          interiorWalls={interiorWallMap.get(room.id) ?? new Set()}
          viewMode={viewMode}
        />
      ))}
    </group>
  )
}

function FloorAssemblyLayers({ assembly, viewMode, outerWidth, outerLength }: { assembly: Assembly; viewMode: ViewMode; outerWidth: number; outerLength: number }) {
  const bw = outerWidth
  const bl = outerLength
  const totalThickness = getTotalThickness(assembly)
  const isFrame = viewMode === 'frame'

  // Floor layers stack upward from y=0 (bottom = EPDM spacers, top = duckboard)
  let yCursor = -totalThickness
  const layers = assembly.layers.map((layer) => {
    const y = yCursor + layer.thickness / 2
    yCursor += layer.thickness
    return { layer, y }
  })

  return (
    <group>
      {layers.map(({ layer, y }, i) => {
        const isMembrane = layer.thickness < 0.005
        const hasFraming = !!layer.framing

        // In frame mode, skip non-framing, non-membrane solid layers
        if (isFrame && !hasFraming && !isMembrane) return null

        // In frame mode with framing, render individual joists
        if (isFrame && hasFraming && layer.framing) {
          const joists = generateJoists(bw, bl, {
            memberWidth: layer.framing.memberWidth,
            spacing: layer.framing.spacing,
            layerThickness: layer.thickness,
          })
          return (
            <group key={i}>
              {joists.map((joist, j) => (
                <mesh
                  key={j}
                  position={[joist.x, y, 0]}
                  castShadow
                >
                  <boxGeometry args={[joist.width, layer.thickness, joist.height]} />
                  <meshStandardMaterial color={layer.framing!.memberColor} roughness={0.8} />
                </mesh>
              ))}
            </group>
          )
        }

        return (
          <mesh
            key={i}
            position={[0, y, 0]}
            receiveShadow
          >
            <boxGeometry args={[bw, isMembrane ? 0.002 : layer.thickness, bl]} />
            <meshStandardMaterial
              color={layer.color}
              roughness={0.8}
              transparent={isMembrane || (layer.opacity != null && layer.opacity < 1)}
              opacity={layer.opacity ?? 1}
            />
          </mesh>
        )
      })}
    </group>
  )
}
