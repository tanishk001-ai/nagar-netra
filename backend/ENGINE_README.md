# Nagar Netra — matching and confidence engine

This is the real, runnable logic behind the dashboard's confidence scores
and flags. It is deliberately scoped to what could actually be built and
validated in the time available — see the boundary below before presenting
this anywhere.

## What's real

- **`geometry.py`** — actual polygon change detection using Shapely
  (symmetric difference, IoU, a real noise floor below which a "change"
  is treated as segmentation/registration wobble, not construction).
- **`matching.py`** — actual record matching: exact khasra join first,
  falling back to spatial overlap only when the ID join fails, and
  refusing to guess below a minimum overlap threshold.
- **`confidence.py`** — the actual weighted confidence formula (segmentation
  confidence, registration quality, record-match quality, temporal
  persistence), each one computed, not asserted.
- **`test_pipeline.py`** — real validation against a labelled synthetic set:
  precision 0.909, recall 1.000, F1 0.952 on N=24 (10 real changes, 4
  noise-only cases that must not be flagged, 10 unchanged, 4 with
  deliberately mismatched khasra numbers to exercise the fallback path).

## What's simulated, and why

The one stage this does **not** implement is imagery → footprint polygon
extraction (the CNN segmentation step). Building and validating that needs
either real satellite tasking or a labelled Indian-imagery training set,
neither of which is obtainable in this timeframe. In production this stage
would be a pretrained building-footprint segmentation model (SpaceNet or
Microsoft/Google global-footprints class), run on NAKSHA's own drone/ORI
imagery for flagged hotspots, per the two-tier design. Here, the polygons
are synthetic — generated with a known ground truth — specifically so the
downstream logic (the part that's actually novel here, not the polygon
extraction itself) can be tested in isolation.

**Be honest about this distinction if asked.** "We validated the matching
and confidence engine end-to-end against a labelled synthetic set; the
segmentation stage uses a pretrained architecture we've specified but not
yet fine-tuned on real imagery" is a defensible, specific answer. Implying
this ran on real satellite data would not survive a follow-up question.

## An honest finding worth keeping in the pitch, not hiding

One false positive showed up in validation: `NN-2612`, a building with
**no real area growth** (0.9% net change) still got flagged. Investigating
why is itself a good demonstration of engineering rigor: the noise floor
checks the *symmetric difference* area (to catch a building that shifted
without growing), not net excess area. A footprint that jitters slightly
in position — without changing size — can rack up enough symmetric-difference
area to clear the floor even though nothing really changed. This is a real,
specific calibration finding a validation process is supposed to surface,
and it's a stronger thing to show a judge than a suspiciously perfect
1.000/1.000/1.000 result would be.

## Running it

```bash
pip install shapely pytest --break-system-packages
python3 data/generate_synthetic_data.py   # regenerate the test fixture
python3 pipeline.py                        # run the pipeline, see flagged output
pytest test_pipeline.py -v -s              # run validation, see the confusion matrix
```
