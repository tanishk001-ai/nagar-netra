"""
Builds the dataset that bridges the frontend's identity data (plot IDs,
khasra numbers, owner names, wards, addresses - all already displayed in
the prototype UI) with the engine's real inputs (baseline/current
footprint polygons, segmentation confidence, registration residual,
temporal pass count).

The engine (geometry.py / matching.py / confidence.py / pipeline.py) is not
touched or duplicated here. This script only produces the JSON the FastAPI
service loads and runs through `pipeline.process_building` at startup.

Identity fields (plot_id, khasra, owner, ward, address, old sanctioned
area/tax figures used only as a *sizing guide*) are carried over from the
frontend's previous static mock (src/data/flags.js) by hand, listed below.
The polygons are new and let the real engine compute genuine excess area
and confidence - they are deliberately NOT reverse-engineered to reproduce
the old hardcoded numbers. Where they land is where they land.

Four of the nineteen are deliberately steered into the engine's four
documented behaviours, so the API always has a live example of each:

  - NN-2608-121 .. clean exact-khasra match                 (default path)
  - NN-2608-072 .. khasra mismatch -> spatial overlap fallback match
  - NN-2609-045 .. khasra mismatch -> spatial overlap fallback match
  - NN-2608-098 .. real growth, but already reassessed on the tax roll
                   -> suppressed, flagged=False
  - NN-2607-114 .. pure registration jitter, no real growth
                   -> correctly not flagged (below the noise floor)

Run with: python3 data/generate_bridge_dataset.py
"""
import json
import random
from pathlib import Path

OUT_DIR = Path(__file__).parent

AUTHORITY = "Bhopal Municipal Corporation — Town & Country Planning Dept."

