export type WallName = 'north' | 'south' | 'east' | 'west';

export type RoomType = 'entry' | 'changing' | 'sauna' | 'shower' | 'wc' | 'storage';

export type MaterialType =
  | 'pine'
  | 'aspen'
  | 'spruce'
  | 'cedar'
  | 'concrete'
  | 'tile'
  | 'painted-wood'
  | 'log'
  | 'brick'
  | 'duckboard';  // slatted wood sections placed over the subfloor

export type RoofType = 'gabled' | 'shed' | 'flat' | 'hip';

export type RoofMaterial = 'metal' | 'asphalt' | 'wood-shingle' | 'green-roof';

export type HeaterType = 'wood' | 'electric';

export type FixtureType = 'shower' | 'toilet' | 'sink' | 'bath';

/** A door or window opening in a wall. */
export interface Opening {
  id: string;
  type: 'door' | 'window';
  /**
   * Horizontal center of the opening in room-local coordinates.
   * For north/south walls: X offset from room center.
   * For east/west walls: Z offset from room center.
   */
  center: number;
  width: number;
  height: number;
  /** Distance from room floor to the bottom of the opening. */
  fromFloor: number;
}

export interface Bench {
  id: string;
  wall: WallName;
  /** Height of the bench sitting surface from the floor. */
  surfaceHeight: number;
  /** How far the bench extends inward from the wall. */
  depth: number;
  /** Length of the bench along the wall. */
  length: number;
  /** Center of bench along the wall, offset from room center. */
  centerOffset: number;
  /** Extra offset away from the wall (for stepped/stadium benches). */
  frontOffset?: number;
}

export interface Heater {
  id: string;
  type: HeaterType;
  /** Position relative to room center (floor level). */
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

export interface Fixture {
  id: string;
  type: FixtureType;
  /** Position relative to room center. */
  x: number;
  z: number;
  /** Y-axis rotation in radians. */
  rotationY?: number;
}

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  /**
   * SW corner position relative to the building SW corner (building origin at 0,0).
   * X increases east, Z increases south (toward viewer).
   */
  position: { x: number; z: number };
  dimensions: {
    /** East-west extent. */
    width: number;
    /** North-south extent. */
    length: number;
    /** Floor-to-ceiling height. */
    height: number;
  };
  materials: {
    innerWalls: MaterialType;
    ceiling: MaterialType;
    floor: MaterialType;
    benches?: MaterialType;
  };
  walls: Record<WallName, { openings: Opening[] }>;
  heater?: Heater;
  benches?: Bench[];
  fixtures?: Fixture[];
}

export interface Roof {
  type: RoofType;
  /** Pitch in degrees from horizontal (0 = flat, 30 = moderate, 45 = steep). */
  pitch: number;
  /** Relevant for gabled and hip roofs. */
  ridgeDirection: 'east-west' | 'north-south';
  /** How far the roof extends beyond the outer walls on each side. */
  overhang: number;
  material: RoofMaterial;
  /** Hex color string, e.g. "#3A3A3A" */
  color: string;
}

export interface Railing {
  /** Which edge of the terrace the railing is on. */
  side: 'north' | 'south' | 'east' | 'west';
  /** Height of the railing from the deck surface. */
  height: number;
  /** Post cross-section (square posts: width × width). */
  postSize: number;
  /** Spacing between post centers. */
  postSpacing: number;
  /** Rail board cross-section. */
  railWidth: number;
  /** Rail board thickness. */
  railThickness: number;
  /** Optional length override (defaults to full edge). */
  length?: number;
  /** Offset of the railing center along the edge from the terrace center. */
  offset?: number;
}

export interface Terrace {
  /** East-west span. */
  width: number;
  /** North-south span. */
  length: number;
  /**
   * Position of the building's outer footprint SW corner relative to the
   * terrace SW corner. Used to place the sauna on the deck.
   */
  buildingOffset: { x: number; z: number };
  /** Optional railings along terrace edges. */
  railings?: Railing[];
}

export interface Building {
  name: string;
  dimensions: {
    /** Total east-west span of the building. */
    width: number;
    /** Total north-south span of the building. */
    length: number;
    /** Height from ground to eaves (before roof starts). */
    wallHeight: number;
  };
  materials: {
    outerWalls: MaterialType;
    foundation: MaterialType;
  };
  roof: Roof;
  rooms: Room[];
  /** Optional assembly preset IDs for detailed construction layer rendering. */
  assemblies?: {
    exteriorWall?: string;
    roof?: string;
    floor?: string;
  };
  /** Optional terrace the building sits on. */
  terrace?: Terrace;
}
