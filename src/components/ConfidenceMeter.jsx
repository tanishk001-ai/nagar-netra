function tierColor(pct) {
  if (pct >= 82) return 'bg-compliant'
  if (pct >= 65) return 'bg-pending'
  return 'bg-flagged'
}

// value: confidence as a 0-100 percentage, straight from the API.
export default function ConfidenceMeter({ value, width = 64 }) {
  const pct = Math.round(value)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full bg-hairline" style={{ width }}>
        <div className={`h-1.5 rounded-full ${tierColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-data text-xs text-ink-soft tabular-nums">{pct}%</span>
    </div>
  )
}
