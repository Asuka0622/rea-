"""Prepare the anime-style dialogue portraits for the web.

Usage: python -I scripts/prepare-portraits.py [--size 320]

Reads the high-resolution portraits, crops the head-and-shoulders square from the top, scales it smoothly
to a square and writes WebP files (public/art/faces/<character>-<expression>.webp) that the dialogue
boxes load.

Two source places are scanned:

- public/art/portraits/<character>-<expression>.png — the original design sources (not committed)
- docs/art/review/sources/portrait-<character>-<expression>-source.png — the delivery copies

Framing is per character, because the artists composed the originals at different scales: the same
zoom on a full-body sheet gives 小林 a face and 朵朵 a whole pumpkin. ZOOM below is chosen so every
portrait fills the frame the way the first case does — hair near the top edge, chin around three
quarters down, nothing else in the picture. When a new portrait arrives, look at it next to
kobayashi-normal.webp and set ZOOM for that character instead of trusting one global number.
"""
import argparse
from pathlib import Path

from PIL import Image

# character -> how far to crop in from the top of the sheet (1 = full width).
ZOOM = {
    "kobayashi": 0.82,
    "lumi": 0.82,
    "azhe": 0.58,
    "duoduo": 0.64,
    "xiaoyu": 0.57,
}
DEFAULT_ZOOM = 0.58


def character_of(stem: str) -> str:
    """"azhe-normal" or "portrait-duoduo-happy-source" -> "azhe" / "duoduo"."""
    name = stem[len("portrait-"):] if stem.startswith("portrait-") else stem
    name = name[:-len("-source")] if name.endswith("-source") else name
    return name.rsplit("-", 1)[0]


def prepare(source: Path, size: int, zoom: float) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    side = int(min(width, height) * zoom)
    left = (width - side) // 2
    return image.crop((left, 0, left + side, side)).resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("output", type=Path, nargs="?", default=root / "public" / "art" / "faces")
    parser.add_argument("--size", type=int, default=320)
    parser.add_argument("--zoom", type=float, default=None, help="override ZOOM for every character")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    places = [
        (root / "public" / "art" / "portraits", ""),
        (root / "docs" / "art" / "review" / "sources", "portrait-"),
    ]
    for place, prefix in places:
        if not place.exists():
            continue
        for source in sorted(place.glob(f"{prefix}*.png")):
            stem = source.name[:-len(".png")]
            character = character_of(stem)
            if character not in ZOOM:
                print(f"skip {source.name}: no ZOOM for {character} (add one to ZOOM)")
                continue
            zoom = args.zoom or ZOOM.get(character, DEFAULT_ZOOM)
            target = args.output / f"{stem[len(prefix):].replace('-source', '')}.webp"
            prepare(source, args.size, zoom).save(target, "WEBP", quality=88, method=6)
            print(f"{source.name} -> {target.name} (zoom {zoom}, {target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
