import type { Building } from '@/types/sauna'
import smallSauna from './small-sauna'
import largeSauna from './large-sauna'

export interface SaunaConfig {
  id: string
  label: string
  building: Building
}

export const CONFIGS: SaunaConfig[] = [
  { id: 'small', label: 'Small (3.2×2.0)', building: smallSauna },
  { id: 'large', label: 'Large (5.0×3.0)', building: largeSauna },
]

export const DEFAULT_CONFIG_ID = 'small'
