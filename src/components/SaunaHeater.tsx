import type { Heater } from '@/types/sauna'

interface Props {
  heater: Heater
  /** Position is relative to room center; caller wraps in a group at room center. */
}

export default function SaunaHeater({ heater }: Props) {
  return (
    <group position={[heater.x, 0, heater.z]}>
      {/* Metal body */}
      <mesh position={[0, heater.height / 2, 0]} castShadow>
        <boxGeometry args={[heater.width, heater.height, heater.depth]} />
        <meshStandardMaterial color="#5A5A5A" roughness={0.35} metalness={0.75} />
      </mesh>

      {/* Stone/rock bed on top (kiuas stones) */}
      <mesh position={[0, heater.height + 0.07, 0]} castShadow>
        <boxGeometry args={[heater.width - 0.04, 0.14, heater.depth - 0.04]} />
        <meshStandardMaterial color="#3E3E3E" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Subtle glow underneath if wood-burning (point light near base) */}
      {heater.type === 'wood' && (
        <pointLight
          position={[0, 0.1, 0]}
          intensity={0.6}
          distance={2}
          color="#FF6A10"
          decay={2}
        />
      )}
    </group>
  )
}
