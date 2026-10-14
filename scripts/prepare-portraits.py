"""Prepare the anime-style dialogue portraits for the web.

Usage: python -I scripts/prepare-portraits.py [<source dir>] [<output dir>] [--size 320] [--zoom 0.82]

Reads the high-resolution portraits (public/art/portraits/<character>-<expression>.png, design sources,
not committed), crops the head-and-shoulders square from the top, scales it smoothly to a square and
writes WebP files (public/art/faces/<character>-<expression>.webp) that the dialogue boxes load.
"""
import argparse
from pathlib import Path

from PIL import Image


def prepare(source: Path, size: int, zoom: float) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    side = int(min(width, height) * zoom)
    left = (width - side) // 2
    return image.crop((left, 0, left + side, side)).resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", type=Path, nargs="?", default=root / "public" / "art" / "portraits")
    parser.add_argument("output", type=Path, nargs="?", default=root / "public" / "art" / "faces")
    parser.add_argument("--size", type=int, default=320)
    parser.add_argument("--zoom", type=float, default=0.82, help="crop closer to the face (1 = full width)")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for source in sorted(args.source.glob("*.png")):
        target = args.output / f"{source.stem}.webp"
        prepare(source, args.size, args.zoom).save(target, "WEBP", quality=88, method=6)
        print(f"{source.name} -> {target.name} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
