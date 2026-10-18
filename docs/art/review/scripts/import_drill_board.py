"""Create the optional Revisit panel background from the generated source."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[4]
SOURCE = Path(r"C:/Users/Administrator/.codex/generated_images/01a1486d-887a-7011-9b98-71621b1a8c9c/exec-af99c18d-fd00-4fe4-8064-5eff597b01c0.png")
SOURCE_COPY = ROOT / "docs/art/review/sources/drill-board-source.png"
TARGET = ROOT / "public/art/pixel/ui/drill-board.png"
PREVIEW = ROOT / "docs/art/review/drill-board-preview.png"


def main() -> None:
    SOURCE_COPY.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, SOURCE_COPY)
    with Image.open(SOURCE) as im:
        output = ImageOps.fit(im.convert("RGB"), (640, 420), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        output.save(TARGET, optimize=True)
        output.save(PREVIEW, optimize=True)


if __name__ == "__main__":
    main()
