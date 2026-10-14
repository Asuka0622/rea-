"""Turn high-resolution character portraits into small pixel-art portraits for the dialogue windows.

Usage: python -I scripts/pixelate-portraits.py <source dir> <output dir> [--size 80] [--colors 28] [--zoom 0.74] [--lines 7]

For each PNG in the source dir: crop the head-and-shoulders square from the top, shrink it with an
area filter, reduce the palette (no dithering), make the alpha hard-edged and add a one-pixel dark
outline. The result is a native-size image meant to be shown scaled up with `image-rendering: pixelated`.
These are stand-ins made from the anime portraits; hand-made pixel portraits can replace them later.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

OUTLINE = (42, 26, 16, 255)


def pixelate(source: Path, size: int, colors: int, zoom: float = 1.0, lines: int = 7) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    # Head and shoulders: a square from the top, centred horizontally. zoom < 1 crops closer to the face,
    # so the face gets more of the few pixels available.
    side = int(min(width, height) * zoom)
    left = (width - side) // 2
    image = image.crop((left, 0, left + side, side))
    alpha_full = image.getchannel("A")
    rgb = Image.new("RGB", image.size, (255, 255, 255))
    rgb.paste(image.convert("RGB"), mask=alpha_full)
    small = rgb.resize((size, size), Image.Resampling.BOX)
    if lines:
        # Averaging washes out thin dark lines (eye outlines, lashes, hair strands). Thicken the dark
        # parts first and blend that in, so the lines survive the shrink.
        dark = rgb.filter(ImageFilter.MinFilter(lines)).resize((size, size), Image.Resampling.BOX)
        small = Image.blend(small, dark, 0.5)
    # Small images lose contrast; give faces and eyes a little back before reducing colours.
    small = ImageEnhance.Color(ImageEnhance.Contrast(small).enhance(1.15)).enhance(1.1)
    alpha = alpha_full.resize((size, size), Image.Resampling.BOX).point(lambda a: 255 if a >= 128 else 0)
    # k-means refinement keeps small colour areas (eye highlights, the hairpin) from merging away.
    quantized = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE).convert("RGBA")
    quantized.putalpha(alpha)
    # One-pixel outline around the silhouette.
    grown = alpha.filter(ImageFilter.MaxFilter(3))
    result = Image.new("RGBA", small.size, (0, 0, 0, 0))
    result.paste(Image.new("RGBA", small.size, OUTLINE), mask=grown)
    result.paste(quantized, mask=alpha)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, default=80)
    parser.add_argument("--colors", type=int, default=28)
    parser.add_argument("--zoom", type=float, default=0.74, help="crop closer to the face (e.g. 0.8)")
    parser.add_argument("--lines", type=int, default=7, help="keep thin dark lines (0 turns it off)")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for source in sorted(args.source.glob("*.png")):
        target = args.output / source.name
        pixelate(source, args.size, args.colors, args.zoom, args.lines).save(target, optimize=True)
        print(f"{source.name} -> {target} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
