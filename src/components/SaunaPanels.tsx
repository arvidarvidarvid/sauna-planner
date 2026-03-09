import { useMemo } from 'react'
import type { Opening } from '@/types/sauna'

// Classic sauna panel dimensions (meters)
const BOARD_WIDTH = 0.070   // 70mm visible board face
const BOARD_GAP = 0.010     // 10mm recessed groove between boards
const BOARD_STEP = BOARD_WIDTH + BOARD_GAP
const PANEL_DEPTH = 0.008   // thin surface detail

interface WallPanelProps {
  wallWidth: number
  wallHeight: number
  wallHeightRight?: number  // for sloped walls (E/W under shed roof)
  openings: Opening[]
  color: string
  roughness?: number
}

/** Vertical sauna panels on a wall interior surface.
 *  Rendered in wall-local space: X = along wall (centered), Y = up from 0. */
export function WallPanels({ wallWidth, wallHeight, wallHeightRight, openings, color, roughness = 0.75 }: WallPanelProps) {
  const boards = useMemo(() => {
    const result: { x: number; segments: { y: number; h: number }[] }[] = []
    const count = Math.ceil(wallWidth / BOARD_STEP) + 1
    const totalSpan = count * BOARD_STEP - BOARD_GAP
    const startX = -totalSpan / 2 + BOARD_WIDTH / 2
    const hRight = wallHeightRight ?? wallHeight

    for (let i = 0; i < count; i++) {
      const xCenter = startX + i * BOARD_STEP
      if (xCenter - BOARD_WIDTH / 2 > wallWidth / 2) break
      if (xCenter + BOARD_WIDTH / 2 < -wallWidth / 2) continue

      const clampedLeft = Math.max(xCenter - BOARD_WIDTH / 2, -wallWidth / 2)
      const clampedRight = Math.min(xCenter + BOARD_WIDTH / 2, wallWidth / 2)
      const cx = (clampedLeft + clampedRight) / 2
      const bw = clampedRight - clampedLeft

      // Interpolate height along wall for sloped ceilings
      const t = (cx + wallWidth / 2) / wallWidth
      const boardHeight = wallHeight + (hRight - wallHeight) * t

      const segments = getVerticalSegments(cx, bw, boardHeight, openings)
      if (segments.length > 0) {
        result.push({ x: cx, segments: segments.map(s => ({ y: (s.bottom + s.top) / 2, h: s.top - s.bottom })) })
      }
    }
    return result
  }, [wallWidth, wallHeight, wallHeightRight, openings])

  const darkerColor = adjustBrightness(color, -6)

  return (
    <group>
      {boards.map((col, i) => (
        col.segments.map((seg, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[col.x, seg.y, PANEL_DEPTH / 2]}
            receiveShadow
          >
            <boxGeometry args={[BOARD_WIDTH, seg.h, PANEL_DEPTH]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? color : darkerColor}
              roughness={roughness}
            />
          </mesh>
        ))
      ))}
    </group>
  )
}

function getVerticalSegments(
  bx: number, bw: number, wallH: number, openings: Opening[],
): { bottom: number; top: number }[] {
  const bL = bx - bw / 2
  const bR = bx + bw / 2

  const hits = openings.filter(o => {
    const oL = o.center - o.width / 2
    const oR = o.center + o.width / 2
    return bL < oR && bR > oL
  })

  if (hits.length === 0) return [{ bottom: 0, top: wallH }]

  const sorted = [...hits].sort((a, b) => a.fromFloor - b.fromFloor)
  const segs: { bottom: number; top: number }[] = []
  let cursor = 0

  for (const o of sorted) {
    if (cursor < o.fromFloor - 0.001) {
      segs.push({ bottom: cursor, top: o.fromFloor })
    }
    cursor = Math.max(cursor, o.fromFloor + o.height)
  }

  if (cursor < wallH - 0.001) {
    segs.push({ bottom: cursor, top: wallH })
  }

  return segs.filter(s => s.top - s.bottom > 0.01)
}

interface CeilingPanelProps {
  width: number    // E-W
  length: number   // N-S
  color: string
  roughness?: number
}

/** Ceiling boards running E-W (along the width). */
export function CeilingPanels({ width, length, color, roughness = 0.75 }: CeilingPanelProps) {
  const boards = useMemo(() => {
    const result: { z: number }[] = []
    const count = Math.floor(length / BOARD_STEP)
    const totalSpan = count * BOARD_STEP - BOARD_GAP
    const startZ = -totalSpan / 2 + BOARD_WIDTH / 2

    for (let i = 0; i < count; i++) {
      result.push({ z: startZ + i * BOARD_STEP })
    }
    return result
  }, [length])

  const darkerColor = adjustBrightness(color, -6)

  return (
    <group>
      {boards.map((b, i) => (
        <mesh
          key={i}
          position={[0, -PANEL_DEPTH / 2, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, PANEL_DEPTH, BOARD_WIDTH]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? color : darkerColor}
            roughness={roughness}
          />
        </mesh>
      ))}
    </group>
  )
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount))
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}
