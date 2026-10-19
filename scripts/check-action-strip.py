"""动作条带的机检（美术交稿先跑，过了再人工审片）。2026-10-19，小克（美术总监验收）写。

用法：python -I scripts/check-action-strip.py <动作条带.png> <这个人运行中的精灵表.png> [--frames N] [--frame 96x192]
  例：python -I scripts/check-action-strip.py docs/art/review/npc-life/barista-wipe-6f-v1/barista-wipe-6f-v1-candidate.png public/art/pixel/sprite-barista.png

查五件事（都是 2026-10-19 验收里真出现过的问题）：
  1. 脚底基线：每帧脚底要和待机第 1 帧一样高（差 >2 像素 = 一切换动作人就往上跳）
  2. 身高：和待机差 >3% 就不行（= 一切换动作人就缩一下）。头顶有道具（伞、帽子举起）时这条要人工看
  3. 贴边：人物或道具碰到帧的左右边（= 被裁掉或串到隔壁帧）
  4. 重复帧：相邻两帧几乎一样（= 动作停住，浪费帧数）
  5. 空帧
退出码 0 = 全过，1 = 有问题。
"""
import sys
from PIL import Image, ImageChops

def args():
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    strip, ref = a[0], a[1]
    fw, fh = 96, 192
    frames = None
    if '--frame' in a:
        fw, fh = map(int, a[a.index('--frame') + 1].split('x'))
    if '--frames' in a:
        frames = int(a[a.index('--frames') + 1])
    return strip, ref, fw, fh, frames

def cells(path, fw, fh, count=None):
    im = Image.open(path).convert('RGBA')
    n = count or im.width // fw
    return [im.crop((i * fw, 0, i * fw + fw, fh)) for i in range(n)]

def solid(cell):
    return cell.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()

def main():
    strip, ref, fw, fh, frames = args()
    idle = cells(ref, fw, fh, 1)[0]
    rb = solid(idle)
    ref_feet, ref_h = rb[3], rb[3] - rb[1]
    problems = []
    seq = cells(strip, fw, fh, frames)
    for i, c in enumerate(seq, 1):
        b = solid(c)
        if not b:
            problems.append(f'第 {i} 帧是空的')
            continue
        if abs(b[3] - ref_feet) > 2:
            problems.append(f'第 {i} 帧脚底在 y={b[3]}，待机是 y={ref_feet}（差 {b[3] - ref_feet}）')
        if i == 1 and abs((b[3] - b[1]) - ref_h) / ref_h > 0.03:
            problems.append(f'身高 {b[3] - b[1]}，待机 {ref_h}（差 {100 * ((b[3] - b[1]) - ref_h) / ref_h:+.0f}%）')
        if b[0] <= 0 or b[2] >= fw:
            problems.append(f'第 {i} 帧碰到帧的左右边（x {b[0]}–{b[2]}）')
    for i in range(len(seq) - 1):
        diff = ImageChops.difference(seq[i], seq[i + 1]).convert('L').point(lambda v: 255 if v > 24 else 0)
        data = diff.get_flattened_data() if hasattr(diff, 'get_flattened_data') else diff.getdata()
        changed = sum(1 for v in data if v)
        if changed < fw * fh * 0.004:
            problems.append(f'第 {i + 1}、{i + 2} 帧几乎一样（只变了 {changed} 个像素）')
    print(f'{strip}: {len(seq)} 帧，对照 {ref}（待机脚底 y={ref_feet}，身高 {ref_h}）')
    for p in problems:
        print('  ✗', p)
    if not problems:
        print('  ✓ 机检通过，可以人工审片')
    sys.exit(1 if problems else 0)

main()
