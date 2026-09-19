"""
Combines four independent signals into a single confidence score for a
flagged change.

Deliberately a transparent weighted formula, not a trained classifier -
every component here can be shown to an inspector as a reason, the way the
prototype's "confidence factors" panel already does. A trained model could
likely score higher on paper, but it would need labelled training data we
don't have yet, and it would turn "why was this flagged" into a question
we couldn't answer, which is the one thing this system is explicitly
designed not to do.

Weights are a starting judgement call, not a measured optimum - the README
says so, and they are the first thing to revisit once real flagged/
dismissed outcomes exist to check them against.
"""

WEIGHTS = {
    "segmentation": 0.30,
    "registration": 0.25,
    "record_match": 0.25,
    "temporal": 0.20,
}


def segmentation_score(building):
    """Mean of the segmentation model's own confidence on both dates -
    a low score here means the model itself wasn't sure it saw a building
    outline at all, let alone a changed one."""
    return (building["seg_confidence_baseline"] + building["seg_confidence_current"]) / 2


def registration_score(building):
    """Converts a registration residual (metres of misalignment between
    the two imagery passes near this building) into a 0-1 score. Above
    2m of residual, we treat alignment as having failed entirely - at
    that point apparent 'growth' is at least as likely to be misregistration
    as real construction, per the geometry module's IoU check."""
    residual = building["registration_residual_m"]
    if residual >= 2.0:
        return 0.0
    return max(0.0, 1.0 - residual / 2.0)


def temporal_score(building):
    """A change seen on only one imagery pass could be a one-off artefact
    (cloud shadow, a parked truck, a temporary shamiana). A change that
    persists across multiple passes is much less likely to be noise."""
    passes = building["temporal_passes"]
    if passes <= 1:
        return 0.4
    elif passes == 2:
        return 0.75
    else:
        return 1.0


def compute_confidence(building, match_quality, geometry_result):
    """
    Returns the overall confidence (0-100) plus the per-factor breakdown,
    so the caller can render the same kind of plain-language explanation
    the prototype UI already shows.
    """
    seg = segmentation_score(building)
    reg = registration_score(building)
    temporal = temporal_score(building)
    record = match_quality

    overall = (
        seg * WEIGHTS["segmentation"]
        + reg * WEIGHTS["registration"]
        + record * WEIGHTS["record_match"]
        + temporal * WEIGHTS["temporal"]
    )

    factors = []
    factors.append(
        f"Detected outline holds {seg*100:.0f}% average segmentation confidence "
        f"across both imagery dates."
    )
    if reg < 0.7:
        factors.append(
            f"Registration residual of {building['registration_residual_m']:.1f}m "
            f"between passes is high enough to soften confidence on this parcel."
        )
    else:
        factors.append(
            f"Imagery passes align within {building['registration_residual_m']:.1f}m, "
            f"a tight registration."
        )
    if record >= 1.0:
        factors.append("Matched to its sanctioned-plan record by exact khasra number.")
    elif record > 0:
        factors.append(
            f"No exact khasra match on file - matched by spatial overlap instead "
            f"(match quality {record:.2f}), which is inherently less certain."
        )
    else:
        factors.append("No confident parcel match found - held for manual lookup.")
    if temporal < 1.0:
        factors.append(
            f"Change observed on {building['temporal_passes']} imagery pass"
            f"{'es' if building['temporal_passes'] != 1 else ''} so far; "
            f"confidence would rise if it persists into the next cycle."
        )
    else:
        factors.append("Change persists across multiple imagery passes.")

    return {
        "confidence_pct": round(overall * 100, 1),
        "segmentation_score": round(seg, 2),
        "registration_score": round(reg, 2),
        "record_match_score": round(record, 2),
        "temporal_score": round(temporal, 2),
        "factors": factors,
    }
