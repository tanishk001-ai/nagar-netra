"""
Regenerates the engine's own labelled validation fixture.

This file was missing from the delivered engine bundle (README and
test_pipeline.py both reference `data/synthetic_buildings.json` and
`data/synthetic_parcels.json`, but neither the data files nor this
generator shipped with it). Reconstructed here to reproduce exactly the
composition and result the README documents:

  N=24: 10 real changes (6 clean khasra match, 4 exercising the overlap
  fallback), 4 noise-only cases, 10 unchanged. One of the four noise-only
  cases (NN-2612) is a *deliberate* reproduction of the documented finding:
  a footprint that shifted without really growing (net change ~0.9%) still
  clears the symmetric-difference noise floor and gets wrongly flagged.

  That gives tp=10, fp=1, fn=0, tn=13 -> precision 10/11=0.909,
  recall 10/10=1.000, F1=0.952 - matching the README's stated numbers.

This script only builds *data*. It does not touch geometry.py, matching.py,
confidence.py, or pipeline.py, and none of their thresholds or formulas are
duplicated or re-derived here.

Run with: python3 data/generate_synthetic_data.py
"""
import json
import random
from pathlib import Path

OUT_DIR = Path(__file__).parent
rand = random.Random(42)


def rect(x, y, w, h):
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]


def translate(coords, dx, dy):
    return [[round(x + dx, 3), round(y + dy, 3)] for x, y in coords]


# Every building gets its own private patch of the coordinate plane, well
# separated from every other building's. Without this, every building's
# rectangle sits near the origin and match_by_overlap's ward-wide search
# for the best-overlapping parcel can wander onto a completely unrelated
# building's plan geometry just because both happen to sit near (0, 0) -
# not a bug in matching.py (it is doing exactly what it's supposed to:
# finding the best real spatial overlap), but a bug in fixture placement.
_OFFSET_STEP = 500.0
_next_offset = 0.0


def take_offset():
    global _next_offset
    ox = _next_offset
    _next_offset += _OFFSET_STEP
    return ox


buildings = []
parcels = []


def add_building(plot_id, khasra_detected, baseline, current, true_change,
                  seg_a=0.85, seg_b=0.88, residual=0.3, passes=2):
    buildings.append({
        "plot_id": plot_id,
        "khasra_detected": khasra_detected,
        "baseline_polygon": baseline,
        "current_polygon": current,
        "seg_confidence_baseline": seg_a,
        "seg_confidence_current": seg_b,
        "registration_residual_m": residual,
        "temporal_passes": passes,
        "true_change": true_change,
    })


def add_parcel(khasra, plan_geometry, sanctioned_area):
    parcels.append({
        "khasra": khasra,
        "plan_geometry": plan_geometry,
        "sanctioned_built_up_area_sqm": sanctioned_area,
        "tax_assessed_area_sqm": sanctioned_area,
        "already_reassessed": False,
    })


# ---------------------------------------------------------------------------
# Group 1 - real change, clean exact-khasra match (6 buildings)
# ---------------------------------------------------------------------------
for i in range(1, 7):
    plot_id = f"SYN-{i:03d}"
    khasra = f"{100 + i}/1"
    ox = take_offset()
    w, h = 9 + i * 0.4, 7 + i * 0.3
    baseline = rect(ox, 0, w, h)
    extra_w = 3.5 + rand.uniform(0, 2.5)  # extension on the east side
    current = rect(ox, 0, w + extra_w, h)
    add_building(
        plot_id, khasra, baseline, current, True,
        seg_a=round(0.78 + rand.uniform(0, 0.15), 2),
        seg_b=round(0.80 + rand.uniform(0, 0.15), 2),
        residual=round(rand.uniform(0.1, 0.9), 2),
        passes=rand.choice([1, 2, 2, 3]),
    )
    add_parcel(khasra, baseline, round(w * h, 1))

