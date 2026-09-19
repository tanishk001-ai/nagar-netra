import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon, Polyline, Popup } from 'react-leaflet'
import { KLR_BUILDING_POLYGONS, KLR_ROADS, KLR_CENTER } from '../data/mapData'
import { useFlags } from '../state/FlagsContext'
import { getWardMap } from '../api/client'
import ConfidenceMeter from '../components/ConfidenceMeter'
import { BlockSkeleton } from '../components/Skeleton'

const STATUS_COLOR = {
  flagged: '#b3261e',
  compliant: '#1f7a45',
  pending: '#a15c07',
}

const LEGEND = [
  { key: 'flagged', label: 'Flagged — excess area detected' },
  { key: 'compliant', label: 'Compliant with sanctioned plan' },
  { key: 'pending', label: 'Not yet processed this cycle' },
]

export default function WardMap() {
  const { flags } = useFlags()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)
  const [wardMap, setWardMap] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getWardMap('KLR-43')
      .then((data) => {
        if (!cancelled) setWardMap(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const statusById = useMemo(() => {
    if (!wardMap) return {}
    return Object.fromEntries(wardMap.buildings.map((b) => [b.id, b]))
  }, [wardMap])

  const flagLookup = useMemo(() => Object.fromEntries(flags.map((f) => [f.plot_id, f])), [flags])

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-flagged">Could not reach the Nagar Netra API: {error}</p>
      </div>
    )
  }

  if (!wardMap) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-5 h-6 w-64 animate-pulse rounded bg-hairline" />
        <BlockSkeleton className="h-[560px]" />
      </div>
    )
  }

  const counts = wardMap.counts

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-ink">Ward 43 · Kolar Road</h1>
          <p className="mt-0.5 text-sm text-muted">Building footprints from the latest change-detection pass, matched against sanctioned plans.</p>
        </div>
        <div className="flex gap-4 font-data text-xs text-ink-soft">
          <span><span className="font-semibold text-flagged">{counts.flagged}</span> flagged</span>
          <span><span className="font-semibold text-compliant">{counts.compliant}</span> compliant</span>
          <span><span className="font-semibold text-pending">{counts.pending}</span> pending</span>
        </div>
      </div>

      <div className="relative h-[560px] overflow-hidden rounded-lg border border-hairline">
        <MapContainer center={KLR_CENTER} zoom={17} maxZoom={19} minZoom={15} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {KLR_ROADS.map((road) => (
            <Polyline key={road.id} positions={road.path} pathOptions={{ color: '#9aa4ac', weight: 3, opacity: 0.8 }} />
          ))}

          {KLR_BUILDING_POLYGONS.map((b) => {
            const cell = statusById[b.id]
            if (!cell) return null
            const color = STATUS_COLOR[cell.status]
            const isHovered = hovered === b.id
            return (
              <Polygon
                key={b.id}
                positions={b.polygon}
                pathOptions={{
                  color,
                  weight: isHovered ? 2 : 1,
                  fillColor: color,
                  fillOpacity: cell.status === 'flagged' ? 0.55 : isHovered ? 0.45 : 0.32,
                }}
                eventHandlers={{
                  mouseover: () => setHovered(b.id),
                  mouseout: () => setHovered(null),
                }}
              >
                <Popup minWidth={220}>
                  {cell.plot_id && flagLookup[cell.plot_id] ? (
                    <FlaggedPopup flag={flagLookup[cell.plot_id]} onOpen={() => navigate(`/flags/${cell.plot_id}`)} />
                  ) : (
                    <div className="text-xs">
                      <div className="font-semibold text-ink">
                        {cell.status === 'compliant' ? 'Compliant' : cell.status === 'pending' ? 'Not yet processed this cycle' : 'Under review'}
                      </div>
                      <div className="mt-0.5 text-muted">Building ref {b.id}</div>
                      {cell.plot_id && (
                        <div className="mt-0.5 text-muted">Dismissed by inspector — no longer an open flag.</div>
                      )}
                    </div>
                  )}
                </Popup>
              </Polygon>
            )
          })}
        </MapContainer>

        <div className="absolute bottom-4 left-4 z-[500] rounded-md border border-hairline bg-surface/95 px-3 py-2.5 shadow-sm backdrop-blur-sm">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Legend</div>
          <div className="flex flex-col gap-1">
            {LEGEND.map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-xs text-ink-soft">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[item.key] }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FlaggedPopup({ flag, onOpen }) {
  return (
    <div className="w-full text-xs">
      <div className="font-data font-semibold text-ink">{flag.plot_id}</div>
      <div className="mt-0.5 text-ink-soft">{flag.owner_name}</div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-muted">Excess area</span>
        <span className="font-data font-medium text-ink">{flag.excess_area_sqm.toFixed(1)} sqm</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-muted">Confidence</span>
        <ConfidenceMeter value={flag.confidence_pct} width={48} />
      </div>
      <button
        onClick={onOpen}
        className="mt-2.5 w-full rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
      >
        View full detail
      </button>
    </div>
  )
}
