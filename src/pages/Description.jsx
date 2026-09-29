import { Satellite, Shapes, GitCompare, Gauge, ClipboardCheck } from 'lucide-react'

const STEPS = [
  {
    icon: Satellite,
    title: 'Triage (Tier 1)',
    tag: 'Specified',
    tone: 'neutral',
    text: 'Free 10 m Sentinel-2 imagery marks which blocks to look at first. At that resolution it can prioritise, but it cannot prove a violation.',
  },
  {
    icon: Shapes,
    title: 'Extract (Tier 2)',
    tag: 'Specified, model not yet fine-tuned',
    tone: 'neutral',
    text: 'On flagged blocks, a pretrained building-footprint model runs on drone, ORI or Cartosat imagery from both dates. Footprints become polygons and are compared.',
  },
  {
    icon: GitCompare,
    title: 'Match',
    tag: 'Built and tested',
    tone: 'built',
    text: 'Each changed footprint is joined to its sanctioned plan by khasra number. If that fails, spatial overlap is used, but only above 50% overlap. Below that the flag is held for a person. A plot whose tax record already reflects the new area is not flagged.',
  },
  {
    icon: Gauge,
    title: 'Score',
    tag: 'Built and tested',
    tone: 'built',
    text: 'Every flag gets a confidence score built from four visible factors, each shown as a reason.',
  },
  {
    icon: ClipboardCheck,
    title: 'Verify',
    tag: 'Human step',
    tone: 'human',
    text: 'An inspector confirms on site, including the floor count. Only then can a notice follow.',
  },
]

const TAG_STYLES = {
  neutral: 'bg-hairline/60 text-ink-soft',
  built: 'bg-compliant-soft text-compliant',
  human: 'bg-brand-soft text-brand',
}

const SCORE_WEIGHTS = [
  { label: 'Segmentation confidence', weight: '30%' },
  { label: 'Registration quality', weight: '25%' },
  { label: 'Record match quality', weight: '25%' },
  { label: 'Persistence across imagery passes', weight: '20%' },
]

const BUILT_AND_TESTED = [
  'Change detection by polygon comparison with a noise floor',
  'Record matching with khasra join and overlap fallback',
  'Tax-roll check',
  'Four-factor confidence with reasons',
  'API and inspector dashboard',
  'Automated tests (4 engine, 7 API)',
]

const NOT_YET_BUILT = [
  'Footprint segmentation on real imagery',
  'Automated topology correction',
  'Attribute mapping across department schemas',
  'A conflict register',
  'The Sentinel-2 triage tier',
]

const KNOWN_LIMITS = [
  'Floor counts are not estimated from imagery. Published shadow-based methods reach about 42% exact accuracy, so floors stay a field check.',
  'Accuracy on real Bhopal imagery is unmeasured, and dense wards are the hard case.',
  'Sentinel-2 at 10 m cannot verify an individual building.',
  'This demo build serves precomputed output. Confirm and Dismiss work on screen but are not saved.',
]

function SectionLabel({ children }) {
  return <div className="text-xs font-semibold uppercase tracking-wide text-muted">{children}</div>
}

function Bullet({ children }) {
  return (
    <li className="flex gap-1.5 text-sm leading-relaxed text-ink-soft">
      <span className="text-muted">·</span>
      <span>{children}</span>
    </li>
  )
}

export default function Description() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold text-ink">How Nagar Netra works</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Nagar Netra compares two dated, high-resolution images of a ward, finds every building that changed, and
        checks each one against the sanctioned plan and the tax record. An inspector then confirms the flags worth
        acting on.
      </p>

      <div className="mt-8 flex flex-col gap-2">
        <SectionLabel>The problem</SectionLabel>
        <p className="text-sm leading-relaxed text-ink-soft">
          NAKSHA is producing drone imagery, orthorectified imagery and elevation data for urban wards. Lining
          that data up with cadastral maps, sanctioned building plans and property tax records is still done by
          hand. A plan is approved once and rarely checked again, so buildings grow while the records, and the
          tax assessed on them, stay the same.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <SectionLabel>What the system does</SectionLabel>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3.5 rounded-lg border border-hairline bg-surface p-4">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand-soft text-brand">
                <s.icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-ink">
                    {i + 1}. {s.title}
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TAG_STYLES[s.tone]}`}>{s.tag}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <SectionLabel>How the score is built</SectionLabel>
        <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {SCORE_WEIGHTS.map((row, i) => (
                <tr key={row.label} className={i < SCORE_WEIGHTS.length - 1 ? 'border-b border-hairline' : ''}>
                  <td className="px-4 py-2.5 text-ink-soft">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-data font-medium text-ink">{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft">
          The weights are a starting judgement, not a measured optimum. They are the first thing to revisit once
          real confirmed and dismissed outcomes exist.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <SectionLabel>How we tested it</SectionLabel>
        <p className="text-sm leading-relaxed text-ink-soft">
          The matching and scoring engine was run on 24 labelled buildings: 10 with real changes, 4 that only
          jittered, and 10 unchanged. Precision 0.91, recall 1.00, F1 0.95. All 10 real changes were caught. There
          was one false positive: a footprint that shifted without growing still cleared the noise floor. We kept
          it in the results because it is a real calibration finding. The footprints in this test are synthetic,
          with a known answer key, so it proves the matching and scoring logic. It does not measure accuracy on
          real imagery. The demo ward in this app is a separate dataset, so its counts differ from the test set.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <SectionLabel>Built and not built</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-hairline bg-surface p-4">
            <div className="text-sm font-semibold text-ink">Built and tested</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {BUILT_AND_TESTED.map((item) => (
                <Bullet key={item}>{item}</Bullet>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-hairline bg-surface p-4">
            <div className="text-sm font-semibold text-ink">Specified, not yet built</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {NOT_YET_BUILT.map((item) => (
                <Bullet key={item}>{item}</Bullet>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <SectionLabel>Known limits</SectionLabel>
        <ul className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-surface p-4">
          {KNOWN_LIMITS.map((item) => (
            <Bullet key={item}>{item}</Bullet>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-xs text-muted">
        Built for Smart India Hackathon 2026, problem statement SIH26013 (Ministry of Rural Development,
        Department of Land Resources).
      </p>
    </div>
  )
}
