import type { Opening } from '@/types/sauna';

export interface FramingMember {
  x: number;      // center X in wall-local coords (0 = wall center)
  y: number;      // center Y (0 = floor)
  z?: number;     // center Z (optional, for lookouts etc.)
  width: number;  // X extent
  height: number; // Z extent (for rafters: span along Z; for wall studs: vertical extent)
  depth: number;  // Y extent (through-wall / layer thickness)
  rotZ?: number;  // rotation around Z axis in wall-local space (for sloped top plates)
  type: 'bottom-plate' | 'top-plate' | 'stud' | 'king-stud' | 'trimmer' | 'header' | 'sill' | 'cripple' | 'rafter' | 'fly-rafter' | 'lookout';
}

interface FramingSpec {
  memberWidth: number;  // e.g. 0.045
  spacing: number;      // e.g. 0.600 c/c
  layerThickness: number; // e.g. 0.195
}

/**
 * Generate all framing members for a wall.
 *
 * Coordinate system (wall-local):
 *   X: centered at 0, runs -wallWidth/2 to +wallWidth/2
 *   Y: 0 = floor, heightLeft/heightRight = top edges
 *
 * When heightLeft !== heightRight, the top plates slope and studs vary in height.
 * Returns members with (x, y) as center positions.
 */
export function generateWallFraming(
  wallWidth: number,
  heightLeft: number,
  heightRight: number,
  openings: Opening[],
  spec: FramingSpec,
): FramingMember[] {
  const { memberWidth: mw, layerThickness: depth } = spec;
  const members: FramingMember[] = [];
  const plateHeight = mw;

  // Height at any X position (interpolated for sloped walls)
  const heightAt = (x: number) => {
    const t = (x + wallWidth / 2) / wallWidth;
    return heightLeft + (heightRight - heightLeft) * t;
  };

  // --- Bottom plate(s) ---
  const bottomSegments = getPlateSegments(
    -wallWidth / 2,
    wallWidth / 2,
    openings.filter(o => o.type === 'door' && o.fromFloor < 0.01),
    mw,
  );
  for (const [left, right] of bottomSegments) {
    const segWidth = right - left;
    members.push({
      x: (left + right) / 2,
      y: plateHeight / 2,
      width: segWidth,
      height: plateHeight,
      depth,
      type: 'bottom-plate',
    });
  }

  // --- Double top plate (follows slope) ---
  const slopeAngle = Math.atan2(heightRight - heightLeft, wallWidth);
  const plateWidth = wallWidth / Math.cos(slopeAngle); // stretched along slope
  const avgHeight = (heightLeft + heightRight) / 2;

  members.push({
    x: 0,
    y: avgHeight - plateHeight / 2,
    width: plateWidth,
    height: plateHeight,
    depth,
    rotZ: slopeAngle,
    type: 'top-plate',
  });
  members.push({
    x: 0,
    y: avgHeight - plateHeight - plateHeight / 2,
    width: plateWidth,
    height: plateHeight,
    depth,
    rotZ: slopeAngle,
    type: 'top-plate',
  });

  const studBottom = plateHeight;

  // Stud top at a given X = wall height minus 2 top plates
  const studTopAt = (x: number) => heightAt(x) - 2 * plateHeight;

  // --- King studs (full height at their position, flanking each opening) ---
  const kingPositions = new Set<number>();
  for (const o of openings) {
    const leftKing = o.center - o.width / 2 - mw / 2;
    const rightKing = o.center + o.width / 2 + mw / 2;
    kingPositions.add(leftKing);
    kingPositions.add(rightKing);

    for (const kx of [leftKing, rightKing]) {
      const kStudTop = studTopAt(kx);
      const kStudHeight = kStudTop - studBottom;
      if (kStudHeight > 0.01) {
        members.push({
          x: kx,
          y: studBottom + kStudHeight / 2,
          width: mw,
          height: kStudHeight,
          depth,
          type: 'king-stud',
        });
      }
    }

    // --- Header above opening (spans between king stud inner faces, rests on trimmers) ---
    const headerBottom = o.fromFloor + o.height;
    const headerHeight = mw;
    members.push({
      x: o.center,
      y: headerBottom + headerHeight / 2,
      width: o.width,
      height: headerHeight,
      depth,
      type: 'header',
    });

    // --- Trimmer (jack) studs: from bottom plate to header ---
    const trimmerHeight = headerBottom - studBottom;
    if (trimmerHeight > 0.01) {
      members.push({
        x: o.center - o.width / 2 + mw / 2,
        y: studBottom + trimmerHeight / 2,
        width: mw,
        height: trimmerHeight,
        depth,
        type: 'trimmer',
      });
      members.push({
        x: o.center + o.width / 2 - mw / 2,
        y: studBottom + trimmerHeight / 2,
        width: mw,
        height: trimmerHeight,
        depth,
        type: 'trimmer',
      });
    }

    // --- Sill for windows (spans between trimmer inner faces) ---
    if (o.type === 'window' && o.fromFloor > 0.01) {
      members.push({
        x: o.center,
        y: o.fromFloor - mw / 2,
        width: o.width - 2 * mw,
        height: mw,
        depth,
        type: 'sill',
      });

      const crippleBottom = studBottom;
      const crippleTop = o.fromFloor - mw;
      const crippleHeight = crippleTop - crippleBottom;
      if (crippleHeight > 0.05) {
        const cripples = getStudPositions(
          o.center - o.width / 2 + mw,
          o.center + o.width / 2 - mw,
          spec.spacing,
        );
        for (const cx of cripples) {
          members.push({
            x: cx,
            y: crippleBottom + crippleHeight / 2,
            width: mw,
            height: crippleHeight,
            depth,
            type: 'cripple',
          });
        }
      }
    }

    // --- Cripple studs above header ---
    const crippleAboveBottom = headerBottom + headerHeight;
    const crippleAboveTop = studTopAt(o.center);
    const crippleAboveHeight = crippleAboveTop - crippleAboveBottom;
    if (crippleAboveHeight > 0.05) {
      const cripples = getStudPositions(
        o.center - o.width / 2 + mw,
        o.center + o.width / 2 - mw,
        spec.spacing,
      );
      for (const cx of cripples) {
        const cxTop = studTopAt(cx);
        const cxHeight = cxTop - crippleAboveBottom;
        if (cxHeight > 0.05) {
          members.push({
            x: cx,
            y: crippleAboveBottom + cxHeight / 2,
            width: mw,
            height: cxHeight,
            depth,
            type: 'cripple',
          });
        }
      }
    }
  }

  // --- Regular studs at spacing, height varies by position ---
  const regularPositions = getStudPositions(-wallWidth / 2 + mw, wallWidth / 2 - mw, spec.spacing);
  for (const sx of regularPositions) {
    let skip = false;
    for (const kp of kingPositions) {
      if (Math.abs(sx - kp) < mw) { skip = true; break; }
    }
    if (skip) continue;

    const insideOpening = openings.some(o => {
      const oLeft = o.center - o.width / 2 - mw * 0.1;
      const oRight = o.center + o.width / 2 + mw * 0.1;
      return sx > oLeft && sx < oRight;
    });
    if (insideOpening) continue;

    const sTop = studTopAt(sx);
    const sHeight = sTop - studBottom;
    if (sHeight > 0.01) {
      members.push({
        x: sx,
        y: studBottom + sHeight / 2,
        width: mw,
        height: sHeight,
        depth,
        type: 'stud',
      });
    }
  }

  // --- Corner studs at wall edges ---
  const edgeLeft = -wallWidth / 2 + mw / 2;
  const edgeRight = wallWidth / 2 - mw / 2;
  for (const ex of [edgeLeft, edgeRight]) {
    let duplicate = false;
    for (const kp of kingPositions) {
      if (Math.abs(ex - kp) < mw) { duplicate = true; break; }
    }
    if (duplicate) continue;

    const hasRegular = members.some(m => m.type === 'stud' && Math.abs(m.x - ex) < mw * 0.5);
    if (hasRegular) continue;

    const sTop = studTopAt(ex);
    const sHeight = sTop - studBottom;
    if (sHeight > 0.01) {
      members.push({
        x: ex,
        y: studBottom + sHeight / 2,
        width: mw,
        height: sHeight,
        depth,
        type: 'stud',
      });
    }
  }

  return members;
}

