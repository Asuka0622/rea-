"""Import the seven case-card illustration candidates from the art inbox."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "docs/art/review/inbox-index/inbox-index.json"
SOURCE_DIR = ROOT / "docs/art/review/sources"
TARGET_DIR = ROOT / "public/art/pixel/scenes"
ASSETS = [
    ("case-privacy-ledger", 133),
    ("case-weather-keys", 134),
    ("case-calculator-eggs", 135),
    ("case-farm-save", 136),
    ("case-archive", 137),
    ("case-flashlight-apk", 138),
    ("case-notes-versions", 139),
]


def main() -> None:
    indexed = json.loads(INDEX.read_text(encoding="utf-8"))
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    cols, cw, ch = 4, 320, 205
    rows = (len(ASSETS) + cols - 1) // cols
    preview = Image.new("RGB", (cols * cw, rows * ch), (37, 42, 51))
    draw = ImageDraw.Draw(preview)
    for index, (name, source_index) in enumerate(ASSETS):
        generated = Path(indexed[source_index]["file"])
        shutil.copy2(generated, SOURCE_DIR / f"{name}-source.png")
        with Image.open(generated) as source:
            target = source.convert("RGB").resize((640, 360), Image.Resampling.LANCZOS)
            target.save(TARGET_DIR / f"{name}.png", optimize=True)
            target.thumbnail((312, 176), Image.Resampling.LANCZOS)
        x, y = (index % cols) * cw, (index // cols) * ch
        preview.paste(target, (x + (cw - target.width) // 2, y + 3))
        draw.text((x + 4, y + 181), f"{name} · inbox #{source_index}", fill=(255, 255, 255))
    preview.save(ROOT / "docs/art/review/case-illustrations-contact.png", optimize=True)


if __name__ == "__main__":
    main()
