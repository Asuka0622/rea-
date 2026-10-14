"""Import a character sprite sheet drawn by the art AI and normalise it for the game.

Usage: python -I scripts/import-sprite-sheet.py <sheet.png> <name> [--frame 96x192] [--side left|right]

The source is a transparent image with one row per action (idle, walk-down, walk-up, walk-side, talk)
and the frames of each row side by side. Frames are found from the transparency, each is placed in a
fixed-size cell with the feet on the bottom line and centred, scaled smoothly, and written as
public/art/pixel/anim-<name>.png + anim-<name>.json, plus sprite-<name>.png (the first idle frame).
"""
import argparse
import json
from pathlib import Path

from PIL import Image

ROWS = [("idle", 2, [2200, 160]), ("walk-down", 4, 140), ("walk-up", 4, 140), ("walk-side", 4, 140), ("talk", 2, 250)]


def bands(values, minimum):
    """Runs of non-zero values longer than `minimum`: [(start, end), ...]."""
    out, start = [], None
    for i, v in enumerate(values + [0]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start > minimum:
                out.append((start, i))
            start = None
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("sheet", type=Path)
    parser.add_argument("name")
    parser.add_argument("--frame", default="96x192", help="output frame size")
    parser.add_argument("--side", default="left", help="which way the walk-side row faces")
    args = parser.parse_args()
    fw, fh = (int(v) for v in args.frame.split("x"))

    sheet = Image.open(args.sheet).convert("RGBA")
    alpha = sheet.getchannel("A").point(lambda a: 255 if a > 20 else 0)
    width, height = sheet.size
    row_bands = bands([1 if alpha.crop((0, y, width, y + 1)).getbbox() else 0 for y in range(height)], 40)
    if len(row_bands) != len(ROWS):
        raise SystemExit(f"expected {len(ROWS)} rows of frames, found {len(row_bands)}")

    frames = []  # per row: list of cropped frames
    for (y0, y1), (_, count, _) in zip(row_bands, ROWS):
        strip = alpha.crop((0, y0, width, y1))
        cols = bands([1 if strip.crop((x, 0, x + 1, y1 - y0)).getbbox() else 0 for x in range(width)], 20)
        if len(cols) != count:
            raise SystemExit(f"row at y={y0}: expected {count} frames, found {len(cols)}")
        frames.append([sheet.crop((x0, y0, x1, y1)) for x0, x1 in cols])

    # One scale for every frame, so the character keeps its size: the tallest frame fits the cell.
    tallest = max(f.getbbox()[3] - f.getbbox()[1] for row in frames for f in row)
    widest = max(f.getbbox()[2] - f.getbbox()[0] for row in frames for f in row)
    scale = min((fh - 4) / tallest, (fw - 2) / widest)
    cols = max(len(row) for row in frames)
    out = Image.new("RGBA", (fw * cols, fh * len(frames)))
    for r, row in enumerate(frames):
        for c, frame in enumerate(row):
            box = frame.getbbox()
            body = frame.crop(box)
            body = body.resize((max(1, round(body.width * scale)), max(1, round(body.height * scale))), Image.Resampling.LANCZOS)
            # Feet on the bottom line (2px margin), centred horizontally.
            out.alpha_composite(body, (c * fw + (fw - body.width) // 2, r * fh + fh - 2 - body.height))

    target = Path(__file__).resolve().parent.parent / "public" / "art" / "pixel"
    out.save(target / f"anim-{args.name}.png", optimize=True)
    out.crop((0, 0, fw, fh)).save(target / f"sprite-{args.name}.png", optimize=True)
    meta = {
        "frame": [fw, fh],
        "sheet": [cols, len(frames)],
        "smooth": True,
        "side": args.side,
        "animations": {name: {"row": r, "frames": count, "ms": ms} for r, (name, count, ms) in enumerate(ROWS)},
    }
    (target / f"anim-{args.name}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(f"anim-{args.name}.png {out.size}, sprite-{args.name}.png, anim-{args.name}.json")


if __name__ == "__main__":
    main()
