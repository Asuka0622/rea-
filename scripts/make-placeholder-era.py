"""Draw a stand-in map for an era until the real art arrives (docs/art/prompts.md 第五批).

Usage: python -I scripts/make-placeholder-era.py

Writes public/art/pixel/eras/china/:
- bianjing.png         960x540 map of Bianjing in late spring: the Bian river, Zhou bridge, the imperial
                       street, the teahouse and the clock tower building site (simple flat pixel shapes)
- bianjing-walk.json   collision (4px cells) and depth layers, in the same format build-walkmap.py writes
- bianjing-front.png   the pixels drawn in front of the player when standing behind roofs and trees
- bianjing-water.png   the river's pixels, which the game animates

Buildings here must match the `era-china` spots in public/game-regions.js.
"""
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw

W, H, CELL = 960, 540, 4
OUT = Path(__file__).resolve().parent.parent / "public" / "art" / "pixel" / "eras" / "china"
random.seed(1088)

GRASS = [(124, 178, 74), (116, 170, 70), (132, 186, 80)]
EARTH = [(214, 186, 132), (206, 178, 124), (220, 194, 140)]
STONE = [(176, 172, 160), (164, 160, 150), (186, 182, 170)]
WATER = [(64, 150, 196), (58, 140, 188), (80, 166, 208)]
ROOF = (88, 98, 112)
ROOF_LINE = (66, 74, 86)
WALL = (232, 226, 210)
WOOD = (132, 86, 52)
DARK = (40, 30, 24)

img = Image.new("RGB", (W, H))
px = img.load()
front = Image.new("RGBA", (W, H))
fronts = []
blocked = set()  # cells


