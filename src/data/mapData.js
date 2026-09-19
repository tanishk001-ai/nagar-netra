import { mulberry32 } from './prng'

// Kolar Road, Bhopal — approximate centroid used as the local grid origin.
// This module only produces the visual polygon layout for the Leaflet map.
// Building *status* (flagged/compliant/pending) now comes from the backend
// (GET /api/ward/:wardId/map), which is the real source of truth.
const CENTER = [23.1793, 77.4218]
const M_PER_DEG_LAT = 111320
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((CENTER[0] * Math.PI) / 180)

function toLatLng(dxEastM, dyNorthM) {
  return [CENTER[0] + dyNorthM / M_PER_DEG_LAT, CENTER[1] + dxEastM / M_PER_DEG_LNG]
}

function rectPolygon(cx, cy, w, h) {
  return [
    toLatLng(cx - w / 2, cy - h / 2),
    toLatLng(cx + w / 2, cy - h / 2),
    toLatLng(cx + w / 2, cy + h / 2),
    toLatLng(cx - w / 2, cy + h / 2),
  ]
}

const rand = mulberry32(7719)

const COLS = 9
const ROWS = 6
const PITCH_X = 19
const PITCH_Y = 17
const ORIGIN_X = -((COLS - 1) * PITCH_X) / 2
const ORIGIN_Y = -((ROWS - 1) * PITCH_Y) / 2

const buildings = []

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    // leave a gap for the two cross-lanes so the grid reads as blocks, not one slab
    if (col === 4 || row === 2) continue

    const jitterX = (rand() - 0.5) * 3
    const jitterY = (rand() - 0.5) * 3
    const cx = ORIGIN_X + col * PITCH_X + jitterX
    const cy = ORIGIN_Y + row * PITCH_Y + jitterY
    const w = 10 + rand() * 4.5
    const h = 8 + rand() * 3.5

    buildings.push({ id: `BLD-${row}-${col}`, polygon: rectPolygon(cx, cy, w, h) })
  }
}

export const KLR_BUILDING_POLYGONS = buildings

export const KLR_ROADS = [
  { id: 'RD-MAIN', name: 'Kolar Road', path: [toLatLng(-95, -70), toLatLng(95, -70)] },
  { id: 'RD-LANE-1', name: 'Lane 1', path: [toLatLng(-4.5, -70), toLatLng(-4.5, 70)] },
  { id: 'RD-LANE-2', name: 'Cross Lane', path: [toLatLng(-95, 0), toLatLng(95, 0)] },
]

export const KLR_CENTER = CENTER
