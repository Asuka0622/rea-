"""Normalize the Victorian salon guest atlas into a compact idle sprite sheet."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
SOURCE = Path(r"C:/Users/Administrator/.codex/generated_images/01a1486d-887a-7011-9b98-71621b1a8c9c/exec-24e643cf-4499-4d3c-9cfb-c1f396e4a03d.png")
ATLAS = ROOT / "docs/art/review/sources/anim-guests-atlas-source.png"
SOURCES = ROOT / "docs/art/review/sources"
ANIM_DIR = ROOT / "public/art/pixel/anim"
FRAME = (64, 96)
GUESTS = ["burgundy-gown", "olive-frock", "navy-waistcoat", "teal-cape"]


def clean_fringe(im: Image.Image) -> Image.Image:
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 190 and r > g * 1.4 and r > b * 1.18:
                px[x, y] = (r, g, b, 0)
    return im


def main() -> None:
    SOURCES.mkdir(parents=True, exist_ok=True)
    ANIM_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, ATLAS)
    with Image.open(SOURCE) as im:
        im = im.convert("RGBA")
        x_edges = [round(i * im.width / 4) for i in range(5)]
        y_mid = 643
        cells: list[list[Image.Image]] = []
        for col in range(4):
            pair = []
            for top, bottom in ((0, y_mid), (y_mid, im.height)):
                crop = im.crop((x_edges[col], top, x_edges[col + 1], bottom))
                crop = clean_fringe(crop)
                # Preserve the full silhouette; center narrower clothes in the 64px logical cell.
                scaled = crop.convert("RGBa").resize(FRAME, Image.Resampling.LANCZOS).convert("RGBA")
                pair.append(scaled)
            cells.append(pair)

    sheet = Image.new("RGBA", (FRAME[0] * 2, FRAME[1] * len(GUESTS)), (0, 0, 0, 0))
    for guest_index, pair in enumerate(cells):
        for frame_index, frame in enumerate(pair):
            sheet.alpha_composite(frame, (frame_index * FRAME[0], guest_index * FRAME[1]))
    sheet.save(SOURCES / "anim-guests-source.png", optimize=True)
    sheet.save(ANIM_DIR / "anim-guests.png", optimize=True)

    animations = {f"{name}-idle": {"row": row, "frames": 2, "ms": 520} for row, name in enumerate(GUESTS)}
    metadata = {
        "character": "salon-guests",
        "frame": list(FRAME),
        "sheet": [sheet.width, sheet.height],
        "layout": "4 guest rows; each row contains two idle frames",
        "resample": "nearest",
        "defaultFacing": "down",
        "guests": GUESTS,
        "animations": animations,
        "source": "4 columns x 2 vertically stacked poses in generated atlas; source in docs/art/review/sources/anim-guests-atlas-source.png",
    }
    (ANIM_DIR / "anim-guests.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    preview = Image.new("RGB", (4 * 256 + 20, 4 * 400 + 20), (42, 48, 59))
    draw = ImageDraw.Draw(preview)
    for guest_index, pair in enumerate(cells):
        for frame_index, frame in enumerate(pair):
            large = frame.resize((256, 384), Image.Resampling.NEAREST)
            x = frame_index * 256 + 8
            y = guest_index * 400 + 8
            preview.paste(large, (x, y), large)
        draw.text((520, guest_index * 400 + 12), GUESTS[guest_index], fill=(255, 255, 255))
    preview.save(ROOT / "docs/art/review/anim-guests-contact.png", optimize=True)


if __name__ == "__main__":
    main()
