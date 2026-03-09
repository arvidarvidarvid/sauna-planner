import type { Fixture } from '@/types/sauna'

interface Props {
  fixture: Fixture
}

export default function FixtureObject({ fixture }: Props) {
  return (
    <group
      position={[fixture.x, 0, fixture.z]}
      rotation={[0, fixture.rotationY ?? 0, 0]}
    >
      {fixture.type === 'shower' && <ShowerFixture />}
      {fixture.type === 'toilet' && <ToiletFixture />}
      {fixture.type === 'sink' && <SinkFixture />}
      {fixture.type === 'bath' && <BathFixture />}
    </group>
  )
}

function ShowerFixture() {
  return (
    <group>
      {/* Shower tray */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.08, 0.9]} />
        <meshStandardMaterial color="#D0D8DC" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Showerhead pole */}
      <mesh position={[0.35, 1.1, 0.35]}>
        <cylinderGeometry args={[0.02, 0.02, 2.2, 8]} />
        <meshStandardMaterial color="#909090" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Showerhead */}
      <mesh position={[0.35, 2.0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.1, 0.08, 0.04, 16]} />
        <meshStandardMaterial color="#A0A0A0" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  )
}

function ToiletFixture() {
  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.2, 0.05]} castShadow>
        <boxGeometry args={[0.38, 0.4, 0.6]} />
        <meshStandardMaterial color="#E8E8E8" roughness={0.4} />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.41, 0]} castShadow>
        <boxGeometry args={[0.35, 0.03, 0.46]} />
        <meshStandardMaterial color="#D8D8D8" roughness={0.5} />
      </mesh>
      {/* Cistern */}
      <mesh position={[0, 0.55, -0.2]} castShadow>
        <boxGeometry args={[0.36, 0.3, 0.18]} />
        <meshStandardMaterial color="#E8E8E8" roughness={0.4} />
      </mesh>
    </group>
  )
}

function SinkFixture() {
  return (
    <group>
      {/* Bowl */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.5, 0.15, 0.38]} />
        <meshStandardMaterial color="#E0E4E8" roughness={0.4} metalness={0.05} />
      </mesh>
      {/* Pedestal */}
      <mesh position={[0, 0.43, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.85, 12]} />
        <meshStandardMaterial color="#E0E4E8" roughness={0.4} />
      </mesh>
      {/* Faucet */}
      <mesh position={[0, 1.0, -0.12]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
        <meshStandardMaterial color="#909090" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  )
}

function BathFixture() {
  return (
    <group>
      {/* Tub outer shell */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.6, 1.6]} />
        <meshStandardMaterial color="#E8E8E8" roughness={0.4} />
      </mesh>
      {/* Inner hollow (approximated by a slightly smaller inset) */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.7, 0.4, 1.5]} />
        <meshStandardMaterial color="#D0D8DC" roughness={0.3} metalness={0.05} />
      </mesh>
    </group>
  )
}
