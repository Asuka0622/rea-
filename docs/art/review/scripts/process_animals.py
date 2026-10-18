"""Split the six art-inbox animal atlases into transparent action-row sprite sheets."""

from __future__ import annotations

import colorsys
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[4]
INDEX = ROOT / "docs/art/review/inbox-index/inbox-index.json"
SOURCE_DIR = ROOT / "docs/art/review/sources"
TARGET_DIR = ROOT / "public/art/pixel/anim"

# Each candidate atlas has four columns and three action rows.
SPEC = {
    "cat": {"index": 167, "frame": (48, 48), "actions": [("sit", 0, [0, 1]), ("walk", 1, [0, 1, 2, 3]), ("sleep", 2, [0, 1])]},
    "dog": {"index": 168, "frame": (48, 48), "actions": [("sit", 1, [0, 1]), ("run", 0, [0, 1, 2, 3]), ("wag", 2, [0, 1])]},
    "chicken": {"index": 169, "frame": (32, 32), "actions": [("stand", 1, [0, 1]), ("peck", 0, [1, 2]), ("walk", 2, [0, 1, 2, 3])]},
    "duck": {"index": 170, "frame": (32, 32), "actions": [("swim", 0, [0, 1]), ("walk", 1, [0, 1, 2, 3])]},
    "pigeon": {"index": 171, "frame": (32, 32), "actions": [("stand", 0, [0, 1]), ("fly", 1, [0, 1, 2, 3])]},
    "butterfly": {"index": 172, "frame": (32, 32), "actions": [("blue-flap", 1, [0, 1, 2, 3])]},
}


def clean_alpha(im: Image.Image) -> Image.Image:
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 180 or (a < 235 and r > g * 1.42 and r > b * 1.18):
                px[x, y] = (r, g, b, 0)
    return im


def crop_cell(atlas: Image.Image, row: int, col: int) -> Image.Image:
    x0, x1 = round(col * atlas.width / 4), round((col + 1) * atlas.width / 4)
    y0, y1 = round(row * atlas.height / 3), round((row + 1) * atlas.height / 3)
    cell = clean_alpha(atlas.crop((x0, y0, x1, y1)).convert("RGBA"))
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda a: 255 if a > 32 else 0).getbbox()
    if bbox:
        cell = cell.crop(bbox)
    return cell


def normalize(cell: Image.Image, frame_size: tuple[int, int], *, airborne: bool = False) -> Image.Image:
    fw, fh = frame_size
    max_w, max_h = int(fw * 0.88), int(fh * 0.86)
    ratio = min(max_w / cell.width, max_h / cell.height)
    size = (max(1, round(cell.width * ratio)), max(1, round(cell.height * ratio)))
    scaled = cell.convert("RGBa").resize(size, Image.Resampling.NEAREST).convert("RGBA")
    frame = Image.new("RGBA", frame_size, (0, 0, 0, 0))
    x = (fw - scaled.width) // 2
    y = (fh - scaled.height) // 2 if airborne else fh - scaled.height - 2
    frame.alpha_composite(scaled, (x, max(0, y)))
    # Cell borders in generated atlases can catch a foot or wing from the neighboring row.
    # Keep the main silhouette and small details attached to its bounding area.
    mask = frame.getchannel("A")
    pixels = mask.load()
    seen: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for yy in range(fh):
        for xx in range(fw):
            if pixels[xx, yy] <= 32 or (xx, yy) in seen:
                continue
            stack = [(xx, yy)]
            seen.add((xx, yy))
            component = []
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                for ny in range(max(0, cy - 1), min(fh, cy + 2)):
                    for nx in range(max(0, cx - 1), min(fw, cx + 2)):
                        if pixels[nx, ny] > 32 and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            components.append(component)
    if components:
        main = max(components, key=len)
        mx0, my0 = min(x for x, _ in main) - 3, min(y for _, y in main) - 3
        mx1, my1 = max(x for x, _ in main) + 3, max(y for _, y in main) + 3
        keep = set(main)
        for component in components:
            if component is main or len(component) < 2:
                continue
            if all(mx0 <= cx <= mx1 and my0 <= cy <= my1 for cx, cy in component):
                keep.update(component)
        out_px = frame.load()
        for yy in range(fh):
            for xx in range(fw):
                if out_px[xx, yy][3] and (xx, yy) not in keep:
                    out_px[xx, yy] = (0, 0, 0, 0)
    return frame


