"""Build the walkability map for the town from its picture.

Usage: python -I scripts/build-walkmap.py [--preview out.png]

Reads public/art/pixel/town.png and writes public/art/pixel/town-walk.json: a grid of 4x4-pixel cells,
1 = walkable, 0 = blocked. Everything is walkable except clear obstacles found by colour: water, tree
canopies (darker, bluer greens) and deep shadows, in blobs big enough to matter; small specks such as a
flower bed or a lamp stay walkable. Buildings are blocked by the game from measured footprints.
--preview draws the result over the map.
"""
import argparse
import colorsys
import json
from pathlib import Path

from PIL import Image, ImageDraw

CELL = 4


def obstacle(r, g, b):
    """Clearly not walkable: water, tree canopies (darker, bluer greens), deep shadows and outlines."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if b > r and b > g and s > 0.25:
        return True  # water
    if v < 0.35:
        return True  # outlines, deep shadow
    if 0.22 <= h <= 0.40 and v < 0.72 and s > 0.40:
        return True  # tree canopy and dense foliage
    return False


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "public" / "art" / "pixel"
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    image = Image.open(root / "town.png").convert("RGB")
    width, height = image.size
    cols, rows = width // CELL, height // CELL
    pixels = image.load()
    grid = []
    for r in range(rows):
        row = []
        for c in range(cols):
            bad = sum(obstacle(*pixels[c * CELL + dx, r * CELL + dy]) for dx in range(CELL) for dy in range(CELL))
            row.append(0 if bad >= 9 else 1)
        grid.append(row)
    # Small blocked specks (a flower bed, a lamp, a bench shadow) stay walkable: only blobs of at least
    # MIN_BLOB cells count as obstacles. Buildings are blocked by the game from measured footprints.
    MIN_BLOB = 6
    seen = [[False] * cols for _ in range(rows)]
    for r0 in range(rows):
        for c0 in range(cols):
            if grid[r0][c0] or seen[r0][c0]:
                continue
            blob, stack = [], [(r0, c0)]
            seen[r0][c0] = True
            while stack:
                r, c = stack.pop()
                blob.append((r, c))
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and not seen[nr][nc] and not grid[nr][nc]:
                        seen[nr][nc] = True
                        stack.append((nr, nc))
            if len(blob) < MIN_BLOB:
                for r, c in blob:
                    grid[r][c] = 1
    smooth = grid
    out = {"cell": CELL, "size": [width, height], "rows": ["".join(str(v) for v in row) for row in smooth]}
    (root / "town-walk.json").write_text(json.dumps(out) + "\n", encoding="utf8")
    print(f"town-walk.json: {cols}x{rows} cells, {sum(row.count(1) for row in smooth)} walkable")
    if args.preview:
        big = image.resize((width * 2, height * 2), Image.Resampling.NEAREST).convert("RGBA")
        layer = Image.new("RGBA", big.size)
        draw = ImageDraw.Draw(layer)
        for r, row in enumerate(smooth):
            for c, v in enumerate(row):
                if not v:
                    draw.rectangle([c * CELL * 2, r * CELL * 2, (c + 1) * CELL * 2 - 1, (r + 1) * CELL * 2 - 1], fill=(255, 0, 60, 110))
        big.alpha_composite(layer)
        big.save(args.preview)


if __name__ == "__main__":
    main()
