# Sauna Planner

Interactive 3D sauna building configurator. Claude edits `src/sauna.config.ts` directly; Vite HMR reloads the view instantly.

## Dev Commands

```bash
npm run dev              # vite + nitro concurrently (frontend :5173, backend :3000)
npm run dev:frontend     # vite only
npx tsc --noEmit         # type-check (run after changes)
```

## Stack

React 18, Vite 7, TypeScript 5.9, Tailwind CSS v4 (`@tailwindcss/vite`), React Three Fiber v8, @react-three/drei v9, Three.js 0.170, Nitro v2 (backend on port 3000, proxied at `/api`).

## Project Structure

```
src/
  sauna.config.ts          ← THE config file Claude edits for building changes
  App.tsx                   ← Root: viewMode state (solid|cutaway|frame), imports config
  main.tsx                  ← React entry point
  index.css                 ← Tailwind + base styles
  types/
    sauna.ts               ← Building, Room, Opening, Bench, Heater, Fixture, Roof
    assembly.ts            ← Assembly, AssemblyLayer, ConstructionMaterial
  components/
    SaunaScene.tsx         ← Canvas, camera, lights, OrbitControls, Grid
    BuildingGroup.tsx      ← Orchestrator: computes interior walls, loads assemblies
    ExteriorWalls.tsx      ← 4 outer walls with openings (WallMesh or AssemblyWallMesh)
    RoomGroup.tsx          ← Per-room: floor, ceiling, interior partitions, furniture
    WallMesh.tsx           ← Simple solid wall (ExtrudeGeometry + opening holes)
    AssemblyWallMesh.tsx   ← Layered wall with framing (assembly view)
    RoofGeometry.tsx       ← Roof surfaces + assembly layers + rafters
    SaunaBench.tsx         ← Bench geometry (top + legs)
    SaunaHeater.tsx        ← Heater box + stones
    Fixture.tsx            ← Shower, toilet, sink, bath
    InfoPanel.tsx          ← Right sidebar: specs, room list, material quantities
  lib/
    assemblies.ts          ← Assembly presets (standard-sauna-wall, cold-roof-metal, terrace-floor)
    materials.ts           ← MATERIAL_PROPS: color/roughness/metalness per MaterialType
    geometry.ts            ← buildWallShape(), roof geometry builders (gabled/shed/flat)
    framing.ts             ← generateWallFraming(), generateRafters(), generateJoists()
    quantities.ts          ← computeQuantities() for material takeoff
    utils.ts               ← cn() classname helper
server/
  routes/health.get.ts     ← GET /api/health (minimal backend)
```

## Coordinate System

- Building SW corner at origin `(0, 0, 0)`
- **X**: west (−) → east (+)
- **Y**: floor (0) → up
- **Z**: north (−) → south (+)
- World center: building geometrically centered (`bw/2`, 0, `bl/2` offset)
- Room center in world: `{ cx: pos.x + rw/2 - bw/2, cz: pos.z + rl/2 - bl/2 }`

## Data Model (src/types/sauna.ts)

```
Building
  dimensions { width (E-W), length (N-S), wallHeight }
  materials { outerWalls, foundation }
  roof { type, pitch°, ridgeDirection, overhang, material, color }
  assemblies? { exteriorWall?, roof?, floor? }  ← assembly preset IDs
  rooms: Room[]
    position { x, z }  ← SW corner relative to building SW corner
    dimensions { width, length, height }
    materials { innerWalls, ceiling, floor, benches? }
    walls { north, south, east, west } → { openings: Opening[] }
    heater?, benches?, fixtures?
```

**Opening `center`**: horizontal offset from room center. X offset for N/S walls, Z offset for E/W walls.

**Types**: `MaterialType` = pine|aspen|spruce|cedar|concrete|tile|painted-wood|log|brick|duckboard. `RoomType` = entry|changing|sauna|shower|wc|storage. `RoofType` = gabled|shed|flat|hip. `FixtureType` = shower|toilet|sink|bath.

## Wall System

- **Exterior thickness**: `WALL_THICKNESS` in BuildingGroup.tsx (0.12m, or derived from assembly frame depth)
- **Interior partitions**: 0.6 × exterior thickness (0.072m)
- **Geometry**: ExtrudeGeometry from THREE.Shape with rectangular holes for openings (WallMesh.tsx)
- **Interior detection**: `computeInteriorWalls()` in BuildingGroup.tsx — a wall is interior if not on building perimeter AND an adjacent room exists

### Wall Rotation & Opening Center Convention (CRITICAL)

South (rotY=π) and East (rotY=−π/2) walls flip their local X axis. Opening `center` values in the config are room-world offsets. The rendering code negates them for south/east:

- ExteriorWalls.tsx: south uses `-(roomCX + o.center)`, east uses `-(roomCZ + o.center)`
- RoomGroup.tsx: `wallOpenings()` helper negates `center` for south and east partition walls
- North and West walls: no negation needed

### Corner Wrapping

E/W walls are wider than the building length (`bl + 2*fd`) to wrap around N/S frame ends. N/S walls pass `claddingWidth = bw + 2*fd` so their cladding covers E/W frame ends at corners.

## Assembly System (src/lib/assemblies.ts)

Three presets: `standard-sauna-wall` (~190mm), `cold-roof-metal` (~260mm), `terrace-floor` (~275mm). Each is an ordered list of `AssemblyLayer` objects (exterior → interior) with material, thickness, thermal conductivity, and optional framing spec.

**View modes** control rendering:
- **solid**: Full opaque walls/roof
- **cutaway**: South wall hidden for interior view
- **frame**: Only framing members (studs, rafters, joists) visible; solid layers hidden

## Component Tree

```
App (viewMode state)
  InfoPanel (sidebar)
  SaunaScene (Canvas, camera, lights)
    BuildingGroup (orchestrator)
      ExteriorWalls (4 outer walls)
        WallMesh / AssemblyWallMesh
      RoofGeometry (roof surfaces + layers)
      FloorAssemblyLayers (if assembly)
      Terrace (deck boards + girders, if building.terrace defined)
      RoomGroup[] (per room)
        floor + ceiling planes
        interior partition WallMesh/AssemblyWallMesh
        SaunaBench[]
        SaunaHeater
        Fixture[]
```

## Common Claude Operations

| Task | What to edit in `src/sauna.config.ts` |
|------|---------------------------------------|
| Add window/door | `room.walls.<wall>.openings[]` — add Opening |
| Add bench | `room.benches[]` — add Bench |
| Add fixture | `room.fixtures[]` — add Fixture |
| Change material | `room.materials.*` or `building.materials.*` |
| Change dimensions | `room.dimensions.*` or `building.dimensions.*` |
| Add room | `building.rooms[]` — set position to abut existing rooms |
| Change roof | `building.roof.*` |
| Change terrace | `building.terrace.*` |

## Current Layout

```
Building: 3.2m × 2.0m × 2.2m, shed roof 5°, log exterior
Terrace: 7.2m × 5.4m, sauna in NW corner (0.3m breathing room)

         7.2m terrace
    ┌─────────────────────────┐
    │ ┌────┬──────┐           │
    │ │Entr│Sauna │           │  5.4m
    │ │1.2m│ 2.0m │           │  terrace
    │ └────┴──────┘           │
    │                         │
    └─────────────────────────┘
Assemblies: standard-sauna-wall, cold-roof-metal, terrace-floor
Girders run N/S, deck boards run E/W
```