def recolor_butterfly(im: Image.Image) -> Image.Image:
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.45 and 0.50 <= h <= 0.74:
                h = 0.80
            elif s > 0.45 and 0.09 <= h <= 0.20:
                h = 0.94
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def build_sheet(name: str, spec: dict, indexed: list[dict]) -> tuple[Image.Image, dict]:
    source_path = Path(indexed[spec["index"]]["file"])
    source_dir = SOURCE_DIR / "animal-atlases"
    source_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_path, source_dir / f"animal-{name}-inbox-{spec['index']}-source.png")
    with Image.open(source_path) as source:
        atlas = source.convert("RGBA")
        frame_size = spec["frame"]
        if name == "butterfly":
            frame_sets = [[normalize(crop_cell(atlas, row, col), frame_size, airborne=True) for col in cols] for _, row, cols in spec["actions"]]
            pink_frames = [recolor_butterfly(frame) for frame in frame_sets[0]]
            frame_sets.extend([pink_frames])
            action_names = ["blue-flap", "violet-flap"]
        else:
            frame_sets = []
            action_names = []
            for action, row, cols in spec["actions"]:
                frames = [normalize(crop_cell(atlas, row, col), frame_size, airborne=(name == "pigeon" and action == "fly")) for col in cols]
                if name == "duck" and action == "swim":
                    for frame in frames:
                        d = ImageDraw.Draw(frame)
                        d.line((3, frame_size[1] - 6, frame_size[0] - 4, frame_size[1] - 6), fill=(92, 189, 208, 190), width=1)
                        d.line((7, frame_size[1] - 3, frame_size[0] - 7, frame_size[1] - 3), fill=(65, 145, 177, 160), width=1)
                frame_sets.append(frames)
                action_names.append(action)

    fw, fh = frame_size
    cols = max(len(frames) for frames in frame_sets)
    sheet = Image.new("RGBA", (cols * fw, len(frame_sets) * fh), (0, 0, 0, 0))
    animation_map = {}
    for row, (action, frames) in enumerate(zip(action_names, frame_sets)):
        for col, frame in enumerate(frames):
            sheet.alpha_composite(frame, (col * fw, row * fh))
        animation_map[action] = {"row": row, "frames": len(frames), "ms": 180 if name in ("cat", "dog") else 240}
    metadata = {
        "character": f"animal-{name}",
        "frame": [fw, fh],
        "sheet": [sheet.width, sheet.height],
        "resample": "nearest",
        "defaultFacing": "side" if name in ("dog", "duck", "pigeon") else "down",
        "sourceInboxIndex": spec["index"],
        "animations": animation_map,
    }
    return sheet, metadata


def main() -> None:
    indexed = json.loads(INDEX.read_text(encoding="utf-8"))
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    sheets = {}
    for name, spec in SPEC.items():
        sheet, metadata = build_sheet(name, spec, indexed)
        stem = f"anim-{name}"
        source = SOURCE_DIR / f"{stem}-source.png"
        target = TARGET_DIR / f"{stem}.png"
        sheet.save(source, optimize=True)
        sheet.save(target, optimize=True)
        (TARGET_DIR / f"{stem}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        sheets[name] = (sheet, metadata)

    # Compact QA strip at 4x nearest-neighbor, plus per-animal sheets for detailed review.
    scale = 4
    line_items = []
    for name, (sheet, metadata) in sheets.items():
        fw, fh = metadata["frame"]
        max_frames = max(item["frames"] for item in metadata["animations"].values())
        animal_preview = Image.new("RGB", (max_frames * fw * scale + 180, len(metadata["animations"]) * (fh * scale + 28)), (42, 48, 59))
        animal_draw = ImageDraw.Draw(animal_preview)
        for action, info in metadata["animations"].items():
            row = info["row"]
            frames = [sheet.crop((i * fw, row * fh, (i + 1) * fw, (row + 1) * fh)) for i in range(info["frames"])]
            line_items.append((name, action, frames))
            y = row * (fh * scale + 28) + 4
            for col, frame in enumerate(frames):
                large = frame.resize((fw * scale, fh * scale), Image.Resampling.NEAREST)
                animal_preview.paste(large, (4 + col * fw * scale, y), large)
            animal_draw.text((max_frames * fw * scale + 12, y + 8), action, fill=(255, 255, 255))
        review_dir = ROOT / "docs/art/review/animals"
        review_dir.mkdir(parents=True, exist_ok=True)
        animal_preview.save(review_dir / f"anim-{name}-contact.png", optimize=True)
    line_h = 48 * scale + 24
    preview = Image.new("RGB", (4 * 48 * scale + 300, len(line_items) * line_h + 20), (42, 48, 59))
    draw = ImageDraw.Draw(preview)
    for row, (name, action, frames) in enumerate(line_items):
        y = row * line_h + 4
        for col, frame in enumerate(frames):
            large = frame.resize((frame.width * scale, frame.height * scale), Image.Resampling.NEAREST)
            preview.paste(large, (4 + col * 48 * scale, y), large)
        draw.text((4 * 48 * scale + 12, y + 8), f"{name} / {action}", fill=(255, 255, 255))
    preview.save(ROOT / "docs/art/review/animal-animations-contact.png", optimize=True)


if __name__ == "__main__":
    main()
