import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CircleCheck, CircleX, Send, Landmark, Receipt, ScanSearch, ShieldOff } from 'lucide-react'
import { useFlags } from '../state/FlagsContext'
import { getFlag } from '../api/client'
import { wardLabel } from '../data/wards'
import StatusBadge from '../components/StatusBadge'
import ConfidenceMeter from '../components/ConfidenceMeter'
import FootprintDiagram, { diagramFromAreas } from '../components/FootprintDiagram'
import { PageSkeleton } from '../components/Skeleton'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const NOT_FLAGGED_COPY = {
  change_below_noise_floor:
    'The two imagery passes disagree slightly on this footprint, but the difference sits within normal segmentation and registration noise. No real construction was detected here.',
  already_reassessed_on_tax_roll:
    'This footprint did grow, but the property tax roll has already been revised to reflect the new built-up area. No inspector action is needed.',
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-hairline bg-surface p-5">
      <div className="mb-3.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {Icon && <Icon size={13} />}
        {title}
      </div>
      {children}
    </section>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-data text-sm text-ink">{value}</span>
    </div>
  )
}

export default function FlagDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setStatus } = useFlags()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFlag(id)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <PageSkeleton />

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-muted">{error ?? `No flag found for "${id}".`}</p>
        <Link to="/" className="mt-2 inline-block text-sm font-medium text-brand">Back to dashboard</Link>
      </div>
    )
  }

  const flag = detail

  const act = async (action) => {
    setActing(true)
    try {
      const updated = await setStatus(flag.plot_id, action)
      setDetail((prev) => ({ ...prev, status: updated.status, resolved_on: updated.resolved_on }))
    } finally {
      setActing(false)
    }
  }

  if (!flag.flagged) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{flag.address}</h1>
          </div>
          <div className="mt-1 font-data text-xs text-muted">
            {flag.plot_id} · {flag.khasra_no} · {wardLabel(flag.ward_id)}
          </div>
          <div className="mt-0.5 text-sm text-ink-soft">Owner of record: {flag.owner_name}</div>
        </div>
        <Section title="Not flagged this cycle" icon={ShieldOff}>
          <p className="text-sm leading-relaxed text-ink-soft">
            {NOT_FLAGGED_COPY[flag.reason] ?? 'This parcel was not flagged.'}
          </p>
          {flag.geometry && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-hairline pt-3.5">
              <Field label="Baseline area" value={`${flag.geometry.baseline_area_sqm.toFixed(1)} sqm`} />
              <Field label="Current area" value={`${flag.geometry.current_area_sqm.toFixed(1)} sqm`} />
              <Field label="Net change" value={`${flag.geometry.excess_area_sqm.toFixed(1)} sqm (${flag.geometry.pct_growth.toFixed(1)}%)`} />
            </div>
          )}
        </Section>
      </div>
    )
  }

  const excessPct = flag.sanctioned_plan ? Math.round((flag.excess_area_sqm / flag.sanctioned_plan.approved_built_up_area_sqm) * 100) : null
  const diagram = diagramFromAreas(flag.geometry.baseline_area_sqm, flag.geometry.excess_area_sqm)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{flag.address}</h1>
            <StatusBadge status={flag.status} />
          </div>
          <div className="mt-1 font-data text-xs text-muted">
            {flag.plot_id} · {flag.khasra_no} · {wardLabel(flag.ward_id)}
          </div>
          <div className="mt-0.5 text-sm text-ink-soft">Owner of record: {flag.owner_name}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => act('confirmed')}
            disabled={acting || flag.status === 'confirmed'}
            className="flex items-center gap-1.5 rounded-md bg-flagged px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CircleCheck size={14} /> Confirm
          </button>
          <button
            onClick={() => act('dismissed')}
            disabled={acting || flag.status === 'dismissed'}
            className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CircleX size={14} /> Dismiss
          </button>
          <button
            onClick={() => act('pending')}
            disabled={acting || flag.status === 'pending'}
            className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14} /> Send to review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Section title="Source imagery" icon={ScanSearch}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div
                  className="aspect-4/3 rounded-md"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, #5c6b4f 0px, #5c6b4f 18px, #566550 19px), repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(0,0,0,0.05) 19px)',
                  }}
                >
                  <FootprintDiagram diagram={diagram} variant="imagery" showExtension={false} />
                </div>
                <div className="mt-1.5 text-xs font-medium text-ink">Baseline · {formatDate(flag.imagery.baseline_date)}</div>
                <div className="text-xs text-muted">{flag.imagery.baseline_source}</div>
              </div>
              <div>
                <div
                  className="aspect-4/3 rounded-md"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, #55624a 0px, #55624a 18px, #505b47 19px), repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(0,0,0,0.06) 19px)',
                  }}
                >
                  <FootprintDiagram diagram={diagram} variant="imagery" showExtension />
                </div>
                <div className="mt-1.5 text-xs font-medium text-ink">Current · {formatDate(flag.imagery.current_date)}</div>
                <div className="text-xs text-muted">{flag.imagery.current_source}</div>
              </div>
            </div>
          </Section>

          <Section title="Computed excess area">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="aspect-square rounded-md border border-hairline bg-canvas p-3">
                <FootprintDiagram diagram={diagram} variant="technical" />
              </div>
              <div className="flex flex-col justify-center gap-2">
                <Field label="Baseline area (t-1)" value={`${flag.geometry.baseline_area_sqm.toFixed(1)} sqm`} />
                <Field label="Detected area (t)" value={`${flag.geometry.current_area_sqm.toFixed(1)} sqm`} />
                <Field label="IoU" value={flag.geometry.iou} />
                <div className="my-1 border-t border-hairline" />
                <div className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="text-sm font-medium text-ink">Excess area</span>
                  <span className="font-data text-base font-semibold text-flagged">
                    +{flag.excess_area_sqm.toFixed(1)} sqm ({flag.geometry.pct_growth.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {flag.sanctioned_plan && (
            <Section title="Matched sanctioned plan" icon={Landmark}>
              <Field label="Match type" value={flag.match_type} />
              <Field label="Approval reference" value={flag.sanctioned_plan.approval_ref_no} />
              <Field label="Approval date" value={formatDate(flag.sanctioned_plan.approval_date)} />
              <Field label="Approved built-up area" value={`${flag.sanctioned_plan.approved_built_up_area_sqm.toFixed(1)} sqm`} />
              <Field label="Approved floors" value={flag.sanctioned_plan.approved_floors} />
              <Field label="Sanctioning authority" value={flag.sanctioned_plan.sanctioning_authority} />
            </Section>
          )}

          {flag.tax_record && (
            <Section title="Matched tax record" icon={Receipt}>
              <Field label="Property ID" value={flag.tax_record.property_id} />
              <Field label="Assessed area" value={`${flag.tax_record.assessed_area_sqm.toFixed(1)} sqm`} />
              <Field label="Occupancy type" value={flag.tax_record.occupancy_type} />
              <Field label="Annual tax" value={`₹${flag.tax_record.annual_tax_rs.toLocaleString('en-IN')}`} />
              <Field label="Last assessed" value={flag.tax_record.last_assessed_year} />
            </Section>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Section title="Confidence score">
            <div className="mb-3 flex items-center gap-3">
              <span className="font-data text-3xl font-semibold text-ink">{Math.round(flag.confidence.confidence_pct)}%</span>
              <ConfidenceMeter value={flag.confidence.confidence_pct} width={90} />
            </div>
            <ul className="flex flex-col gap-2.5">
              {flag.confidence.factors.map((f, i) => (
                <li key={i} className="text-sm leading-snug text-ink-soft">
                  <span className="mr-1.5 text-muted">·</span>
                  {f}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Detection timeline">
            <Field label="Detected on" value={formatDate(flag.detected_on)} />
            {flag.resolved_on && <Field label="Actioned on" value={formatDate(flag.resolved_on)} />}
            <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2.5">
              <span className="text-sm text-ink-soft">Current status</span>
              <StatusBadge status={flag.status} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
