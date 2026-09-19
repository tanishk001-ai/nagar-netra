"""
Tiny JSON-backed store for the inspector workflow status (pending /
confirmed / dismissed) of each flagged plot.

This is deliberately separate from the engine: the engine decides whether
something IS a violation (flagged, excess area, confidence). Whether an
inspector has since confirmed or dismissed it is app state, not something
geometry.py/matching.py/confidence.py have any business computing. A JSON
file is enough for a prototype; a real deployment would put this in the
same database as the rest of the municipal workflow.
"""
import json
from pathlib import Path
from threading import Lock

STATE_PATH = Path(__file__).parent / "data" / "workflow_state.json"
_lock = Lock()


def load_state():
    if STATE_PATH.exists():
        with open(STATE_PATH) as f:
            return json.load(f)
    return {}


def save_state(state):
    with open(STATE_PATH, "w") as f:
        json.dump(state, f, indent=2)


def seed_if_missing(buildings):
    """On first run, seed workflow status from the bridge dataset's
    original mock status for buildings the engine actually flagged."""
    state = load_state()
    changed = False
    for b in buildings:
        if b["plot_id"] not in state:
            state[b["plot_id"]] = {
                "status": b.get("workflow_status", "pending"),
                "resolved_on": b.get("resolved_on"),
            }
            changed = True
    if changed:
        save_state(state)
    return state


def set_status(plot_id, status, today_iso):
    with _lock:
        state = load_state()
        if plot_id not in state:
            state[plot_id] = {"status": status, "resolved_on": None}
        state[plot_id]["status"] = status
        state[plot_id]["resolved_on"] = today_iso if status in ("confirmed", "dismissed") else None
        save_state(state)
        return state[plot_id]


def get_status(plot_id, state=None):
    state = state if state is not None else load_state()
    return state.get(plot_id, {"status": "pending", "resolved_on": None})
