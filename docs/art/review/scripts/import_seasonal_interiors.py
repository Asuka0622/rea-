"""Import the matching spring, summer and winter public-room interiors."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "docs/art/review/inbox-index/inbox-index.json"
SOURCE_DIR = ROOT / "docs/art/review/sources"
TARGET_DIR = ROOT / "public/art/pixel"
ROOMS = ["learn", "engines", "clients", "doctor"]
SETS = {
    "summer": [82, 83, 84, 85],
    "spring": [92, 93, 94, 95],
    "winter": [102, 103, 104, 105],
}


def main() -> None:
    indexed = json.loads(INDEX.read_text(encoding="utf-8"))
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"size": [320, 180], "rooms": ROOMS, "sourceNumbers": SETS, "stateNote": "Seasonal interior candidates. Confirm lighting, furniture and doorway/player anchors before activation."}
    preview = Image.new("RGB", (4 * 240, 3 * 160), (37, 42, 51))
    draw = ImageDraw.Draw(preview)
    for row, (season, indexes) in enumerate(SETS.items()):
        for col, (room, index) in enumerate(zip(ROOMS, indexes)):
            generated = Path(indexed[index]["file"])
            stem = f"room-{room}-{season}"
            shutil.copy2(generated, SOURCE_DIR / f"{stem}-source.png")
            with Image.open(generated) as source:
                target = source.convert("RGB").resize((320, 180), Image.Resampling.LANCZOS)
                target.save(TARGET_DIR / f"{stem}.png", optimize=True)
                target.thumbnail((232, 130), Image.Resampling.LANCZOS)
            x, y = col * 240 + (240 - target.width) // 2, row * 160 + 2
            preview.paste(target, (x, y))
            draw.text((col * 240 + 4, row * 160 + 136), f"{season} · {room}", fill=(255, 255, 255))
    (ROOT / "docs/art/review/seasonal-room-candidates.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preview.save(ROOT / "docs/art/review/seasonal-rooms-contact.png", optimize=True)


if __name__ == "__main__":
    main()
