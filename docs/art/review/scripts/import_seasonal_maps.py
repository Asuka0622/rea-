"""Import the aligned spring, summer and winter five-region map candidates."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "docs/art/review/inbox-index/inbox-index.json"
SOURCE_DIR = ROOT / "docs/art/review/sources"
TARGET_DIR = ROOT / "public/art/pixel/regions"
REGIONS = ["center", "homes", "craft", "north", "south"]
SETS = {"summer": range(71, 76), "spring": range(86, 91), "winter": range(96, 101)}


def main() -> None:
    indexed = json.loads(INDEX.read_text(encoding="utf-8"))
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    for season, indexes in SETS.items():
        for region, index in zip(REGIONS, indexes):
            generated = Path(indexed[index]["file"])
            stem = f"town-{region}-{season}"
            source = SOURCE_DIR / f"{stem}-source.png"
            target = TARGET_DIR / f"{stem}.png"
            shutil.copy2(generated, source)
            with Image.open(generated) as im:
                # The source is already 16:9; match the established runtime size.
                resized = im.convert("RGB").resize((960, 540), Image.Resampling.LANCZOS)
                resized.save(target, optimize=True)
    manifest = {
        "baseState": {"season": "spring/summer/winter", "weather": "clear", "time": "noon"},
        "size": [960, 540],
        "regions": REGIONS,
        "sourceNumbers": {"summer": list(SETS["summer"]), "spring": list(SETS["spring"]), "winter": list(SETS["winter"])},
        "stateNote": "These are candidate seasonal overlays of the autumn region layouts; verify each exit, walk mask and occlusion in-game before activation.",
    }
    (ROOT / "docs/art/review/seasonal-map-candidates.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preview = Image.new("RGB", (5 * 200, 3 * 140), (37, 42, 51))
    from PIL import ImageDraw

    draw = ImageDraw.Draw(preview)
    for row, season in enumerate(("spring", "summer", "winter")):
        for col, region in enumerate(REGIONS):
            im = Image.open(TARGET_DIR / f"town-{region}-{season}.png").convert("RGB")
            im.thumbnail((192, 108), Image.Resampling.LANCZOS)
            x, y = col * 200 + (200 - im.width) // 2, row * 140 + 2
            preview.paste(im, (x, y))
            draw.text((col * 200 + 4, row * 140 + 113), f"{season} · {region}", fill=(255, 255, 255))
    preview.save(ROOT / "docs/art/review/seasonal-maps-contact.png", optimize=True)


if __name__ == "__main__":
    main()
