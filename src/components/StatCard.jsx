export default function StatCard({ label, value, suffix, sub, accent }) {
  return (
    <div className="flex-1 rounded-lg border border-hairline bg-surface px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-data text-3xl font-semibold tabular-nums ${accent ?? 'text-ink'}`}>{value}</span>
        {suffix && <span className="text-sm font-medium text-ink-soft">{suffix}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}
