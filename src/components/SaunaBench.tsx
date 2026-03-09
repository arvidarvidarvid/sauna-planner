import { useMemo } from 'react'
import type { Bench, Building } from '@/types/sauna'

interface Props {
  bench: Bench
  roomDimensions: Building['rooms'][0]['dimensions']
  roomPosition: Building['rooms'][0]['position']
  color: string
  wallThickness: number
  riserBottom: number  // where the front riser stops (0 = floor, or lower bench surface)
}

// Slat dimensions (meters)
const SLAT_WIDTH = 0.045     // 45mm board face
const SLAT_GAP = 0.008       // 8mm gap between boards
const SLAT_STEP = SLAT_WIDTH + SLAT_GAP
const SLAT_THICKNESS = 0.028 // 28mm thick

// Backrest
const BACKREST_BOARD_H = 0.090  // 90mm tall boards
const BACKREST_GAP = 0.015      // 15mm gap between backrest boards
const BACKREST_STEP = BACKREST_BOARD_H + BACKREST_GAP
const BACKREST_COUNT = 2

export default function SaunaBench({ bench, roomDimensions, color, wallThickness, riserBottom }: Props) {
  const { width, length } = roomDimensions
  const halfW = width / 2
  const halfL = length / 2

  // Bench center position relative to room center
  let x = bench.centerOffset
  let z = 0
  const t = wallThickness / 2
  const fo = bench.frontOffset ?? 0

  switch (bench.wall) {
    case 'north': z = -halfL + t + bench.depth / 2 + fo; break
    case 'south': z =  halfL - t - bench.depth / 2 - fo; break
    case 'east':  x =  halfW - t - bench.depth / 2 - fo; z = bench.centerOffset; break
    case 'west':  x = -halfW + t + bench.depth / 2 + fo; z = bench.centerOffset; break
  }

  const isAlongX = bench.wall === 'north' || bench.wall === 'south'
  const isUpperBench = !bench.frontOffset || bench.frontOffset === 0

  const darkerColor = adjustBrightness(color, -8)

  // Precompute slat data
  const surfaceSlats = useMemo(() => {
    // Surface slats run side-to-side (along bench length), spaced across depth
    const count = Math.floor(bench.depth / SLAT_STEP)
    const totalSpan = count * SLAT_STEP - SLAT_GAP
    const startOffset = -totalSpan / 2 + SLAT_WIDTH / 2
    const slats: { pos: number; color: string }[] = []
    for (let i = 0; i < count; i++) {
      slats.push({
        pos: startOffset + i * SLAT_STEP,
        color: i % 2 === 0 ? color : darkerColor,
      })
    }
    return slats
  }, [bench.length, color, darkerColor])

  const riserSlats = useMemo(() => {
    const riserHeight = bench.surfaceHeight - riserBottom
    if (riserHeight < SLAT_STEP) return []
    const count = Math.floor(riserHeight / SLAT_STEP)
    const totalSpan = count * SLAT_STEP - SLAT_GAP
    const startY = riserBottom + (riserHeight - totalSpan) / 2 + SLAT_WIDTH / 2
    const slats: { y: number; color: string }[] = []
    for (let i = 0; i < count; i++) {
      slats.push({
        y: startY + i * SLAT_STEP,
        color: i % 2 === 0 ? color : darkerColor,
      })
    }
    return slats
  }, [bench.surfaceHeight, riserBottom, color, darkerColor])

  // Front edge position (away from wall)
  const frontSign = (bench.wall === 'north' || bench.wall === 'west') ? 1 : -1
  const frontOffset = frontSign * bench.depth / 2

  // Back edge position (toward wall)
  const backOffset = -frontSign * bench.depth / 2

  return (
    <group position={[x, 0, z]}>
      {/* Surface slats — boards running side-to-side (along bench length) */}
      {surfaceSlats.map((slat, i) => {
        const depthPos = (-0.5 + (i + 0.5) / surfaceSlats.length) * bench.depth * frontSign
        return (
          <mesh
            key={`s-${i}`}
            position={[
              isAlongX ? 0 : depthPos,
              bench.surfaceHeight - SLAT_THICKNESS / 2,
              isAlongX ? depthPos : 0,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[
              isAlongX ? bench.length : SLAT_WIDTH,
              SLAT_THICKNESS,
              isAlongX ? SLAT_WIDTH : bench.length,
            ]} />
            <meshStandardMaterial color={slat.color} roughness={0.75} />
          </mesh>
        )
      })}

      {/* Cross-beam supports under surface (2 beams running front-to-back, perpendicular to slats) */}
      {[-0.3, 0.3].map(frac => {
        const alongPos = frac * bench.length
        const supportY = bench.surfaceHeight - SLAT_THICKNESS - 0.035
        return (
          <mesh
            key={`cb-${frac}`}
            position={[
              isAlongX ? alongPos : 0,
              supportY,
              isAlongX ? 0 : alongPos,
            ]}
          >
            <boxGeometry args={[
              isAlongX ? 0.045 : bench.depth - 0.02,
              0.045,
              isAlongX ? bench.depth - 0.02 : 0.045,
            ]} />
            <meshStandardMaterial color={darkerColor} roughness={0.8} />
          </mesh>
        )
      })}

      {/* Front riser — horizontal slats covering vertical face */}
      {riserSlats.map((slat, i) => (
        <mesh
          key={`r-${i}`}
          position={[
            isAlongX ? 0 : frontOffset,
            slat.y,
            isAlongX ? frontOffset : 0,
          ]}
          castShadow
        >
          <boxGeometry args={[
            isAlongX ? bench.length : SLAT_THICKNESS,
            SLAT_WIDTH,
            isAlongX ? SLAT_THICKNESS : bench.length,
          ]} />
          <meshStandardMaterial color={slat.color} roughness={0.75} />
        </mesh>
      ))}

      {/* Backrest — horizontal boards above seat, offset from wall (upper bench only) */}
      {isUpperBench && (() => {
        // Backrest sits 7cm from wall surface: ~4cm gap behind boards + SLAT_THICKNESS board
        const BACKREST_STANDOFF = 0.07 // total distance from wall to front of board
        const spacerDepth = BACKREST_STANDOFF - SLAT_THICKNESS // ~42mm spacer
        const boardOffset = backOffset + frontSign * (BACKREST_STANDOFF - SLAT_THICKNESS / 2)
        const spacerOffset = backOffset + frontSign * (spacerDepth / 2)

        return (
          <>
            {/* Spacer blocks between wall and backrest boards */}
            {[-0.35, 0, 0.35].map(frac => {
              const alongPos = frac * bench.length
              const spacerY = bench.surfaceHeight + 0.05 + (BACKREST_COUNT * BACKREST_STEP - BACKREST_GAP) / 2
              return (
                <mesh
                  key={`sp-${frac}`}
                  position={[
                    isAlongX ? alongPos : spacerOffset,
                    spacerY,
                    isAlongX ? spacerOffset : alongPos,
                  ]}
                >
                  <boxGeometry args={[
                    isAlongX ? 0.03 : spacerDepth,
                    BACKREST_COUNT * BACKREST_STEP - BACKREST_GAP,
                    isAlongX ? spacerDepth : 0.03,
                  ]} />
                  <meshStandardMaterial color={darkerColor} roughness={0.8} />
                </mesh>
              )
            })}
            {/* Backrest boards */}
            {Array.from({ length: BACKREST_COUNT }, (_, i) => {
              const boardY = bench.surfaceHeight + 0.05 + BACKREST_BOARD_H / 2 + i * BACKREST_STEP
              return (
                <mesh
                  key={`br-${i}`}
                  position={[
                    isAlongX ? 0 : boardOffset,
                    boardY,
                    isAlongX ? boardOffset : 0,
                  ]}
                  castShadow
                >
                  <boxGeometry args={[
                    isAlongX ? bench.length : SLAT_THICKNESS,
                    BACKREST_BOARD_H,
                    isAlongX ? SLAT_THICKNESS : bench.length,
                  ]} />
                  <meshStandardMaterial color={i % 2 === 0 ? color : darkerColor} roughness={0.75} />
                </mesh>
              )
            })}
          </>
        )
      })()}

      {/* LED backlight — point lights behind backrest/riser simulating warm LED strip bounce */}
      {(() => {
        const ledY = isUpperBench
          ? bench.surfaceHeight + 0.05 + BACKREST_BOARD_H / 2 + (BACKREST_COUNT - 1) * BACKREST_STEP
          : bench.surfaceHeight - 0.02
        // In the gap between backrest and wall
        const ledWallOffset = backOffset + frontSign * 0.02
        // Spread multiple point lights along the bench length for even coverage
        const ledCount = 5
        return Array.from({ length: ledCount }, (_, i) => {
          const frac = (i + 0.5) / ledCount - 0.5
          const alongPos = frac * bench.length * 0.9
          return (
            <pointLight
              key={`led-${i}`}
              position={[
                isAlongX ? alongPos : ledWallOffset,
                ledY,
                isAlongX ? ledWallOffset : alongPos,
              ]}
              intensity={0.3}
              distance={1.0}
              decay={2}
              color="#FFBB66"
              castShadow={false}
            />
          )
        })
      })()}
    </group>
  )
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount))
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}
