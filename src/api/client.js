// Two modes:
//  - live (default, local dev): talks to the FastAPI backend.
//  - static (VITE_STATIC=true, the Vercel demo build): reads precomputed
//    JSON exported by backend/export_static.py from /data/*.json and
//    fakes Confirm/Dismiss/Send-to-review as in-memory-only mutations -
//    they visibly work but persist nowhere and reset on reload.
const IS_STATIC = import.meta.env.VITE_STATIC === 'true'
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

async function fetchJson(path) {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} for ${path}`)
  }
  return res.json()
}

// --- static-mode in-memory cache -------------------------------------------
// Each JSON file is fetched once and cached; Confirm/Dismiss/Send-to-review
// mutate the cached objects directly so every already-open view (list,
// detail, ward map) reflects the change immediately, exactly like the live
// backend's response does - it just never touches disk.
const staticCache = { flags: null, details: new Map(), wardMap: null }

async function staticLoadFlags() {
  if (!staticCache.flags) {
    staticCache.flags = await fetchJson('/data/flags.json')
  }
  return staticCache.flags
}

async function staticLoadDetail(plotId) {
  if (!staticCache.details.has(plotId)) {
    const detail = await fetchJson(`/data/flag/${plotId}.json`)
    staticCache.details.set(plotId, detail)
  }
  return staticCache.details.get(plotId)
}

async function staticLoadWardMap() {
  if (!staticCache.wardMap) {
    staticCache.wardMap = await fetchJson('/data/ward-map.json')
  }
  return staticCache.wardMap
}

async function staticSetStatus(plotId, status) {
  const flags = await staticLoadFlags()
  const entry = flags.find((f) => f.plot_id === plotId)
  if (!entry) throw new Error(`No such plot: ${plotId}`)
  if (!entry.flagged) {
    throw new Error('This plot was not flagged by the engine; there is nothing to confirm or dismiss.')
  }

  const resolvedOn = status === 'confirmed' || status === 'dismissed' ? new Date().toISOString().slice(0, 10) : null
  entry.status = status
  entry.resolved_on = resolvedOn

  const detail = staticCache.details.get(plotId)
  if (detail) {
    detail.status = status
    detail.resolved_on = resolvedOn
  }

  // keep the ward map's flagged/compliant colouring in sync, mirroring
  // main.py's ward_map(): dismissed -> compliant, otherwise -> flagged.
  if (staticCache.wardMap) {
    const cell = staticCache.wardMap.buildings.find((b) => b.plot_id === plotId)
    if (cell) cell.status = status === 'dismissed' ? 'compliant' : 'flagged'
  }

  return { ...entry }
}

export const getFlags = () => (IS_STATIC ? staticLoadFlags() : request('/api/flags'))

export const getFlag = (plotId) => (IS_STATIC ? staticLoadDetail(plotId) : request(`/api/flags/${plotId}`))

export const getWardMap = (wardId) =>
  IS_STATIC ? staticLoadWardMap() : request(`/api/ward/${wardId}/map`)

export const confirmFlag = (plotId) =>
  IS_STATIC ? staticSetStatus(plotId, 'confirmed') : request(`/api/flags/${plotId}/confirm`, { method: 'POST' })

export const dismissFlag = (plotId) =>
  IS_STATIC ? staticSetStatus(plotId, 'dismissed') : request(`/api/flags/${plotId}/dismiss`, { method: 'POST' })

export const sendToReview = (plotId) =>
  IS_STATIC ? staticSetStatus(plotId, 'pending') : request(`/api/flags/${plotId}/review`, { method: 'POST' })

export const isStaticBuild = IS_STATIC
