import type { Building } from '@/types/sauna'

/**
 * Large Finnish Sauna — 5.0m × 3.0m outer boundary
 *
 * Wall assembly is ~190mm per side, so interior is ~4.62m × 2.62m.
 * Entry: 1.82m wide, Sauna: 2.80m wide.
 *
 * Room layout (west → east):
 *   ┌─────────┬───────────────┐
 *   │  Entry  │    Sauna      │  2.62m deep (Z)
 *   │ 1.82m   │    2.80m      │
 *   └─────────┴───────────────┘
 *   x=0    x=1.82         x=4.62
 *
 * South facade:
 *   [Entry door 0.9m] | [3× standing windows 0.8×1.4m]
 */
const building: Building = {
  name: 'Large Sauna (5.0×3.0)',

  dimensions: {
    width: 4.62,      // east-west interior (1.82 entry + 2.80 sauna)
    length: 2.62,     // north-south interior
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
      dimensions: { width: 1.82, length: 2.62, height: 2.2 },
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
      position: { x: 1.82, z: 0 },
      dimensions: { width: 2.80, length: 2.62, height: 2.1 },
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
              id: 'sauna-window-left',
              type: 'window',
              center: -0.85,
              width: 0.8,
              height: 1.4,
              fromFloor: 0.6,
            },
            {
              id: 'sauna-window-center',
              type: 'window',
              center: 0,
              width: 0.8,
              height: 1.4,
              fromFloor: 0.6,
            },
            {
              id: 'sauna-window-right',
              type: 'window',
              center: 0.85,
              width: 0.8,
              height: 1.4,
              fromFloor: 0.6,
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
        x: 1.0,
        z: 0.95,
        width: 0.4,
        depth: 0.4,
        height: 0.6,
      },
      benches: [
        {
          id: 'bench-upper',
          wall: 'north',
          surfaceHeight: 1.1,
          depth: 0.6,
          length: 2.7,
          centerOffset: 0,
        },
        {
          id: 'bench-lower',
          wall: 'north',
          surfaceHeight: 0.5,
          depth: 0.45,
          length: 2.7,
          centerOffset: 0,
          frontOffset: 0.6,
        },
      ],
    },
  ],
}

export default building
