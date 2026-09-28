"""
Exports the exact JSON the FastAPI service returns, as static files, so the
frontend can be deployed to Vercel with no live backend at all.

Deliberately reuses main.py's own route functions rather than
reimplementing them, so the exported shapes are guaranteed identical to
what /api/flags, /api/flags/{id}, and /api/ward/{id}/map return today - if
main.py's response shape ever changes, this export changes with it instead
of silently drifting out of sync.

Writes:
  public/data/flags.json          - GET /api/flags
  public/data/flag/<plot_id>.json - GET /api/flags/<plot_id>, one per building
  public/data/ward-map.json       - GET /api/ward/KLR-43/map

Run with: python3 export_static.py
"""
import json
from pathlib import Path

import main as api

OUT_DIR = Path(__file__).parent.parent / "public" / "data"
FLAG_DIR = OUT_DIR / "flag"


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def main():
    flags = api.list_flags()
    write_json(OUT_DIR / "flags.json", flags)

    for plot_id in api.BUILDINGS_BY_ID:
        detail = api.flag_detail(plot_id)
        write_json(FLAG_DIR / f"{plot_id}.json", detail)

    ward_map = api.ward_map("KLR-43")
    write_json(OUT_DIR / "ward-map.json", ward_map)

    print(
        f"Exported {len(flags)} flags, {len(api.BUILDINGS_BY_ID)} detail files, "
        f"and ward-map.json to {OUT_DIR}"
    )


if __name__ == "__main__":
    main()
