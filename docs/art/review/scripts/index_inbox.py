"""Create small numbered contact sheets for the unreviewed art inbox."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


INBOX = Path(r"C:/Users/Administrator/.codex/generated_images/01a13a14-2db6-7f32-aecd-353b0f8d6736")
OUT = Path(__file__).resolve().parents[1] / "inbox-index"
COLS = 8
CELL_W = 128
CELL_H = 112
THUMB_W = 120
THUMB_H = 82


def main() -> None:
    files = sorted(INBOX.glob("*.png"), key=lambda p: (p.stat().st_mtime, p.name))
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "inbox-index.json").write_text(
        json.dumps([{"index": i, "file": str(p)} for i, p in enumerate(files)], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    page_size = 72
    for start in range(0, len(files), page_size):
        batch = files[start : start + page_size]
        rows = (len(batch) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * CELL_W, rows * CELL_H), (37, 42, 51))
        draw = ImageDraw.Draw(sheet)
        for offset, path in enumerate(batch):
            index = start + offset
            x = (offset % COLS) * CELL_W
            y = (offset // COLS) * CELL_H
            with Image.open(path) as src:
                thumb = src.convert("RGBA")
                thumb.thumbnail((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
                px = x + (CELL_W - thumb.width) // 2
                py = y + 3 + (THUMB_H - thumb.height) // 2
                sheet.paste(thumb, (px, py), thumb)
                dims = f"{src.width}x{src.height}"
            draw.text((x + 4, y + THUMB_H + 5), f"#{index} {dims}", fill=(255, 255, 255))
        sheet.save(OUT / f"inbox-{start:03d}-{start + len(batch) - 1:03d}.jpg", quality=88)


if __name__ == "__main__":
    main()
