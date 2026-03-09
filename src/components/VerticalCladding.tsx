import { useMemo } from 'react'
import type { Opening } from '@/types/sauna'

interface Props {
  wallWidth: number
  wallHeight: number
  wallHeightRight?: number
  openings: Opening[]
  /** Z position of the outermost (back) face of the cladding */
  zBack: number
  /** Total depth of the cladding layer */
  depth: number
  color: string
}

// Board-on-board dimensions (meters) — measured from main house
const OVERLAP_WIDTH = 0.095    // 95mm overlap boards
const VISIBLE_GAP = 0.110     // 110mm visible between overlap boards
const REPEAT = OVERLAP_WIDTH + VISIBLE_GAP  // 205mm
const BASE_BOARD_WIDTH = 0.110 // 110mm — matches the visible gap between overlap boards

interface Board {
  x: number
  yCenter: number
  height: number
  width: number
  zCenter: number
  depth: number
  isFront: boolean
}

export default function VerticalCladding({
  wallWidth, wallHeight, wallHeightRight, openings, zBack, depth, color,
}: Props) {
  const hL = wallHeight
  const hR = wallHeightRight ?? wallHeight
  const backDepth = depth * 0.5
  const frontDepth = depth - backDepth

  const boards = useMemo(() => {
    const result: Board[] = []
    const hw = wallWidth / 2

    const heightAt = (x: number) => {
      const t = (x + hw) / wallWidth
      return hL + (hR - hL) * Math.max(0, Math.min(1, t))
    }

    // Center the pattern on the wall
    const count = Math.ceil(wallWidth / REPEAT) + 2
    const patternW = count * REPEAT
    const start = -patternW / 2 + REPEAT / 2

    // Front (overlap) boards
    for (let i = 0; i < count; i++) {
      const bx = start + i * REPEAT
      addBoards(result, bx, OVERLAP_WIDTH, hw, heightAt, openings,
        zBack + backDepth + frontDepth / 2, frontDepth, true)
    }

    // Back (base) boards — offset by half a repeat
    for (let i = 0; i <= count; i++) {
      const bx = start + i * REPEAT - REPEAT / 2
      addBoards(result, bx, BASE_BOARD_WIDTH, hw, heightAt, openings,
        zBack + backDepth / 2, backDepth, false)
    }

    return result
  }, [wallWidth, hL, hR, openings, zBack, depth, backDepth, frontDepth])

  const frontColor = adjustBrightness(color, -10)

  return (
    <group>
      {boards.map((b, i) => (
        <mesh key={i} position={[b.x, b.yCenter, b.zCenter]} castShadow receiveShadow>
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial
            color={b.isFront ? frontColor : color}
            roughness={0.82}
          />
        </mesh>
      ))}
    </group>
  )
}

function addBoards(
  result: Board[], bx: number, boardW: number, hw: number,
  heightAt: (x: number) => number, openings: Opening[],
  zCenter: number, depth: number, isFront: boolean,
) {
  const left = Math.max(bx - boardW / 2, -hw)
  const right = Math.min(bx + boardW / 2, hw)
  if (right - left < 0.005) return

  const w = right - left
  const cx = (left + right) / 2
  const h = heightAt(cx)

  // Check if this board overlaps any opening horizontally
  const overlapsAny = openings.some(o => {
    const oL = o.center - o.width / 2
    const oR = o.center + o.width / 2
    return left < oR && right > oL
  })

  if (!overlapsAny) {
    // No overlap — render full board at full height
    result.push({ x: cx, yCenter: h / 2, height: h, width: w, zCenter, depth, isFront })
    return
  }

  // Board overlaps opening(s). Two things to render:
  // 1. Vertically split segments at full width (above/below openings)
  for (const seg of verticalSegments(cx, w, h, openings)) {
    result.push({
      x: cx,
      yCenter: (seg.bottom + seg.top) / 2,
      height: seg.top - seg.bottom,
      width: w,
      zCenter,
      depth,
      isFront,
    })
  }

  // 2. Horizontally clipped "ripped" strips at full height (fills gaps next to trim)
  const strips = horizontalStrips(left, right, openings)
  for (const [sL, sR] of strips) {
    const sw = sR - sL
    if (sw < 0.005) continue
    // Skip if this strip is the same as the full board (no clipping happened)
    if (Math.abs(sw - w) < 0.001) continue
    const scx = (sL + sR) / 2
    const sh = heightAt(scx)
    result.push({
      x: scx,
      yCenter: sh / 2,
      height: sh,
      width: sw,
      zCenter,
      depth,
      isFront,
    })
  }
}

/** Clip [left, right] against all openings, returning sub-strips that don't overlap any opening. */
function horizontalStrips(
  left: number, right: number, openings: Opening[],
): [number, number][] {
  // Collect horizontal ranges of all openings
  const gaps: [number, number][] = []
  for (const o of openings) {
    const oL = o.center - o.width / 2
    const oR = o.center + o.width / 2
    if (oL < right && oR > left) {
      gaps.push([Math.max(oL, left), Math.min(oR, right)])
    }
  }

  if (gaps.length === 0) return [[left, right]]

  gaps.sort((a, b) => a[0] - b[0])

  const strips: [number, number][] = []
  let cursor = left
  for (const [gL, gR] of gaps) {
    if (cursor < gL - 0.001) strips.push([cursor, gL])
    cursor = Math.max(cursor, gR)
  }
  if (cursor < right - 0.001) strips.push([cursor, right])
  return strips
}

function verticalSegments(
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

  return segs
}

function adjustBrightness(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount))
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}
