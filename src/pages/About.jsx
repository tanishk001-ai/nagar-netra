import { ShieldCheck, ScanSearch, Landmark, Receipt, Info } from 'lucide-react'
import { isStaticBuild } from '../api/client'

const STEPS = [
  { icon: ScanSearch, title: 'Change detection', text: 'Each ward is re-flown on a rolling cycle. Building footprints from the current pass are compared against the last confirmed baseline to isolate genuine new construction from noise, shadow drift, and seasonal cover.' },
  { icon: Landmark, title: 'Sanctioned plan match', text: 'Every footprint that changed is matched to its sanctioned building plan on file with the Town & Country Planning department by khasra number, and the approved built-up area is diffed against what was detected.' },
  { icon: Receipt, title: 'Tax roll cross-check', text: 'The same parcel is matched against the property tax roll to confirm the assessed area has not already been revised, so inspectors are not sent to re-verify a plot that was already reassessed.' },
]

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-ink">About Nagar Netra</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Nagar Netra flags plots where satellite-detected construction has outgrown its sanctioned building plan,
        so ward inspectors can verify a short, ranked list instead of walking every parcel. It was built for the
        NAKSHA programme under the Department of Land Resources, Ministry of Rural Development, as a submission
        for problem statement SIH26013.
      </p>

      {isStaticBuild && (
        <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-hairline bg-brand-soft px-4 py-3">
          <Info size={15} className="flex-none text-brand" />
          <p className="text-xs text-brand">
            Demo build: serves precomputed output of the matching and scoring engine. Live API and tests are in the repository.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-5">
        {STEPS.map((s) => (
          <div key={s.title} className="flex gap-3.5 rounded-lg border border-hairline bg-surface p-4">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand-soft text-brand">
              <s.icon size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{s.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3 rounded-lg border border-hairline bg-canvas p-4">
        <ShieldCheck size={18} className="flex-none text-brand" />
        <p className="text-xs leading-relaxed text-ink-soft">
          This dashboard holds parcel geometry, sanctioned-plan references, and property tax fields for one purpose:
          verifying construction against approvals. It does not store owner contact details beyond what is already
          on the tax roll, and access is limited to ward inspectors and the revenue officers who action a confirmed
          flag. Nothing here is shared outside the corporation without a written request under the applicable
          right-to-information rules.
        </p>
      </div>
    </div>
  )
}
