"""把生成的中心广场图处理成 2560x1440 的母版候选，并叠上 town-v2-plan 的建筑框做校验。

目的：让美术看到「构图可以照这张，但坐标必须按这些框画」。叠框图也用来判断生成图偏了多少。
输出：
  docs/art/review/regions/center-v2-candidate.png      干净候选（2560x1440）
  docs/art/review/regions/center-v2-blockout-check.png 叠了建筑框/门/主路/spawn 的校验图
"""

from PIL import Image, ImageDraw, ImageFont
import glob
import json
import os

SRC = max(glob.glob("D:/gpt/rea/.sandbox/artgen/Cozy_pixel_art_town_plaza*.png"), key=os.path.getmtime)
OUT_DIR = "D:/gpt/rea/docs/art/review/regions"
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 2560, 1440
CROP = (0, 76, 1536, 940)  # 1536x864 = 16:9

plan = json.load(open("D:/gpt/rea/docs/world/town-v2-plan.json", encoding="utf-8"))
center = [z for z in plan["zones"] if z["id"] == "center"][0]

im = Image.open(SRC).convert("RGB")
band = im.crop(CROP).resize((W, H), Image.Resampling.LANCZOS)
band.save(os.path.join(OUT_DIR, "center-v2-candidate.png"), "PNG", optimize=True)
print("candidate", band.size)

# ---- 校验图 ----
check = band.copy()
d = ImageDraw.Draw(check, "RGBA")


def box(rect, color, label=""):
    d.rectangle(rect, outline=color, width=5)
    if label:
        d.text((rect[0] + 8, rect[1] + 6), label, fill=color)


for b in center["buildings"]:
    f = b["footprint"]
    box([f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]], (255, 96, 72, 230), b["name"])
    door = b["door"]
    d.ellipse([door["x"] - 10, door["y"] - 10, door["x"] + 10, door["y"] + 10], fill=(120, 220, 255, 240))

for p in center.get("paths", []):
    pts = [(x, y) for x, y in p["points"]]
    d.line(pts, fill=(120, 220, 255, 150), width=6)

for e in center["exits"]:
    ax, ay = e["anchor"]
    d.ellipse([ax - 18, ay - 18, ax + 18, ay + 18], outline=(255, 220, 120, 240), width=5)

sx, sy = center["spawn"]
d.ellipse([sx - 22, sy - 22, sx + 22, sy + 22], outline=(140, 255, 160, 240), width=6)

# 人物尺度参考：门净高按 72-88 世界单位、人 56-64
d.rectangle([40, H - 200, 40 + 64, H - 200 + 64], outline=(255, 255, 255, 200), width=3)
d.text((40, H - 232), "person 64u", fill=(255, 255, 255, 220))

check.save(os.path.join(OUT_DIR, "center-v2-blockout-check.png"), "PNG", optimize=True)
print("check", check.size)
