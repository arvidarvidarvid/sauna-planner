import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Building } from '@/types/sauna'
import type { ViewMode, Viewpoint } from '@/App'
import BuildingGroup from './BuildingGroup'

interface Props {
  building: Building
  viewMode: ViewMode
  viewpoint: Viewpoint
  nightMode: boolean
}

interface ViewpointTarget {
  position: THREE.Vector3
  target: THREE.Vector3
}

function computeViewpoints(building: Building): Record<Viewpoint, ViewpointTarget> {
  const { width, length, wallHeight } = building.dimensions
  const bw = width
  const bl = length

  const exteriorPos = new THREE.Vector3(width * 1.8, wallHeight * 2.2, length * 2.5)
  const exteriorTarget = new THREE.Vector3(0, wallHeight / 2, 0)

  const result: Record<Viewpoint, ViewpointTarget> = {
    exterior: { position: exteriorPos, target: exteriorTarget },
    'upper-1': { position: exteriorPos.clone(), target: exteriorTarget.clone() },
    'upper-2': { position: exteriorPos.clone(), target: exteriorTarget.clone() },
    'lower-1': { position: exteriorPos.clone(), target: exteriorTarget.clone() },
    'lower-2': { position: exteriorPos.clone(), target: exteriorTarget.clone() },
    entry: { position: exteriorPos.clone(), target: exteriorTarget.clone() },
  }

  // Compute entry room viewpoint — standing at the back, facing the front door (south)
  const entryRoom = building.rooms.find(r => r.type === 'entry')
  if (entryRoom) {
    const ecx = entryRoom.position.x + entryRoom.dimensions.width / 2 - bw / 2
    const ecz = entryRoom.position.z + entryRoom.dimensions.length / 2 - bl / 2
    const entryHalfL = entryRoom.dimensions.length / 2
    const STANDING_EYE_HEIGHT = 1.65
    result.entry = {
      position: new THREE.Vector3(ecx, STANDING_EYE_HEIGHT, ecz - entryHalfL + 0.3),
      target: new THREE.Vector3(ecx, STANDING_EYE_HEIGHT - 0.1, ecz + entryHalfL),
    }
  }

  // Find sauna room with benches
  const saunaRoom = building.rooms.find(r => r.type === 'sauna' && r.benches?.length)
  if (!saunaRoom || !saunaRoom.benches) return result

  // Room center in world space
  const cx = saunaRoom.position.x + saunaRoom.dimensions.width / 2 - bw / 2
  const cz = saunaRoom.position.z + saunaRoom.dimensions.length / 2 - bl / 2
  const roomHalfL = saunaRoom.dimensions.length / 2
  const ceilingH = saunaRoom.dimensions.height

  // Find upper and lower benches
  const upper = saunaRoom.benches.find(b => b.id.includes('upper'))
  const lower = saunaRoom.benches.find(b => b.id.includes('lower'))

  const wallThickness = 0.095 / 2 // approximate half-frame depth for bench offset
  const SEATED_EYE_HEIGHT = 0.75

  const makeBenchViewpoints = (
    bench: typeof upper,
    key1: Viewpoint,
    key2: Viewpoint,
  ) => {
    if (!bench) return

    const fo = bench.frontOffset ?? 0
    let bz = 0
    switch (bench.wall) {
      case 'north': bz = -roomHalfL + wallThickness + bench.depth / 2 + fo; break
      case 'south': bz = roomHalfL - wallThickness - bench.depth / 2 - fo; break
    }

    const eyeY = Math.min(bench.surfaceHeight + SEATED_EYE_HEIGHT, ceilingH - 0.05)
    const spread = bench.length * 0.35 / 2  // two people spread across bench

    // Look toward south wall (window)
    const targetZ = cz + roomHalfL

    result[key1] = {
      position: new THREE.Vector3(cx - spread, eyeY, cz + bz),
      target: new THREE.Vector3(cx - spread * 0.3, eyeY - 0.15, targetZ),
    }
    result[key2] = {
      position: new THREE.Vector3(cx + spread, eyeY, cz + bz),
      target: new THREE.Vector3(cx + spread * 0.3, eyeY - 0.15, targetZ),
    }
  }

  makeBenchViewpoints(upper, 'upper-1', 'upper-2')
  makeBenchViewpoints(lower, 'lower-1', 'lower-2')

  return result
}

