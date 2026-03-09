import { useState } from 'react'
import { CONFIGS, DEFAULT_CONFIG_ID } from './configs'
import SaunaScene from './components/SaunaScene'
import InfoPanel from './components/InfoPanel'

export type ViewMode = 'solid' | 'cutaway' | 'frame'
export type Viewpoint = 'exterior' | 'upper-1' | 'upper-2' | 'lower-1' | 'lower-2' | 'entry'

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'cutaway', label: 'Cutaway' },
  { value: 'frame', label: 'Frame' },
]

const VIEWPOINTS: { value: Viewpoint; label: string }[] = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'upper-1', label: 'Upper L' },
  { value: 'upper-2', label: 'Upper R' },
  { value: 'lower-1', label: 'Lower L' },
  { value: 'lower-2', label: 'Lower R' },
  { value: 'entry', label: 'Entry' },
]

export default function App() {
  const [configId, setConfigId] = useState(DEFAULT_CONFIG_ID)
  const [viewMode, setViewMode] = useState<ViewMode>('solid')
  const [viewpoint, setViewpoint] = useState<Viewpoint>('exterior')
  const [nightMode, setNightMode] = useState(false)

  const config = CONFIGS.find(c => c.id === configId) ?? CONFIGS[0]
  const building = config.building

  const handleConfigChange = (id: string) => {
    setConfigId(id)
    setViewpoint('exterior') // reset to exterior when switching configs
  }

  return (
    <div className="flex flex-col h-screen bg-stone-950 text-stone-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-wide text-stone-200">Sauna Planner</span>
          <span className="text-stone-600">·</span>
          {/* Config selector */}
          <select
            value={configId}
            onChange={e => handleConfigChange(e.target.value)}
            className="text-sm bg-stone-800 text-stone-300 border border-stone-700 rounded px-2 py-0.5 hover:bg-stone-700 focus:outline-none focus:border-amber-700 transition-colors"
          >
            {CONFIGS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          {/* Viewpoint selector */}
          <div className="flex rounded border border-stone-700 overflow-hidden">
            {VIEWPOINTS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setViewpoint(value)}
                className={`text-xs px-3 py-1.5 transition-colors ${
                  viewpoint === value
                    ? 'bg-amber-800/40 text-amber-300'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* View mode toggle */}
          <div className="flex rounded border border-stone-700 overflow-hidden">
            {VIEW_MODES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setViewMode(value)}
                className={`text-xs px-3 py-1.5 transition-colors ${
                  viewMode === value
                    ? 'bg-amber-800/40 text-amber-300'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Day/Night toggle */}
          <div className="flex rounded border border-stone-700 overflow-hidden">
            {(['day', 'night'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setNightMode(mode === 'night')}
                className={`text-xs px-3 py-1.5 transition-colors ${
                  (mode === 'night') === nightMode
                    ? 'bg-amber-800/40 text-amber-300'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300'
                }`}
              >
                {mode === 'day' ? 'Day' : 'Night'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 border-r border-stone-800 overflow-y-auto">
          <InfoPanel building={building} />
        </aside>

        {/* 3D Canvas */}
        <main className="flex-1 relative">
          <SaunaScene building={building} viewMode={viewMode} viewpoint={viewpoint} nightMode={nightMode} />
        </main>
      </div>
    </div>
  )
}
