"""Split Lao Qin's 2x2 expression atlas into transparent dialogue portraits."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[4]
SOURCE = Path(r"C:/Users/Administrator/.codex/generated_images/01a1486d-887a-7011-9b98-71621b1a8c9c/exec-c263862c-941a-4d15-a2a4-dcb4bdefab45.png")
ATLAS = ROOT / "docs/art/review/sources/archivist-expressions-atlas-source.png"
SOURCES = ROOT / "docs/art/review/sources"
TARGETS = ROOT / "public/art/faces"
CELLS = {
    "normal": (0, 0),
    "thinking": (1, 0),
    "happy": (0, 1),
    "surprised": (1, 1),
}


def remove_edge_fringe(im: Image.Image) -> Image.Image:
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            # Background extraction left a thin red contour on a few transparent hair edges.
            if a < 210 and r > g * 1.36 and r > b * 1.12:
                px[x, y] = (r, g, b, 0)
    return im


def main() -> None:
    SOURCES.mkdir(parents=True, exist_ok=True)
    TARGETS.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, ATLAS)
    with Image.open(SOURCE) as atlas:
        atlas = atlas.convert("RGBA")
        cell_w, cell_h = atlas.width // 2, atlas.height // 2
        for name, (col, row) in CELLS.items():
            crop = atlas.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
            crop = remove_edge_fringe(crop)
            # Preserve clean alpha while reducing to the game's 320x320 portrait size.
            scaled = crop.convert("RGBa").resize((320, 320), Image.Resampling.LANCZOS).convert("RGBA")
            scaled.save(SOURCES / f"archivist-{name}-source.png", optimize=True)
            scaled.save(TARGETS / f"archivist-{name}.webp", "WEBP", lossless=True, method=6)

    preview = Image.new("RGBA", (4 * 320, 320), (47, 54, 65, 255))
    for col, name in enumerate(("normal", "thinking", "happy", "surprised")):
        with Image.open(SOURCES / f"archivist-{name}-source.png") as face:
            preview.alpha_composite(face, (col * 320, 0))
    preview.convert("RGB").save(ROOT / "docs/art/review/archivist-portraits-contact.png", optimize=True)


if __name__ == "__main__":
    main()
