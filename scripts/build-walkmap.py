"""Build collision and depth data for the town from its picture.

Usage: python -I scripts/build-walkmap.py [--region NAME] [--preview out.png]

With --region, works on a region map (public/art/pixel/regions/town-NAME.png, see public/game-regions.js)
and writes town-NAME-walk.json and town-NAME-front.png next to it; building footprints come from
game-regions.js (read through node).

Reads public/art/pixel/town.png and writes:
- public/art/pixel/town-walk.json: a grid of 4x4-pixel cells (1 = walkable, 0 = blocked) and a list
  of "fronts" (trees and other foliage the player can walk behind): { x, y, w, h, base } in map pixels.
- public/art/pixel/town-front.png: the same size as the map, holding only the pixels of those fronts.

How it reads the picture: water is blocked. Tree canopies (darker, bluer greens) and dark outlines form
blobs; for each blob only the lower part (the trunk and the bottom of the canopy) is blocked, so the
player can walk behind the top of a tree, and the game draws the blob's pixels over the player whenever
the player's feet are above the blob's base. Small specks (a lamp, a flower bed) are ignored.
Buildings are handled by the game from measured footprints in the same way.
"""
import argparse
import colorsys
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

CELL = 4
MIN_BLOB = 6        # cells; smaller specks are walkable and not drawn in front
BLOCKED_SHARE = 0.6  # the lower 60% of each column of a blob is solid, the top 40% can be walked behind


# Building footprints, the same numbers as TOWN and CASE_HOUSES in public/game-shell.js.
BUILDINGS = [
    (50, 22, 87, 69), (270, 40, 88, 69), (428, 33, 66, 66), (138, 215, 75, 59), (400, 210, 83, 63),
    (128, 118, 82, 59), (190, 28, 47, 56), (550, 215, 60, 59), (553, 22, 60, 49), (415, 132, 65, 49), (537, 130, 73, 53),
]


