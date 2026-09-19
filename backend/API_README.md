# Nagar Netra backend

FastAPI wrapper around the matching/confidence engine (`geometry.py`,
`matching.py`, `confidence.py`, `pipeline.py` — untouched, logic and
thresholds exactly as delivered). `main.py` runs the pipeline once at
startup and serves the results to the frontend.

See [ENGINE_README.md](ENGINE_README.md) (delivered as-is with the engine)
for what's real vs. simulated in the engine itself. This file only covers
the API layer built around it.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Regenerate the data (only needed once, or after editing a generator)

```bash
python3 data/generate_synthetic_data.py   # engine's own validation fixture
python3 data/generate_bridge_dataset.py   # frontend-identity + engine-input dataset the API serves
```

## Run

```bash
uvicorn main:app --port 8000
```

Frontend expects this at `http://localhost:8000` (see `src/api/client.js`;
override with `VITE_API_URL`).

## Test

```bash
pytest test_pipeline.py -v -s   # the engine's own validation - untouched
pytest test_api.py -v           # API-level test
```

## Notes for anyone picking this up later

- **`data/generate_synthetic_data.py` and `data/generate_bridge_dataset.py`
  were reconstructed, not part of the original delivery.** The engine
  bundle's README and `test_pipeline.py` both reference
  `data/synthetic_buildings.json` / `data/synthetic_parcels.json`, but
  neither those files nor a generator for them were included. The
  generator here was written to reproduce the exact documented result
  (precision 0.909, recall 1.000, F1 0.952, N=24, with `NN-2612` as the
  one documented false positive) without changing anything in
  `geometry.py` / `matching.py` / `confidence.py` / `pipeline.py`.

- **A real bug was found and fixed while building this**, not in the
  engine, but in how the fixture data was first laid out: every
  building's baseline/current/plan polygon was generated at local
  coordinate `(0, 0)`. `matching.py`'s overlap fallback searches *every*
  parcel for the best spatial overlap with a building's footprint - with
  everything sitting at the same origin, it would occasionally lock onto
  a completely unrelated building's sanctioned-plan geometry instead of
  the one it was meant to recover. Both generators now place each
  building on its own 500m-separated patch of the coordinate plane. This
  didn't affect `test_pipeline.py`'s pass/fail result (flagged vs.
  not-flagged didn't change), but it did produce a wrong matched khasra
  and sanctioned-plan record for the overlap-fallback cases before the
  fix - worth knowing if the dataset is regenerated or extended again.

- **`data/workflow_state.json`** is the only mutable state (Confirm /
  Dismiss / Send-to-review). It's created on first run and gitignored.
  Delete it to reset every flag back to its seeded workflow status.
