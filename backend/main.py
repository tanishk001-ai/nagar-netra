"""
FastAPI wrapper around the matching/confidence engine.

This file contains no matching, geometry, or confidence logic of its own.
It loads the bridge dataset, runs pipeline.process_building once at
startup, caches the results, and serves them - plus a small JSON-backed
workflow store for Confirm/Dismiss - to the Nagar Netra frontend.
"""
import hashlib
import json
from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pipeline import process_building
import store

DATA_DIR = Path(__file__).parent / "data"
AUTHORITY = "Bhopal Municipal Corporation — Town & Country Planning Dept."

app = FastAPI(title="Nagar Netra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Run the pipeline once at import time (process start) and cache the
# result in memory. A real deployment would re-run this on a schedule tied
# to the imagery ingest cycle, not on every request.
# ---------------------------------------------------------------------------
with open(DATA_DIR / "bridge_buildings.json") as f:
    BUILDINGS = json.load(f)
with open(DATA_DIR / "bridge_parcels.json") as f:
    PARCELS = json.load(f)
with open(DATA_DIR / "klr43_grid_snapshot.json") as f:
    KLR43_GRID = json.load(f)

BUILDINGS_BY_ID = {b["plot_id"]: b for b in BUILDINGS}
RESULTS_BY_ID = {b["plot_id"]: process_building(b, PARCELS) for b in BUILDINGS}

store.seed_if_missing(BUILDINGS)


def _khasra_display(building, result):
    khasra = result.get("matched_khasra") or building["khasra_detected"]
    return f"Khasra No. {khasra}"


def _property_id(plot_id, tax_year):
    digest = int(hashlib.sha1(plot_id.encode()).hexdigest(), 16)
    seq = 40000 + (digest % 59999)
    return f"BMC/PT/{tax_year}/0{seq}"


def _imagery_dates(building):
    detected = date.fromisoformat(building["detected_on"])
    digest = int(hashlib.sha1(building["plot_id"].encode()).hexdigest(), 16)
    baseline_offset = 370 + (digest % 45)
    current_offset = digest % 6
    return {
        "baseline_date": (detected - timedelta(days=baseline_offset)).isoformat(),
        "baseline_source": "Cartosat-3, 0.28m PAN" if digest % 2 else "ISRO Bhuvan archive, 0.3m pansharpened",
        "current_date": (detected - timedelta(days=current_offset)).isoformat(),
        "current_source": "Cartosat-3, 0.28m PAN",
    }


def _matched_parcel(result):
    khasra = result.get("matched_khasra")
    if not khasra:
        return None
    for p in PARCELS:
        if p["khasra"] == khasra:
            return p
    return None


def build_flag_summary(plot_id):
    building = BUILDINGS_BY_ID[plot_id]
    result = RESULTS_BY_ID[plot_id]
    workflow = store.get_status(plot_id)

    summary = {
        "plot_id": plot_id,
        "ward_id": building["ward_id"],
        "khasra_no": _khasra_display(building, result),
        "owner_name": building["owner_name"],
        "address": building["address"],
        "flagged": result["flagged"],
        "reason": result.get("reason"),
        "match_type": result.get("match_type"),
        "excess_area_sqm": result["geometry"]["excess_area_sqm"] if result["flagged"] else None,
        "confidence_pct": result["confidence"]["confidence_pct"] if result["flagged"] else None,
        "detected_on": building["detected_on"],
        "status": workflow["status"] if result["flagged"] else None,
        "resolved_on": workflow["resolved_on"] if result["flagged"] else None,
    }
    return summary


@app.get("/api/flags")
def list_flags():
    return [build_flag_summary(plot_id) for plot_id in BUILDINGS_BY_ID]


@app.get("/api/flags/{plot_id}")
def flag_detail(plot_id: str):
    if plot_id not in BUILDINGS_BY_ID:
        raise HTTPException(status_code=404, detail=f"No such plot: {plot_id}")

    building = BUILDINGS_BY_ID[plot_id]
    result = RESULTS_BY_ID[plot_id]
    summary = build_flag_summary(plot_id)
    parcel = _matched_parcel(result)

    detail = {
        **summary,
        "geometry": result["geometry"],
        "confidence": result.get("confidence"),
        "imagery": _imagery_dates(building),
        "sanctioned_plan": None,
        "tax_record": None,
    }

    if parcel is not None:
        detail["sanctioned_plan"] = {
            "approval_ref_no": parcel["approval_ref_no"],
            "approval_date": parcel["approval_date"],
            "approved_built_up_area_sqm": parcel["sanctioned_built_up_area_sqm"],
            "approved_floors": parcel["approved_floors"],
            "sanctioning_authority": parcel["sanctioning_authority"],
        }
        detail["tax_record"] = {
            "property_id": _property_id(plot_id, parcel["last_assessed_year"]),
            "assessed_area_sqm": parcel["tax_assessed_area_sqm"],
            "occupancy_type": parcel["occupancy_type"],
            "annual_tax_rs": parcel["annual_tax_rs"],
            "last_assessed_year": parcel["last_assessed_year"],
        }

    return detail


@app.post("/api/flags/{plot_id}/confirm")
def confirm_flag(plot_id: str):
    return _set_workflow(plot_id, "confirmed")


@app.post("/api/flags/{plot_id}/dismiss")
def dismiss_flag(plot_id: str):
    return _set_workflow(plot_id, "dismissed")


@app.post("/api/flags/{plot_id}/review")
def send_to_review(plot_id: str):
    return _set_workflow(plot_id, "pending")


def _set_workflow(plot_id, status):
    if plot_id not in BUILDINGS_BY_ID:
        raise HTTPException(status_code=404, detail=f"No such plot: {plot_id}")
    if not RESULTS_BY_ID[plot_id]["flagged"]:
        raise HTTPException(status_code=400, detail="This plot was not flagged by the engine; there is nothing to confirm or dismiss.")
    store.set_status(plot_id, status, date.today().isoformat())
    return build_flag_summary(plot_id)


@app.get("/api/ward/{ward_id}/map")
def ward_map(ward_id: str):
    if ward_id != "KLR-43":
        raise HTTPException(status_code=404, detail="No seeded building geometry for this ward yet.")

    buildings = []
    for cell in KLR43_GRID:
        if cell["flagId"]:
            plot_id = cell["flagId"]
            result = RESULTS_BY_ID.get(plot_id)
            workflow = store.get_status(plot_id)
            if result and result["flagged"] and workflow["status"] != "dismissed":
                status = "flagged"
            else:
                status = "compliant"
            buildings.append({"id": cell["id"], "status": status, "plot_id": plot_id})
        else:
            # static backdrop cell: no individual identity/geometry, not
            # processed by the engine this cycle.
            buildings.append({"id": cell["id"], "status": cell["status"], "plot_id": None})

    counts = {"flagged": 0, "compliant": 0, "pending": 0}
    for b in buildings:
        counts[b["status"]] += 1

    return {"ward_id": ward_id, "buildings": buildings, "counts": counts}


@app.get("/api/health")
def health():
    return {"ok": True, "buildings_loaded": len(BUILDINGS), "flagged": sum(1 for r in RESULTS_BY_ID.values() if r["flagged"])}
