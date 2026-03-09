import type { Building } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { ViewMode } from '@/App'
import { getAssembly, getTotalThickness, getFrameDepth, getExteriorDepth } from '@/lib/assemblies'
import { generateJoists } from '@/lib/framing'
import { computeInteriorWalls } from '@/lib/building'
import ExteriorWalls from './ExteriorWalls'
import RoofGeometry from './RoofGeometry'
import RoomGroup from './RoomGroup'
import Terrace from './Terrace'

interface Props {
  building: Building
  viewMode: ViewMode
}

export const DEFAULT_WALL_THICKNESS = 0.12

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
  const partitionAssembly: Assembly | undefined = building.assemblies?.interiorPartition
    ? getAssembly(building.assemblies.interiorPartition)
    : undefined

  // Wall thickness for positioning = frame depth only (cladding extends beyond)
  const wallThickness = wallAssembly
    ? getFrameDepth(wallAssembly)
    : DEFAULT_WALL_THICKNESS

  // Exterior layer depth (wind barrier + air gap + cladding) for corner coverage
  const exteriorDepth = wallAssembly ? getExteriorDepth(wallAssembly) : 0

  // Outer footprint = interior dims + frame on each side
  const outerWidth = bw + 2 * wallThickness
  const outerLength = bl + 2 * wallThickness

  return (
    <group>
      {/* Exterior skin */}
      <ExteriorWalls
        building={building}
        wallThickness={wallThickness}
        exteriorDepth={exteriorDepth}
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
          interiorWalls={interiorWallMap.get(room.id) ?? new Map()}
          partitionAssembly={partitionAssembly}
          viewMode={viewMode}
        />
      ))}
    </group>
  )
}

export function FloorAssemblyLayers({ assembly, viewMode, outerWidth, outerLength, exploded = false }: { assembly: Assembly; viewMode: ViewMode; outerWidth: number; outerLength: number; exploded?: boolean }) {
  const bw = outerWidth
  const bl = outerLength
  const totalThickness = getTotalThickness(assembly)
  const isFrame = viewMode === 'frame'
  const gap = exploded ? 0.15 : 0

  // Floor layers stack upward from y=0 (bottom = EPDM spacers, top = duckboard)
  let yCursor = -totalThickness - gap * (assembly.layers.length - 1)
  const layers = assembly.layers.map((layer, i) => {
    const y = yCursor + layer.thickness / 2
    yCursor += layer.thickness + (i < assembly.layers.length - 1 ? gap : 0)
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