/** Inner component that runs inside the Canvas and can use R3F hooks */
function CameraController({ viewpoint, viewpoints }: {
  viewpoint: Viewpoint
  viewpoints: Record<Viewpoint, ViewpointTarget>
}) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const isAnimating = useRef(false)
  const animProgress = useRef(0)
  const startPos = useRef(new THREE.Vector3())
  const startTarget = useRef(new THREE.Vector3())
  const prevViewpoint = useRef<Viewpoint>(viewpoint)

  useEffect(() => {
    if (viewpoint === prevViewpoint.current) return
    // Start animation
    isAnimating.current = true
    animProgress.current = 0
    startPos.current.copy(camera.position)
    if (controlsRef.current) {
      startTarget.current.copy(controlsRef.current.target)
    }
    prevViewpoint.current = viewpoint
  }, [viewpoint, camera])

  useFrame((_, delta) => {
    if (!isAnimating.current || !controlsRef.current) return

    animProgress.current = Math.min(1, animProgress.current + delta * 2.5)
    const t = easeInOutCubic(animProgress.current)

    const vp = viewpoints[viewpoint]
    camera.position.lerpVectors(startPos.current, vp.position, t)

    if (viewpoint === 'exterior') {
      controlsRef.current.target.lerpVectors(startTarget.current, vp.target, t)
    } else {
      // Interior: target = tiny offset in look direction, so controls rotate in place
      const lookDir = new THREE.Vector3().subVectors(vp.target, vp.position).normalize()
      const interiorTarget = vp.position.clone().add(lookDir.multiplyScalar(0.01))
      controlsRef.current.target.lerpVectors(startTarget.current, interiorTarget, t)
    }

    controlsRef.current.update()

    if (animProgress.current >= 1) {
      isAnimating.current = false
    }
  })

  const isInterior = viewpoint !== 'exterior'

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minPolarAngle={isInterior ? 0.1 : 0.05}
      maxPolarAngle={isInterior ? Math.PI - 0.1 : Math.PI / 2 - 0.02}
      minDistance={isInterior ? 0 : 1}
      maxDistance={isInterior ? 0.02 : 50}
      enableZoom={!isInterior}
      enablePan={!isInterior}
    />
  )
}

/** Photo backdrop placed south of the building, visible through the sauna window */
function SkyboxBackdrop({ building, nightMode }: { building: Building; nightMode: boolean }) {
  const dayTexture = useLoader(THREE.TextureLoader, '/skybox.png')
  const nightTexture = useLoader(THREE.TextureLoader, '/skybox-night.png')
  const texture = nightMode ? nightTexture : dayTexture
  const { length } = building.dimensions

  // The photo is taken from the terrace looking south.
  // Place it as a large plane south of the building, facing north.
  const planeWidth = 20
  const planeHeight = 15
  // The photo has ~40% terrace deck at the bottom, so the horizon is roughly 60% up.
  // Position the plane so the horizon (~60% up the image) aligns with ~eye level (~1.5m).
  // Bottom of plane at floor level (0), so horizon is at planeHeight * 0.6 = 9m — too high.
  // Instead, anchor bottom of plane below floor so horizon hits ~1.5m above floor.
  const horizonFraction = 0.6 // horizon is ~60% up from bottom of photo
  const horizonWorldY = 2.5  // where we want the horizon in world space
  const bottomY = horizonWorldY - planeHeight * horizonFraction // bottom of plane
  const distanceSouth = length / 2 + 8

  return (
    <mesh position={[2, bottomY + planeHeight / 2, distanceSouth]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export default function SaunaScene({ building, viewMode, viewpoint, nightMode }: Props) {
  const { width, length, wallHeight } = building.dimensions
  const terraceSpan = building.terrace
    ? Math.max(building.terrace.width, building.terrace.length)
    : 0
  const maxSpan = Math.max(width, length, terraceSpan)

  const viewpoints = useMemo(() => computeViewpoints(building), [building])

  return (
    <Canvas
      shadows
      camera={{
        position: [width * 1.8, wallHeight * 2.2, length * 2.5],
        fov: 45,
        near: 0.01,
        far: 200,
      }}
      gl={{ antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Background */}
      <color attach="background" args={[nightMode ? '#0A0A0F' : '#1C1917']} />

      {/* Lighting */}
      <ambientLight intensity={nightMode ? 0.05 : 0.45} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={nightMode ? 0.05 : 1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Warm fill light from south (front) */}
      <directionalLight position={[0, 3, 10]} intensity={nightMode ? 0.02 : 0.3} color="#FFE8C0" />

      {/* Camera controller with animated transitions */}
      <CameraController viewpoint={viewpoint} viewpoints={viewpoints} />

      {/* Orientation gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport
          axisColors={['#FF6B6B', '#51CF66', '#4DABF7']}
          labelColor="white"
        />
      </GizmoHelper>

      {/* Ground grid */}
      <Grid
        args={[maxSpan * 4, maxSpan * 4]}
        position={[0, -0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2A2520"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3A3530"
        fadeDistance={maxSpan * 3}
        fadeStrength={1}
        infiniteGrid
      />

      {/* South backdrop photo */}
      <SkyboxBackdrop building={building} nightMode={nightMode} />

      {/* The building */}
      <BuildingGroup building={building} viewMode={viewMode} />
    </Canvas>
  )
}
