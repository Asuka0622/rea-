"""Turn high-resolution character portraits into small pixel-art portraits for the dialogue windows.

Usage: python -I scripts/pixelate-portraits.py <source dir> <output dir> [--size 80] [--colors 20] [--zoom 0.82]

For each PNG in the source dir: crop the head-and-shoulders square from the top, shrink it with an
area filter, reduce the palette (no dithering), make the alpha hard-edged and add a one-pixel dark
outline. The result is a native-size image meant to be shown scaled up with `image-rendering: pixelated`.
These are stand-ins made from the anime portraits; hand-made pixel portraits can replace them later.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

OUTLINE = (42, 26, 16, 255)


def pixelate(source: Path, size: int, colors: int, zoom: float = 1.0) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    width, height = image.size
    # Head and shoulders: a square from the top, centred horizontally. zoom < 1 crops closer to the face,
    # so the face gets more of the few pixels available.
    side = int(min(width, height) * zoom)
    left = (width - side) // 2
    image = image.crop((left, 0, left + side, side))
    # Crisp edges survive the shrink better.
    image = image.filter(ImageFilter.UnsharpMask(radius=4, percent=120, threshold=2))
    small = image.resize((size, size), Image.Resampling.BOX)
    # Small images lose contrast; give faces and eyes a little back before reducing colours.
    alpha_raw = small.getchannel("A")
    small = ImageEnhance.Color(ImageEnhance.Contrast(small.convert("RGB")).enhance(1.18)).enhance(1.12).convert("RGBA")
    small.putalpha(alpha_raw)
    alpha = small.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    rgb = Image.new("RGB", small.size, (255, 255, 255))
    rgb.paste(small.convert("RGB"), mask=alpha)
    quantized = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    quantized.putalpha(alpha)
    # One-pixel outline around the silhouette.
    grown = alpha.filter(ImageFilter.MaxFilter(3))
    result = Image.new("RGBA", small.size, (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            if alpha.getpixel((x, y)):
                result.putpixel((x, y), quantized.getpixel((x, y)))
            elif grown.getpixel((x, y)):
                result.putpixel((x, y), OUTLINE)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--size", type=int, default=80)
    parser.add_argument("--colors", type=int, default=20)
    parser.add_argument("--zoom", type=float, default=0.82, help="crop closer to the face (e.g. 0.8)")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for source in sorted(args.source.glob("*.png")):
        target = args.output / source.name
        pixelate(source, args.size, args.colors, args.zoom).save(target, optimize=True)
        print(f"{source.name} -> {target} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