def open_ground(r, g, b):
    """Grass and bright path: what surrounds a building inside its footprint rectangle."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return (0.17 <= h <= 0.27 and v >= 0.74) or (0.09 <= h <= 0.14 and v >= 0.93 and s >= 0.5)


def kind(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if b > r and b > g and s > 0.25:
        return "water"
    if v < 0.35 or (0.22 <= h <= 0.40 and v < 0.72 and s > 0.40):
        return "foliage"  # tree canopies, dense foliage, dark outlines and shadows
    return "ground"


def region_buildings(public: Path, region: str):
    script = "import(process.argv[1]).then((m) => console.log(JSON.stringify(m.REGIONS[process.argv[2]])))"
    data = json.loads(subprocess.run(["node", "-e", script, (public / "game-regions.js").as_uri(), region], capture_output=True, text=True, encoding="utf8", check=True).stdout)
    # Stand-ins drawn by the game (placeholder) are not in the picture.
    return [(s["x"], s["y"], s["w"], s["h"]) for s in data["spots"].values() if not s.get("placeholder")]


def main() -> None:
    global BUILDINGS
    public = Path(__file__).resolve().parent.parent / "public"
    root = public / "art" / "pixel"
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--region")
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    name = "town"
    if args.region:
        BUILDINGS = region_buildings(public, args.region)
        root = root / "regions"
        name = f"town-{args.region}"
    image = Image.open(root / f"{name}.png").convert("RGB")
    width, height = image.size
    cols, rows = width // CELL, height // CELL
    px = image.load()
    kinds = [[kind(*px[x, y]) for x in range(width)] for y in range(height)]

    def cell_kind(r, c):
        counts = {"water": 0, "foliage": 0}
        for dy in range(CELL):
            for dx in range(CELL):
                k = kinds[r * CELL + dy][c * CELL + dx]
                if k in counts:
                    counts[k] += 1
        if counts["water"] >= 9:
            return "water"
        if counts["water"] + counts["foliage"] >= 9:
            return "foliage"
        return "ground"

    cells = [[cell_kind(r, c) for c in range(cols)] for r in range(rows)]
    walk = [[0 if cells[r][c] == "water" else 1 for c in range(cols)] for r in range(rows)]

    front = Image.new("RGBA", (width, height))
    fronts = []
    seen = [[False] * cols for _ in range(rows)]
    for r0 in range(rows):
        for c0 in range(cols):
            if cells[r0][c0] != "foliage" or seen[r0][c0]:
                continue
            blob, stack = [], [(r0, c0)]
            seen[r0][c0] = True
            while stack:
                r, c = stack.pop()
                blob.append((r, c))
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and not seen[nr][nc] and cells[nr][nc] == "foliage":
                        seen[nr][nc] = True
                        stack.append((nr, nc))
            if len(blob) < MIN_BLOB:
                continue
            # Solid lower part, per column.
            by_col = {}
            for r, c in blob:
                by_col.setdefault(c, []).append(r)
            for c, rs in by_col.items():
                top, bottom = min(rs), max(rs)
                solid = max(1, round((bottom - top + 1) * BLOCKED_SHARE))
                for r in range(bottom - solid + 1, bottom + 1):
                    if r in rs:
                        walk[r][c] = 0
            # Pixels drawn in front of the player, and the line the player's feet are compared with.
            # Canopy highlights look like grass, so holes are filled: a pixel surrounded mostly by
            # canopy belongs to the canopy too.
            mask = set()
            area = set()
            for r, c in blob:
                for dy in range(CELL):
                    for dx in range(CELL):
                        x, y = c * CELL + dx, r * CELL + dy
                        area.add((x, y))
                        if kinds[y][x] != "ground":
                            mask.add((x, y))
            for _ in range(3):
                grown = {(x, y) for (x, y) in area - mask if sum((x + i, y + j) in mask for i in (-1, 0, 1) for j in (-1, 0, 1)) >= 5}
                if not grown:
                    break
                mask |= grown
            for x, y in mask:
                front.putpixel((x, y), (*px[x, y], 255))
            rs = [r for r, _ in blob]
            cs = [c for _, c in blob]
            fronts.append({"x": min(cs) * CELL, "y": min(rs) * CELL, "w": (max(cs) - min(cs) + 1) * CELL, "h": (max(rs) - min(rs) + 1) * CELL, "base": (max(rs) + 1) * CELL})

    # Buildings: their own pixels (not the grass and path around them) go to the front layer too.
    for bx, by, bw, bh in BUILDINGS:
        for y in range(by, min(height, by + bh)):
            for x in range(bx, min(width, bx + bw)):
                if not open_ground(*px[x, y]):
                    front.putpixel((x, y), (*px[x, y], 255))
        fronts.append({"x": bx, "y": by, "w": bw, "h": bh, "base": by + bh, "building": True})

    out = {"cell": CELL, "size": [width, height], "rows": ["".join(str(v) for v in row) for row in walk], "fronts": fronts}
    (root / f"{name}-walk.json").write_text(json.dumps(out) + "\n", encoding="utf8")
    front.save(root / f"{name}-front.png", optimize=True)
    print(f"{name}-walk.json: {cols}x{rows} cells, {sum(row.count(1) for row in walk)} walkable, {len(fronts)} fronts; {name}-front.png")
    if args.preview:
        big = image.resize((width * 2, height * 2), Image.Resampling.NEAREST).convert("RGBA")
        layer = Image.new("RGBA", big.size)
        draw = ImageDraw.Draw(layer)
        for r, row in enumerate(walk):
            for c, v in enumerate(row):
                if not v:
                    draw.rectangle([c * CELL * 2, r * CELL * 2, (c + 1) * CELL * 2 - 1, (r + 1) * CELL * 2 - 1], fill=(255, 0, 60, 120))
        for f in fronts:
            draw.line([f["x"] * 2, f["base"] * 2, (f["x"] + f["w"]) * 2, f["base"] * 2], fill=(255, 255, 0, 200), width=1)
        big.alpha_composite(layer)
        big.save(args.preview)


if __name__ == "__main__":
    main()
