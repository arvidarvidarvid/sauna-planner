import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface Props {
  /** Start point of the measurement */
  from: [number, number, number]
  /** End point of the measurement */
  to: [number, number, number]
  /** Offset perpendicular to the line (positive = outward) */
  offset?: number
  /** Override label text (default: auto-computed mm) */
  label?: string
  /** Color of the line and ticks */
  color?: string
  /** Which side to offset: for vertical lines 'left'|'right', for horizontal 'up'|'down' */
  side?: 'left' | 'right'
}

const TICK_SIZE = 0.03
const LINE_WIDTH = 1.5

export default function DimensionLine({
  from,
  to,
  offset = 0.15,
  label,
  color = '#94a3b8',
  side = 'right',
}: Props) {
  const { points, tickA, tickB, midpoint, length, labelText } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = new THREE.Vector3().subVectors(b, a)
    const len = dir.length()
    dir.normalize()

    // Compute perpendicular offset direction
    // For vertical lines (mostly Y), offset along Z
    // For horizontal lines (mostly X), offset along Z
    // For depth lines (mostly Z), offset along X
    let perp: THREE.Vector3
    const absX = Math.abs(dir.x)
    const absY = Math.abs(dir.y)
    const absZ = Math.abs(dir.z)

    if (absY > absX && absY > absZ) {
      // Vertical line — offset along Z
      perp = new THREE.Vector3(0, 0, 1)
    } else if (absX > absZ) {
      // Horizontal X line — offset along Z
      perp = new THREE.Vector3(0, 0, 1)
    } else {
      // Depth Z line — offset along X
      perp = new THREE.Vector3(1, 0, 0)
    }

    const sign = side === 'left' ? -1 : 1
    const off = perp.clone().multiplyScalar(offset * sign)

    const pa = a.clone().add(off)
    const pb = b.clone().add(off)
    const mid = pa.clone().add(pb).multiplyScalar(0.5)

    // Tick marks perpendicular to the measurement direction
    const tickDir = perp.clone().multiplyScalar(TICK_SIZE * sign)
    const tA1 = pa.clone().sub(tickDir)
    const tA2 = pa.clone().add(tickDir)
    const tB1 = pb.clone().sub(tickDir)
    const tB2 = pb.clone().add(tickDir)

    // Format label
    const mm = Math.round(len * 1000)
    const text = label ?? (mm >= 1000 ? `${(mm / 1000).toFixed(mm % 100 === 0 ? 1 : 2)}m` : `${mm}mm`)

    return {
      points: [pa, pb],
      tickA: [tA1, tA2],
      tickB: [tB1, tB2],
      midpoint: mid,
      length: len,
      labelText: text,
    }
  }, [from, to, offset, label, side])

  if (length < 0.001) return null

  return (
    <group>
      {/* Main line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              points[0].x, points[0].y, points[0].z,
              points[1].x, points[1].y, points[1].z,
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={LINE_WIDTH} />
      </line>

      {/* Tick at start */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              tickA[0].x, tickA[0].y, tickA[0].z,
              tickA[1].x, tickA[1].y, tickA[1].z,
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={LINE_WIDTH} />
      </line>

      {/* Tick at end */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              tickB[0].x, tickB[0].y, tickB[0].z,
              tickB[1].x, tickB[1].y, tickB[1].z,
            ])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={LINE_WIDTH} />
      </line>

      {/* Label */}
      <Html
        position={[midpoint.x, midpoint.y, midpoint.z]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            color,
            fontSize: '11px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
            background: 'rgba(12, 10, 9, 0.85)',
            padding: '1px 5px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}
        >
          {labelText}
        </span>
      </Html>
    </group>
  )
}
