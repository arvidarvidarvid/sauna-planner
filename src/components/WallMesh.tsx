import { useMemo } from 'react'
import * as THREE from 'three'
import { buildWallShape } from '@/lib/geometry'
import type { Opening } from '@/types/sauna'
import { WINDOW_GLASS_COLOR } from '@/lib/materials'

interface Props {
  wallWidth: number
  wallHeight: number
  wallHeightRight?: number
  thickness: number
  openings: Opening[]
  color: string
  roughness: number
  metalness: number
  /** If provided, exterior-facing side uses this color (for double-material walls). */
  exteriorColor?: string
  exteriorRoughness?: number
  /** True to skip rendering (used for cutaway). */
  hidden?: boolean
}

export default function WallMesh({
  wallWidth,
  wallHeight,
  wallHeightRight: wallHeightRightProp,
  thickness,
  openings,
  color,
  roughness,
  metalness,
  exteriorColor,
  exteriorRoughness,
  hidden = false,
}: Props) {
  const hLeft = wallHeight
  const hRight = wallHeightRightProp ?? wallHeight
  const geometry = useMemo(() => {
    const shape = buildWallShape(wallWidth, hLeft, hRight, openings)
    return new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  }, [wallWidth, hLeft, hRight, thickness, openings])

  const windowOpenings = openings.filter(o => o.type === 'window')
  const doorOpenings = openings.filter(o => o.type === 'door')

  if (hidden) return null

  return (
    <>
      {/* Interior face */}
      <mesh
        geometry={geometry}
        position={[0, 0, -thickness / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Exterior face (back side, possibly different material) */}
      <mesh
        geometry={geometry}
        position={[0, 0, -thickness / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={exteriorColor ?? color}
          roughness={exteriorRoughness ?? roughness}
          metalness={metalness}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Window glass panes */}
      {windowOpenings.map(opening => (
        <mesh
          key={opening.id}
          position={[opening.center, opening.fromFloor + opening.height / 2, 0]}
        >
          <planeGeometry args={[opening.width, opening.height]} />
          <meshStandardMaterial
            color={WINDOW_GLASS_COLOR}
            transparent
            opacity={0.35}
            roughness={0.05}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Door panels — glass doors for interior partitions */}
      {doorOpenings.map(opening => (
        <mesh
          key={opening.id}
          position={[opening.center, opening.fromFloor + opening.height / 2, 0]}
        >
          <planeGeometry args={[opening.width, opening.height]} />
          <meshStandardMaterial
            color={WINDOW_GLASS_COLOR}
            transparent
            opacity={0.3}
            roughness={0.05}
            metalness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  )
}
