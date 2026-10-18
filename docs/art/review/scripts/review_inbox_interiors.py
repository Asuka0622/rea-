"""Create a room-by-room review of the seasonal interior images in the art inbox."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "docs/art/review/inbox-index/inbox-index.json"
OUT = ROOT / "docs/art/review/inbox-index/interiors-review.jpg"
ROOMS = ["home", "learn", "engines", "clients", "doctor"]


def main() -> None:
    indexed = json.loads(INDEX.read_text(encoding="utf-8"))
    entries = []
    for room in ROOMS:
        entries.append((f"base {room}", ROOT / f"public/art/pixel/room-{room}.png"))
    for season, ids in (("summer", range(78, 86)), ("spring", range(91, 96)), ("winter", range(101, 106))):
        entries.extend((f"{season} #{i}", Path(indexed[i]["file"])) for i in ids)
    cols, cw, ch = 5, 200, 135
    rows = (len(entries) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cw, rows * ch), (37, 42, 51))
    draw = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(entries):
        x, y = (i % cols) * cw, (i // cols) * ch
        with Image.open(path) as source:
            thumb = source.convert("RGB")
            thumb.thumbnail((192, 108), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x + (cw - thumb.width) // 2, y + 2))
        draw.text((x + 4, y + 113), label, fill=(255, 255, 255))
    sheet.save(OUT, quality=91)


if __name__ == "__main__":
    main()
