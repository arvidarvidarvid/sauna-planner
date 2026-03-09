export type ConstructionMaterial =
  | 'stone-wool'
  | 'timber-stud'
  | 'plywood'
  | 'exterior-board'
  | 'metal-sheet'
  | 'aspen-panel'
  | 'alder-panel'
  | 'pine-panel'
  | 'aluminum-vapor-barrier'
  | 'wind-barrier'
  | 'epdm-spacer'
  | 'duckboard'
  | 'air-gap';

export interface AssemblyLayer {
  name: string;
  material: ConstructionMaterial;
  thickness: number;       // meters
  lambda: number | null;   // W/mK (null for membranes/air gaps)
  color: string;           // hex
  opacity?: number;        // 0-1, for membranes
  framing?: {
    memberWidth: number;   // e.g. 0.045
    spacing: number;       // e.g. 0.600 c/c
    memberColor: string;
  };
}

export interface Assembly {
  id: string;
  name: string;
  kind: 'wall' | 'roof' | 'floor';
  layers: AssemblyLayer[]; // ordered exterior→interior (or top→bottom)
}
