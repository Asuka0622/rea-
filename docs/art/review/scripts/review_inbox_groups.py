"""Build focused reviews for seasonal regions and sprite candidates in art inbox."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "docs/art/review/inbox-index/inbox-index.json"
OUT = ROOT / "docs/art/review/inbox-index"


def load_index() -> dict[int, Path]:
    return {entry["index"]: Path(entry["file"]) for entry in json.loads(INDEX.read_text(encoding="utf-8"))}


def contact(name: str, groups: list[tuple[str, list[int]]], *, cols: int, cell: tuple[int, int], thumb: tuple[int, int]) -> None:
    files = load_index()
    cw, ch = cell
    tw, th = thumb
    pairs = [(f"{label} #{idx}", files[idx]) for label, ids in groups for idx in ids]
    rows = (len(pairs) + cols - 1) // cols
    image = Image.new("RGB", (cols * cw, rows * ch), (37, 42, 51))
    draw = ImageDraw.Draw(image)
    for i, (label, path) in enumerate(pairs):
        x, y = (i % cols) * cw, (i // cols) * ch
        with Image.open(path) as src:
            thumb_img = src.convert("RGBA")
            thumb_img.thumbnail((tw, th), Image.Resampling.LANCZOS)
            xx = x + (cw - thumb_img.width) // 2
            yy = y + 2 + (th - thumb_img.height) // 2
            image.paste(thumb_img, (xx, yy), thumb_img)
            dims = f"{src.width}x{src.height}"
        draw.text((x + 3, y + th + 4), f"{label} {dims}", fill=(255, 255, 255))
    image.save(OUT / name, quality=90)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    contact(
        "seasonal-maps-review.jpg",
        [
            ("autumn", list(range(48, 53))),
            ("summer", list(range(71, 76))),
            ("spring", list(range(86, 91))),
            ("winter", list(range(96, 101))),
        ],
        cols=5,
        cell=(250, 165),
        thumb=(240, 135),
    )
    review_region_order()
    contact(
        "sprite-candidates-review.jpg",
        [
            ("npc", list(range(108, 116))),
            ("animals", list(range(116, 125))),
            ("npc2", list(range(125, 133))),
            ("animals-alt", list(range(167, 173))),
            ("npc3", [140, 142, 143]),
            ("npc4", list(range(187, 202))),
        ],
        cols=6,
        cell=(235, 150),
        thumb=(220, 118),
    )


def review_region_order() -> None:
    files = load_index()
    regions = ["center", "homes", "craft", "north", "south"]
    autumn_sources = [48, 49, 50, 51, 52]
    cell_w, cell_h = 220, 155
    sheet = Image.new("RGB", (cell_w * 5, cell_h * 2), (37, 42, 51))
    draw = ImageDraw.Draw(sheet)
    for row, (label, paths) in enumerate(
        [("runtime", [ROOT / f"public/art/pixel/regions/town-{name}.png" for name in regions]), ("source", [files[i] for i in autumn_sources])]
    ):
        for col, (region, path) in enumerate(zip(regions, paths)):
            x, y = col * cell_w, row * cell_h
            with Image.open(path) as src:
                thumb = src.convert("RGBA")
                thumb.thumbnail((cell_w - 6, 124), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x + (cell_w - thumb.width) // 2, y + 2), thumb)
                number = f"#{autumn_sources[col]}" if row else ""
            draw.text((x + 5, y + 128), f"{label} {region} {number}", fill=(255, 255, 255))
    sheet.save(OUT / "autumn-region-order-review.jpg", quality=91)


if __name__ == "__main__":
    main()
