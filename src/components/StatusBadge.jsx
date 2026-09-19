const STYLES = {
  pending: { label: 'Pending review', dot: 'bg-pending', text: 'text-pending', bg: 'bg-pending-soft' },
  confirmed: { label: 'Confirmed', dot: 'bg-flagged', text: 'text-flagged', bg: 'bg-flagged-soft' },
  dismissed: { label: 'Dismissed', dot: 'bg-compliant', text: 'text-compliant', bg: 'bg-compliant-soft' },
}

export default function StatusBadge({ status, className = '' }) {
  const s = STYLES[status] ?? STYLES.pending
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
