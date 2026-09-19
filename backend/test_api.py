"""
API-level test for the FastAPI wrapper. Doesn't re-test the engine itself
(that's test_pipeline.py's job) - just checks the HTTP layer serves what
the engine actually computed, in the shape the frontend expects.

Run with: pytest test_api.py -v
"""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_list_flags_shape_and_mix():
    resp = client.get("/api/flags")
    assert resp.status_code == 200
    flags = resp.json()

    assert len(flags) == 19

    flagged = [f for f in flags if f["flagged"]]
    not_flagged = [f for f in flags if not f["flagged"]]
    assert len(flagged) >= 1, "expected at least one flagged result"
    assert len(not_flagged) >= 1, "expected at least one non-flagged result"

    sample = flagged[0]
    for key in ["plot_id", "ward_id", "khasra_no", "owner_name", "address",
                "excess_area_sqm", "confidence_pct", "match_type", "status"]:
        assert key in sample

    # the two documented non-flag behaviours must both be present
    reasons = {f["plot_id"]: f["reason"] for f in not_flagged}
    assert "change_below_noise_floor" in reasons.values()
    assert "already_reassessed_on_tax_roll" in reasons.values()


def test_flag_detail_has_real_confidence_factors():
    resp = client.get("/api/flags")
    flagged_id = next(f["plot_id"] for f in resp.json() if f["flagged"])

    detail = client.get(f"/api/flags/{flagged_id}").json()
    assert detail["confidence"]["factors"], "confidence factors should be non-empty"
    assert detail["geometry"]["excess_area_sqm"] == detail["excess_area_sqm"]
    assert detail["sanctioned_plan"] is not None
    assert detail["tax_record"] is not None


def test_unknown_plot_returns_404():
    resp = client.get("/api/flags/NOT-A-REAL-PLOT")
    assert resp.status_code == 404


def test_confirm_and_dismiss_update_status():
    resp = client.get("/api/flags")
    flagged_id = next(f["plot_id"] for f in resp.json() if f["flagged"])

    confirmed = client.post(f"/api/flags/{flagged_id}/confirm").json()
    assert confirmed["status"] == "confirmed"

    dismissed = client.post(f"/api/flags/{flagged_id}/dismiss").json()
    assert dismissed["status"] == "dismissed"

    # restore to pending so repeated test runs are idempotent
    client.post(f"/api/flags/{flagged_id}/review")


def test_cannot_confirm_a_non_flagged_plot():
    resp = client.get("/api/flags")
    not_flagged_id = next(f["plot_id"] for f in resp.json() if not f["flagged"])
    resp = client.post(f"/api/flags/{not_flagged_id}/confirm")
    assert resp.status_code == 400


def test_ward_map_returns_klr43_grid():
    resp = client.get("/api/ward/KLR-43/map")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["buildings"]) == 40
    assert body["counts"]["flagged"] + body["counts"]["compliant"] + body["counts"]["pending"] == 40


def test_ward_map_404_for_unmapped_ward():
    resp = client.get("/api/ward/AYN-51/map")
    assert resp.status_code == 404
