import { useMemo } from 'react';
import * as THREE from 'three';
import { buildWallShape } from '@/lib/geometry';
import type { Opening } from '@/types/sauna';
import type { Assembly } from '@/types/assembly';
import type { ViewMode } from '@/App';
import { generateWallFraming, type FramingMember } from '@/lib/framing';
import { WINDOW_GLASS_COLOR } from '@/lib/materials';
import VerticalCladding from './VerticalCladding';

interface Props {
  wallWidth: number;
  wallHeight: number;
  wallHeightRight?: number; // if different from wallHeight, wall top is sloped
  claddingWidth?: number;   // wider width for exterior layers (corner coverage)
  openings: Opening[];
  assembly: Assembly;
  hidden?: boolean;
  viewMode: ViewMode;
}


export const MEMBER_TYPE_COLORS: Record<FramingMember['type'], string> = {
  'bottom-plate': '#D4A050',
  'top-plate': '#D4A050',
  'stud': '#C8A878',
  'king-stud': '#B89060',
  'trimmer': '#A88050',
  'header': '#E0B868',
  'sill': '#E0B868',
  'cripple': '#BCA070',
  'rafter': '#C8A878',
  'fly-rafter': '#B89060',
  'lookout': '#D4A050',
};

interface LayerRender {
  zOffset: number;
  color: string;
  opacity: number;
  isMembrane: boolean;
  hasFraming: boolean;
  thickness: number;
  renderDepth: number; // actual rendered depth (membranes get 0.002)
  isCladding: boolean; // outermost non-membrane exterior layer
}

