"""Create aligned autumn rain overlays from each region's walk grid and base map."""

from __future__ import annotations

import json
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
REGIONS = ("center", "homes", "craft", "north", "south")
SIZE = (960, 540)
STEP = 4


def read_ground_mask(name: str) -> tuple[Image.Image, Image.Image]:
    map_path = ROOT / "public/art/pixel/regions" / f"town-{name}.png"
    walk_path = ROOT / "public/art/pixel/regions" / f"town-{name}-walk.json"
    art = Image.open(map_path).convert("RGB")
    data = json.loads(walk_path.read_text(encoding="utf-8"))
    rows = data["rows"]
    small = Image.new("L", (len(rows[0]), len(rows)), 0)
    small.putdata([255 if bit == "1" else 0 for row in rows for bit in row])
    walk = small.resize(SIZE, Image.Resampling.NEAREST)
    ground = Image.new("L", SIZE, 0)

    source = art.load()
    can_walk = walk.load()
    is_ground = ground.load()
    buildings = [front for front in data.get("fronts", []) if front.get("building")]

    for y in range(SIZE[1]):
        for x in range(SIZE[0]):
            if not can_walk[x, y]:
                continue
            if any(
                front["x"] - 20 <= x < front["x"] + front["w"] + 20
                and front["y"] - 20 <= y < front["y"] + front["h"] + 20
                for front in buildings
            ):
                continue
            red, green, blue = source[x, y]
            # The paths use warm ochre and sand tones; this rejects most foliage,
            # roof tiles, stone borders, and water while following the actual map.
            sand = (
                red >= 135
                and green >= 88
                and blue >= 38
                and 9 <= red - green <= 92
                and 18 <= green - blue <= 122
            )
            if sand:
                is_ground[x, y] = 255
    return art, ground


def make_layer(name: str) -> tuple[Image.Image, Image.Image]:
    _, ground = read_ground_mask(name)
    ground_data = ground.load()
    rng = random.Random(1843 + sum(ord(c) for c in name))
    candidates: list[tuple[int, int]] = []

    # A 28x16 patch with dense warm path pixels is a safe place for a puddle.
    for y in range(10, SIZE[1] - 24, 8):
        for x in range(16, SIZE[0] - 44, 8):
            hits = sum(
                ground_data[xx, yy] > 0
                for yy in range(y - 8, y + 8, STEP)
                for xx in range(x - 14, x + 14, STEP)
            )
            if hits >= 20:
                candidates.append((x, y))

    rng.shuffle(candidates)
    chosen: list[tuple[int, int]] = []
    for x, y in candidates:
        if any((x - px) ** 2 + (y - py) ** 2 < 32**2 for px, py in chosen):
            continue
        chosen.append((x, y))
        if len(chosen) >= 28:
            break

    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    puddle_mask = Image.new("L", SIZE, 0)
    draw = ImageDraw.Draw(puddle_mask)
    for x, y in chosen:
        width = rng.randrange(18, 37, STEP)
        height = rng.randrange(8, 17, STEP)
        # Blocky flattened ellipses keep the reflections within pixel-art texture.
        left, top = x - width // 2, y - height // 2
        right, bottom = left + width, top + height
        points = [
            (left + STEP, top),
            (right - STEP, top),
            (right, top + STEP),
            (right, bottom - STEP),
            (right - STEP, bottom),
            (left + STEP, bottom),
            (left, bottom - STEP),
            (left, top + STEP),
        ]
        draw.polygon(points, fill=255)

    puddle_mask = ImageChops.multiply(puddle_mask, ground)
    puddles = Image.new("RGBA", SIZE, (50, 96, 126, 0))
    puddles.putalpha(puddle_mask.point(lambda a: round(a * 0.28)))
    layer.alpha_composite(puddles)

    highlight = Image.new("RGBA", SIZE, (178, 218, 218, 0))
    hmask = Image.new("L", SIZE, 0)
    hd = ImageDraw.Draw(hmask)
    for x, y in chosen:
        w = rng.randrange(8, 19, STEP)
        hd.rectangle((x - w // 2, y - 1, x + w // 2, y + 1), fill=255)
        if rng.random() < 0.45:
            hd.rectangle((x + 2, y + 4, x + 8, y + 5), fill=210)
    hmask = ImageChops.multiply(hmask, puddle_mask)
    highlight.putalpha(hmask.point(lambda a: round(a * 0.42)))
    layer.alpha_composite(highlight)

    preview = Image.open(ROOT / "public/art/pixel/regions" / f"town-{name}.png").convert("RGBA")
    preview.alpha_composite(layer)
    return layer, preview.convert("RGB")


def main() -> None:
    source_dir = ROOT / "docs/art/review/sources"
    review_dir = ROOT / "docs/art/review/wet"
    runtime_dir = ROOT / "public/art/pixel/regions"
    for folder in (source_dir, review_dir, runtime_dir):
        folder.mkdir(parents=True, exist_ok=True)

    contact = Image.new("RGB", (960, 810), (30, 34, 40))
    draw = ImageDraw.Draw(contact)
    for index, name in enumerate(REGIONS):
        layer, preview = make_layer(name)
        filename = f"town-{name}-wet.png"
        layer.save(source_dir / f"{filename[:-4]}-source.png", optimize=True)
        layer.save(runtime_dir / filename, optimize=True)
        thumb = preview.resize((480, 270), Image.Resampling.LANCZOS)
        x, y = (index % 2) * 480, (index // 2) * 270
        contact.paste(thumb, (x, y))
        draw.text((x + 8, y + 8), f"{name} · wet overlay", fill="white")
    contact.save(review_dir / "town-wet-contact.png")


if __name__ == "__main__":
    main()
