"""把美术分支的 6x5 角色精灵源图重采样成主树的部署规格（576x960），并补 JSON。

源：D:/gpt/rea-artwork/public/art/pixel/anim-<id>.png（971x1619，RGBA，6 列 x 5 行）
目标：D:/gpt/rea/public/art/pixel/sprite-<id>.png（576x960）+ .json

为什么用 LANCZOS 而不是 NEAREST：源图是 971x1619 的高分辨率渲染（sourceCanvas），
不是像素原稿；缩到 576x960 是非整数倍，NEAREST 会丢列丢行。带 alpha 缩放必须先预乘，
否则边缘会出现黑边。
"""

# 用法：python scripts/convert-artwork-sprites.py [id ...]  （不给 id 就转全部 anim-*.png）

from PIL import Image
import json
import os
import sys

ART = "D:/gpt/rea-artwork/public/art/pixel"
OUT = "D:/gpt/rea/public/art/pixel"
TARGET = (576, 960)  # 6 列 x 5 行，每帧 96x192


def resample(src_path, dst_path, size=TARGET):
    im = Image.open(src_path)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    prem = im.convert("RGBa")  # 预乘 alpha
    prem = prem.resize(size, Image.Resampling.LANCZOS)
    out = prem.convert("RGBA")
    out.save(dst_path, "PNG", optimize=True)
    return im.size, out.size


def write_json(src_json, dst_json, character):
    with open(src_json, encoding="utf-8") as f:
        data = json.load(f)
    # 源 JSON 的 frame 写的就是目标帧（96x192），图是源分辨率；这里补主树需要的字段。
    data["frame"] = [96, 192]
    data["logicalFrame"] = [16, 32]
    data["sheet"] = [6, 5]
    data["resample"] = "lanczos"
    data["character"] = character
    data["source"] = f"docs/art/review (artwork branch: anim-{character}.png)"
    with open(dst_json, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    ids = sys.argv[1:] or [f[5:-4] for f in os.listdir(ART) if f.startswith("anim-") and f.endswith(".png")]
    for cid in ids:
        src = os.path.join(ART, f"anim-{cid}.png")
        src_json = os.path.join(ART, f"anim-{cid}.json")
        if not os.path.exists(src):
            print("skip", cid, "(no source)")
            continue
        dst = os.path.join(OUT, f"sprite-{cid}.png")
        write_json(src_json, os.path.join(OUT, f"sprite-{cid}.json"), cid) if os.path.exists(src_json) else None
        before, after = resample(src, dst)
        print(f"{cid}: {before} -> {after}  {os.path.getsize(dst)} bytes")


if __name__ == "__main__":
    main()
