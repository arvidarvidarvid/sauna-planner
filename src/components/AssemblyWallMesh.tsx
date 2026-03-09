import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { buildWallShape } from '@/lib/geometry';
import type { Opening } from '@/types/sauna';
import type { Assembly } from '@/types/assembly';
import type { ViewMode } from '@/App';
import { generateWallFraming, type FramingMember } from '@/lib/framing';
import { WINDOW_GLASS_COLOR } from '@/lib/materials';
import VerticalCladding from './VerticalCladding';
import { WallPanels } from './SaunaPanels';

interface Props {
  wallWidth: number;
  wallHeight: number;
  wallHeightRight?: number; // if different from wallHeight, wall top is sloped
  claddingWidth?: number;   // wider width for exterior layers (corner coverage)
  openings: Opening[];
  assembly: Assembly;
  hidden?: boolean;
  viewMode: ViewMode;
  exploded?: boolean;
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
  name: string;
  zOffset: number;
  color: string;
  opacity: number;
  isMembrane: boolean;
  hasFraming: boolean;
  isAirGap: boolean;
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
  exploded = false,
}: Props) {
  const hLeft = wallHeight;
  const hRight = wallHeightRightProp ?? wallHeight;
  const isFrame = viewMode === 'frame';
  const isPartition = assembly.kind === 'partition';
  const gap = exploded ? 0.15 : 0;
  const framingGap = exploded ? gap * 1.5 : 0; // extra gap between framing and insulation

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
        name: frameLayer.name,
        zOffset: -frameDepth / 2,
        color: frameLayer.color,
        opacity: frameLayer.opacity ?? 1,
        isMembrane: false,
        hasFraming: true,
        isAirGap: false,
        thickness: frameDepth,
        renderDepth: frameDepth,
        isCladding: false,
      });
    }

    // Exterior layers: stack outward from framing outer face
    // In exploded mode, start from the framing's offset position
    let zCursor = -frameDepth / 2 - framingGap;
    const extReversed = [...exteriorLayers].reverse();
    // The outermost non-membrane layer is the cladding (last in reversed array)
    // Partitions have no cladding — both sides are interior panels
    let claddingIdx = -1;
    if (!isPartition) {
      for (let j = extReversed.length - 1; j >= 0; j--) {
        if (extReversed[j].thickness >= 0.005) { claddingIdx = j; break; }
      }
    }
    for (let i = 0; i < extReversed.length; i++) {
      const layer = extReversed[i];
      const isMembrane = layer.thickness < 0.005;
      const renderDepth = isMembrane ? 0.002 : layer.thickness;
      zCursor -= renderDepth + gap;
      result.push({
        name: layer.name,
        zOffset: zCursor,
        color: layer.color,
        opacity: layer.opacity ?? (isMembrane ? 0.5 : 1),
        isMembrane,
        hasFraming: false,
        isAirGap: layer.material === 'air-gap',
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
      const layerZ = zCursor + gap;
      result.push({
        name: layer.name,
        zOffset: layerZ,
        color: layer.color,
        opacity: layer.opacity ?? (isMembrane ? 0.5 : 1),
        isMembrane,
        hasFraming: false,
        isAirGap: layer.material === 'air-gap',
        thickness: layer.thickness,
        renderDepth,
        isCladding: false,
      });
      zCursor = layerZ + renderDepth;
    }

    return result;
  }, [assembly, frameLayer, frameDepth, exteriorLayers, interiorLayers, gap, framingGap]);

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
  }, [wallWidth, cw, hLeft, hRight, openings, layerRenders, frameDepth]);

  // Generate real framing members
  const allFramingMembers = useMemo(() => {
    if (!frameLayer?.framing) return [];
    const members = generateWallFraming(wallWidth, hLeft, hRight, openings, {
      memberWidth: frameLayer.framing.memberWidth,
      spacing: frameLayer.framing.spacing,
      layerThickness: frameDepth,
    });
    // Opening-adjacent members (king studs, trimmers, headers, sills) get painted
    // white in solid mode — they're hidden behind the window/door frame (karmi)
    const OPENING_MEMBER_TYPES = new Set(['king-stud', 'trimmer', 'header', 'sill']);
    const KARMI_COLOR = '#F0EDE6';
    return members.map(member => ({
      member,
      zOffset: -framingGap, // offset outward in exploded mode
      color: isFrame
        ? MEMBER_TYPE_COLORS[member.type]
        : OPENING_MEMBER_TYPES.has(member.type)
          ? KARMI_COLOR
          : frameLayer.framing!.memberColor,
    }));
  }, [frameLayer, wallWidth, hLeft, hRight, openings, frameDepth, isFrame, framingGap]);

  // Generate individual insulation batts for exploded mode (fit between studs)
  const insulationBatts = useMemo(() => {
    if (!exploded || !frameLayer?.framing) return [];
    const mw = frameLayer.framing.memberWidth;
    const hw = wallWidth / 2;
    const plateH = mw;
    const heightAt = (x: number) => {
      const t = (x + hw) / wallWidth;
      return hLeft + (hRight - hLeft) * t;
    };
    const studTopAt = (x: number) => heightAt(x) - 2 * plateH;

    // Collect X positions of all vertical members (edges of cavities)
    const verticalEdges = new Set<number>();
    verticalEdges.add(-hw);
    verticalEdges.add(hw);
    const members = generateWallFraming(wallWidth, hLeft, hRight, openings, {
      memberWidth: mw,
      spacing: frameLayer.framing.spacing,
      layerThickness: frameDepth,
    });
    for (const m of members) {
      // All vertical members define cavity edges
      if (m.type === 'stud' || m.type === 'king-stud' || m.type === 'trimmer' || m.type === 'cripple') {
        verticalEdges.add(m.x - m.width / 2);
        verticalEdges.add(m.x + m.width / 2);
      }
    }
    const sorted = [...verticalEdges].sort((a, b) => a - b);

    // For each cavity between adjacent edges, generate batts
    const batts: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const left = sorted[i];
      const right = sorted[i + 1];
      const cavityW = right - left;
      if (cavityW < mw + 0.01) continue; // skip stud-width gaps (inside a stud)

      const cx = (left + right) / 2;
      const bottom = plateH;
      const top = studTopAt(cx);
      if (top - bottom < 0.02) continue;

      // Check if this cavity overlaps any opening
      const overlapping = openings.filter(o => {
        const oL = o.center - o.width / 2;
        const oR = o.center + o.width / 2;
        return left < oR - 0.01 && right > oL + 0.01;
      });

      if (overlapping.length === 0) {
        batts.push({ x: cx, y: bottom + (top - bottom) / 2, w: cavityW, h: top - bottom });
      } else {
        // Split around openings vertically
        let cursor = bottom;
        const vertRanges = overlapping
          .map(o => ({ bot: o.fromFloor, top: o.fromFloor + o.height + mw })) // include header
          .sort((a, b) => a.bot - b.bot);
        for (const r of vertRanges) {
          const sillBottom = r.bot - mw; // include sill
          if (sillBottom > cursor + 0.02) {
            const h = sillBottom - cursor;
            batts.push({ x: cx, y: cursor + h / 2, w: cavityW, h });
          }
          cursor = Math.max(cursor, r.top);
        }
        if (top > cursor + 0.02) {
          const h = top - cursor;
          batts.push({ x: cx, y: cursor + h / 2, w: cavityW, h });
        }
      }
    }
    return batts;
  }, [exploded, frameLayer, wallWidth, hLeft, hRight, openings, frameDepth]);

  // Generate horizontal battens for air-gap layers
  const BATTEN_WIDTH = 0.045;   // 45mm wide
  const BATTEN_SPACING = 0.600; // 600mm c/c vertical spacing
  const BATTEN_COLOR = '#C8A878';
  const airGapBattens = useMemo(() => {
    const battens: { x: number; y: number; z: number; width: number; height: number; depth: number }[] = [];
    const hw = wallWidth / 2;
    const heightAt = (x: number) => {
      const t = (x + hw) / wallWidth;
      return hLeft + (hRight - hLeft) * t;
    };

    for (const lr of layerRenders) {
      if (!lr.isAirGap) continue;
      const zCenter = lr.zOffset + lr.renderDepth / 2;
      const avgH = (hLeft + hRight) / 2;
      const count = Math.floor(avgH / BATTEN_SPACING);

      for (let j = 0; j <= count; j++) {
        const y = BATTEN_SPACING * (j + 0.5);
        if (y > avgH - BATTEN_WIDTH) continue;

        // Split battens around openings
        const segments = getBattenSegments(-hw, hw, y, BATTEN_WIDTH, openings, heightAt);
        for (const [left, right] of segments) {
          const segW = right - left;
          if (segW < 0.01) continue;
          battens.push({
            x: (left + right) / 2,
            y,
            z: zCenter,
            width: segW,
            height: BATTEN_WIDTH,
            depth: lr.renderDepth,
          });
        }
      }
    }
    return battens;
  }, [layerRenders, wallWidth, hLeft, hRight, openings]);

  // Generate trim boards around openings to cover gaps between cladding and frames
  const TRIM_WIDTH = 0.070;  // 70mm exterior trim boards (vuorilaudat)
  const TRIM_COLOR = '#F5F0E8'; // painted white trim
  const INT_TRIM_WIDTH = 0.055; // 55mm interior casing (peitelista)
  const INT_TRIM_THICK = 0.015; // 15mm thick
  const REVEAL_THICK = 0.022; // 22mm reveal/jamb boards (smyygit)
  const FLASHING_COLOR = '#5A5A5A'; // dark metal flashing
  const FLASHING_THICK = 0.001; // 1mm sheet metal

  // Find interior panel layer (innermost layer — positive Z side)
  const interiorPanelLayer = layerRenders.filter(lr => !lr.hasFraming && lr.zOffset > frameDepth / 2 - 0.001 && !lr.isMembrane && !lr.isAirGap).pop();
  // Find exterior panel layer (outermost solid layer — negative Z side, for partitions)
  const exteriorPanelLayer = layerRenders.filter(lr => !lr.hasFraming && lr.zOffset < -(frameDepth / 2 - 0.001) && !lr.isMembrane && !lr.isAirGap)[0];

  const trimBoards = useMemo(() => {
    if (!claddingLayer && !isPartition) return [];
    const boards: { x: number; y: number; z: number; w: number; h: number; d: number; color?: string; metalness?: number }[] = [];

    // Helper: add interior-style trim (wood casing + reveals) around an opening on one side
    const addInteriorTrim = (o: Opening, panelLayer: LayerRender | undefined, side: 'interior' | 'exterior') => {
      if (!panelLayer) return;
      const oL = o.center - o.width / 2;
      const oR = o.center + o.width / 2;
      const oBot = o.fromFloor;
      const oTop = o.fromFloor + o.height;
      const panelOuterZ = panelLayer.zOffset + panelLayer.renderDepth;
      const woodColor = panelLayer.color;

      // Physical reveal depth for this side
      const layersOnSide = side === 'interior'
        ? assembly.layers.slice(frameIndex + 1)
        : assembly.layers.slice(0, frameIndex);
      const revealDepth = layersOnSide.reduce(
        (sum, l) => sum + (l.thickness < 0.005 ? 0.002 : l.thickness), 0
      );

      // Casing trim on panel face
      const caseTrimZ = panelOuterZ + INT_TRIM_THICK / 2;
      const topW = o.width + 2 * INT_TRIM_WIDTH;
      boards.push({
        x: o.center, y: oTop + INT_TRIM_WIDTH / 2, z: caseTrimZ,
        w: topW, h: INT_TRIM_WIDTH, d: INT_TRIM_THICK,
        color: woodColor,
      });
      if (o.type === 'window') {
        boards.push({
          x: o.center, y: oBot - INT_TRIM_WIDTH / 2, z: caseTrimZ,
          w: topW, h: INT_TRIM_WIDTH, d: INT_TRIM_THICK,
          color: woodColor,
        });
      }
      const sideBot = o.type === 'window' ? oBot - INT_TRIM_WIDTH : oBot;
      const sideH = oTop + INT_TRIM_WIDTH - sideBot;
      boards.push({
        x: oL - INT_TRIM_WIDTH / 2, y: sideBot + sideH / 2, z: caseTrimZ,
        w: INT_TRIM_WIDTH, h: sideH, d: INT_TRIM_THICK,
        color: woodColor,
      });
      boards.push({
        x: oR + INT_TRIM_WIDTH / 2, y: sideBot + sideH / 2, z: caseTrimZ,
        w: INT_TRIM_WIDTH, h: sideH, d: INT_TRIM_THICK,
        color: woodColor,
      });

      // Reveal boards lining the opening recess
      if (revealDepth > 0.01) {
        const revZ = panelOuterZ - revealDepth / 2;
        boards.push({ x: oL + REVEAL_THICK / 2, y: oBot + o.height / 2, z: revZ, w: REVEAL_THICK, h: o.height, d: revealDepth, color: woodColor });
        boards.push({ x: oR - REVEAL_THICK / 2, y: oBot + o.height / 2, z: revZ, w: REVEAL_THICK, h: o.height, d: revealDepth, color: woodColor });
        boards.push({ x: o.center, y: oTop - REVEAL_THICK / 2, z: revZ, w: o.width, h: REVEAL_THICK, d: revealDepth, color: woodColor });
        if (o.type === 'window') {
          boards.push({ x: o.center, y: oBot + REVEAL_THICK / 2, z: revZ, w: o.width, h: REVEAL_THICK, d: revealDepth, color: woodColor });
        }
      }
    };

    if (isPartition) {
      // Partition: interior-style wood trim on both sides
      for (const o of openings) {
        addInteriorTrim(o, interiorPanelLayer, 'interior');
        addInteriorTrim(o, exteriorPanelLayer, 'exterior');
      }
      return boards;
    }

    // === EXTERIOR WALL TRIM ===
    const trimZ = claddingLayer!.zOffset + claddingLayer!.renderDepth / 2;
    const trimDepth = claddingLayer!.renderDepth + 0.004; // slightly proud of cladding
    const claddingOuterZ = claddingLayer!.zOffset + claddingLayer!.renderDepth;

    // Physical (non-exploded) reveal depths
    const physExtRevealDepth = assembly.layers.slice(0, frameIndex).reduce(
      (sum, l) => sum + (l.thickness < 0.005 ? 0.002 : l.thickness), 0
    );
    const physIntRevealDepth = assembly.layers.slice(frameIndex + 1).reduce(
      (sum, l) => sum + (l.thickness < 0.005 ? 0.002 : l.thickness), 0
    );

    for (const o of openings) {
      const oL = o.center - o.width / 2;
      const oR = o.center + o.width / 2;
      const oBot = o.fromFloor;
      const oTop = o.fromFloor + o.height;

      // === EXTERIOR TRIM (vuorilaudat) — flat boards on cladding face ===
      const topW = o.width + 2 * TRIM_WIDTH;
      boards.push({
        x: o.center, y: oTop + TRIM_WIDTH / 2, z: trimZ,
        w: topW, h: TRIM_WIDTH, d: trimDepth,
      });
      if (o.type === 'window') {
        boards.push({
          x: o.center, y: oBot - TRIM_WIDTH / 2, z: trimZ,
          w: topW, h: TRIM_WIDTH, d: trimDepth,
        });
      }
      const sideBot = o.type === 'window' ? oBot - TRIM_WIDTH : oBot;
      const sideTop = oTop + TRIM_WIDTH;
      const sideH = sideTop - sideBot;
      boards.push({
        x: oL - TRIM_WIDTH / 2, y: sideBot + sideH / 2, z: trimZ,
        w: TRIM_WIDTH, h: sideH, d: trimDepth,
      });
      boards.push({
        x: oR + TRIM_WIDTH / 2, y: sideBot + sideH / 2, z: trimZ,
        w: TRIM_WIDTH, h: sideH, d: trimDepth,
      });

      // === EXTERIOR REVEAL BOARDS (smyygit) ===
      if (physExtRevealDepth > 0.01) {
        const revealD = physExtRevealDepth;
        const revealZ = claddingOuterZ - revealD / 2;
        boards.push({ x: oL + REVEAL_THICK / 2, y: oBot + o.height / 2, z: revealZ, w: REVEAL_THICK, h: o.height, d: revealD });
        boards.push({ x: oR - REVEAL_THICK / 2, y: oBot + o.height / 2, z: revealZ, w: REVEAL_THICK, h: o.height, d: revealD });
        boards.push({ x: o.center, y: oTop - REVEAL_THICK / 2, z: revealZ, w: o.width, h: REVEAL_THICK, d: revealD });
        if (o.type === 'window') {
          boards.push({ x: o.center, y: oBot + REVEAL_THICK / 2, z: revealZ, w: o.width, h: REVEAL_THICK, d: revealD });
        }
      }

      // === HEAD FLASHING (vesipelti) ===
      if (o.type === 'window') {
        const flashingW = o.width + 2 * TRIM_WIDTH + 0.02;
        const flashingProjection = 0.025;
        const flashingZ = claddingLayer!.zOffset - flashingProjection / 2;
        boards.push({
          x: o.center, y: oTop + TRIM_WIDTH + FLASHING_THICK / 2, z: flashingZ,
          w: flashingW, h: FLASHING_THICK, d: trimDepth + flashingProjection,
          color: FLASHING_COLOR, metalness: 0.6,
        });
      }

      // === SILL FLASHING (ikkunapelti) ===
      if (o.type === 'window') {
        const sillW = o.width + 2 * TRIM_WIDTH + 0.02;
        const sillProjection = 0.030;
        const sillZ = claddingLayer!.zOffset - sillProjection / 2;
        boards.push({
          x: o.center, y: oBot - TRIM_WIDTH - FLASHING_THICK / 2, z: sillZ,
          w: sillW, h: FLASHING_THICK, d: trimDepth + sillProjection,
          color: FLASHING_COLOR, metalness: 0.6,
        });
      }

      // === INTERIOR TRIM (peitelista) ===
      if (physIntRevealDepth > 0.01 && interiorPanelLayer) {
        addInteriorTrim(o, interiorPanelLayer, 'interior');
      }
    }
    return boards;
  }, [openings, claddingLayer, interiorPanelLayer, exteriorPanelLayer, frameDepth, assembly, frameIndex, exploded, framingGap, isPartition]);

  const windowOpenings = openings.filter(o => o.type === 'window');
  const doorOpenings = openings.filter(o => o.type === 'door');

  if (hidden) return null;

  return (
    <>
      {/* Layer fills */}
      {layerGeometries.map((layer, i) => {
        // In frame mode: show only framing members (rendered separately below)
        if (isFrame) return null;
        // In exploded mode: skip the solid insulation fill — batts rendered separately
        if (exploded && layer.hasFraming) return null;
        // Air gaps are represented by battens only — no sheet needed
        if (layer.isAirGap) return null;
        // Partition panel layers are rendered as WallPanels below
        if (isPartition && !layer.isMembrane && !layer.hasFraming && !layer.isAirGap && layer.opacity >= 1) return null;

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

      {/* Partition interior paneling — WallPanels on both sides */}
      {isPartition && !isFrame && interiorPanelLayer && (
        <group position={[0, 0, interiorPanelLayer.zOffset]} rotation={[0, Math.PI, 0]}>
          <WallPanels wallWidth={wallWidth} wallHeight={hLeft} wallHeightRight={hRight} openings={openings.map(o => ({ ...o, center: -o.center }))} color={interiorPanelLayer.color} />
        </group>
      )}
      {isPartition && !isFrame && exteriorPanelLayer && (
        <group position={[0, 0, exteriorPanelLayer.zOffset + exteriorPanelLayer.renderDepth]}>
          <WallPanels wallWidth={wallWidth} wallHeight={hLeft} wallHeightRight={hRight} openings={openings} color={exteriorPanelLayer.color} />
        </group>
      )}

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

      {/* Opening trim boards, reveal boards, and flashings */}
      {!isFrame && trimBoards.map((b, i) => (
        <mesh
          key={`trim-${i}`}
          position={[b.x, b.y, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color={b.color ?? TRIM_COLOR}
            roughness={b.metalness ? 0.3 : 0.5}
            metalness={b.metalness ?? 0}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}

      {/* Air-gap battens */}
      {airGapBattens.map((b, i) => (
        <mesh
          key={`batten-${i}`}
          position={[b.x, b.y, b.z]}
          castShadow
        >
          <boxGeometry args={[b.width, b.height, b.depth]} />
          <meshStandardMaterial color={BATTEN_COLOR} roughness={0.8} />
        </mesh>
      ))}

      {/* Exploded insulation batts (individual pieces between studs) */}
      {exploded && frameLayer && insulationBatts.map((b, i) => (
        <mesh
          key={`batt-${i}`}
          position={[b.x, b.y, -frameDepth / 2]}
          castShadow
        >
          <boxGeometry args={[b.w, b.h, frameDepth]} />
          <meshStandardMaterial color={frameLayer.color} roughness={0.9} />
        </mesh>
      ))}

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

      {/* Layer name labels (exploded mode only) */}
      {exploded && layerRenders.map((lr, i) => {
        const midH = (hLeft + hRight) / 2;
        const z = lr.hasFraming
          ? -framingGap + lr.renderDepth / 2
          : lr.zOffset + lr.renderDepth / 2;
        return (
          <Html
            key={`label-${i}`}
            position={[wallWidth / 2 + 0.05, midH * 0.5, z]}
            center
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <span
              style={{
                color: '#94a3b8',
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
              {lr.name}
            </span>
          </Html>
        );
      })}

      {/* Window/door frames (karmi) — white-painted frames covering exposed studs */}
      {!isFrame && openings.map(opening => {
        // Frame must cover king studs (memberWidth=45mm outside the opening edge)
        // plus a small margin. Total frame width = stud width + overlap.
        const mw = frameLayer?.framing?.memberWidth ?? 0.045;
        const FRAME_WIDTH = mw + 0.015; // covers full king stud + 15mm overlap
        const FRAME_DEPTH = frameDepth + 0.010; // spans full frame depth + slight overlap
        const FRAME_COLOR = '#F0EDE6';
        const karmiZ = exploded ? -framingGap : 0; // move with frame in exploded mode
        const oL = opening.center - opening.width / 2;
        const oR = opening.center + opening.width / 2;
        const oBot = opening.fromFloor;
        const oTop = opening.fromFloor + opening.height;

        return (
          <group key={`frame-karmi-${opening.id}`}>
            {/* Top (head) frame — straddles opening top edge */}
            <mesh position={[opening.center, oTop, karmiZ]} castShadow receiveShadow>
              <boxGeometry args={[opening.width + 2 * FRAME_WIDTH, FRAME_WIDTH, FRAME_DEPTH]} />
              <meshStandardMaterial color={FRAME_COLOR} roughness={0.4} />
            </mesh>
            {/* Left jamb frame — straddles opening left edge */}
            <mesh position={[oL, oBot + opening.height / 2, karmiZ]} castShadow receiveShadow>
              <boxGeometry args={[FRAME_WIDTH, opening.height, FRAME_DEPTH]} />
              <meshStandardMaterial color={FRAME_COLOR} roughness={0.4} />
            </mesh>
            {/* Right jamb frame — straddles opening right edge */}
            <mesh position={[oR, oBot + opening.height / 2, karmiZ]} castShadow receiveShadow>
              <boxGeometry args={[FRAME_WIDTH, opening.height, FRAME_DEPTH]} />
              <meshStandardMaterial color={FRAME_COLOR} roughness={0.4} />
            </mesh>
            {/* Bottom sill frame (windows) or threshold (doors) */}
            {opening.type === 'window' ? (
              <mesh position={[opening.center, oBot, karmiZ]} castShadow receiveShadow>
                <boxGeometry args={[opening.width + 2 * FRAME_WIDTH, FRAME_WIDTH, FRAME_DEPTH]} />
                <meshStandardMaterial color={FRAME_COLOR} roughness={0.4} />
              </mesh>
            ) : (
              <mesh position={[opening.center, oBot + 0.010, karmiZ]} castShadow receiveShadow>
                <boxGeometry args={[opening.width, 0.020, FRAME_DEPTH]} />
                <meshStandardMaterial color={FRAME_COLOR} roughness={0.4} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Window glass panes */}
      {windowOpenings.map(opening => {
        const glassZ = exploded ? -framingGap : 0;
        return (
        <mesh
          key={opening.id}
          position={[opening.center, opening.fromFloor + opening.height / 2, glassZ]}
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
        )
      })}

      {/* Partition glass doors — full glass panel (sauna-style) */}
      {isPartition && doorOpenings.map(opening => {
        const doorZ = exploded ? -framingGap : 0;
        return (
          <mesh
            key={opening.id}
            position={[opening.center, opening.fromFloor + opening.height / 2, doorZ]}
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
        );
      })}

      {/* Exterior door panels — white with narrow center glass strip */}
      {!isPartition && doorOpenings.map(opening => {
        const doorZ = exploded ? -framingGap : 0;
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
            <mesh position={[(doorL + glassL) / 2, cy, doorZ]} castShadow receiveShadow>
              <boxGeometry args={[glassL - doorL, opening.height, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Right panel */}
            <mesh position={[(glassR + doorR) / 2, cy, doorZ]} castShadow receiveShadow>
              <boxGeometry args={[doorR - glassR, opening.height, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Top panel (between left and right, above glass) */}
            <mesh position={[cx, (glassTop + doorTop) / 2, doorZ]} castShadow receiveShadow>
              <boxGeometry args={[GLASS_W, doorTop - glassTop, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Bottom panel (between left and right, below glass) */}
            <mesh position={[cx, (doorBot + glassBot) / 2, doorZ]} castShadow receiveShadow>
              <boxGeometry args={[GLASS_W, glassBot - doorBot, DOOR_DEPTH]} />
              <meshStandardMaterial color={DOOR_COLOR} roughness={0.5} />
            </mesh>
            {/* Handle — small dark cylinder on the left side */}
            <mesh
              position={[cx - opening.width * 0.3, opening.fromFloor + 1.0, doorZ - DOOR_DEPTH / 2 - 0.01]}
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

/** Split a horizontal batten into segments that avoid openings */
function getBattenSegments(
  left: number,
  right: number,
  y: number,
  battenH: number,
  openings: Opening[],
  heightAt: (x: number) => number,
): [number, number][] {
  // Clip to wall height at edges
  const hL = heightAt(left);
  const hR = heightAt(right);
  const minH = Math.min(hL, hR);
  if (y + battenH / 2 > minH) return [];

  // Collect opening gaps that intersect this batten's Y range
  const gaps: [number, number][] = [];
  for (const o of openings) {
    const oBottom = o.fromFloor;
    const oTop = o.fromFloor + o.height;
    if (y + battenH / 2 > oBottom && y - battenH / 2 < oTop) {
      gaps.push([o.center - o.width / 2, o.center + o.width / 2]);
    }
  }

  if (gaps.length === 0) return [[left, right]];

  // Sort gaps left to right
  gaps.sort((a, b) => a[0] - b[0]);

  const segments: [number, number][] = [];
  let cursor = left;
  for (const [gL, gR] of gaps) {
    if (cursor < gL) segments.push([cursor, gL]);
    cursor = Math.max(cursor, gR);
  }
  if (cursor < right) segments.push([cursor, right]);
  return segments;
}
