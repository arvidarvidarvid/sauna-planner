import type { Building } from '@/types/sauna'

/**
 * Small Finnish Sauna — 3.2m × 2.0m
 *
 * Room layout (west → east):
 *   ┌──────┬──────────┐
 *   │Entry │  Sauna   │  2.0m deep (Z)
 *   │1.2m  │   2.0m   │
 *   └──────┴──────────┘
 *   x=0  x=1.2      x=3.2
 *
 * South facade:
 *   [Entry door 0.9m] | [Large sauna window 1.4×1.2m]
 */
const building: Building = {
  name: 'Small Sauna (3.2×2.0)',

  dimensions: {
    width: 3.2,       // east-west (1.2 entry + 2.0 sauna)
    length: 2.0,      // north-south
    wallHeight: 2.2,  // eaves height
  },

  materials: {
    outerWalls: 'log',
    foundation: 'duckboard',
  },

  roof: {
    type: 'shed',
    pitch: 5,
    ridgeDirection: 'east-west',
    overhang: 0.3,
    material: 'metal',
    color: '#1A1A1A',
  },

  assemblies: {
    exteriorWall: 'standard-sauna-wall',
    roof: 'cold-roof-metal',
    interiorPartition: 'standard-interior-partition',
  },

  terrace: {
    width: 7.2,
    length: 5.4,
    buildingOffset: { x: 0.3, z: 0.3 },
    railings: [
      {
        side: 'south',
        height: 1.1,
        postSize: 0.095,
        postSpacing: 1.2,
        railWidth: 0.120,
        railThickness: 0.028,
      },
      {
        side: 'east',
        height: 1.1,
        postSize: 0.095,
        postSpacing: 1.2,
        railWidth: 0.120,
        railThickness: 0.028,
        length: 2.7,
        offset: 1.35,
      },
      {
        side: 'west',
        height: 1.1,
        postSize: 0.095,
        postSpacing: 1.2,
        railWidth: 0.120,
        railThickness: 0.028,
        length: 2.7,
        offset: 1.35,
      },
    ],
  },

  rooms: [
    {
      id: 'entry',
      type: 'entry',
      name: 'Entry',
      position: { x: 0, z: 0 },
      dimensions: { width: 1.2, length: 2.0, height: 2.2 },
      materials: {
        innerWalls: 'pine',
        ceiling: 'pine',
        floor: 'duckboard',
      },
      walls: {
        north: { openings: [] },
        south: {
          openings: [
            {
              id: 'entry-door',
              type: 'door',
              center: 0,
              width: 0.9,
              height: 2.0,
              fromFloor: 0,
            },
          ],
        },
        east: {
          openings: [
            {
              id: 'entry-to-sauna',
              type: 'door',
              center: -0.4,
              width: 0.8,
              height: 1.9,
              fromFloor: 0,
            },
          ],
        },
        west: { openings: [] },
      },
    },
    {
      id: 'sauna',
      type: 'sauna',
      name: 'Sauna',
      position: { x: 1.2, z: 0 },
      dimensions: { width: 2.0, length: 2.0, height: 2.1 },
      materials: {
        innerWalls: 'aspen',
        ceiling: 'aspen',
        floor: 'duckboard',
        benches: 'aspen',
      },
      walls: {
        north: { openings: [] },
        south: {
          openings: [
            {
              id: 'sauna-window-south',
              type: 'window',
              center: 0,
              width: 1.4,
              height: 1.2,
              fromFloor: 0.8,
            },
          ],
        },
        east: {
          openings: [
            {
              id: 'sauna-window-east',
              type: 'window',
              center: 0,
              width: 0.4,
              height: 0.4,
              fromFloor: 1.3,
            },
          ],
        },
        west: {
          openings: [
            {
              id: 'sauna-from-entry',
              type: 'door',
              center: -0.4,
              width: 0.8,
              height: 1.9,
              fromFloor: 0,
            },
          ],
        },
      },
      heater: {
        id: 'kiuas',
        type: 'electric',
        x: 0.65,
        z: 0.65,
        width: 0.3,
        depth: 0.3,
        height: 0.5,
      },
      benches: [
        {
          id: 'bench-upper',
          wall: 'north',
          surfaceHeight: 1.1,
          depth: 0.5,
          length: 1.8,
          centerOffset: 0,
        },
        {
          id: 'bench-lower',
          wall: 'north',
          surfaceHeight: 0.5,
          depth: 0.38,
          length: 1.8,
          centerOffset: 0,
          frontOffset: 0.5,
        },
      ],
    },
  ],
}

export default building
