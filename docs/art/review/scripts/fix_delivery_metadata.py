"""Correct legacy manifest dimensions and normalize the allowed status field."""

from __future__ import annotations

import csv
import io
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
MANIFEST = ROOT / "docs/art/delivery-2026-10-17.csv"
DIMENSIONS = {
    **{f"lumi-{face}-fullbody-source": (1086, 1448) for face in ("normal", "happy", "surprised", "thinking")},
    **{f"kobayashi-{face}-fullbody-source": (1086, 1448) for face in ("normal", "happy", "surprised")},
    "case-room-privacy-ledger": (1280, 720),
    "case-room-privacy-ledger-v3-candidate": (1280, 720),
    "case-room-privacy-ledger-v4-candidate": (1280, 720),
    "case-room-farm-save-candidate": (1280, 720),
    "case-room-calculator-eggs-candidate": (1280, 720),
    "case-room-farm-save-v2-candidate": (1280, 720),
    "case-room-calculator-eggs-v2-candidate": (1280, 720),
    "case-room-weather-keys": (1280, 720),
}


def main() -> None:
    raw = MANIFEST.read_bytes()
    had_bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig")
    lines = text.splitlines()
    changed = []
    for index, line in enumerate(lines[1:], start=2):
        row = next(csv.reader([line]))
        asset_id = row[0]
        if asset_id in DIMENSIONS:
            row[7], row[8] = map(str, DIMENSIONS[asset_id])
        if asset_id == "xiaoke-design-directions-v1":
            row[12] = "候选"
        if asset_id in DIMENSIONS or asset_id == "xiaoke-design-directions-v1":
            stream = io.StringIO()
            csv.writer(stream, lineterminator="").writerow(row)
            lines[index - 1] = stream.getvalue()
            changed.append(asset_id)
    output = "\n".join(lines) + "\n"
    MANIFEST.write_bytes((b"\xef\xbb\xbf" if had_bom else b"") + output.encode("utf-8"))
    print(f"updated={len(changed)}")


if __name__ == "__main__":
    main()
