"""把生成好的场景图（默认 1536x1024）裁成小游戏舞台用的横带（默认 1440x192）。

用法：python scripts/crop-gen-strip.py <源图> [左 上 右 下] [目标宽 高]

为什么裁「机柜下部 + 地板」这一段：底图上如果留着一条走线槽，会跟代码画的两条桥架打架
（用户反馈的「路线突兀」有一半来自这个冲突）。这段正好是机柜底 + 干净地板，桥架叠上去
就是地板上的槽，不需要对齐任何画出来的路线。

源：.sandbox/artgen/Cozy_pixel_art_data_center_int_*.png
目标：public/art/pixel/minigames/mini-td-floor.png
"""

from PIL import Image
import glob
import os

SRC = max(glob.glob("D:/gpt/rea/.sandbox/artgen/Cozy_pixel_art_data_center_int_*.png"), key=os.path.getmtime)
OUT = "D:/gpt/rea/public/art/pixel/minigames/mini-td-floor.png"

# 源里：机柜底约 y=668，地板到 1024，走线槽约 y=815-830。取 560 起、205 高，正好跳过槽。
CROP = (0, 560, 1536, 765)
TARGET = (1440, 192)

im = Image.open(SRC)
print("source", im.size, im.mode)
band = im.crop(CROP)
band = band.convert("RGBa").resize(TARGET, Image.Resampling.LANCZOS).convert("RGBA")
band.save(OUT, "PNG", optimize=True)
print("out", band.size, os.path.getsize(OUT), "bytes")
