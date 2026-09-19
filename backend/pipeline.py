"""
End-to-end pipeline: given a building's baseline/current footprints and the
parcel record set, decide whether to flag it, and if so, with what
confidence and what excess area.

This is the real logic behind the prototype's dashboard and flag-detail
screens. It does not touch imagery - it starts from polygons that a
segmentation model would have produced (see README for that boundary).
"""
import json

from geometry import compute_change
from matching import match_record
from confidence import compute_confidence


def process_building(building, parcels):
    geom = compute_change(building["baseline_polygon"], building["current_polygon"])

    if not geom["above_noise_floor"]:
        return {
            "plot_id": building["plot_id"],
            "flagged": False,
            "reason": "change_below_noise_floor",
            "geometry": geom,
        }

    parcel, match_type, match_quality = match_record(building, parcels)

    if parcel is not None and parcel.get("already_reassessed"):
        # the tax roll cross-check rule from the About page: if the
        # assessed area already reflects something close to the detected
        # area, this was already handled - don't send the inspector to
        # re-verify a plot that's been dealt with.
        already_close = abs(parcel["tax_assessed_area_sqm"] - geom["current_area_sqm"]) < (
            0.15 * geom["current_area_sqm"]
        )
        if already_close:
            return {
                "plot_id": building["plot_id"],
                "flagged": False,
                "reason": "already_reassessed_on_tax_roll",
                "geometry": geom,
                "matched_khasra": parcel["khasra"],
            }

    confidence = compute_confidence(building, match_quality, geom)

    return {
        "plot_id": building["plot_id"],
        "flagged": True,
        "geometry": geom,
        "match_type": match_type,
        "matched_khasra": parcel["khasra"] if parcel else None,
        "sanctioned_area_sqm": parcel["sanctioned_built_up_area_sqm"] if parcel else None,
        "confidence": confidence,
    }


def run_pipeline(buildings_path, parcels_path):
    with open(buildings_path) as f:
        buildings = json.load(f)
    with open(parcels_path) as f:
        parcels = json.load(f)

    results = [process_building(b, parcels) for b in buildings]
    return results, buildings


if __name__ == "__main__":
    results, buildings = run_pipeline(
        "data/synthetic_buildings.json", "data/synthetic_parcels.json"
    )
    flagged = [r for r in results if r["flagged"]]
    print(f"Processed {len(results)} buildings, flagged {len(flagged)}.\n")
    for r in sorted(flagged, key=lambda x: -x["confidence"]["confidence_pct"]):
        print(
            f"{r['plot_id']}  excess={r['geometry']['excess_area_sqm']:>7} sqm  "
            f"confidence={r['confidence']['confidence_pct']:>5}%  "
            f"match={r['match_type']}"
        )