export default function AssemblyWallMesh({
  wallWidth,
  wallHeight,
  wallHeightRight: wallHeightRightProp,
  claddingWidth: claddingWidthProp,
  openings,
  assembly,
  hidden = false,
  viewMode,
}: Props) {
  const hLeft = wallHeight;
  const hRight = wallHeightRightProp ?? wallHeight;
  const isFrame = viewMode === 'frame';
  const gap = 0;

  // Find the framing layer — this is the structural core centered at z=0
  const frameIndex = assembly.layers.findIndex(l => l.framing);
  const frameLayer = assembly.layers[frameIndex];
  const frameDepth = frameLayer?.thickness ?? 0;

  // Split layers into zones
  const exteriorLayers = assembly.layers.slice(0, frameIndex);   // before frame
  const interiorLayers = assembly.layers.slice(frameIndex + 1);  // after frame

  // Compute z-offsets for each zone, centered on the frame
  const layerRenders = useMemo(() => {
    const result: LayerRender[] = [];

    // Frame layer: centered at z=0
    if (frameLayer) {
      result.push({
        zOffset: -frameDepth / 2,
        color: frameLayer.color,
        opacity: frameLayer.opacity ?? 1,
        isMembrane: false,
        hasFraming: true,
        thickness: frameDepth,
        renderDepth: frameDepth,
        isCladding: false,
      });
    }

    // Exterior layers: stack outward from frame outer face (z = -frameDepth/2)
    // Reverse so we go from frame outward: wind barrier, vent gap, cladding
    let zCursor = -frameDepth / 2;
    const extReversed = [...exteriorLayers].reverse();
    // The outermost non-membrane layer is the cladding (last in reversed array)
    let claddingIdx = -1;
    for (let j = extReversed.length - 1; j >= 0; j--) {
      if (extReversed[j].thickness >= 0.005) { claddingIdx = j; break; }
    }
    for (let i = 0; i < extReversed.length; i++) {
      const layer = extReversed[i];
      const isMembrane = layer.thickness < 0.005;
      const renderDepth = isMembrane ? 0.002 : layer.thickness;
      zCursor -= renderDepth + (i > 0 ? gap : 0);
      result.push({
        zOffset: zCursor,
        color: layer.color,
        opacity: layer.opacity ?? (isMembrane ? 0.5 : 1),
        isMembrane,
        hasFraming: false,
        thickness: layer.thickness,
        renderDepth,
        isCladding: i === claddingIdx && !isMembrane,
      });
    }

    // Interior layers: stack inward from frame inner face (z = +frameDepth/2)
    zCursor = frameDepth / 2;
    for (let i = 0; i < interiorLayers.length; i++) {
      const layer = interiorLayers[i];
      const isMembrane = layer.thickness < 0.005;
      const renderDepth = isMembrane ? 0.002 : layer.thickness;
      const layerZ = zCursor + (i > 0 ? gap : 0);
      result.push({
        zOffset: layerZ,
        color: layer.color,
        opacity: layer.opacity ?? (isMembrane ? 0.5 : 1),
        isMembrane,
        hasFraming: false,
        thickness: layer.thickness,
        renderDepth,
        isCladding: false,
      });
      zCursor = layerZ + renderDepth;
    }

    return result;
  }, [assembly, frameLayer, frameDepth, exteriorLayers, interiorLayers, gap]);

  // Build geometries for each layer render
  const cw = claddingWidthProp ?? wallWidth;
  const claddingLayer = layerRenders.find(lr => lr.isCladding);
  const layerGeometries = useMemo(() => {
    const frameShape = buildWallShape(wallWidth, hLeft, hRight, openings);
    const claddingShape = cw !== wallWidth
      ? buildWallShape(cw, hLeft, hRight, openings)
      : frameShape;
    return layerRenders.filter(lr => !lr.isCladding).map(lr => {
      // Exterior layers (not frame, not interior) use wider cladding shape
      const useWide = !lr.hasFraming && lr.zOffset < -frameDepth / 2 - 0.001;
      const shape = useWide ? claddingShape : frameShape;
      return {
        ...lr,
        geometry: new THREE.ExtrudeGeometry(shape, { depth: lr.renderDepth, bevelEnabled: false }),
      };
    });
  }, [wallWidth, cw, wallHeight, openings, layerRenders, frameDepth]);

  // Generate real framing members
  const allFramingMembers = useMemo(() => {
    if (!frameLayer?.framing) return [];
    const members = generateWallFraming(wallWidth, hLeft, hRight, openings, {
      memberWidth: frameLayer.framing.memberWidth,
      spacing: frameLayer.framing.spacing,
      layerThickness: frameDepth,
    });
    return members.map(member => ({
      member,
      zOffset: 0, // frame centered at z=0
      color: isFrame
        ? MEMBER_TYPE_COLORS[member.type]
        : frameLayer.framing!.memberColor,
    }));
  }, [frameLayer, wallWidth, wallHeight, openings, frameDepth, isFrame]);

  const windowOpenings = openings.filter(o => o.type === 'window');
  const doorOpenings = openings.filter(o => o.type === 'door');

  if (hidden) return null;

  return (
    <>
      {/* Layer fills */}
      {layerGeometries.map((layer, i) => {
        // In frame mode: show only framing members (rendered separately below)
        if (isFrame) return null;

        return (
          <mesh
            key={`layer-${i}`}
            geometry={layer.geometry}
            position={[0, 0, layer.zOffset]}
            castShadow={!layer.isMembrane}
            receiveShadow
          >
            <meshStandardMaterial
              color={layer.color}
              roughness={0.8}
              metalness={layer.isMembrane ? 0.3 : 0.0}
              transparent={layer.opacity < 1 || (isFrame && layer.isMembrane)}
              opacity={isFrame ? 0.15 : layer.opacity}
              side={THREE.DoubleSide}
              polygonOffset={layer.hasFraming}
              polygonOffsetFactor={layer.hasFraming ? 1 : 0}
              polygonOffsetUnits={layer.hasFraming ? 1 : 0}
            />
          </mesh>
        );
      })}

      {/* Vertical board-on-board cladding */}
      {claddingLayer && !isFrame && (
        <VerticalCladding
          wallWidth={cw}
          wallHeight={hLeft}
          wallHeightRight={hRight}
          openings={openings}
          zBack={claddingLayer.zOffset}
          depth={claddingLayer.renderDepth}
          color={claddingLayer.color}
        />
      )}

      {/* Framing members */}
      {allFramingMembers.map(({ member, zOffset, color }, i) => (
        <mesh
          key={`frame-${i}`}
          position={[member.x, member.y, zOffset]}
          rotation={member.rotZ ? [0, 0, member.rotZ] : undefined}
          castShadow
        >
          <boxGeometry args={[member.width, member.height, member.depth]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      ))}

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

      {/* Door panels — white with narrow center glass strip */}
      {doorOpenings.map(opening => {
        const DOOR_DEPTH = 0.045
        const DOOR_COLOR = '#F0EDE6'
        const GLASS_W = 0.10
        const GLASS_H = opening.height * 0.65
        const GLASS_Y_CENTER = opening.fromFloor + opening.height * 0.55
        const cx = opening.center
        const cy = opening.fromFloor + opening.height / 2

        // Split door into 4 panels around the glass cutout
        const glassTop = GLASS_Y_CENTER + GLASS_H / 2
        const glassBot = GLASS_Y_CENTER - GLASS_H / 2
        const glassL = cx - GLASS_W / 2
        const glassR = cx + GLASS_W / 2
        const doorL = cx - opening.width / 2
        const doorR = cx + opening.width / 2
        const doorBot = opening.fromFloor
        const doorTop = opening.fromFloor + opening.height

        return (
          <group key={opening.id}>
            {/* Left panel */}
            <mesh position={[(doorL + glassL) / 2, cy, 0]} castShadow receiveShadow>
              <boxGeometry args={[glassL - doorL, opening.height, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Right panel */}
            <mesh position={[(glassR + doorR) / 2, cy, 0]} castShadow receiveShadow>
              <boxGeometry args={[doorR - glassR, opening.height, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Top panel (between left and right, above glass) */}
            <mesh position={[cx, (glassTop + doorTop) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[GLASS_W, doorTop - glassTop, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Bottom panel (between left and right, below glass) */}
            <mesh position={[cx, (doorBot + glassBot) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[GLASS_W, glassBot - doorBot, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Handle — small dark cylinder on the left side */}
            <mesh
              position={[cx - opening.width * 0.3, opening.fromFloor + 1.0, -DOOR_DEPTH / 2 - 0.01]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.01, 0.01, 0.06, 8]} />
              <meshStandardMaterial color="#3A3A3A" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        )
      })}
    </>
  );
}
