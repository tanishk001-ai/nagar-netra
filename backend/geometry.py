"""
Geometric change detection between a baseline and a current building
footprint polygon.

This is the piece that would, in production, run on polygons extracted by
a segmentation model from two dated imagery passes (see README for what's
real vs simulated here). Given two polygons, it answers: did the footprint
actually grow, and by how much, after accounting for the kind of small
shape wobble that segmentation and registration noise always introduces.
"""
from shapely.geometry import Polygon

# Below this, a detected "growth" is treated as segmentation/registration
# noise, not a real change. This threshold is a real engineering decision,
# not an arbitrary knob - it should be tuned against a validation set once
# real imagery is available, but some floor is necessary or every building
# gets flagged from noise alone.
MIN_REAL_CHANGE_SQM = 5.0


def to_polygon(coords):
    return Polygon(coords)


def compute_change(baseline_coords, current_coords):
    """
    Returns a dict describing the geometric relationship between the two
    footprints: areas, excess area, percentage growth, and whether the
    growth clears the noise floor.
    """
    baseline = to_polygon(baseline_coords)
    current = to_polygon(current_coords)

    baseline_area = baseline.area
    current_area = current.area

    # Symmetric difference isolates the parts that changed, rather than
    # just subtracting areas - this matters because a footprint can grow
    # on one side and shrink slightly on another (partial demolition +
    # extension), and a naive area subtraction would net those out and
    # hide a real change.
    diff_geom = baseline.symmetric_difference(current)
    changed_area = diff_geom.area

    excess_area = current_area - baseline_area
    pct_growth = (excess_area / baseline_area * 100) if baseline_area > 0 else 0.0

    # IoU (intersection over union) - standard remote-sensing metric for
    # how much the two polygons overlap. Low IoU with large excess area
    # suggests the "growth" might actually be a registration shift rather
    # than real new construction (the building moved, not grew) - this
    # feeds into the confidence score, not just a flag/no-flag decision.
    intersection = baseline.intersection(current).area
    union = baseline.union(current).area
    iou = intersection / union if union > 0 else 0.0

    is_above_noise_floor = changed_area >= MIN_REAL_CHANGE_SQM

    return {
        "baseline_area_sqm": round(baseline_area, 1),
        "current_area_sqm": round(current_area, 1),
        "excess_area_sqm": round(excess_area, 1),
        "pct_growth": round(pct_growth, 1),
        "changed_area_sqm": round(changed_area, 1),
        "iou": round(iou, 3),
        "above_noise_floor": is_above_noise_floor,
    }
