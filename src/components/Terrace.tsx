import { useMemo } from 'react'
import type { Terrace as TerraceConfig, Railing } from '@/types/sauna'

interface Props {
  terrace: TerraceConfig
  /** Y position of the deck top surface. */
  deckY: number
  /** World-space offset: terrace center relative to building center. */
  centerOffset: { x: number; z: number }
}

// Typical terrace dimensions (meters)
const BOARD_WIDTH = 0.120
const BOARD_THICKNESS = 0.028
const BOARD_GAP = 0.005
const GIRDER_WIDTH = 0.048
const GIRDER_HEIGHT = 0.148
const GIRDER_SPACING = 0.600

const BOARD_COLOR = '#A08860'
const GIRDER_COLOR = '#8A7040'
const POST_COLOR = '#9A8050'

interface BoardSegment {
  x: number
  z: number
  length: number
}

function RailingGroup({ railing, tw, tl, deckY }: { railing: Railing; tw: number; tl: number; deckY: number }) {
  const { side, height, postSize, postSpacing, railWidth, railThickness } = railing

  const isNS = side === 'north' || side === 'south'
  const fullEdgeLength = isNS ? tw : tl
  const railLength = railing.length ?? fullEdgeLength
  const railOffset = railing.offset ?? 0

  // Post positions along the railing segment
  const posts = useMemo(() => {
    const count = Math.floor(railLength / postSpacing) + 1
    const totalSpan = (count - 1) * postSpacing
    const start = -totalSpan / 2
    const result: number[] = []
    for (let i = 0; i < count; i++) {
      result.push(start + i * postSpacing + railOffset)
    }
    return result
  }, [railLength, postSpacing, railOffset])

  // Edge Z/X position (center of post on the terrace edge)
  const edgePos = (() => {
    switch (side) {
      case 'north': return -tl / 2 + postSize / 2
      case 'south': return tl / 2 - postSize / 2
      case 'west': return -tw / 2 + postSize / 2
      case 'east': return tw / 2 - postSize / 2
    }
  })()

  const postCenterY = deckY + height / 2
  const railCenterY = deckY + height - railThickness / 2

  return (
    <group>
      {/* Posts */}
      {posts.map((pos, i) => {
        const position: [number, number, number] = isNS
          ? [pos, postCenterY, edgePos]
          : [edgePos, postCenterY, pos]
        return (
          <mesh key={`p${i}`} position={position} castShadow>
            <boxGeometry args={[postSize, height, postSize]} />
            <meshStandardMaterial color={POST_COLOR} roughness={0.85} />
          </mesh>
        )
      })}
      {/* Top rail */}
      {(() => {
        const position: [number, number, number] = isNS
          ? [railOffset, railCenterY, edgePos]
          : [edgePos, railCenterY, railOffset]
        const args: [number, number, number] = isNS
          ? [railLength, railThickness, railWidth]
          : [railWidth, railThickness, railLength]
        return (
          <mesh position={position} castShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial color={POST_COLOR} roughness={0.85} />
          </mesh>
        )
      })()}
    </group>
  )
}

export default function Terrace({ terrace, deckY, centerOffset }: Props) {
  const { width: tw, length: tl } = terrace

  const boards = useMemo(() => {
    const result: BoardSegment[] = []
    const step = BOARD_WIDTH + BOARD_GAP
    const count = Math.floor(tl / step)
    const totalSpan = count * step - BOARD_GAP
    const startZ = -totalSpan / 2 + BOARD_WIDTH / 2
    for (let i = 0; i < count; i++) {
      result.push({ x: 0, z: startZ + i * step, length: tw })
    }
    return result
  }, [tl, tw])

  const girders = useMemo(() => {
    const result: { x: number }[] = []
    const count = Math.floor(tw / GIRDER_SPACING) + 1
    const totalSpan = (count - 1) * GIRDER_SPACING
    const startX = -totalSpan / 2
    for (let i = 0; i < count; i++) {
      result.push({ x: startX + i * GIRDER_SPACING })
    }
    return result
  }, [tw])

  const boardY = deckY - BOARD_THICKNESS / 2
  const girderY = deckY - BOARD_THICKNESS - GIRDER_HEIGHT / 2

  return (
    <group position={[centerOffset.x, 0, centerOffset.z]}>
      {/* Deck boards — run E/W */}
      {boards.map((b, i) => (
        <mesh key={`b${i}`} position={[b.x, boardY, b.z]} receiveShadow>
          <boxGeometry args={[b.length, BOARD_THICKNESS, BOARD_WIDTH]} />
          <meshStandardMaterial color={BOARD_COLOR} roughness={0.85} />
        </mesh>
      ))}

      {/* Girders — run N/S, under the boards */}
      {girders.map((g, i) => (
        <mesh key={`g${i}`} position={[g.x, girderY, 0]} receiveShadow>
          <boxGeometry args={[GIRDER_WIDTH, GIRDER_HEIGHT, tl]} />
          <meshStandardMaterial color={GIRDER_COLOR} roughness={0.85} />
        </mesh>
      ))}

      {/* Railings */}
      {terrace.railings?.map((railing, ri) => (
        <RailingGroup key={`r${ri}`} railing={railing} tw={tw} tl={tl} deckY={deckY} />
      ))}
    </group>
  )
}
