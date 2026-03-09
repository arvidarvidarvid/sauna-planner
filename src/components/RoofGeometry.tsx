import { useMemo } from 'react'
import type { Roof } from '@/types/sauna'
import type { Assembly } from '@/types/assembly'
import type { ViewMode } from '@/App'
import { ROOF_MATERIAL_PROPS } from '@/lib/materials'
import { generateRafters } from '@/lib/framing'
import {
  buildGabledRoofGeometry,
  buildShedRoofGeometry,
  buildFlatRoofGeometry,
} from '@/lib/geometry'

interface Props {
  roof: Roof
  buildingWidth: number
  buildingLength: number
  wallHeight: number
  roofAssembly?: Assembly
  viewMode: ViewMode
}

export default function RoofGeometry({ roof, buildingWidth, buildingLength, wallHeight, roofAssembly, viewMode }: Props) {
  const isFrame = viewMode === 'frame'

  const geometry = useMemo(() => {
    switch (roof.type) {
      case 'gabled':
        return buildGabledRoofGeometry(
          buildingWidth,
          buildingLength,
          wallHeight,
          roof.pitch,
          roof.ridgeDirection,
          roof.overhang,
        )
      case 'shed':
        return buildShedRoofGeometry(
          buildingWidth,
          buildingLength,
          wallHeight,
          roof.pitch,
          roof.overhang,
        )
      case 'flat':
      case 'hip':
      default:
        return buildFlatRoofGeometry(
          buildingWidth,
          buildingLength,
          wallHeight,
          roof.overhang,
        )
    }
  }, [roof, buildingWidth, buildingLength, wallHeight])

  const matProps = ROOF_MATERIAL_PROPS[roof.material]
  const color = roof.color || matProps.color

  // Roof assembly layers — framing sits on wall top, exterior stacks up, interior hangs down
  const roofLayers = useMemo(() => {
    if (!roofAssembly) return null
    const outerW = buildingWidth + 2 * roof.overhang
    const outerL = buildingLength + 2 * roof.overhang

    // Pitch geometry for shed roofs
    const pitchRad = (roof.pitch * Math.PI) / 180
    const isShed = roof.type === 'shed'
    const rise = isShed ? Math.tan(pitchRad) * buildingLength : 0

    // Split layers into zones around the framing layer
    const frameIndex = roofAssembly.layers.findIndex(l => l.framing)
    const frameLayer = roofAssembly.layers[frameIndex]
    const exteriorLayers = roofAssembly.layers.slice(0, frameIndex)   // above framing (metal, vent gap, wind barrier)
    const interiorLayers = roofAssembly.layers.slice(frameIndex + 1)  // below framing (vapor, counter-batten, ceiling)

    const layerElements: React.ReactNode[] = []

    // --- Framing layer: bottom at Y=0 (rests on wall top plates) ---
    if (frameLayer) {
      const frameThickness = frameLayer.thickness
      const layerY = frameThickness / 2

      if (isFrame && frameLayer.framing) {
        const rafters = generateRafters(buildingWidth, buildingLength, roof.overhang, {
          memberWidth: frameLayer.framing.memberWidth,
          spacing: frameLayer.framing.spacing,
          layerThickness: frameLayer.thickness,
        })
        layerElements.push(
          <group key={`frame-${frameIndex}`}>
            {rafters.map((rafter, j) => (
              <mesh
                key={j}
                position={[rafter.x, layerY, rafter.z ?? 0]}
                castShadow
              >
                <boxGeometry args={[rafter.width, rafter.depth, rafter.height]} />
                <meshStandardMaterial color={frameLayer.framing!.memberColor} roughness={0.8} />
              </mesh>
            ))}
          </group>
        )
      } else if (!isFrame) {
        layerElements.push(
          <mesh key={`frame-${frameIndex}`} position={[0, layerY, 0]} receiveShadow>
            <boxGeometry args={[outerW, frameThickness, outerL]} />
            <meshStandardMaterial color={frameLayer.color} roughness={0.8} opacity={frameLayer.opacity ?? 1} transparent={(frameLayer.opacity ?? 1) < 1} />
          </mesh>
        )
      }

      // --- Exterior layers: stack upward from framing top ---
      let yCursorUp = frameThickness
      for (let i = exteriorLayers.length - 1; i >= 0; i--) {
        const layer = exteriorLayers[i]
        const origIndex = i
        // Skip the metal roofing layer (index 0) — rendered as main roof mesh
        if (origIndex === 0) continue
        const isMembrane = layer.thickness < 0.005
        const renderThickness = isMembrane ? 0.002 : layer.thickness
        const y = yCursorUp + renderThickness / 2
        yCursorUp += renderThickness

        if (isFrame && !isMembrane) continue
        layerElements.push(
          <mesh key={`ext-${origIndex}`} position={[0, y, 0]} receiveShadow>
            <boxGeometry args={[outerW, renderThickness, outerL]} />
            <meshStandardMaterial
              color={layer.color} roughness={0.8}
              transparent={isMembrane || (layer.opacity != null && layer.opacity < 1)}
              opacity={isFrame && isMembrane ? 0.15 : (layer.opacity ?? 1)}
            />
          </mesh>
        )
      }

      // --- Interior layers: stack downward from Y=0 (indoor area only) ---
      let yCursorDown = 0
      for (let i = 0; i < interiorLayers.length; i++) {
        const layer = interiorLayers[i]
        const origIndex = frameIndex + 1 + i
        const isMembrane = layer.thickness < 0.005
        const renderThickness = isMembrane ? 0.002 : layer.thickness
        yCursorDown -= renderThickness
        const y = yCursorDown + renderThickness / 2

        if (isFrame && !isMembrane) continue
        layerElements.push(
          <mesh key={`int-${origIndex}`} position={[0, y, 0]} receiveShadow>
            <boxGeometry args={[buildingWidth, renderThickness, buildingLength]} />
            <meshStandardMaterial
              color={layer.color} roughness={0.8}
              transparent={isMembrane || (layer.opacity != null && layer.opacity < 1)}
              opacity={isFrame && isMembrane ? 0.15 : (layer.opacity ?? 1)}
            />
          </mesh>
        )
      }
    }

    // Wrap in a pitched group for shed roofs
    if (isShed && rise > 0) {
      return (
        <group
          position={[0, wallHeight + rise / 2, 0]}
          rotation={[-pitchRad, 0, 0]}
        >
          {layerElements}
        </group>
      )
    }

    // Flat/other roofs: no tilt, but still need wallHeight offset
    return (
      <group position={[0, wallHeight, 0]}>
        {layerElements}
      </group>
    )
  }, [roofAssembly, buildingWidth, buildingLength, wallHeight, roof, isFrame])

  // Trim & corrugation geometry (shed roof only for now)
  const isShed = roof.type === 'shed'
  const pitchRad = (roof.pitch * Math.PI) / 180
  const rise = isShed ? Math.tan(pitchRad) * buildingLength : 0
  const hw = buildingWidth / 2 + roof.overhang
  const hl = buildingLength / 2 + roof.overhang
  const overhangRise = Math.tan(pitchRad) * roof.overhang

  // Total assembly thickness above wall top (framing + exterior layers except metal roofing)
  const assemblyStackHeight = useMemo(() => {
    if (!roofAssembly) return 0
    const frameIdx = roofAssembly.layers.findIndex(l => l.framing)
    if (frameIdx < 0) return 0
    const frameTh = roofAssembly.layers[frameIdx].thickness
    // Exterior layers between frame and metal roofing (index 0), excluding the metal itself
    let extTh = 0
    for (let i = frameIdx - 1; i >= 1; i--) { // skip index 0 (metal roofing)
      extTh += roofAssembly.layers[i].thickness < 0.005 ? 0.002 : roofAssembly.layers[i].thickness
    }
    return frameTh + extTh
  }, [roofAssembly])

  // Corrugation ridges running N→S (down the slope)
  const corrugationRidges = useMemo(() => {
    if (!isShed || isFrame) return null
    const RIDGE_SPACING = 0.076  // ~76mm between ridges (standard corrugated profile)
    const RIDGE_HEIGHT = 0.012
    const RIDGE_WIDTH = 0.025
    const slopeLen = (buildingLength + 2 * roof.overhang) / Math.cos(pitchRad)
    const count = Math.floor((buildingWidth + 2 * roof.overhang) / RIDGE_SPACING)
    const totalW = (count - 1) * RIDGE_SPACING
    const startX = -totalW / 2

    const ridges: { x: number }[] = []
    for (let i = 0; i < count; i++) {
      ridges.push({ x: startX + i * RIDGE_SPACING })
    }

    // The pitched group for assembly layers is at [0, wallHeight + rise/2, 0]
    // with rotation [-pitchRad, 0, 0]. Inside that group, assembly layers stack
    // from y=0 (wall top) up to y=assemblyStackHeight. Corrugation sits on top.
    const localY = assemblyStackHeight + RIDGE_HEIGHT / 2 + 0.002
    const surfaceMidY = wallHeight + rise / 2
    // Convert local Y offset to world coords (rotated by pitch)
    const dy = localY * Math.cos(pitchRad)
    const dz = -localY * Math.sin(pitchRad)

    return (
      <group position={[0, surfaceMidY + dy, dz]} rotation={[-pitchRad, 0, 0]}>
        {ridges.map((r, i) => (
          <mesh key={i} position={[r.x, 0, 0]} castShadow>
            <boxGeometry args={[RIDGE_WIDTH, RIDGE_HEIGHT, slopeLen]} />
            <meshStandardMaterial color={color} roughness={0.25} metalness={0.85} />
          </mesh>
        ))}
      </group>
    )
  }, [isShed, isFrame, buildingWidth, buildingLength, roof.overhang, pitchRad, wallHeight, rise, color, assemblyStackHeight])

  // White painted wood trim (fascia & barge boards)
  const TRIM_THICKNESS = 0.022
  const TRIM_HEIGHT = assemblyStackHeight + 0.025  // cover assembly stack + small lip below
  const TRIM_COLOR = '#F0EDE6'

  return (
    <>
      {/* Main roof surface — hidden in frame mode, offset up by assembly stack to sit on top */}
      {!isFrame && (
        <mesh
          geometry={geometry}
          position={[0, assemblyStackHeight, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={color}
            roughness={matProps.roughness}
            metalness={matProps.metalness}
            side={2}
          />
        </mesh>
      )}
      {roofLayers}

      {/* Corrugation ridges */}
      {corrugationRidges}

      {/* Roof trim — white painted fascia & barge boards */}
      {!isFrame && isShed && (() => {
        // Trim top aligns with the top of the assembly stack (or wallHeight if no assembly)
        // Convert assemblyStackHeight from pitched-local to world Y offset
        const stackDy = assemblyStackHeight * Math.cos(pitchRad)
        const stackDz = -assemblyStackHeight * Math.sin(pitchRad)
        const nY = wallHeight - overhangRise + stackDy
        const sY = wallHeight + rise + overhangRise + stackDy

        const slopeLen = (buildingLength + 2 * roof.overhang) / Math.cos(pitchRad)
        const midY = wallHeight + rise / 2
        // Barge board local Y offset in pitched frame
        const bargeDy = assemblyStackHeight * Math.cos(pitchRad)
        const bargeDz = -assemblyStackHeight * Math.sin(pitchRad)

        // Nudge trim outward to avoid z-fighting with assembly layers
        const nudge = TRIM_THICKNESS / 2 + 0.003

        return (
          <group>
            {/* North fascia (low side) */}
            <mesh
              position={[0, nY - TRIM_HEIGHT / 2, -hl + stackDz - nudge]}
              castShadow
            >
              <boxGeometry args={[hw * 2 + TRIM_THICKNESS * 2, TRIM_HEIGHT, TRIM_THICKNESS]} />
              <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
            </mesh>

            {/* South fascia (high side) */}
            <mesh
              position={[0, sY - TRIM_HEIGHT / 2, hl + stackDz + nudge]}
              castShadow
            >
              <boxGeometry args={[hw * 2 + TRIM_THICKNESS * 2, TRIM_HEIGHT, TRIM_THICKNESS]} />
              <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
            </mesh>

            {/* West barge board (follows slope) */}
            <mesh
              position={[-hw - nudge, midY + bargeDy - TRIM_HEIGHT / 2, bargeDz]}
              rotation={[-pitchRad, 0, 0]}
              castShadow
            >
              <boxGeometry args={[TRIM_THICKNESS, TRIM_HEIGHT, slopeLen]} />
              <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
            </mesh>

            {/* East barge board (follows slope) */}
            <mesh
              position={[hw + nudge, midY + bargeDy - TRIM_HEIGHT / 2, bargeDz]}
              rotation={[-pitchRad, 0, 0]}
              castShadow
            >
              <boxGeometry args={[TRIM_THICKNESS, TRIM_HEIGHT, slopeLen]} />
              <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
            </mesh>
          </group>
        )
      })()}
    </>
  )
}
