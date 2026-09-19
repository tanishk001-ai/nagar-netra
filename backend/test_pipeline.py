"""
Validates the pipeline against the synthetic ground truth using the same
metrics the SIH deck's testing plan commits to: precision, recall, F1, and
a confusion matrix - not a single "accuracy" number, since most buildings
in any real ward are unchanged and accuracy is meaningless under that
class imbalance.

Run with: pytest test_pipeline.py -v -s
"""
import json
import pytest

from pipeline import run_pipeline


@pytest.fixture(scope="module")
def pipeline_output():
    results, buildings = run_pipeline(
        "data/synthetic_buildings.json", "data/synthetic_parcels.json"
    )
    truth_by_id = {b["plot_id"]: b["true_change"] for b in buildings}
    return results, truth_by_id


def test_confusion_matrix_and_metrics(pipeline_output):
    results, truth_by_id = pipeline_output

    tp = fp = fn = tn = 0
    false_positive_ids = []
    false_negative_ids = []

    for r in results:
        predicted = r["flagged"]
        actual = truth_by_id[r["plot_id"]]
        if predicted and actual:
            tp += 1
        elif predicted and not actual:
            fp += 1
            false_positive_ids.append(r["plot_id"])
        elif not predicted and actual:
            fn += 1
            false_negative_ids.append(r["plot_id"])
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    print("\n" + "=" * 60)
    print("CONFUSION MATRIX (synthetic validation set, N=24)")
    print("=" * 60)
    print(f"  True positives  (real change, correctly flagged):   {tp}")
    print(f"  False positives (no real change, wrongly flagged):  {fp}  {false_positive_ids}")
    print(f"  False negatives (real change, missed):              {fn}  {false_negative_ids}")
    print(f"  True negatives  (no change, correctly not flagged): {tn}")
    print("-" * 60)
    print(f"  Precision: {precision:.3f}")
    print(f"  Recall:    {recall:.3f}")
    print(f"  F1:        {f1:.3f}")
    print("=" * 60)

    # These thresholds are deliberately not 1.0 - a synthetic test set this
    # small should not be over-fit to. The assertions document the actual
    # observed floor so a future change to the noise threshold or weights
    # that regresses recall gets caught.
    assert recall >= 0.9, "missed too many real changes - noise floor or weights likely too strict"
    assert precision >= 0.85, "flagging too many false positives - noise floor likely too loose"


def test_noise_floor_rejects_pure_jitter():
    """A building whose two footprints are identical (0 real change) must
    never be flagged, regardless of any other factor."""
    from geometry import compute_change

    square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    result = compute_change(square, square)
    assert result["excess_area_sqm"] == 0
    assert result["above_noise_floor"] is False


def test_fallback_matching_requires_minimum_overlap():
    """A building with no khasra match and negligible geometric overlap
    with any parcel must return no match, not a bad guess."""
    from matching import match_record

    building = {
        "khasra_detected": "NO-SUCH-KHASRA",
        "baseline_polygon": [[1000, 1000], [1010, 1000], [1010, 1010], [1000, 1010], [1000, 1000]],
    }
    parcels = [
        {
            "khasra": "225/1",
            "plan_geometry": [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        }
    ]
    parcel, match_type, quality = match_record(building, parcels)
    assert parcel is None
    assert match_type == "no_confident_match"
    assert quality == 0.0


def test_already_reassessed_parcel_is_suppressed():
    """If the tax roll already reflects the detected area, the pipeline
    should not re-flag it, per the tax-roll cross-check design."""
    from pipeline import process_building

    building = {
        "plot_id": "TEST-001",
        "khasra_detected": "225/1",
        "baseline_polygon": [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        "current_polygon": [[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]],
        "seg_confidence_baseline": 0.9,
        "seg_confidence_current": 0.9,
        "temporal_passes": 2,
        "registration_residual_m": 0.2,
    }
    parcel = {
        "khasra": "225/1",
        "plan_geometry": [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        "sanctioned_built_up_area_sqm": 100.0,
        "tax_assessed_area_sqm": 195.0,  # already updated close to the new 200 sqm
        "already_reassessed": True,
    }
    result = process_building(building, [parcel])
    assert result["flagged"] is False
    assert result["reason"] == "already_reassessed_on_tax_roll"


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v", "-s"]))
