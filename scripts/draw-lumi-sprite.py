"""Hand-placed 16x32 pixel sprite of Lumi (the guide), with walking frames.

Usage: python -I scripts/draw-lumi-sprite.py

Writes public/art/pixel/sprite-lumi.png (standing, front) and public/art/pixel/anim-lumi.png +
anim-lumi.json (idle 2 frames, walk 4 frames; facing left is mirrored by the page). Every pixel is placed
by hand in the grids below, so the sprite stays crisp at any whole-number scale.
"""
import json
from pathlib import Path

from PIL import Image

PALETTE = {
    ".": (0, 0, 0, 0),
    "K": (42, 26, 16, 255),     # outline
    "H": (127, 211, 192, 255),  # hair (mint)
    "h": (79, 168, 148, 255),   # hair shade
    "L": (196, 240, 228, 255),  # hair light
    "S": (246, 214, 182, 255),  # skin
    "s": (226, 173, 138, 255),  # skin shade / blush
    "E": (59, 35, 18, 255),     # eye
    "A": (201, 138, 43, 255),   # eye (amber)
    "C": (243, 234, 214, 255),  # cape
    "c": (205, 190, 158, 255),  # cape shade
    "G": (185, 190, 198, 255),  # hoodie
    "g": (138, 144, 156, 255),  # hoodie shade
    "P": (63, 143, 134, 255),   # headphones
    "B": (75, 58, 46, 255),     # trousers / boots
    "b": (53, 40, 31, 255),     # boots shade
    "M": (217, 164, 65, 255),   # hair clip (gold)
}

HEAD = [
    "........KK......",
    ".......KHK......",
    ".....KKKHKKK....",
    "....KHHHHLLHK...",
    "...KHHHHHHLLHK..",
    "..KHHHHHHHHHHHK.",
    "..KHHhHHHHHhHHK.",
    ".KHHhHHHHHHHhHHK",
    ".KHhHHhHHhHHHhMK",
    ".KHhSSHSSSHSShHK",
    ".KhSSSSSSSSSSShK",
    ".KhSEASSSSSAESKK",
    ".KhSEESSSSSEESK.",
    "..KsSSSSSSSSSsK.",
    "...KSSSSKSSSSK..",
    "....KKSSSSSSKK..",
]

BODY_STAND = [
    "...KPPKKKKKPPK..",
    "..KCPGGGGGGGPCK.",
    ".KCCKGGGGGGGKCCK",
    ".KCcKgGGGGGgKcCK",
    ".KCcKgGGGGGgKcCK",
    ".KCcKgGGGGGgKcCK",
    ".KCcKSGGGGGSKcCK",
    "..KcKKGGGGGKKcK.",
    "...KKBBBBBBBKK..",
    "....KBBK.KBBK...",
    "....KBBK.KBBK...",
    "....KBBK.KBBK...",
    "....KbbK.KbbK...",
    "...KbbbK.KbbbK..",
    "...KKKKK.KKKKK..",
    "................",
]

# Walking: the legs swing; the body bobs one pixel on the passing frames.
LEGS_A = [
    "...KKBBBBBBBKK..",
    "...KBBK..KBBK...",
    "..KBBK....KBBK..",
    "..KBBK....KBBK..",
    "..KbbK.....KbbK.",
    ".KbbbK.....KbbbK",
    ".KKKKK.....KKKKK",
    "................",
]
LEGS_PASS = [
    "...KKBBBBBBBKK..",
    ".....KBBBBBK....",
    ".....KBBKBBK....",
    ".....KBBKBBK....",
    ".....KbbKbbK....",
    "....KbbbKbbbK...",
    "....KKKKKKKKK...",
    "................",
]
LEGS_B = [
    "...KKBBBBBBBKK..",
    "....KBBK..KBBK..",
    "...KBBK....KBBK.",
    "...KBBK....KBBK.",
    "..KbbK.....KbbK.",
    ".KbbbK....KbbbK.",
    ".KKKKK....KKKKK.",
    "................",
]


def frame(rows):
    assert len(rows) == 32, len(rows)
    image = Image.new("RGBA", (16, 32))
    for y, row in enumerate(rows):
        assert len(row) == 16, (y, row)
        for x, ch in enumerate(row):
            image.putpixel((x, y), PALETTE[ch])
    return image


def body_with(legs):
    return BODY_STAND[:8] + legs


def shifted(rows, dy):
    """Move the whole figure down by dy pixels (the bob)."""
    return ["." * 16] * dy + rows[: len(rows) - dy]


def main():
    out = Path(__file__).resolve().parent.parent / "public" / "art" / "pixel"
    out.mkdir(parents=True, exist_ok=True)
    stand = HEAD + BODY_STAND
    blink = HEAD[:11] + [".KhSKKSSSSSKKSKK", ".KhSSSSSSSSSSSK."] + HEAD[13:] + BODY_STAND
    walk = [
        HEAD + body_with(LEGS_A),
        shifted(HEAD + body_with(LEGS_PASS), 1),
        HEAD + body_with(LEGS_B),
        shifted(HEAD + body_with(LEGS_PASS), 1),
    ]
    frame(stand).save(out / "sprite-lumi.png")
    sheet = Image.new("RGBA", (16 * 4, 32 * 2))
    for i, rows in enumerate([stand, blink]):
        sheet.paste(frame(rows), (16 * i, 0))
    for i, rows in enumerate(walk):
        sheet.paste(frame(rows), (16 * i, 32))
    sheet.save(out / "anim-lumi.png")
    (out / "anim-lumi.json").write_text(json.dumps({
        "frame": [16, 32],
        "animations": {"idle": {"row": 0, "frames": 2, "ms": [2200, 160]}, "walk": {"row": 1, "frames": 4, "ms": 140}},
    }, indent=2) + "\n", encoding="utf8")
    print("sprite-lumi.png, anim-lumi.png, anim-lumi.json")


if __name__ == "__main__":
    main()
