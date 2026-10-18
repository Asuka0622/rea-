#!/usr/bin/env python3
"""Assemble an 8-frame, four-direction walk atlas around an existing sprite sheet.

The generated atlas supplies only the four walking rows. Existing idle, talk, and
other non-walk rows are copied pixel-for-pixel into the candidate output.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

from PIL import Image


WALK_LAYOUT = [
    ("walk-down", 1),
    ("walk-up", 2),
    ("walk-left", 3),
    ("walk-right", 4),
]


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def get_animation_map(meta: dict) -> dict:
    animations = meta.get("animations") or meta.get("animation")
    if not isinstance(animations, dict):
        raise ValueError("metadata must contain an animations object")
    return animations


def frame_dimensions(meta: dict) -> tuple[int, int]:
    frame = meta.get("frame")
    if isinstance(frame, list) and len(frame) >= 2:
        return int(frame[0]), int(frame[1])
    return int(meta["frameWidth"]), int(meta["frameHeight"])


def copy_row(source: Image.Image, target: Image.Image, source_row: int,
             target_row: int, frame_height: int) -> None:
    crop = source.crop((0, source_row * frame_height, source.width,
                        (source_row + 1) * frame_height))
    target.alpha_composite(crop, (0, target_row * frame_height))


def content_bbox(cell: Image.Image) -> tuple[int, int, int, int] | None:
    """Ignore faint generation halos when finding the actual pose bounds."""
    alpha = cell.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= 48 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    margin = 2
    return (max(0, left - margin), max(0, top - margin),
            min(cell.width, right + margin), min(cell.height, bottom + margin))


def frame_crop(atlas: Image.Image, row: int, col: int) -> Image.Image:
    x0 = round(col * atlas.width / 8)
    x1 = round((col + 1) * atlas.width / 8)
    y0 = round(row * atlas.height / 4)
    y1 = round((row + 1) * atlas.height / 4)
    cell = atlas.crop((x0, y0, x1, y1))
    bbox = content_bbox(cell)
    if bbox is None:
        raise ValueError(f"empty walk pose at row {row + 1}, frame {col + 1}")
    return cell.crop(bbox)


def frame_crop_from_strip(strip: Image.Image, col: int, direction: str) -> Image.Image:
    x0 = round(col * strip.width / 8)
    x1 = round((col + 1) * strip.width / 8)
    cell = strip.crop((x0, 0, x1, strip.height))
    bbox = content_bbox(cell)
    if bbox is None:
        raise ValueError(f"empty {direction} walk pose at frame {col + 1}")
    return cell.crop(bbox)


def fit_pose(pose: Image.Image, frame_width: int, frame_height: int,
             scale: float) -> Image.Image:
    size = (max(1, round(pose.width * scale)),
            max(1, round(pose.height * scale)))
    pose = pose.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
    x = (frame_width - pose.width) // 2
    y = frame_height - 4 - pose.height
    frame.alpha_composite(pose, (x, y))
    return frame


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-image", type=Path, required=True)
    parser.add_argument("--source-meta", type=Path, required=True)
    parser.add_argument("--walk-atlas", type=Path,
                        help="Transparent 8x4 atlas: down, up, left, right")
    for direction in ("down", "up", "left", "right"):
        parser.add_argument(f"--walk-{direction}-strip", type=Path,
                            help=f"Transparent one-row strip with eight {direction} poses")
    parser.add_argument("--output-image", type=Path, required=True)
    parser.add_argument("--output-meta", type=Path, required=True)
    args = parser.parse_args()

    meta = load_json(args.source_meta)
    animations = get_animation_map(meta)
    frame_width, frame_height = frame_dimensions(meta)
    source_sheet = meta.get("sheet")
    if not isinstance(source_sheet, list) or len(source_sheet) < 2:
        raise ValueError("source metadata must specify sheet columns and rows")
    source_columns, source_rows = map(int, source_sheet[:2])

    source = Image.open(args.source_image).convert("RGBA")
    expected_size = (frame_width * source_columns, frame_height * source_rows)
    if source.size != expected_size:
        raise ValueError(f"source sheet is {source.size}; metadata expects {expected_size}")

    directions = ["down", "up", "left", "right"]
    strip_args = {direction: getattr(args, f"walk_{direction}_strip")
                  for direction in directions}
    has_strips = all(strip_args.values())
    if args.walk_atlas and any(strip_args.values()):
        raise ValueError("provide either --walk-atlas or all four direction strips")
    if not args.walk_atlas and not has_strips:
        raise ValueError("provide --walk-atlas or all four direction strips")

    walk_atlas = None
    walk_strips = {}
    if args.walk_atlas:
        walk_atlas = Image.open(args.walk_atlas).convert("RGBA")
        if walk_atlas.width < 8 or walk_atlas.height < 4:
            raise ValueError("walk atlas is too small to contain an 8x4 grid")
        if walk_atlas.getchannel("A").getextrema()[0] != 0:
            raise ValueError("walk atlas background is not transparent")
    else:
        for direction, path in strip_args.items():
            strip = Image.open(path).convert("RGBA")
            if strip.width < 8:
                raise ValueError(f"{direction} strip is too narrow for 8 frames")
            if strip.getchannel("A").getextrema()[0] != 0:
                raise ValueError(f"{direction} strip background is not transparent")
            walk_strips[direction] = strip

    # Standard rows occupy 0-5. Extra non-walk actions stay after them.
    extra_actions = []
    for name, action in animations.items():
        lower = name.lower()
        if "walk" in lower or lower == "idle" or lower == "talk":
            continue
        extra_actions.append((name, action))
    extra_actions.sort(key=lambda pair: int(pair[1].get("row", 0)))

    output_rows = 6 + len(extra_actions)
    output = Image.new("RGBA", (frame_width * 8, frame_height * output_rows),
                       (0, 0, 0, 0))

    # Preserve the original idle/talk rows without resampling or repainting.
    idle = animations.get("idle")
    talk = animations.get("talk")
    if idle is not None:
        copy_row(source, output, int(idle["row"]), 0, frame_height)
    if talk is not None:
        copy_row(source, output, int(talk["row"]), 5, frame_height)

    new_animations = {}
    if idle is not None:
        new_animations["idle"] = {**copy.deepcopy(idle), "row": 0}

    # Use one scale for every walking pose. Per-pose fitting makes wide strides
    # shrink independently, causing the character to visibly change size mid-cycle.
    walk_poses: dict[str, list[Image.Image]] = {}
    for direction in directions:
        poses = []
        for frame_index in range(8):
            if walk_atlas is not None:
                pose = frame_crop(walk_atlas, directions.index(direction), frame_index)
            else:
                pose = frame_crop_from_strip(walk_strips[direction], frame_index, direction)
            poses.append(pose)
        walk_poses[direction] = poses
    max_pose_width = max(pose.width for poses in walk_poses.values() for pose in poses)
    max_pose_height = max(pose.height for poses in walk_poses.values() for pose in poses)
    common_scale = min((frame_width - 2) / max_pose_width,
                       (frame_height - 8) / max_pose_height)

    for name, row in WALK_LAYOUT:
        direction = name.removeprefix("walk-")
        for frame_index, pose in enumerate(walk_poses[direction]):
            fitted = fit_pose(pose, frame_width, frame_height, common_scale)
            output.alpha_composite(
                fitted,
                (frame_index * frame_width, row * frame_height),
            )
        new_animations[name] = {"row": row, "frames": 8, "ms": 75}
    if talk is not None:
        new_animations["talk"] = {**copy.deepcopy(talk), "row": 5}

    row_map: dict[int, int] = {}
    for new_row, (name, action) in enumerate(extra_actions, start=6):
        old_row = int(action.get("row", 0))
        if old_row not in row_map:
            copy_row(source, output, old_row, new_row, frame_height)
            row_map[old_row] = new_row
        new_animations[name] = {**copy.deepcopy(action), "row": row_map[old_row]}

    args.output_image.parent.mkdir(parents=True, exist_ok=True)
    args.output_meta.parent.mkdir(parents=True, exist_ok=True)
    output.save(args.output_image, format="PNG", optimize=True)

    candidate_meta = copy.deepcopy(meta)
    candidate_meta["sheet"] = [8, output_rows]
    candidate_meta["animations"] = new_animations
    candidate_meta.pop("animation", None)
    candidate_meta["status"] = "candidate"
    candidate_meta["walkAtlasSource"] = (
        args.walk_atlas.as_posix() if args.walk_atlas else
        {direction: path.as_posix() for direction, path in strip_args.items()}
    )
    candidate_meta["note"] = (
        "Animation-only candidate. Original idle, talk and other non-walk rows were copied "
        "pixel-for-pixel. Four independent walk directions: 8 frames x 75ms; verify alternating "
        "gait phases (A lead/max stride, stride closes through weight transfer, B lead/max stride, "
        "stride closes through weight transfer, then loop), opposite lead legs in frames 1 and 5, "
        "natural counter-swinging arms, stable held props, correct independent left/right facing, "
        "map camera angle and in-game scale before integration."
    )
    with args.output_meta.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(candidate_meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(f"image={args.output_image} size={output.size}")
    print(f"metadata={args.output_meta} sheet={output_rows}x8")
    print("preserved_rows=idle,talk,other non-walk actions")


if __name__ == "__main__":
    main()