# Identity + old display figures, carried over verbatim from
# src/data/flags.js RAW_FLAGS. `approved`/`excess` here are used only to
# size the generated polygons plausibly - not asserted as the answer.
IDENTITY = [
    dict(id='NN-2607-114', ward='KLR-43', khasra='214/2', owner='Ramnivas Patel', addr='H.No. 12-B, Metro Vihar Colony, Kolar Road', excess=18.4, old_confidence=0.612, status='pending', detected='2026-07-03', approved=78.5, floors=1, approvalDate='2015-03-12', approvalRef='TNCP/BPL/2015/0342', occ='Residential', tax=3240, taxYear=2021),
    dict(id='NN-2607-089', ward='AYN-51', khasra='76/1/A', owner='Nasira Khan', addr='9/3, Nehru Colony Lane, Ayodhya Nagar', excess=34.7, old_confidence=0.734, status='pending', detected='2026-07-09', approved=92.0, floors=2, approvalDate='2017-06-24', approvalRef='TNCP/BPL/2017/0819', occ='Residential', tax=4780, taxYear=2022),
    dict(id='NN-2607-156', ward='KLR-43', khasra='221/1', owner='Devendra Chouksey', addr='H.No. 27, Vrindavan Nagar Extension, Kolar Road', excess=42.9, old_confidence=0.881, status='confirmed', detected='2026-07-14', resolved='2026-09-15', approved=145.2, floors=2, approvalDate='2012-11-02', approvalRef='TNCP/BPL/2012/0156', occ='Mixed Use', tax=9650, taxYear=2023),
    dict(id='NN-2607-203', ward='BGS-38', khasra='58/4', owner='Sunita Rathore', addr='Plot 41, Bagsevania Main Road', excess=56.2, old_confidence=0.667, status='pending', detected='2026-07-18', approved=64.8, floors=1, approvalDate='2018-01-19', approvalRef='TNCP/BPL/2018/0623', occ='Residential', tax=2890, taxYear=2021),
    dict(id='NN-2607-231', ward='CNB-29', khasra='13/2/B', owner='Abdul Sattar Qureshi', addr='H.No. 63, Chuna Bhatti', excess=63.8, old_confidence=0.925, status='confirmed', detected='2026-07-22', resolved='2026-08-30', approved=188.6, floors=3, approvalDate='2011-08-07', approvalRef='TNCP/BPL/2011/0071', occ='Commercial', tax=14200, taxYear=2024),
    dict(id='NN-2608-047', ward='KLR-43', khasra='198/3', owner='Manoj Vishwakarma', addr='H.No. 5, Gautam Nagar, Kolar Road', excess=71.4, old_confidence=0.583, status='pending', detected='2026-07-27', approved=71.3, floors=1, approvalDate='2016-04-30', approvalRef='TNCP/BPL/2016/0498', occ='Residential', tax=3510, taxYear=2022),
    dict(id='NN-2608-072', ward='BGM-60', khasra='9/1', owner='Kavita Dubey', addr='Sector 4, Bagmugaliya Extension', excess=84.6, old_confidence=0.799, status='pending', detected='2026-08-02', approved=110.4, floors=2, approvalDate='2019-09-15', approvalRef='TNCP/BPL/2019/0937', occ='Residential', tax=6420, taxYear=2023),
    dict(id='NN-2608-098', ward='SHP-17', khasra='32/2/C', owner='Iqbal Ahmed Siddiqui', addr='E-14, Shahpura', excess=92.3, old_confidence=0.712, status='dismissed', detected='2026-08-05', resolved='2026-09-12', approved=96.7, floors=2, approvalDate='2014-02-27', approvalRef='TNCP/BPL/2014/0284', occ='Residential', tax=5180, taxYear=2021),
    dict(id='NN-2608-121', ward='KLR-43', khasra='207/5', owner='Rajni Malviya', addr='H.No. 33, Radha Krishna Colony, Kolar Road', excess=101.7, old_confidence=0.864, status='confirmed', detected='2026-08-09', resolved='2026-09-16', approved=134.9, floors=2, approvalDate='2017-12-05', approvalRef='TNCP/BPL/2017/0765', occ='Mixed Use', tax=8930, taxYear=2023),
    dict(id='NN-2608-145', ward='AYN-51', khasra='81/3', owner='Harpreet Singh Sodhi', addr='14/2, Ambedkar Marg, Ayodhya Nagar', excess=112.9, old_confidence=0.947, status='confirmed', detected='2026-08-12', resolved='2026-08-28', approved=205.3, floors=3, approvalDate='2010-05-21', approvalRef='TNCP/BPL/2010/0039', occ='Commercial', tax=15600, taxYear=2024),
    dict(id='NN-2608-167', ward='BGS-38', khasra='62/1', owner='Yogesh Sahu', addr='Plot 19, Bagsevania Main Road', excess=124.4, old_confidence=0.601, status='pending', detected='2026-08-15', approved=58.2, floors=1, approvalDate='2020-07-14', approvalRef='TNCP/BPL/2020/1042', occ='Residential', tax=2410, taxYear=2021),
    dict(id='NN-2608-189', ward='CNB-29', khasra='17/2', owner='Farha Sultana', addr='H.No. 22, Chuna Bhatti', excess=138.6, old_confidence=0.756, status='dismissed', detected='2026-08-19', resolved='2026-08-25', approved=122.6, floors=2, approvalDate='2013-10-09', approvalRef='TNCP/BPL/2013/0217', occ='Residential', tax=7260, taxYear=2022),
    dict(id='NN-2608-212', ward='KLR-43', khasra='230/1/A', owner='Om Prakash Tiwari', addr='H.No. 8, Shivalik Enclave, Kolar Road', excess=151.2, old_confidence=0.688, status='pending', detected='2026-08-22', approved=87.9, floors=1, approvalDate='2016-03-03', approvalRef='TNCP/BPL/2016/0361', occ='Residential', tax=4050, taxYear=2022),
    dict(id='NN-2608-234', ward='BGM-60', khasra='11/4', owner='Meena Kushwaha', addr='Sector 7, Bagmugaliya Extension', excess=167.8, old_confidence=0.833, status='pending', detected='2026-08-26', approved=159.4, floors=3, approvalDate='2009-09-18', approvalRef='TNCP/BPL/2009/0018', occ='Mixed Use', tax=11800, taxYear=2023),
    dict(id='NN-2608-256', ward='SHP-17', khasra='40/1', owner='Sanjay Namdev', addr='E-27, Shahpura', excess=179.3, old_confidence=0.905, status='confirmed', detected='2026-08-29', resolved='2026-09-10', approved=176.8, floors=3, approvalDate='2012-06-26', approvalRef='TNCP/BPL/2012/0509', occ='Residential', tax=12950, taxYear=2024),
    dict(id='NN-2609-021', ward='KLR-43', khasra='218/2', owner='Zeba Parveen', addr='H.No. 41, Vrindavan Nagar Extension, Kolar Road', excess=196.5, old_confidence=0.629, status='pending', detected='2026-09-02', approved=68.4, floors=1, approvalDate='2018-11-11', approvalRef='TNCP/BPL/2018/0872', occ='Residential', tax=3080, taxYear=2021),
    dict(id='NN-2609-045', ward='AYN-51', khasra='89/2/B', owner='Ashok Raikwar', addr='21/5, Nehru Colony Lane, Ayodhya Nagar', excess=214.7, old_confidence=0.771, status='dismissed', detected='2026-09-05', resolved='2026-09-11', approved=141.0, floors=2, approvalDate='2015-01-30', approvalRef='TNCP/BPL/2015/0193', occ='Residential', tax=7940, taxYear=2023),
    dict(id='NN-2609-067', ward='BGS-38', khasra='70/1', owner='Pushpa Bai Ahirwar', addr='Plot 55, Bagsevania Main Road', excess=233.1, old_confidence=0.958, status='confirmed', detected='2026-09-09', resolved='2026-09-16', approved=198.5, floors=3, approvalDate='2011-04-15', approvalRef='TNCP/BPL/2011/0126', occ='Commercial', tax=13400, taxYear=2024),
    dict(id='NN-2609-088', ward='KLR-43', khasra='225/3', owner='Naeem Khan', addr='H.No. 16, Gautam Nagar, Kolar Road', excess=258.9, old_confidence=0.694, status='pending', detected='2026-09-14', approved=103.6, floors=1, approvalDate='2019-05-08', approvalRef='TNCP/BPL/2019/0654', occ='Residential', tax=5760, taxYear=2022),
]

