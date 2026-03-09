import type { Assembly } from '@/types/assembly';

/**
 * Assembly presets derived from docs/building-standards/insulation.md.
 * Each preset defines the construction layer stack for a building element.
 */

export const ASSEMBLY_PRESETS: Record<string, Assembly> = {
  'standard-sauna-wall': {
    id: 'standard-sauna-wall',
    name: 'Standard Sauna Wall (~190mm)',
    kind: 'wall',
    layers: [
      {
        name: 'Exterior cladding',
        material: 'exterior-board',
        thickness: 0.022,
        lambda: 0.13,
        color: '#F0EDE6',
      },
      {
        name: 'Ventilation gap',
        material: 'air-gap',
        thickness: 0.025,
        lambda: null,
        color: '#1a1a1a',
        opacity: 0.3,
      },
      {
        name: 'Wind barrier',
        material: 'wind-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#4a7a5a',
        opacity: 0.5,
      },
      {
        name: 'Frame + stone wool',
        material: 'stone-wool',
        thickness: 0.095,
        lambda: 0.036,
        color: '#C4B44A',
        framing: {
          memberWidth: 0.045,
          spacing: 0.600,
          memberColor: '#C8A878',
        },
      },
      {
        name: 'Vapor barrier (Al)',
        material: 'aluminum-vapor-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#C0C0C0',
        opacity: 0.6,
      },
      {
        name: 'Counter-batten',
        material: 'air-gap',
        thickness: 0.025,
        lambda: null,
        color: '#1a1a1a',
        opacity: 0.3,
      },
      {
        name: 'Interior panel',
        material: 'aspen-panel',
        thickness: 0.015,
        lambda: 0.13,
        color: '#D4BC96',
      },
    ],
  },

  'cold-roof-metal': {
    id: 'cold-roof-metal',
    name: 'Cold Roof — Metal Standing Seam (~260mm)',
    kind: 'roof',
    layers: [
      {
        name: 'Metal roofing',
        material: 'metal-sheet',
        thickness: 0.001,
        lambda: 50,
        color: '#3A3A3A',
      },
      {
        name: 'Ventilation gap',
        material: 'air-gap',
        thickness: 0.050,
        lambda: null,
        color: '#1a1a1a',
        opacity: 0.3,
      },
      {
        name: 'Wind barrier',
        material: 'wind-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#4a7a5a',
        opacity: 0.5,
      },
      {
        name: 'Rafters + stone wool',
        material: 'stone-wool',
        thickness: 0.145,
        lambda: 0.036,
        color: '#C4B44A',
        framing: {
          memberWidth: 0.045,
          spacing: 0.600,
          memberColor: '#C8A878',
        },
      },
      {
        name: 'Vapor barrier (Al)',
        material: 'aluminum-vapor-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#C0C0C0',
        opacity: 0.6,
      },
      {
        name: 'Counter-batten',
        material: 'air-gap',
        thickness: 0.025,
        lambda: null,
        color: '#1a1a1a',
        opacity: 0.3,
      },
      {
        name: 'Interior ceiling panel',
        material: 'aspen-panel',
        thickness: 0.015,
        lambda: 0.13,
        color: '#D4BC96',
      },
    ],
  },

  'terrace-floor': {
    id: 'terrace-floor',
    name: 'Floor on Terrace (~275mm)',
    kind: 'floor',
    layers: [
      {
        name: 'EPDM spacers',
        material: 'epdm-spacer',
        thickness: 0.015,
        lambda: null,
        color: '#2a2a2a',
      },
      {
        name: 'Joists + stone wool',
        material: 'stone-wool',
        thickness: 0.195,
        lambda: 0.036,
        color: '#C4B44A',
        framing: {
          memberWidth: 0.045,
          spacing: 0.400,
          memberColor: '#C8A878',
        },
      },
      {
        name: 'Vapor barrier (Al)',
        material: 'aluminum-vapor-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#C0C0C0',
        opacity: 0.6,
      },
      {
        name: 'Plywood deck',
        material: 'plywood',
        thickness: 0.022,
        lambda: 0.13,
        color: '#B89A6A',
      },
      {
        name: 'Duckboard',
        material: 'duckboard',
        thickness: 0.044,
        lambda: 0.13,
        color: '#B89A6A',
      },
    ],
  },
  'standard-interior-partition': {
    id: 'standard-interior-partition',
    name: 'Standard Interior Partition (~80mm)',
    kind: 'partition',
    layers: [
      {
        name: 'Interior panel',
        material: 'aspen-panel',
        thickness: 0.015,
        lambda: 0.13,
        color: '#D4BC96',
      },
      {
        name: 'Vapor barrier (Al)',
        material: 'aluminum-vapor-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#C0C0C0',
        opacity: 0.6,
      },
      {
        name: 'Frame + stone wool',
        material: 'stone-wool',
        thickness: 0.045,
        lambda: 0.036,
        color: '#C4B44A',
        framing: {
          memberWidth: 0.045,
          spacing: 0.600,
          memberColor: '#C8A878',
        },
      },
      {
        name: 'Vapor barrier (Al)',
        material: 'aluminum-vapor-barrier',
        thickness: 0.001,
        lambda: null,
        color: '#C0C0C0',
        opacity: 0.6,
      },
      {
        name: 'Interior panel',
        material: 'aspen-panel',
        thickness: 0.015,
        lambda: 0.13,
        color: '#D4BC96',
      },
    ],
  },
};

export function getAssembly(id: string): Assembly | undefined {
  return ASSEMBLY_PRESETS[id];
}

export function getTotalThickness(assembly: Assembly): number {
  return assembly.layers.reduce((sum, l) => sum + l.thickness, 0);
}

/** Returns the thickness of the structural framing layer (the one with `framing` defined). */
export function getFrameDepth(assembly: Assembly): number {
  const frameLayer = assembly.layers.find(l => l.framing);
  return frameLayer?.thickness ?? getTotalThickness(assembly);
}

/** Returns the total thickness of layers outside the frame (exterior side). */
export function getExteriorDepth(assembly: Assembly): number {
  const frameIndex = assembly.layers.findIndex(l => l.framing);
  if (frameIndex < 0) return 0;
  return assembly.layers.slice(0, frameIndex).reduce((sum, l) => sum + l.thickness, 0);
}
