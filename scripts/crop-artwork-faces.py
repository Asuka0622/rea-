"""把美术分支的立绘（1086x1448）裁成对话用的方形头像（320x320 WebP）。

主树的对话头像有两种尺寸并存：80x80（部分小镇常驻）和 320x320（路米、老秦）。
立绘规格是「头在上方 82% 的正方形里」——所以取顶部正方形，正好是头肩。

源：D:/gpt/rea-artwork/public/art/faces/<id>-<face>.webp
目标：D:/gpt/rea/public/art/faces/<id>-<face>.webp
"""

# 用法：python scripts/crop-artwork-faces.py carpenter-normal doctor-happy ...

from PIL import Image
import os
import sys

ART = "D:/gpt/rea-artwork/public/art/faces"
OUT = "D:/gpt/rea/public/art/faces"
SIZE = (320, 320)


def crop_to_head(src, dst, size=SIZE):
    im = Image.open(src)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    w, h = im.size
    side = min(w, h)  # 顶部正方形 = 头肩区域
    box = (0, 0, side, side)
    head = im.crop(box)
    prem = head.convert("RGBa").resize(size, Image.Resampling.LANCZOS)
    out = prem.convert("RGBA")
    out.save(dst, "WEBP", quality=88, method=6)
    return (w, h), (side, side), out.size, os.path.getsize(dst)


def main():
    names = sys.argv[1:]
    if not names:
        names = ["carpenter-normal"]
    for name in names:
        src = os.path.join(ART, name + ".webp")
        if not os.path.exists(src):
            print("skip", name, "(no source)")
            continue
        dst = os.path.join(OUT, name + ".webp")
        before, box, after, size = crop_to_head(src, dst)
        print(f"{name}: {before} crop {box} -> {after}  {size} bytes")


if __name__ == "__main__":
    main()