def fill(x0, y0, x1, y1, palette, grain=3):
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            px[x, y] = palette[((x // grain) * 7 + (y // grain) * 13 + random.randint(0, 1)) % len(palette)]


def block(x0, y0, x1, y1):
    for r in range(max(0, y0) // CELL, min(H - 1, y1) // CELL + 1):
        for c in range(max(0, x0) // CELL, min(W - 1, x1) // CELL + 1):
            blocked.add((r, c))


d = ImageDraw.Draw(img)
fd = ImageDraw.Draw(front)

# Ground, roads, river, bridge.
fill(0, 0, W, H, GRASS)
fill(450, 0, 512, H, EARTH)            # 御街, north-south
fill(0, 482, W, 520, EARTH)            # the street along the south bank, in front of the shops
fill(0, 232, W, 262, EARTH)            # the street along the north bank
fill(600, 230, 760, 262, STONE)        # paving in front of the tower site
fill(0, 290, W, 362, WATER, grain=2)   # 汴河
for _ in range(500):                   # ripples
    x, y = random.randrange(W), random.randrange(292, 360)
    d.line([x, y, x + random.randint(3, 8), y], fill=(150, 210, 236))
fill(440, 282, 522, 370, STONE, grain=2)  # 州桥
d.rectangle([440, 282, 522, 370], outline=DARK)
for y in range(290, 364, 8):
    d.line([444, y, 518, y], fill=(150, 146, 136))
d.rectangle([436, 280, 444, 372], fill=(150, 146, 136), outline=DARK)   # railings
d.rectangle([518, 280, 526, 372], fill=(150, 146, 136), outline=DARK)
water = Image.new("LA", (W, H))
for y in range(290, 362):
    for x in range(W):
        if not (436 <= x <= 526):
            water.putpixel((x, y), (255, 255))
            if y < 360:
                block(x, y, x, y)

# City wall along the top with a gate over the imperial street.
fill(0, 0, W, 34, [(150, 140, 128), (140, 130, 118)], grain=4)
d.line([0, 34, W, 34], fill=DARK, width=2)
fill(452, 0, 510, 34, [(60, 48, 40)])
block(0, 0, 448, 36)
block(514, 0, W, 36)


def building(x, y, w, h, roof_h, door_x, sign=None, wall=WALL, roof=ROOF):
    """A Song-style building: tiled roof with up-turned eaves, white or wooden walls, a dark door."""
    wall_top = y + roof_h
    d.rectangle([x + 4, wall_top, x + w - 4, y + h], fill=wall, outline=DARK)
    for i in range(x + 14, x + w - 10, 22):                       # windows / lattices
        d.rectangle([i, wall_top + 10, i + 10, wall_top + 22], fill=(150, 112, 70), outline=DARK)
    d.rectangle([door_x - 7, y + h - 22, door_x + 7, y + h], fill=(60, 40, 28), outline=DARK)
    d.polygon([(x - 6, wall_top + 2), (x + 6, y), (x + w - 6, y), (x + w + 6, wall_top + 2)], fill=roof, outline=DARK)
    for i in range(x, x + w, 6):
        d.line([i, y + 2, i - 2, wall_top], fill=ROOF_LINE)
    d.line([x - 8, wall_top + 2, x + w + 8, wall_top + 2], fill=DARK, width=2)
    if sign:
        d.rectangle([door_x - 16, wall_top + 2, door_x + 16, wall_top + 9], fill=sign, outline=DARK)
    # The roof and upper wall are drawn in front of the player standing behind the building.
    for yy in range(y, y + h):
        for xx in range(x - 8, x + w + 8):
            if 0 <= xx < W and (yy < wall_top + 4 or x + 4 <= xx <= x + w - 4):
                fd.point((xx, yy), fill=(*px[xx, yy], 255)) if px[xx, yy] not in GRASS + EARTH + STONE else None
    fronts.append({"x": x - 8, "y": y, "w": w + 16, "h": h, "base": y + h, "building": True})


# The teahouse on the south bank, west of the bridge; a wine shop flag.
building(296, 398, 128, 76, 30, 360, sign=(180, 40, 36))
d.line([290, 452, 290, 424], fill=WOOD, width=2)
d.polygon([(290, 424), (308, 428), (290, 436)], fill=(200, 60, 50))
# More shops along the south street (stand-ins, not open in the test build).
building(560, 398, 120, 76, 30, 620)
building(120, 400, 120, 74, 28, 180)
building(720, 398, 140, 76, 30, 790, roof=(96, 84, 74))
# The maths hall in the north-west.
building(220, 128, 140, 88, 34, 290, sign=(40, 80, 140))

# The water-driven clock tower building site (水运仪象台): a tall three-storey timber tower in scaffolding.
tx, ty, tw = 646, 52, 64
for i, (top, bottom) in enumerate([(52, 92), (92, 142), (142, 226)]):
    d.rectangle([tx, top, tx + tw, bottom], fill=(150, 104, 64) if i else (120, 128, 120), outline=DARK)
    d.line([tx - 6, top, tx + tw + 6, top], fill=DARK, width=2)
d.ellipse([tx + 18, 58, tx + 46, 86], outline=(196, 160, 70), width=3)          # the armillary sphere on top, under a cloth
d.line([tx + 32, 58, tx + 32, 86], fill=(196, 160, 70))
d.line([tx + 18, 72, tx + 46, 72], fill=(196, 160, 70))
d.rectangle([tx + 24, 196, tx + 40, 226], fill=(50, 34, 24), outline=DARK)      # door
for sx in (tx - 10, tx + tw + 6):                                              # scaffolding poles
    d.line([sx, 46, sx, 228], fill=(176, 140, 90), width=2)
for sy in range(60, 228, 24):
    d.line([tx - 10, sy, tx + tw + 8, sy], fill=(176, 140, 90))
d.rectangle([720, 196, 760, 226], fill=(166, 120, 76), outline=DARK)              # timber stack
for yy in range(46, 228):
    for xx in range(tx - 12, tx + tw + 10):
        if px[xx, yy] not in GRASS + EARTH + STONE:
            fd.point((xx, yy), fill=(*px[xx, yy], 255))
fronts.append({"x": tx - 12, "y": 46, "w": tw + 22, "h": 182, "base": 228, "building": True})

# Willows along the river and peach trees in blossom.
def tree(cx, cy, colour, blossom=None):
    d.rectangle([cx - 2, cy, cx + 2, cy + 14], fill=WOOD)
    d.ellipse([cx - 14, cy - 18, cx + 14, cy + 6], fill=colour, outline=(60, 100, 40))
    if blossom:
        for _ in range(14):
            d.point((cx + random.randint(-11, 11), cy + random.randint(-15, 3)), fill=blossom)
    for yy in range(cy - 18, cy + 7):
        for xx in range(cx - 14, cx + 15):
            if 0 <= xx < W and 0 <= yy < H and px[xx, yy] not in GRASS + EARTH:
                fd.point((xx, yy), fill=(*px[xx, yy], 255))
    fronts.append({"x": cx - 14, "y": cy - 18, "w": 29, "h": 33, "base": cy + 14})
    block(cx - 4, cy + 8, cx + 4, cy + 14)


for x in range(40, 940, 70):
    if not 400 < x < 560:
        tree(x, 272, (110, 170, 70))
        if not (100 < x + 30 < 250 or 280 < x + 30 < 440 or 540 < x + 30 < 700 or 700 < x + 30 < 880):
            tree(x + 30, 378, (110, 170, 70))
for cx, cy in [(120, 90), (170, 190), (400, 120), (560, 160), (840, 110), (900, 200), (40, 452), (910, 452)]:
    tree(cx, cy, (226, 160, 180), blossom=(255, 230, 236))

OUT.mkdir(parents=True, exist_ok=True)
img.save(OUT / "bianjing.png", optimize=True)
front.save(OUT / "bianjing-front.png", optimize=True)
water.save(OUT / "bianjing-water.png", optimize=True)
cols, rows = W // CELL, H // CELL
walk = ["".join("0" if (r, c) in blocked else "1" for c in range(cols)) for r in range(rows)]
(OUT / "bianjing-walk.json").write_text(json.dumps({"cell": CELL, "size": [W, H], "rows": walk, "fronts": fronts, "placeholder": True}) + "\n", encoding="utf8")
print("bianjing placeholder:", OUT)
