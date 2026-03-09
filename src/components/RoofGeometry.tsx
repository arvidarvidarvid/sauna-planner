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
  exploded?: boolean
}

export default function RoofGeometry({ roof, buildingWidth, buildingLength, wallHeight, roofAssembly, viewMode, exploded = false }: Props) {
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
    const gap = exploded ? 0.15 : 0
    const framingGap = exploded ? gap * 1.5 : 0

    // Batten constants (same as AssemblyWallMesh)
    const BATTEN_WIDTH = 0.045
    const BATTEN_SPACING = 0.600
    const BATTEN_COLOR = '#C8A878'

    // --- Framing layer: bottom at Y=0 (rests on wall top plates) ---
    if (frameLayer) {
      const frameThickness = frameLayer.thickness
      const layerY = frameThickness / 2

      // Render rafters in frame mode OR exploded mode
      if ((isFrame || exploded) && frameLayer.framing) {
        const rafters = generateRafters(buildingWidth, buildingLength, roof.overhang, {
          memberWidth: frameLayer.framing.memberWidth,
          spacing: frameLayer.framing.spacing,
          layerThickness: frameLayer.thickness,
        })
        // In exploded mode, offset rafters upward from insulation for visibility
        const rafterYOffset = exploded ? framingGap : 0
        layerElements.push(
          <group key={`frame-${frameIndex}`}>
            {rafters.map((rafter, j) => (
              <mesh
                key={j}
                position={[rafter.x, layerY + rafterYOffset, rafter.z ?? 0]}
                castShadow
              >
                <boxGeometry args={[rafter.width, rafter.depth, rafter.height]} />
                <meshStandardMaterial color={frameLayer.framing!.memberColor} roughness={0.8} />
              </mesh>
            ))}
          </group>
        )

        // In exploded mode, render individual insulation batts between rafters
        if (exploded && !isFrame) {
          const mw = frameLayer.framing.memberWidth
          const span = buildingLength + 2 * roof.overhang

          // Collect structural rafter X positions (edges of cavities)
          const rafterEdges = new Set<number>()
          rafterEdges.add(-outerW / 2)
          rafterEdges.add(outerW / 2)
          for (const r of rafters) {
            if (r.type === 'rafter' || r.type === 'fly-rafter') {
              rafterEdges.add(r.x - r.width / 2)
              rafterEdges.add(r.x + r.width / 2)
            }
          }
          const sorted = [...rafterEdges].sort((a, b) => a - b)

          // Collect lookout Z positions per cavity (for splitting batts)
          const lookouts = rafters.filter(r => r.type === 'lookout')

          const battPieces: { x: number; z: number; w: number; l: number }[] = []
          for (let i = 0; i < sorted.length - 1; i++) {
            const left = sorted[i]
            const right = sorted[i + 1]
            const cavityW = right - left
            if (cavityW < mw + 0.01) continue // skip stud-width gaps

            const cx = (left + right) / 2

            // Find lookouts that overlap this cavity's X range
            const cavityLookouts = lookouts.filter(lo => {
              const loL = lo.x - lo.width / 2
              const loR = lo.x + lo.width / 2
              return loL < right - 0.01 && loR > left + 0.01
            })

            if (cavityLookouts.length === 0) {
              // No lookouts — full span batt
              battPieces.push({ x: cx, z: 0, w: cavityW, l: span })
            } else {
              // Split batt around lookouts in Z
              const halfSpan = span / 2
              const gaps = cavityLookouts
                .map(lo => ({ bot: (lo.z ?? 0) - lo.height / 2, top: (lo.z ?? 0) + lo.height / 2 }))
                .sort((a, b) => a.bot - b.bot)

              let cursor = -halfSpan
              for (const g of gaps) {
                if (g.bot > cursor + 0.02) {
                  const segLen = g.bot - cursor
                  battPieces.push({ x: cx, z: (cursor + g.bot) / 2, w: cavityW, l: segLen })
                }
                cursor = Math.max(cursor, g.top)
              }
              if (halfSpan > cursor + 0.02) {
                const segLen = halfSpan - cursor
                battPieces.push({ x: cx, z: (cursor + halfSpan) / 2, w: cavityW, l: segLen })
              }
            }
          }

          layerElements.push(
            <group key="insulation-batts">
              {battPieces.map((b, j) => (
                <mesh key={j} position={[b.x, layerY, b.z]} castShadow>
                  <boxGeometry args={[b.w, frameThickness, b.l]} />
                  <meshStandardMaterial color={frameLayer.color} roughness={0.9} />
                </mesh>
              ))}
            </group>
          )
        }
      } else if (!isFrame && !exploded) {
        // Non-exploded solid mode: single solid block
        layerElements.push(
          <mesh key={`frame-${frameIndex}`} position={[0, layerY, 0]} receiveShadow>
            <boxGeometry args={[outerW, frameThickness, outerL]} />
            <meshStandardMaterial color={frameLayer.color} roughness={0.8} opacity={frameLayer.opacity ?? 1} transparent={(frameLayer.opacity ?? 1) < 1} />
          </mesh>
        )
      }

      // --- Soffit panels (white underside of overhang) ---
      if (!isFrame) {
        const SOFFIT_THICK = 0.012
        const SOFFIT_COLOR = '#F0EDE6'
        const soffitY = -SOFFIT_THICK / 2 // just below frame bottom
        const oh = roof.overhang

        if (oh > 0.01) {
          // North eave soffit
          layerElements.push(
            <mesh key="soffit-n" position={[0, soffitY, -(buildingLength + oh) / 2]} receiveShadow>
              <boxGeometry args={[outerW, SOFFIT_THICK, oh]} />
              <meshStandardMaterial color={SOFFIT_COLOR} roughness={0.6} />
            </mesh>
          )
          // South eave soffit
          layerElements.push(
            <mesh key="soffit-s" position={[0, soffitY, (buildingLength + oh) / 2]} receiveShadow>
              <boxGeometry args={[outerW, SOFFIT_THICK, oh]} />
              <meshStandardMaterial color={SOFFIT_COLOR} roughness={0.6} />
            </mesh>
          )
          // West rake soffit
          layerElements.push(
            <mesh key="soffit-w" position={[-(buildingWidth + oh) / 2, soffitY, 0]} receiveShadow>
              <boxGeometry args={[oh, SOFFIT_THICK, buildingLength]} />
              <meshStandardMaterial color={SOFFIT_COLOR} roughness={0.6} />
            </mesh>
          )
          // East rake soffit
          layerElements.push(
            <mesh key="soffit-e" position={[(buildingWidth + oh) / 2, soffitY, 0]} receiveShadow>
              <boxGeometry args={[oh, SOFFIT_THICK, buildingLength]} />
              <meshStandardMaterial color={SOFFIT_COLOR} roughness={0.6} />
            </mesh>
          )
        }
      }

      // --- Exterior layers: stack upward from framing top ---
      let yCursorUp = frameThickness + framingGap
      for (let i = exteriorLayers.length - 1; i >= 0; i--) {
        const layer = exteriorLayers[i]
        const origIndex = i
        // Skip the metal roofing layer (index 0) — rendered as main roof mesh
        if (origIndex === 0) continue
        const isMembrane = layer.thickness < 0.005
        const isAirGap = layer.material === 'air-gap'
        const renderThickness = isMembrane ? 0.002 : layer.thickness
        yCursorUp += gap
        const y = yCursorUp + renderThickness / 2
        yCursorUp += renderThickness

        if (isFrame && !isMembrane) continue

        // Air gaps: render battens instead of solid sheet
        if (isAirGap && !isFrame) {
          // Inset battens slightly so they don't z-fight with the layer above (metal roof)
          const battenH = renderThickness - 0.003
          const battenY = y - 0.0015
          const battensPerSpan = Math.floor(outerL / BATTEN_SPACING)
          const battenElements: React.ReactNode[] = []
          for (let b = 0; b <= battensPerSpan; b++) {
            const bz = -outerL / 2 + BATTEN_SPACING * (b + 0.5)
            if (bz > outerL / 2 - BATTEN_WIDTH) continue
            battenElements.push(
              <mesh key={b} position={[0, battenY, bz]} castShadow>
                <boxGeometry args={[outerW, battenH, BATTEN_WIDTH]} />
                <meshStandardMaterial color={BATTEN_COLOR} roughness={0.8} />
              </mesh>
            )
          }
          layerElements.push(<group key={`ext-${origIndex}`}>{battenElements}</group>)
          continue
        }

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
      let yCursorDown = -framingGap
      for (let i = 0; i < interiorLayers.length; i++) {
        const layer = interiorLayers[i]
        const origIndex = frameIndex + 1 + i
        const isMembrane = layer.thickness < 0.005
        const isAirGap = layer.material === 'air-gap'
        const renderThickness = isMembrane ? 0.002 : layer.thickness
        yCursorDown -= renderThickness + gap
        const y = yCursorDown + renderThickness / 2

        if (isFrame && !isMembrane) continue

        // Air gaps: render battens instead of solid sheet
        if (isAirGap && !isFrame) {
          const battensPerWidth = Math.floor(buildingWidth / BATTEN_SPACING)
          const battenElements: React.ReactNode[] = []
          for (let b = 0; b <= battensPerWidth; b++) {
            const bx = -buildingWidth / 2 + BATTEN_SPACING * (b + 0.5)
            if (bx > buildingWidth / 2 - BATTEN_WIDTH) continue
            battenElements.push(
              <mesh key={b} position={[bx, y, 0]} castShadow>
                <boxGeometry args={[BATTEN_WIDTH, renderThickness, buildingLength]} />
                <meshStandardMaterial color={BATTEN_COLOR} roughness={0.8} />
              </mesh>
            )
          }
          layerElements.push(<group key={`int-${origIndex}`}>{battenElements}</group>)
          continue
        }

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
  }, [roofAssembly, buildingWidth, buildingLength, wallHeight, roof, isFrame, exploded])

  // Trim & corrugation geometry (shed roof only for now)
  const isShed = roof.type === 'shed'
  const pitchRad = (roof.pitch * Math.PI) / 180
  const rise = isShed ? Math.tan(pitchRad) * buildingLength : 0
  const hw = buildingWidth / 2 + roof.overhang
  const hl = buildingLength / 2 + roof.overhang
  const overhangRise = Math.tan(pitchRad) * roof.overhang

  // Physical assembly thickness (no gaps) — used for trim, corrugation positioning
  const assemblyStackHeight = useMemo(() => {
    if (!roofAssembly) return 0
    const frameIdx = roofAssembly.layers.findIndex(l => l.framing)
    if (frameIdx < 0) return 0
    const frameTh = roofAssembly.layers[frameIdx].thickness
    let extTh = 0
    for (let i = frameIdx - 1; i >= 1; i--) { // skip index 0 (metal roofing)
      extTh += roofAssembly.layers[i].thickness < 0.005 ? 0.002 : roofAssembly.layers[i].thickness
    }
    return frameTh + extTh
  }, [roofAssembly])

  // Extra Y offset for exploded mode (gaps between layers push metal roof up)
  const explodedExtraY = useMemo(() => {
    if (!exploded || !roofAssembly) return 0
    const frameIdx = roofAssembly.layers.findIndex(l => l.framing)
    if (frameIdx < 0) return 0
    const gap = 0.15
    const framingGap = gap * 1.5
    // rafter offset + framingGap above rafters + gap per exterior layer + final gap before metal
    const extLayerCount = frameIdx - 1 // layers between frame and metal (indices 1..frameIdx-1)
    return framingGap + framingGap + (extLayerCount + 1) * gap
  }, [exploded, roofAssembly])

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
    const localY = assemblyStackHeight + explodedExtraY + RIDGE_HEIGHT / 2 + 0.002
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
  }, [isShed, isFrame, buildingWidth, buildingLength, roof.overhang, pitchRad, wallHeight, rise, color, assemblyStackHeight, explodedExtraY])

  // White painted wood trim (fascia & barge boards)
  const TRIM_THICKNESS = 0.022
  const TRIM_HEIGHT = assemblyStackHeight + 0.025  // cover assembly stack + small lip below
  const TRIM_COLOR = '#F0EDE6'

  return (
    <>
      {/* Main roof surface — hidden in frame mode, offset along pitch normal by assembly stack */}
      {!isFrame && (() => {
        const totalOffset = assemblyStackHeight + explodedExtraY
        const dy = totalOffset * Math.cos(pitchRad)
        const dz = -totalOffset * Math.sin(pitchRad)
        return (
        <mesh
          geometry={geometry}
          position={[0, dy, dz]}
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
        )
      })()}
      {roofLayers}

      {/* Corrugation ridges */}
      {corrugationRidges}

      {/* Roof trim — white painted fascia & barge boards */}
      {!isFrame && isShed && (() => {
        // Trim top aligns with the top of the assembly stack (or wallHeight if no assembly)
        // In exploded mode, trim moves up with the metal roof
        const totalStackH = assemblyStackHeight + explodedExtraY
        // Convert from pitched-local to world Y offset
        const stackDy = totalStackH * Math.cos(pitchRad)
        const stackDz = -totalStackH * Math.sin(pitchRad)
        const nY = wallHeight - overhangRise + stackDy
        const sY = wallHeight + rise + overhangRise + stackDy

        const slopeLen = (buildingLength + 2 * roof.overhang) / Math.cos(pitchRad)
        const midY = wallHeight + rise / 2
        // Barge board local Y offset in pitched frame
        const bargeDy = totalStackH * Math.cos(pitchRad)
        const bargeDz = -totalStackH * Math.sin(pitchRad)

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
