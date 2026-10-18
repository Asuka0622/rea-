"""Audit delivery manifest paths, runtime image sizes, alpha and status vocabulary."""

from __future__ import annotations

import csv
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[4]
MANIFEST = ROOT / "docs/art/delivery-2026-10-17.csv"
VALID_STATUS = {"候选", "待验收", "已验收", "已接入"}


def main() -> None:
    with MANIFEST.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    missing: list[str] = []
    bad_status: list[str] = []
    bad_dimensions: list[str] = []
    bad_alpha: list[str] = []
    for row in rows:
        for key in ("source_file", "target_file"):
            value = (row.get(key) or "").strip()
            if value and not (ROOT / value).is_file():
                missing.append(f"{row['asset_id']} {key}: {value}")
        if row.get("status") not in VALID_STATUS:
            bad_status.append(f"{row['asset_id']}: {row.get('status')}")
        target = ROOT / (row.get("target_file") or "")
        if not target.is_file() or target.suffix.lower() not in {".png", ".webp", ".jpg", ".jpeg"}:
            continue
        try:
            with Image.open(target) as im:
                width, height = row.get("width", "").strip(), row.get("height", "").strip()
                if width and height and (im.width != int(width) or im.height != int(height)):
                    bad_dimensions.append(f"{row['asset_id']}: manifest {width}x{height}, file {im.width}x{im.height}")
                if row.get("alpha") == "是":
                    alpha = im.getchannel("A") if "A" in im.getbands() else None
                    if alpha is None or alpha.getextrema()[0] == 255:
                        bad_alpha.append(f"{row['asset_id']}: marked transparent but alpha is absent/fully opaque")
                if row.get("alpha") == "否" and "A" in im.getbands() and im.getchannel("A").getextrema()[0] < 255:
                    bad_alpha.append(f"{row['asset_id']}: marked opaque but has transparent pixels")
        except Exception as exc:  # pragma: no cover - diagnostic output
            bad_dimensions.append(f"{row['asset_id']}: could not read {target}: {exc}")
    print(f"rows={len(rows)}")
    print(f"missing_paths={len(missing)}")
    print(f"bad_status={len(bad_status)}")
    print(f"bad_dimensions={len(bad_dimensions)}")
    print(f"bad_alpha={len(bad_alpha)}")
    for group in (missing, bad_status, bad_dimensions, bad_alpha):
        for item in group[:100]:
            print(item)


if __name__ == "__main__":
    main()