/**
 * Generate roof framing: structural rafters within wall span,
 * fly rafters at rake overhang edges, and lookout blocks connecting them.
 *
 * Structural rafters rest on the wall top plates.
 * Eave overhang (N/S) = rafter cantilevering past the wall — natural.
 * Rake overhang (E/W) = ladder framing: lookouts from last rafter to fly rafter.
 */
export function generateRafters(
  buildingWidth: number,
  buildingLength: number,
  overhang: number,
  spec: FramingSpec,
): FramingMember[] {
  const members: FramingMember[] = [];
  const mw = spec.memberWidth;
  const span = buildingLength + 2 * overhang; // rafter length (eave overhang included)

  // --- Structural rafters: symmetric from center within buildingWidth ---
  // Place rafters symmetrically so left/right overhang gaps are equal
  const halfCount = Math.floor((buildingWidth / 2) / spec.spacing);
  const rafterPositions: number[] = [0]; // center rafter
  for (let i = 1; i <= halfCount; i++) {
    rafterPositions.push(i * spec.spacing);
    rafterPositions.push(-i * spec.spacing);
  }
  // Add edge rafters inset by mw/2 so they sit on the wall top plate
  for (const edge of [-buildingWidth / 2 + mw / 2, buildingWidth / 2 - mw / 2]) {
    if (!rafterPositions.some(x => Math.abs(x - edge) < mw)) {
      rafterPositions.push(edge);
    }
  }
  rafterPositions.sort((a, b) => a - b);

  let lastRafterLeftX = rafterPositions[0];
  let lastRafterRightX = rafterPositions[rafterPositions.length - 1];

  for (const x of rafterPositions) {
    members.push({
      x,
      y: 0,
      width: mw,
      height: span,
      depth: spec.layerThickness,
      type: 'rafter',
    });
  }

  // --- Fly rafters at rake overhang edges ---
  if (overhang > mw) {
    const flyLeftX = -buildingWidth / 2 - overhang + mw / 2;
    const flyRightX = buildingWidth / 2 + overhang - mw / 2;

    members.push({
      x: flyLeftX,
      y: 0,
      width: mw,
      height: span,
      depth: spec.layerThickness,
      type: 'fly-rafter',
    });
    members.push({
      x: flyRightX,
      y: 0,
      width: mw,
      height: span,
      depth: spec.layerThickness,
      type: 'fly-rafter',
    });

    // --- Lookouts: connect last structural rafter to fly rafter ---
    const lookoutSpacing = spec.spacing;
    const lookoutStartZ = -span / 2 + mw / 2; // inset from rafter ends
    const lookoutEndZ = span / 2 - mw / 2;
    const lookoutCount = Math.ceil((lookoutEndZ - lookoutStartZ) / lookoutSpacing) + 1;

    for (const side of ['left', 'right'] as const) {
      const structX = side === 'left' ? lastRafterLeftX : lastRafterRightX;
      const flyX = side === 'left' ? flyLeftX : flyRightX;
      const midX = (structX + flyX) / 2;
      const lookoutWidth = Math.abs(flyX - structX) - mw; // clear span between rafter faces

      if (lookoutWidth < 0.01) continue;

      // Place lookouts at both ends, plus evenly spaced in between
      const zPositions: number[] = [lookoutStartZ];
      for (let i = 1; i < lookoutCount; i++) {
        const z = lookoutStartZ + i * lookoutSpacing;
        if (z > lookoutEndZ - mw) break; // stop before we'd overlap the end lookout
        zPositions.push(z);
      }
      if (lookoutEndZ - zPositions[zPositions.length - 1] > mw) {
        zPositions.push(lookoutEndZ); // add end lookout if not already close
      }

      for (const z of zPositions) {
        members.push({
          x: midX,
          y: 0,
          z,
          width: lookoutWidth,
          height: mw, // cross-section in Z
          depth: spec.layerThickness,  // match rafter depth
          type: 'lookout',
        });
      }
    }
  }

  return members;
}

