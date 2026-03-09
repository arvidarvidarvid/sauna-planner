import type { MaterialType, RoofMaterial } from '@/types/sauna'

interface MaterialProps {
  color: string;
  roughness: number;
  metalness: number;
}

export const MATERIAL_PROPS: Record<MaterialType, MaterialProps> = {
  pine:          { color: '#C8A878', roughness: 0.80, metalness: 0.0 },
  aspen:         { color: '#D4BC96', roughness: 0.75, metalness: 0.0 },
  spruce:        { color: '#A8956A', roughness: 0.82, metalness: 0.0 },
  cedar:         { color: '#B87856', roughness: 0.78, metalness: 0.0 },
  concrete:      { color: '#8E8E8E', roughness: 0.95, metalness: 0.0 },
  tile:          { color: '#B4C0C8', roughness: 0.50, metalness: 0.05 },
  'painted-wood':{ color: '#D4CCBC', roughness: 0.65, metalness: 0.0 },
  log:           { color: '#9A7A50', roughness: 0.90, metalness: 0.0 },
  brick:         { color: '#B0624A', roughness: 0.92, metalness: 0.0 },
  duckboard:     { color: '#B89A6A', roughness: 0.85, metalness: 0.0 },
}

export const ROOF_MATERIAL_PROPS: Record<RoofMaterial, MaterialProps> = {
  metal:          { color: '#5A5A5A', roughness: 0.30, metalness: 0.80 },
  asphalt:        { color: '#2E2E2E', roughness: 0.95, metalness: 0.0 },
  'wood-shingle': { color: '#8B6040', roughness: 0.90, metalness: 0.0 },
  'green-roof':   { color: '#5A8A4A', roughness: 0.98, metalness: 0.0 },
}

export const FOUNDATION_COLOR = '#6E6E6E'
export const WINDOW_GLASS_COLOR = '#7BA7BC'
