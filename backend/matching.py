"""
Matches a detected, changed footprint to its sanctioned-plan and tax-roll
record.

The honest problem this addresses: cadastral, revenue and municipal layers
routinely use different parcel identifiers, or the same identifier typed
inconsistently across departments. A system that only does an exact ID
join will silently drop every parcel where that join fails - which the
feasibility slide already admits will happen. So this always tries the
clean path first, and only falls back to spatial matching when it must,
and it tells you which path it took.
"""
from shapely.geometry import Polygon

# Below this overlap fraction, we refuse to guess - the parcel goes to a
# human as "no confident match" rather than being silently matched to the
# wrong record. This is a real design choice: a wrong record match would
# produce a bill/notice referencing the wrong plot, which is worse than an
# unmatched flag that a human has to look up manually.
MIN_OVERLAP_FRACTION_FOR_FALLBACK_MATCH = 0.5


def match_by_khasra(building, parcels):
    for parcel in parcels:
        if parcel["khasra"] == building["khasra_detected"]:
            return parcel, "exact_khasra_match"
    return None, None


def match_by_overlap(building, parcels):
    """
    Fallback used only when the exact khasra join fails. Finds the parcel
    whose sanctioned-plan geometry overlaps most with the detected baseline
    footprint, and only accepts it if the overlap clears a minimum
    fraction of the building's own area - a small sliver of overlap with
    a neighbouring parcel should not count as a match.
    """
    building_poly = Polygon(building["baseline_polygon"])
    building_area = building_poly.area
    if building_area == 0:
        return None, None

    best_parcel = None
    best_fraction = 0.0
    for parcel in parcels:
        plan_poly = Polygon(parcel["plan_geometry"])
        overlap = building_poly.intersection(plan_poly).area
        fraction = overlap / building_area
        if fraction > best_fraction:
            best_fraction = fraction
            best_parcel = parcel

    if best_parcel is not None and best_fraction >= MIN_OVERLAP_FRACTION_FOR_FALLBACK_MATCH:
        return best_parcel, "overlap_fallback_match"
    return None, None


def match_record(building, parcels):
    """
    Returns (parcel_or_None, match_type, match_quality) where match_quality
    is a 0-1 score used later by the confidence formula - an exact khasra
    match is trusted more than an overlap-based guess, even a good one.
    """
    parcel, match_type = match_by_khasra(building, parcels)
    if parcel is not None:
        return parcel, match_type, 1.0

    parcel, match_type = match_by_overlap(building, parcels)
    if parcel is not None:
        # scale quality by how strong the overlap was, capped below an
        # exact match's quality of 1.0
        building_poly = Polygon(building["baseline_polygon"])
        plan_poly = Polygon(parcel["plan_geometry"])
        fraction = building_poly.intersection(plan_poly).area / building_poly.area
        quality = min(0.85, 0.5 + fraction * 0.4)
        return parcel, match_type, round(quality, 2)

    return None, "no_confident_match", 0.0