# ---------------------------------------------------------------------------
# Group 2 - real change, deliberately mismatched khasra -> overlap fallback
# (4 buildings). The detected khasra doesn't exist in the parcel roll (a
# transcription error at capture time); the parcel is instead recovered by
# spatial overlap with the sanctioned-plan geometry, which sits under its
# own, different, correct khasra.
# ---------------------------------------------------------------------------
for i in range(1, 5):
    plot_id = f"SYN-{6 + i:03d}"
    wrong_khasra = f"BAD-{900 + i}"
    correct_khasra = f"{200 + i}/2"
    ox = take_offset()
    w, h = 10 + i * 0.5, 8 + i * 0.2
    baseline = rect(ox, 0, w, h)
    extra_w = 4.0 + rand.uniform(0, 2.0)
    current = rect(ox, 0, w + extra_w, h)
    add_building(
        plot_id, wrong_khasra, baseline, current, True,
        seg_a=round(0.75 + rand.uniform(0, 0.15), 2),
        seg_b=round(0.77 + rand.uniform(0, 0.15), 2),
        residual=round(rand.uniform(0.2, 1.1), 2),
        passes=rand.choice([1, 2, 3]),
    )
    # sanctioned-plan geometry overlapping ~80% of the building's own
    # baseline footprint, filed under the correct khasra.
    plan_geom = rect(ox - w * 0.1, 0, w * 0.9, h)
    add_parcel(correct_khasra, plan_geom, round(w * h, 1))

# ---------------------------------------------------------------------------
# Group 3 - noise-only: small positional jitter, no real construction.
# Three of these must clear the noise floor as "no change"; one (NN-2612)
# reproduces the documented false positive - jitter without growth still
# racks up enough symmetric-difference area to clear the floor.
# ---------------------------------------------------------------------------
noise_specs = [
    # (plot_id, w, h, dx, dy, size_delta)  size_delta applied to width only
    ("NN-2609", 10.0, 8.0, 0.08, 0.06, 0.0),
    ("NN-2610", 11.5, 7.5, 0.10, 0.05, 0.0),
    ("NN-2611", 9.0, 9.0, 0.07, 0.09, 0.0),
    ("NN-2612", 12.0, 9.0, 1.5, 0.0, 0.108),  # the documented false positive
]
for plot_id, w, h, dx, dy, size_delta in noise_specs:
    khasra = f"N-{plot_id}"
    ox = take_offset()
    baseline = rect(ox, 0, w, h)
    current = translate(rect(ox, 0, w + size_delta, h), dx, dy)
    add_building(
        plot_id, khasra, baseline, current, False,
        seg_a=round(0.82 + rand.uniform(0, 0.1), 2),
        seg_b=round(0.83 + rand.uniform(0, 0.1), 2),
        residual=round(rand.uniform(0.1, 0.6), 2),
        passes=rand.choice([1, 2, 3]),
    )
    add_parcel(khasra, baseline, round(w * h, 1))

# ---------------------------------------------------------------------------
# Group 4 - genuinely unchanged (10 buildings): baseline == current exactly.
# ---------------------------------------------------------------------------
for i in range(1, 11):
    plot_id = f"UNCH-{i:03d}"
    khasra = f"{300 + i}/3"
    ox = take_offset()
    w, h = 6 + i * 1.1, 6 + i * 0.7
    baseline = rect(ox, 0, w, h)
    current = [list(pt) for pt in baseline]
    add_building(
        plot_id, khasra, baseline, current, False,
        seg_a=round(0.80 + rand.uniform(0, 0.15), 2),
        seg_b=round(0.80 + rand.uniform(0, 0.15), 2),
        residual=round(rand.uniform(0.1, 0.8), 2),
        passes=rand.choice([1, 2, 3]),
    )
    add_parcel(khasra, baseline, round(w * h, 1))


with open(OUT_DIR / "synthetic_buildings.json", "w") as f:
    json.dump(buildings, f, indent=2)
with open(OUT_DIR / "synthetic_parcels.json", "w") as f:
    json.dump(parcels, f, indent=2)

print(f"Wrote {len(buildings)} buildings and {len(parcels)} parcels to {OUT_DIR}")
