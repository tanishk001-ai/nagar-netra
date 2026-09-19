function bounds(diagram) {
  const { base, ext } = diagram
  const minX = Math.min(0, ext.x)
  const minY = Math.min(0, ext.y)
  const maxX = Math.max(base.w, ext.x + ext.w)
  const maxY = Math.max(base.h, ext.y + ext.h)
  const w = maxX - minX
  const h = maxY - minY
  const pad = Math.max(w, h) * 0.18
  return { minX: minX - pad, minY: minY - pad, w: w + pad * 2, h: h + pad * 2 }
}

function rectPath({ x, y, w, h }) {
  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`
}

// Builds a simple base-rectangle + east-extension diagram straight from
// the engine's own reported areas (baseline_area_sqm, excess_area_sqm) -
// not a separately invented shape, so the picture always matches the
// numbers next to it.
export function diagramFromAreas(baselineAreaSqm, excessAreaSqm) {
  const baseW = Math.sqrt(baselineAreaSqm * 1.35)
  const baseH = baselineAreaSqm / baseW
  const extW = Math.max(excessAreaSqm, 0) / baseH
  return {
    base: { x: 0, y: 0, w: baseW, h: baseH },
    ext: { x: baseW, y: 0, w: extW, h: baseH },
  }
}

// variant "imagery": a muted silhouette meant to sit over a placeholder tile crop.
// variant "technical": a clean line diagram — dashed sanctioned outline vs solid detected outline.
export default function FootprintDiagram({ diagram, variant = 'technical', showExtension = true }) {
  const { minX, minY, w, h } = bounds(diagram)
  const viewBox = `${minX} ${minY} ${w} ${h}`

  if (variant === 'imagery') {
    return (
      <svg viewBox={viewBox} className="h-full w-full">
        <path d={rectPath(diagram.base)} fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.85)" strokeWidth={w * 0.012} />
        {showExtension && (
          <path d={rectPath(diagram.ext)} fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.95)" strokeWidth={w * 0.012} />
        )}
      </svg>
    )
  }

  return (
    <svg viewBox={viewBox} className="h-full w-full">
      <path
        d={rectPath(diagram.base)}
        fill="none"
        stroke="#6b7684"
        strokeDasharray={`${w * 0.02} ${w * 0.015}`}
        strokeWidth={w * 0.012}
      />
      <path
        d={rectPath(diagram.ext)}
        fill="rgba(179,38,30,0.16)"
        stroke="#b3261e"
        strokeWidth={w * 0.012}
      />
      <path d={rectPath(diagram.base)} fill="none" stroke="#101820" strokeWidth={w * 0.008} />
    </svg>
  )
}
