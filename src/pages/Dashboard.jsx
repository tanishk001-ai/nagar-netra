import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useFlags } from '../state/FlagsContext'
import { WARDS, wardLabel } from '../data/wards'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import ConfidenceMeter from '../components/ConfidenceMeter'
import { PageSkeleton } from '../components/Skeleton'

const NOW = new Date('2026-09-18')
const WEEK_AGO = new Date('2026-09-11')

const COLUMNS = [
  { key: 'plot_id', label: 'Plot ID' },
  { key: 'ward_id', label: 'Ward' },
  { key: 'excess_area_sqm', label: 'Excess area' },
  { key: 'confidence_pct', label: 'Confidence' },
  { key: 'status', label: 'Status' },
  { key: 'detected_on', label: 'Detected' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const { flags, loading, error } = useFlags()
  const navigate = useNavigate()
  const [ward, setWard] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'excess_area_sqm', dir: 'desc' })

  const flagged = useMemo(() => flags.filter((f) => f.flagged), [flags])

  const verifiedThisWeek = useMemo(
    () =>
      flagged.filter((f) => f.resolved_on && new Date(f.resolved_on) > WEEK_AGO && new Date(f.resolved_on) <= NOW)
        .length,
    [flagged],
  )

  const avgConfidence = useMemo(() => {
    if (flagged.length === 0) return 0
    return Math.round(flagged.reduce((sum, f) => sum + f.confidence_pct, 0) / flagged.length)
  }, [flagged])

  const rows = useMemo(() => {
    let list = flagged
    if (ward !== 'all') list = list.filter((f) => f.ward_id === ward)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (f) =>
          f.plot_id.toLowerCase().includes(q) ||
          f.owner_name.toLowerCase().includes(q) ||
          f.address.toLowerCase().includes(q),
      )
    }
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (typeof av === 'string') return av.localeCompare(bv) * dir
      return (av - bv) * dir
    })
  }, [flagged, ward, query, sort])

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  if (loading) return <PageSkeleton />

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-flagged">Could not reach the Nagar Netra API: {error}</p>
        <p className="mt-1 text-sm text-muted">Is the backend running on http://localhost:8000?</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink">Flagged plots</h1>
        <p className="mt-0.5 text-sm text-muted">Change-detection results cross-checked against sanctioned plans and tax records, current cycle.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <StatCard label="Flags this cycle" value={flagged.length} />
        <StatCard label="Average confidence" value={avgConfidence} suffix="%" />
        <StatCard label="Verified this week" value={verifiedThisWeek} sub="Confirmed or dismissed by inspectors" />
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plot ID, owner, address"
            className="w-full rounded-md border border-hairline bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>
        <select
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="w-full rounded-md border border-hairline bg-surface py-1.5 px-3 text-sm text-ink focus:border-brand focus:outline-none sm:w-56"
        >
          <option value="all">All wards</option>
          {WARDS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.locality}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left">
              {COLUMNS.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-4 py-2.5">
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink-soft"
                  >
                    {col.label}
                    {sort.key === col.key ? (
                      sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr
                key={f.plot_id}
                onClick={() => navigate(`/flags/${f.plot_id}`)}
                className="cursor-pointer border-b border-hairline last:border-b-0 hover:bg-canvas"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-data text-xs text-ink">{f.plot_id}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">{wardLabel(f.ward_id)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-data tabular-nums text-ink">{f.excess_area_sqm.toFixed(1)} sqm</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <ConfidenceMeter value={f.confidence_pct} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <StatusBadge status={f.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">{formatDate(f.detected_on)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-muted">
                  No flags match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
