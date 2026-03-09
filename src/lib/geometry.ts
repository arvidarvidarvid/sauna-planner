import * as THREE from 'three'
import type { Opening } from '@/types/sauna'

/**
 * Build a THREE.Shape for a wall with holes punched for each opening.
 *
 * The shape is in "wall-local 2D space":
 *   horizontal axis: centered at 0, runs from -wallWidth/2 to +wallWidth/2
 *   vertical axis: 0 = floor, heightLeft/heightRight = top edges
 *
 * When heightLeft !== heightRight, the top edge is sloped (trapezoid).
 * Opening.center is a horizontal offset from the wall's center in this local space.
 */
export function buildWallShape(
  wallWidth: number,
  heightLeft: number,
  heightRight: number,
  openings: Opening[],
): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(-wallWidth / 2, 0)
  shape.lineTo(wallWidth / 2, 0)
  shape.lineTo(wallWidth / 2, heightRight)
  shape.lineTo(-wallWidth / 2, heightLeft)
  shape.closePath()

  for (const o of openings) {
    const left = o.center - o.width / 2
    const right = o.center + o.width / 2
    const bottom = o.fromFloor
    const top = o.fromFloor + o.height

    const hole = new THREE.Path()
    hole.moveTo(left, bottom)
    hole.lineTo(right, bottom)
    hole.lineTo(right, top)
    hole.lineTo(left, top)
    hole.closePath()

    shape.holes.push(hole)
  }

  return shape
}

/**
 * Compute vertices for a gabled roof.
 * Returns an array of triangles (each group of 3 vertices = 1 triangle).
 *
 * The roof sits on top of the building walls:
 *   - Building spans from x=0..width, z=0..length (in world space centered for rendering)
 *   - But here we work in building-local space: x=-width/2..width/2, z=-length/2..length/2
 *
 * For east-west ridge: ridge runs along X axis at center Z.
 * For north-south ridge: ridge runs along Z axis at center X.
 *
 * Returns BufferGeometry with normals computed.
 */
export function buildGabledRoofGeometry(
  width: number,
  length: number,
  wallHeight: number,
  pitch: number,    // degrees
  ridgeDirection: 'east-west' | 'north-south',
  overhang: number,
): THREE.BufferGeometry {
  const pitchRad = (pitch * Math.PI) / 180
  const hw = width / 2 + overhang
  const hl = length / 2 + overhang
  const y = wallHeight

  if (ridgeDirection === 'east-west') {
    // Ridge at z=0 (center), runs east-west
    const ridgeY = y + Math.tan(pitchRad) * (length / 2)
    const ridgeHw = hw  // ridge spans full width + overhang

    // 4 corners of eaves (bottom of slopes), extended by overhang
    const nw: [number, number, number] = [-hw, y - Math.tan(pitchRad) * overhang, -hl]
    const ne: [number, number, number] = [hw,  y - Math.tan(pitchRad) * overhang, -hl]
    const sw: [number, number, number] = [-hw, y - Math.tan(pitchRad) * overhang,  hl]
    const se: [number, number, number] = [hw,  y - Math.tan(pitchRad) * overhang,  hl]
    // Ridge points
    const rw: [number, number, number] = [-ridgeHw, ridgeY, 0]
    const re: [number, number, number] = [ridgeHw,  ridgeY, 0]

    // North slope: nw, ne, re, rw (quad → 2 triangles)
    // South slope: rw, re, se, sw
    // West gable: nw, rw, sw
    // East gable: ne, se, re
    const verts: [number, number, number][] = [
      // North slope
      nw, ne, re,  nw, re, rw,
      // South slope
      rw, re, se,  rw, se, sw,
      // West gable (triangle)
      nw, rw, sw,
      // East gable (triangle)
      re, ne, se,
    ]

    return buildGeometryFromTriangles(verts)
  } else {
    // Ridge at x=0 (center), runs north-south
    const ridgeY = y + Math.tan(pitchRad) * (width / 2)
    const ridgeHl = hl

    const nw: [number, number, number] = [-hw, y - Math.tan(pitchRad) * overhang, -hl]
    const ne: [number, number, number] = [hw,  y - Math.tan(pitchRad) * overhang, -hl]
    const sw: [number, number, number] = [-hw, y - Math.tan(pitchRad) * overhang,  hl]
    const se: [number, number, number] = [hw,  y - Math.tan(pitchRad) * overhang,  hl]
    const rn: [number, number, number] = [0, ridgeY, -ridgeHl]
    const rs: [number, number, number] = [0, ridgeY,  ridgeHl]

    const verts: [number, number, number][] = [
      // West slope
      nw, rn, rs,  nw, rs, sw,
      // East slope
      rn, ne, se,  rn, se, rs,
      // North gable
      nw, ne, rn,
      // South gable
      rs, se, sw,
    ]

    return buildGeometryFromTriangles(verts)
  }
}

export function buildShedRoofGeometry(
  width: number,
  length: number,
  wallHeight: number,
  pitch: number,
  overhang: number,
): THREE.BufferGeometry {
  const pitchRad = (pitch * Math.PI) / 180
  const hw = width / 2 + overhang
  const hl = length / 2 + overhang
  const rise = Math.tan(pitchRad) * length
  const overhangRise = Math.tan(pitchRad) * overhang

  // Slope continues through overhang: north dips below wallHeight, south extends above
  const nw: [number, number, number] = [-hw, wallHeight - overhangRise,              -hl]
  const ne: [number, number, number] = [ hw, wallHeight - overhangRise,              -hl]
  const sw: [number, number, number] = [-hw, wallHeight + rise + overhangRise,  hl]
  const se: [number, number, number] = [ hw, wallHeight + rise + overhangRise,  hl]

  return buildGeometryFromTriangles([nw, ne, se, nw, se, sw])
}

export function buildFlatRoofGeometry(
  width: number,
  length: number,
  wallHeight: number,
  overhang: number,
): THREE.BufferGeometry {
  const hw = width / 2 + overhang
  const hl = length / 2 + overhang
  const y = wallHeight + 0.05 // slight thickness above eaves

  const nw: [number, number, number] = [-hw, y, -hl]
  const ne: [number, number, number] = [hw,  y, -hl]
  const sw: [number, number, number] = [-hw, y,  hl]
  const se: [number, number, number] = [hw,  y,  hl]

  return buildGeometryFromTriangles([nw, ne, se, nw, se, sw])
}

function buildGeometryFromTriangles(verts: [number, number, number][]): THREE.BufferGeometry {
  const positions = new Float32Array(verts.length * 3)
  for (let i = 0; i < verts.length; i++) {
    positions[i * 3 + 0] = verts[i][0]
    positions[i * 3 + 1] = verts[i][1]
    positions[i * 3 + 2] = verts[i][2]
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}