/**
 * Generate evenly spaced floor joists.
 */
export function generateJoists(
  buildingWidth: number,
  buildingLength: number,
  spec: FramingSpec,
): FramingMember[] {
  const members: FramingMember[] = [];
  const count = Math.ceil(buildingWidth / spec.spacing) + 1;
  const startX = -buildingWidth / 2;

  for (let i = 0; i < count; i++) {
    const x = startX + i * spec.spacing;
    if (x > buildingWidth / 2 + 0.01) break;
    members.push({
      x,
      y: 0,
      width: spec.memberWidth,
      height: buildingLength,
      depth: spec.layerThickness,
      type: 'stud',
    });
  }

  return members;
}

// --- Helpers ---

/** Get stud X positions evenly spaced between left and right. */
function getStudPositions(left: number, right: number, spacing: number): number[] {
  const positions: number[] = [];
  // Start from left, place at spacing intervals
  const firstX = left + spacing - ((left % spacing) + spacing) % spacing;
  for (let x = firstX; x <= right; x += spacing) {
    positions.push(x);
  }
  return positions;
}

/** Split a plate span into segments interrupted by door openings.
 *  Plate extends under the trimmers (inset by memberWidth from opening edge). */
function getPlateSegments(
  left: number,
  right: number,
  doorOpenings: Opening[],
  memberWidth: number,
): [number, number][] {
  if (doorOpenings.length === 0) return [[left, right]];

  // Sort door openings by their left edge
  const sorted = [...doorOpenings].sort(
    (a, b) => (a.center - a.width / 2) - (b.center - b.width / 2),
  );

  const segments: [number, number][] = [];
  let cursor = left;

  for (const door of sorted) {
    // Plate extends under the trimmers — cut only at trimmer inner faces
    const doorLeft = door.center - door.width / 2 + memberWidth;
    const doorRight = door.center + door.width / 2 - memberWidth;
    if (doorLeft > cursor + 0.01) {
      segments.push([cursor, doorLeft]);
    }
    cursor = doorRight;
  }

  if (cursor < right - 0.01) {
    segments.push([cursor, right]);
  }

  return segments;
}