FALLBACK_MATCH_IDS = {'NN-2608-072', 'NN-2609-045'}
ALREADY_REASSESSED_ID = 'NN-2608-098'
NOISE_ONLY_ID = 'NN-2607-114'


def rect(x, y, w, h):
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]


def translate(coords, dx, dy):
    return [[round(x + dx, 3), round(y + dy, 3)] for x, y in coords]


def seeded(plot_id):
    return random.Random(f"bridge:{plot_id}")


buildings = []
parcels = []

for building_index, rec in enumerate(IDENTITY):
    rand = seeded(rec['id'])
    # Each building gets its own private patch of the coordinate plane
    # (500m apart - far larger than any footprint here). Without this,
    # every building's rectangle sits near the origin and the overlap
    # fallback's ward-wide search for the best-overlapping parcel can
    # wander onto a completely unrelated building's plan geometry just
    # because both happen to sit near (0, 0). Not a matching.py bug -
    # it's doing exactly what it should - but a fixture-placement one.
    ox = building_index * 500.0
    base_w = round((rec['approved'] * 1.35) ** 0.5, 2)
    base_h = round(rec['approved'] / base_w, 2)
    baseline = rect(ox, 0, base_w, base_h)

    # engine inputs loosely correlated with the old display confidence, so
    # a plot that used to look shaky still gets shakier inputs - but the
    # actual number is now computed by confidence.py, not asserted.
    seg_a = round(min(0.97, 0.62 + rec['old_confidence'] * 0.32 + rand.uniform(-0.03, 0.03)), 2)
    seg_b = round(min(0.97, 0.64 + rec['old_confidence'] * 0.32 + rand.uniform(-0.03, 0.03)), 2)
    residual = round(max(0.05, (1 - rec['old_confidence']) * 1.9 + rand.uniform(-0.15, 0.15)), 2)
    passes = 1 if rec['old_confidence'] < 0.65 else (2 if rec['old_confidence'] < 0.85 else 3)

    if rec['id'] == NOISE_ONLY_ID:
        # pure registration jitter: same footprint, shifted slightly, no
        # real size change -> symmetric-difference area stays under the
        # 5.0 sqm noise floor.
        current = translate(rect(ox, 0, base_w, base_h), 0.15, 0.05)
        khasra_detected = rec['khasra']
    elif rec['id'] in FALLBACK_MATCH_IDS:
        jitter = 0.85 + rand.uniform(0, 0.3)
        extra_w = round((rec['excess'] / base_h) * jitter, 2)
        current = rect(ox, 0, base_w + extra_w, base_h)
        khasra_detected = f"BAD-{rec['khasra'].replace('/', '-')}"
    else:
        jitter = 0.85 + rand.uniform(0, 0.3)
        extra_w = round((rec['excess'] / base_h) * jitter, 2)
        current = rect(ox, 0, base_w + extra_w, base_h)
        khasra_detected = rec['khasra']

    buildings.append({
        "plot_id": rec['id'],
        "khasra_detected": khasra_detected,
        "baseline_polygon": baseline,
        "current_polygon": current,
        "seg_confidence_baseline": seg_a,
        "seg_confidence_current": seg_b,
        "registration_residual_m": residual,
        "temporal_passes": passes,
        # identity/display fields - not read by the engine, carried through
        # for the API response.
        "ward_id": rec['ward'],
        "owner_name": rec['owner'],
        "address": rec['addr'],
        "detected_on": rec['detected'],
        "workflow_status": rec['status'],
        "resolved_on": rec.get('resolved'),
    })

    current_w = current[2][0] - current[0][0] if rec['id'] != NOISE_ONLY_ID else base_w
    current_area = round(current_w * base_h, 2) if rec['id'] != NOISE_ONLY_ID else round(base_w * base_h, 2)

    if rec['id'] in FALLBACK_MATCH_IDS:
        # correct khasra on file differs from what got detected at capture
        # time; the sanctioned-plan geometry overlaps most of the
        # building's own baseline footprint so the fallback match succeeds.
        plan_geometry = rect(ox - base_w * 0.08, 0, base_w * 0.92, base_h)
        parcels.append({
            "khasra": rec['khasra'],
            "plan_geometry": plan_geometry,
            "sanctioned_built_up_area_sqm": rec['approved'],
            "tax_assessed_area_sqm": rec['approved'],
            "already_reassessed": False,
            "approved_floors": rec['floors'],
            "approval_date": rec['approvalDate'],
            "approval_ref_no": rec['approvalRef'],
            "sanctioning_authority": AUTHORITY,
            "occupancy_type": rec['occ'],
            "annual_tax_rs": rec['tax'],
            "last_assessed_year": rec['taxYear'],
        })
    elif rec['id'] == ALREADY_REASSESSED_ID:
        assessed = round(current_area * 0.91, 1)  # within 15% of current -> suppressed
        parcels.append({
            "khasra": rec['khasra'],
            "plan_geometry": baseline,
            "sanctioned_built_up_area_sqm": rec['approved'],
            "tax_assessed_area_sqm": assessed,
            "already_reassessed": True,
            "approved_floors": rec['floors'],
            "approval_date": rec['approvalDate'],
            "approval_ref_no": rec['approvalRef'],
            "sanctioning_authority": AUTHORITY,
            "occupancy_type": rec['occ'],
            "annual_tax_rs": rec['tax'],
            "last_assessed_year": rec['taxYear'],
        })
    else:
        parcels.append({
            "khasra": rec['khasra'],
            "plan_geometry": baseline,
            "sanctioned_built_up_area_sqm": rec['approved'],
            "tax_assessed_area_sqm": rec['approved'],
            "already_reassessed": False,
            "approved_floors": rec['floors'],
            "approval_date": rec['approvalDate'],
            "approval_ref_no": rec['approvalRef'],
            "sanctioning_authority": AUTHORITY,
            "occupancy_type": rec['occ'],
            "annual_tax_rs": rec['tax'],
            "last_assessed_year": rec['taxYear'],
        })

with open(OUT_DIR / "bridge_buildings.json", "w") as f:
    json.dump(buildings, f, indent=2)
with open(OUT_DIR / "bridge_parcels.json", "w") as f:
    json.dump(parcels, f, indent=2)

print(f"Wrote {len(buildings)} buildings and {len(parcels)} parcels to {OUT_DIR}")
