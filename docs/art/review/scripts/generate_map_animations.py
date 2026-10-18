"""Draw the current-world P2 map animation sprite strips in Bitetown's pixel palette."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
TARGET_DIR = ROOT / "public/art/pixel/anim"
SOURCE_DIR = ROOT / "docs/art/review/sources"
PREVIEW_DIR = ROOT / "docs/art/review/map-animations"

INK = (37, 49, 59, 255)
INK_SOFT = (55, 66, 71, 255)
GOLD = (223, 159, 67, 255)
GOLD_LIGHT = (248, 218, 154, 255)
WOOD = (143, 88, 54, 255)
WOOD_LIGHT = (184, 123, 70, 255)
WATER = (73, 132, 158, 255)
WATER_LIGHT = (139, 203, 215, 255)
FOAM = (227, 245, 229, 245)
LEAF = (100, 143, 83, 255)
TEAL = (77, 143, 152, 255)
PLUM = (132, 91, 129, 255)
RED = (178, 83, 66, 255)
PALE = (238, 226, 195, 255)
GRAY = (184, 194, 194, 180)


def new(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def box(draw: ImageDraw.ImageDraw, xy, fill, outline=INK):
    draw.rectangle(xy, fill=fill, outline=outline)


def polygon(draw: ImageDraw.ImageDraw, points, fill, outline=INK):
    draw.polygon(points, fill=fill, outline=outline)


def fountain(frame: int) -> Image.Image:
    im, d = new((48, 48))
    heights = (13, 20, 25, 18)
    top = 40 - heights[frame]
    d.line((24, 40, 24, top), fill=WATER_LIGHT, width=3)
    d.line((19, 40, 20 - frame % 2, top + 8), fill=WATER, width=2)
    d.line((28, 40, 27 + frame % 2, top + 7), fill=FOAM, width=2)
    splash_y = 39
    for x, y in ((13, splash_y - 2), (17, splash_y), (31, splash_y), (35, splash_y - 2)):
        d.rectangle((x, y, x + (frame % 2), y + 1), fill=WATER_LIGHT)
    for x, y in ((16, 32 - frame % 2), (32, 30 + frame % 2), (21, top + 2), (27, top + 4)):
        d.rectangle((x, y, x + 1, y + 1), fill=FOAM)
    return im


def waterwheel(frame: int) -> Image.Image:
    im, d = new((64, 64))
    cx, cy, radius = 32, 30, 22
    d.ellipse((cx - radius - 3, cy - radius - 3, cx + radius + 3, cy + radius + 3), outline=INK, width=3)
    d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=WOOD_LIGHT, width=4)
    angle = frame * math.pi / 8
    for spoke in range(8):
        theta = angle + spoke * math.pi / 4
        ex = round(cx + math.cos(theta) * (radius - 2))
        ey = round(cy + math.sin(theta) * (radius - 2))
        d.line((cx, cy, ex, ey), fill=WOOD_LIGHT, width=3)
        paddle_x = round(cx + math.cos(theta) * (radius - 7))
        paddle_y = round(cy + math.sin(theta) * (radius - 7))
        d.rectangle((paddle_x - 3, paddle_y - 2, paddle_x + 3, paddle_y + 2), fill=WOOD, outline=INK)
    d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=GOLD, outline=INK, width=2)
    drip_x = 18 + frame * 7
    d.line((drip_x, 54, drip_x + 1, 59), fill=WATER_LIGHT, width=2)
    d.rectangle((drip_x, 60, drip_x + 1, 61), fill=FOAM)
    return im


def smoke(frame: int) -> Image.Image:
    im, d = new((32, 64))
    center_x = 15 + ((frame % 3) - 1) * 2
    base_y = 56 - frame * 5
    sizes = ((7, 5), (9, 6), (11, 7))
    for i, (w, h) in enumerate(sizes):
        y = base_y - i * 11
        x = center_x + (i - 1) * (1 + frame % 2)
        alpha = max(55, 158 - i * 36 - frame * 5)
        color = (190, 199, 197, alpha)
        d.ellipse((x - w // 2, y - h // 2, x + w // 2, y + h // 2), fill=color)
        d.rectangle((x - w // 2 + 2, y - 1, x + w // 2 - 2, y + 1), fill=(206, 211, 202, max(40, alpha - 20)))
    return im


def flag(frame: int) -> Image.Image:
    im, d = new((48, 32))
    d.line((10, 3, 10, 29), fill=WOOD, width=3)
    d.rectangle((7, 28, 14, 30), fill=INK_SOFT)
    folds = [0, 2, 1, -1]
    f = folds[frame]
    polygon(d, [(12, 5), (34, 6 + f), (29, 12 + f), (35, 17 + f), (12, 15)], RED, INK)
    d.line((13, 8, 28, 9 + f), fill=GOLD_LIGHT, width=1)
    return im


def fish(frame: int) -> Image.Image:
    im, d = new((48, 32))
    if frame < 5:
        ys = (22, 14, 7, 5, 13)
        x = (12, 15, 18, 22, 28)[frame]
        y = ys[frame]
        flip = frame in (3, 4)
        body = (x - 7, y - 4, x + 7, y + 4)
        d.ellipse(body, fill=GOLD, outline=INK, width=1)
        tail = [(x - 7, y), (x - 12, y - 5), (x - 12, y + 5)] if not flip else [(x + 7, y), (x + 12, y - 5), (x + 12, y + 5)]
        polygon(d, tail, RED, INK)
        eye_x = x + 3 if not flip else x - 3
        d.point((eye_x, y - 1), fill=INK)
        if frame in (2, 3):
            d.rectangle((x - 13, 26, x - 11, 27), fill=WATER_LIGHT)
            d.rectangle((x + 12, 24, x + 14, 25), fill=FOAM)
    else:
        d.arc((13, 18, 35, 29), 190, 350, fill=WATER_LIGHT, width=2)
        d.arc((18, 21, 30, 28), 190, 350, fill=FOAM, width=1)
        d.rectangle((23, 17, 24, 18), fill=FOAM)
    return im


def ripple(frame: int) -> Image.Image:
    im, d = new((48, 24))
    sizes = ((7, 3), (12, 5), (17, 7), (20, 8))
    w, h = sizes[frame]
    color = (139, 203, 215, 220 - frame * 35)
    d.ellipse((24 - w, 12 - h, 24 + w, 12 + h), outline=color, width=1)
    if frame < 3:
        d.arc((24 - w + 3, 12 - h + 1, 24 + w - 3, 12 + h - 1), 195, 345, fill=(227, 245, 229, 170 - frame * 35), width=1)
    return im


def laundry(frame: int) -> Image.Image:
    im, d = new((80, 48))
    d.line((4, 8, 76, 8), fill=INK, width=1)
    d.line((5, 7, 75, 7), fill=PALE, width=1)
    cloth_y = (12, 13, 14, 13)[frame]
    sway = (0, 1, -1, 0)[frame]
    clothes = [
        (12, cloth_y, 26, cloth_y + 27, RED),
        (33, cloth_y + sway, 48, cloth_y + 24, TEAL),
        (55, cloth_y, 68, cloth_y + 25, GOLD),
    ]
    for x0, y0, x1, y1, color in clothes:
        d.line((x0 + 6, 8, x0 + 6 + sway, y0), fill=WOOD, width=1)
        polygon(d, [(x0 + sway, y0), (x1 + sway, y0), (x1, y1 - 4), (x1 - 3, y1), (x0 + 3, y1), (x0, y1 - 4)], color, INK)
        d.line((x0 + 3, y0 + 4, x1 - 3, y0 + 4), fill=GOLD_LIGHT, width=1)
    return im


def windvane(frame: int) -> Image.Image:
    im, d = new((32, 32))
    d.line((16, 10, 16, 29), fill=WOOD, width=2)
    d.ellipse((13, 27, 19, 31), fill=INK_SOFT)
    angles = (0, 45, 90, 135)
    theta = math.radians(angles[frame])
    cx, cy = 16, 9
    dx, dy = round(math.cos(theta) * 11), round(math.sin(theta) * 8)
    ex, ey = cx + dx, cy - dy
    d.line((cx - dx, cy + dy, ex, ey), fill=INK, width=3)
    d.line((cx - dx, cy + dy, ex, ey), fill=GOLD, width=1)
    perp = (-dy // 2, dx // 2)
    polygon(d, [(ex, ey), (ex - dx // 2 + perp[0], ey + dy // 2 + perp[1]), (ex - dx // 2 - perp[0], ey + dy // 2 - perp[1])], RED, INK)
    d.ellipse((13, 6, 19, 12), fill=GOLD_LIGHT, outline=INK)
    return im


def scarecrow(frame: int) -> Image.Image:
    im, d = new((48, 80))
    sway = (0, 1)[frame]
    d.line((24, 27, 24, 72), fill=WOOD, width=4)
    d.line((10, 38, 38, 38), fill=WOOD_LIGHT, width=4)
    box(d, (17, 29, 31, 43), (167, 116, 67, 255))
    polygon(d, [(12, 39), (36, 39), (32 + sway, 59), (16 + sway, 59)], TEAL, INK)
    d.rectangle((14, 57, 33, 61), fill=WOOD, outline=INK)
    d.line((17, 45, 11 - sway, 53), fill=PALE, width=3)
    d.line((31, 45, 37 + sway, 52), fill=PALE, width=3)
    d.line((12 - sway, 53, 8 - sway, 50), fill=GOLD, width=2)
    d.line((37 + sway, 52, 41 + sway, 48), fill=RED, width=2)
    polygon(d, [(9, 27), (18, 18), (31, 18), (40, 27), (38, 30), (11, 30)], WOOD, INK)
    d.line((23, 21, 25, 25), fill=PALE, width=1)
    d.rectangle((18, 33, 20, 35), fill=INK)
    d.rectangle((28, 33, 30, 35), fill=INK)
    return im


GLYPHS = {
    "P": ["110", "101", "110", "100", "100"],
    "L": ["100", "100", "100", "100", "111"],
    "A": ["010", "101", "111", "101", "101"],
    "Y": ["101", "101", "010", "010", "010"],
}


def neon(frame: int) -> Image.Image:
    im, d = new((96, 40))
    accents = (TEAL, PLUM, GOLD, RED)
    accent = accents[frame]
    d.rectangle((2, 4, 93, 36), fill=(38, 47, 63, 255), outline=INK, width=3)
    d.rectangle((6, 8, 89, 32), outline=accent, width=2)
    if frame != 2:
        scale, gap = 3, 4
        word_w = 4 * 3 * scale + 3 * gap
        x_start = (96 - word_w) // 2
        for letter_index, letter in enumerate("PLAY"):
            color = accents[(frame + letter_index) % len(accents)]
            for gy, glyph_row in enumerate(GLYPHS[letter]):
                for gx, bit in enumerate(glyph_row):
                    if bit == "1":
                        x = x_start + letter_index * (3 * scale + gap) + gx * scale
                        y = 12 + gy * 3
                        d.rectangle((x, y, x + scale - 1, y + 2), fill=color)
    for x, y in ((10, 11), (85, 10), (10, 29), (85, 29)):
        d.rectangle((x, y, x + 1, y + 1), fill=GOLD_LIGHT)
    return im


def sawdust(frame: int) -> Image.Image:
    im, d = new((48, 32))
    points = [
        [(8, 24), (13, 17), (16, 22), (12, 25)],
        [(15, 19), (18, 11), (22, 16), (19, 21)],
        [(24, 17), (27, 9), (31, 14), (28, 19)],
        [(33, 22), (36, 15), (40, 19), (37, 23)],
    ]
    colors = (GOLD_LIGHT, WOOD_LIGHT, PALE, GOLD)
    for index, poly in enumerate(points):
        dx = (frame * (index + 1)) % 5 - 2
        dy = ((frame + index * 2) % 4) - 1
        polygon(d, [(x + dx, y - dy) for x, y in poly], colors[index], WOOD)
    d.rectangle((4 + frame * 2, 27, 7 + frame * 2, 28), fill=WOOD_LIGHT)
    return im


def pendulum(frame: int) -> Image.Image:
    im, d = new((48, 64))
    d.rectangle((16, 3, 32, 8), fill=WOOD, outline=INK)
    d.ellipse((21, 7, 27, 13), fill=GOLD_LIGHT, outline=INK)
    angle = (-0.28, -0.12, 0.12, 0.28)[frame]
    px, py = 24, 11
    bx, by = round(px + math.sin(angle) * 29), round(py + math.cos(angle) * 29)
    d.line((px, py, bx, by), fill=INK, width=4)
    d.line((px, py, bx, by), fill=GOLD, width=2)
    d.ellipse((bx - 7, by - 7, bx + 7, by + 7), fill=WOOD, outline=INK, width=2)
    d.ellipse((bx - 4, by - 4, bx + 4, by + 4), fill=GOLD, outline=INK)
    d.rectangle((bx - 1, by - 2, bx + 1, by + 2), fill=GOLD_LIGHT)
    return im


def boat(frame: int) -> Image.Image:
    im, d = new((80, 40))
    tilt = (0, 1, 0, -1)[frame]
    y = 22 + (0, -1, 0, 1)[frame]
    polygon(d, [(13, y), (68, y + tilt), (58, 32 + tilt), (24, 32), (16, 28)], WOOD, INK)
    d.line((20, y + 3, 62, y + 3 + tilt), fill=WOOD_LIGHT, width=2)
    d.line((25, y + 6, 56, y + 6 + tilt), fill=GOLD, width=1)
    d.rectangle((36, y - 7, 38, y), fill=WOOD, outline=INK)
    d.polygon([(38, y - 7), (53, y - 4), (39, y + 1)], fill=PALE, outline=INK)
    d.line((13, y - 1, 7, y - 4), fill=GOLD_LIGHT, width=2)
    d.arc((4, y - 10, 17, y + 2), 50, 300, fill=GOLD_LIGHT, width=2)
    return im


ANIMATIONS: dict[str, tuple[tuple[int, int], int, int, Callable[[int], Image.Image]]] = {
    "center-fountain": ((48, 48), 4, 220, fountain),
    "center-waterwheel": ((64, 64), 4, 250, waterwheel),
    "center-smoke": ((32, 64), 6, 440, smoke),
    "center-flag": ((48, 32), 4, 240, flag),
    "river-fish": ((48, 32), 6, 250, fish),
    "river-ripple": ((48, 24), 4, 360, ripple),
    "homes-laundry": ((80, 48), 4, 280, laundry),
    "homes-windvane": ((32, 32), 4, 250, windvane),
    "homes-scarecrow": ((48, 80), 2, 420, scarecrow),
    "craft-neon": ((96, 40), 4, 240, neon),
    "craft-sawdust": ((48, 32), 4, 190, sawdust),
    "north-clock-pendulum": ((48, 64), 4, 320, pendulum),
    "south-pier-boat": ((80, 40), 4, 420, boat),
}


def main() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    preview_items = []
    for name, (frame_size, frame_count, ms, draw_frame) in ANIMATIONS.items():
        fw, fh = frame_size
        frames = [draw_frame(i) for i in range(frame_count)]
        sheet = Image.new("RGBA", (fw * frame_count, fh), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, (index * fw, 0))
        source = SOURCE_DIR / f"{name}-source.png"
        target = TARGET_DIR / f"{name}.png"
        sheet.save(source, optimize=True)
        sheet.save(target, optimize=True)
        metadata = {
            "characterOrPlace": name,
            "frame": [fw, fh],
            "sheet": [sheet.width, sheet.height],
            "layout": "one horizontal row; one frame per cell",
            "resample": "nearest",
            "anchor": [fw // 2, fh - 1],
            "animations": {"loop": {"row": 0, "frames": frame_count, "ms": ms}},
        }
        (TARGET_DIR / f"{name}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        preview_items.append((name, sheet, frame_size, frame_count))

    columns, cell_w = 2, 700
    cell_h = 240
    rows = math.ceil(len(preview_items) / columns)
    contact = Image.new("RGB", (columns * cell_w, rows * cell_h), (42, 48, 59))
    draw = ImageDraw.Draw(contact)
    for index, (name, sheet, (fw, fh), count) in enumerate(preview_items):
        col, row = index % columns, index // columns
        x, y = col * cell_w, row * cell_h
        scale = max(1, min(3, (cell_w - 16) // sheet.width, (cell_h - 28) // fh))
        shown = sheet.resize((sheet.width * scale, sheet.height * scale), Image.Resampling.NEAREST)
        contact.paste(shown, (x + (cell_w - shown.width) // 2, y + 25), shown)
        draw.text((x + 8, y + 4), f"{name}  {fw}x{fh} × {count}", fill=(255, 255, 255))
    contact.save(ROOT / "docs/art/review/map-animations-contact.png", optimize=True)


if __name__ == "__main__":
    main()
