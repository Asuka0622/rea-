#!/usr/bin/env python3
"""生成音频审听台（一次只看一件）。

用法：python scripts/build-audio-review-page.py

读 docs/audio/review/index.json 的待审队列，为每个文件算好波形包络与尾部淡出
区间，连同元信息一起内嵌进 docs/audio/review/review.html。页面自包含，直接用
浏览器打开即可（file:// 下也能播，不需要起服务）。

审核结果保存在浏览器 localStorage，用页面上的「复制裁决」导出后交给部署方
写回 CSV 的 status 字段。
"""

import array
import json
import math
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "docs" / "audio" / "review"
INDEX = REVIEW / "index.json"
OUT = REVIEW / "review.html"

BUCKETS = 1200          # 波形横轴采样桶数
FADE_WINDOW = 0.05      # 淡出检测的窗口（秒）
FADE_LOOKBACK = 6.0     # 只在末尾多少秒内找淡出
FADE_DROP_DB = 3.0      # 低于全曲 RMS 多少 dB 算进入淡出


def read_mono(path):
    """读 wav，返回 (采样率, 单声道整数数组, 满量程, 声道数, 位深)。波形只取左声道。"""
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        ch = w.getnchannels()
        width = w.getsampwidth()
        raw = w.readframes(n)

    if width not in (1, 2, 3, 4):
        raise SystemExit(f"不支持的位深：{width * 8}bit（{path.name}）")

    vals = array.array("i", [0] * n)
    if width == 1:
        for i in range(n):
            vals[i] = raw[i * ch] - 128
        full = 1 << 7
    else:
        step = ch * width
        for i in range(n):
            base = i * step
            vals[i] = int.from_bytes(raw[base:base + width], "little", signed=True)
        full = 1 << (width * 8 - 1)
    return sr, vals, full, ch, width * 8


def to_db(value, full):
    if value <= 0:
        return -99.0
    return 20 * math.log10(value / full)


def rms_db(seg, full):
    total = 0.0
    for v in seg:
        total += float(v) * float(v)
    return to_db(math.sqrt(total / max(len(seg), 1)), full)


def envelope(mono, full):
    n = len(mono)
    size = max(1, n // BUCKETS)
    env = []
    for b in range(BUCKETS):
        lo = b * size
        hi = min(n, (b + 1) * size)
        if lo >= hi:
            env.append([0.0, 0.0])
            continue
        mn = mono[lo]
        mx = mono[lo]
        for i in range(lo + 1, hi):
            v = mono[i]
            if v < mn:
                mn = v
            if v > mx:
                mx = v
        env.append([round(mn / full, 3), round(mx / full, 3)])
    return env


def detect_fade(mono, sr, full, full_rms):
    """从末尾往回找，返回淡出持续的秒数；没有淡出返回 0。"""
    win = max(1, int(sr * FADE_WINDOW))
    tail_start = max(0, len(mono) - int(sr * FADE_LOOKBACK))
    tail = mono[tail_start:]
    if len(tail) < win * 2:
        return 0.0
    levels = []
    for i in range(0, len(tail) - win + 1, win):
        levels.append(rms_db(tail[i:i + win], full))
    if not levels:
        return 0.0
    threshold = full_rms - FADE_DROP_DB
    for idx in range(len(levels) - 1, -1, -1):
        if levels[idx] >= threshold:
            return round((len(levels) - idx) * FADE_WINDOW, 2)
    return round(len(levels) * FADE_WINDOW, 2)


def measure(path):
    sr, mono, full, channels, bit_depth = read_mono(path)
    peak = max(max(mono), -min(mono))
    full_rms = rms_db(mono, full)
    head = mono[: int(sr * 0.05)]
    tail = mono[-int(sr * 0.05):]
    return {
        "file": path.name,
        "sampleRate": sr,
        "bitDepth": bit_depth,
        "channels": channels,
        "seconds": round(len(mono) / sr, 2),
        "peakDbfs": round(to_db(peak, full), 2),
        "rmsDbfs": round(full_rms, 2),
        "headDbfs": round(rms_db(head, full), 2),
        "tailDbfs": round(rms_db(tail, full), 2),
        "fadeSeconds": detect_fade(mono, sr, full, full_rms),
        "sizeMb": round(path.stat().st_size / 1024 / 1024, 1),
        "envelope": envelope(mono, full),
    }


def main():
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    items = []
    for entry in index.get("items", []):
        path = REVIEW / entry["file"]
        if not path.exists():
            print(f"跳过（文件不在）：{entry['file']}")
            continue
        data = measure(path)
        items.append({**entry, **data})

    payload = json.dumps({"updated": index.get("updated"), "items": items}, ensure_ascii=False)
    html = TEMPLATE.replace("__PAYLOAD__", payload)
    OUT.write_text(html, encoding="utf-8")
    print(f"已生成 {OUT.relative_to(ROOT)} · 队列 {len(items)} 件")
    for item in items:
        flag = " · 尾部淡出，不能无缝循环" if item["fadeSeconds"] >= 0.15 else ""
        print(f"  - {item['id']} · {item['seconds']}s · peak {item['peakDbfs']}dBFS · {item['rmsDbfs']}dBFS{flag}")


TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>音频审听台 · 比特镇预告版</title>
<style>
  :root { --bg:#f7f7f5; --panel:#ffffff; --line:#e2e2dd; --ink:#2c2c28; --dim:#76766c; --accent:#3f6f52; --warn:#b06a1f; --bad:#b0352f; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.6 "PingFang SC","Microsoft YaHei",system-ui,sans-serif; }
  header { padding:18px 24px; border-bottom:1px solid var(--line); background:var(--panel); }
  h1 { margin:0; font-size:17px; }
  header p { margin:4px 0 0; color:var(--dim); font-size:12px; }
  .wrap { display:flex; gap:20px; padding:20px 24px 48px; align-items:flex-start; flex-wrap:wrap; }
  aside { width:220px; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px; }
  aside h2 { margin:4px 6px 10px; font-size:12px; color:var(--dim); font-weight:600; letter-spacing:.05em; }
  .q { display:block; width:100%; text-align:left; border:0; border-radius:6px; padding:8px 10px; background:transparent; cursor:pointer; font:inherit; color:var(--ink); }
  .q:hover { background:#f0f0ec; }
  .q.on { background:#e8f0ea; color:var(--accent); font-weight:600; }
  .q small { display:block; color:var(--dim); font-weight:400; font-size:11px; }
  main { flex:1; min-width:320px; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:20px; }
  .id { font-size:18px; font-weight:600; }
  .pill { display:inline-block; border-radius:999px; padding:1px 9px; font-size:11px; border:1px solid var(--line); color:var(--dim); margin-left:6px; }
  .pill.p0 { border-color:#c9dfd1; background:#eaf3ed; color:var(--accent); }
  dl { display:grid; grid-template-columns:88px 1fr; gap:4px 12px; margin:14px 0 0; }
  dt { color:var(--dim); font-size:12px; }
  dd { margin:0; }
  canvas { display:block; width:100%; height:130px; margin:16px 0 6px; border:1px solid var(--line); border-radius:6px; background:#fbfbfa; }
  .ctrl { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:12px 0; }
  button { font:inherit; border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:6px; padding:6px 14px; cursor:pointer; }
  button:hover { background:#f0f0ec; }
  button.go { background:var(--accent); border-color:var(--accent); color:#fff; }
  button.go:hover { background:#355f46; }
  .verdict { display:flex; gap:10px; align-items:center; margin-top:6px; flex-wrap:wrap; }
  .verdict button.on { font-weight:600; }
  .verdict .pass.on { background:#eaf3ed; border-color:#c9dfd1; color:var(--accent); }
  .verdict .reject.on { background:#f7e9e8; border-color:#e3c5c2; color:var(--bad); }
  textarea { width:100%; min-height:62px; font:inherit; border:1px solid var(--line); border-radius:6px; padding:8px; resize:vertical; }
  .note { color:var(--dim); font-size:12px; }
  .warn { color:var(--warn); }
  .bad { color:var(--bad); }
  pre { background:#f6f6f3; border:1px solid var(--line); border-radius:6px; padding:10px; overflow:auto; max-height:150px; font-size:11px; }
</style>
</head>
<body>
<header>
  <h1>音频审听台</h1>
  <p>一次审一件 · 结果存在本机浏览器 · 审完点「复制裁决」交回部署方</p>
</header>
<div class="wrap">
  <aside>
    <h2>待审队列</h2>
    <div id="queue"></div>
  </aside>
  <main id="stage"></main>
</div>

<script>
const DATA = __PAYLOAD__;
const STORE = "rea-audio-verdicts";
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
const save = (all) => localStorage.setItem(STORE, JSON.stringify(all));
let verdicts = load();
let current = 0;

function mmss(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderQueue() {
  const box = document.getElementById("queue");
  box.replaceChildren(...DATA.items.map((item, i) => {
    const b = document.createElement("button");
    b.className = "q" + (i === current ? " on" : "");
    const state = verdicts[item.id]?.verdict || "待定";
    b.innerHTML = `${item.id}<small>${item.category} · ${state}</small>`;
    b.onclick = () => { current = i; render(); };
    return b;
  }));
}

function drawWave(canvas, item) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);

  const mid = h / 2;
  const env = item.envelope;
  const n = env.length;
  const fadeFrom = item.fadeSeconds > 0 ? n - Math.round(item.fadeSeconds / item.seconds * n) : n;

  g.strokeStyle = "#9a9a90";
  g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();

  for (let i = 0; i < n; i++) {
    const x = (i / n) * w;
    const [mn, mx] = env[i];
    const y1 = mid - mx * (h / 2 - 6);
    const y2 = mid - mn * (h / 2 - 6);
    g.strokeStyle = i >= fadeFrom ? "#d99a4e" : "#4a7f61";
    g.beginPath(); g.moveTo(x, y1); g.lineTo(x, Math.max(y2, y1 + 0.8)); g.stroke();
  }

  if (item.fadeSeconds > 0) {
    const x = (fadeFrom / n) * w;
    g.fillStyle = "rgba(217,154,78,.10)";
    g.fillRect(x, 0, w - x, h);
    g.strokeStyle = "#d99a4e";
    g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    g.setLineDash([]);
  }
}

function render() {
  renderQueue();
  const item = DATA.items[current];
  const stored = verdicts[item.id] || { verdict: "待定", note: "" };
  const fadeBad = item.fadeSeconds >= 0.15;
  const rmsHot = item.rmsDbfs > -18;

  const stage = document.getElementById("stage");
  stage.innerHTML = `
    <div class="id">${item.id}<span class="pill ${item.priority.toLowerCase()}">${item.priority}</span>
      <span class="pill">${item.category}</span></div>
    <dl>
      <dt>用在哪儿</dt><dd>${item.use || "—"}</dd>
      <dt>触发</dt><dd>${item.trigger || "—"}</dd>
      <dt>目标时长</dt><dd>${item.targetSeconds} 秒</dd>
      <dt>实测时长</dt><dd>${item.seconds} 秒（${mmss(item.seconds)}）</dd>
      <dt>格式</dt><dd>${item.sampleRate} Hz · ${item.bitDepth} bit · ${item.channels === 2 ? "立体声" : "单声道"} · 母版 WAV ${item.sizeMb} MB</dd>
      <dt>响度</dt><dd>
        峰值 <b>${item.peakDbfs} dBFS</b> ·
        全曲 RMS <b class="${rmsHot ? "warn" : ""}">${item.rmsDbfs} dBFS</b>
      </dd>
      <dt>首尾</dt><dd>
        开头 50 ms <b>${item.headDbfs} dBFS</b> ·
        结尾 50 ms <b class="${fadeBad ? "bad" : ""}">${item.tailDbfs} dBFS</b>
        ${fadeBad ? `<br><span class="bad">检测到尾部淡出约 ${item.fadeSeconds} 秒，直接循环会有塌陷</span>` : ""}
      </dd>
      <dt>落地目录</dt><dd><code>${item.targetDirectory}</code></dd>
    </dl>

    <canvas id="wave"></canvas>
    <div class="note">绿色是主体，橙色是检测到的尾部淡出段。母版体积较大，首次播放要等一下；开循环、从接缝前 3 秒听最准。</div>

    <div class="ctrl">
      <button id="toggle" class="go">播放</button>
      <button id="seam">跳到接缝前 3 秒</button>
      <label><input type="checkbox" id="loop" checked> 循环</label>
      <span class="note" id="pos">0:00 / ${mmss(item.seconds)}</span>
    </div>

    <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">

    <div><b>裁决</b></div>
    <div class="verdict">
      <button class="pass" data-v="通过">通过</button>
      <button class="reject" data-v="退回返修">退回返修</button>
      <button data-v="待定">待定</button>
    </div>
    <textarea id="note" placeholder="听感备注：哪里好、哪里不对、要音频组改什么">${stored.note}</textarea>
    <div class="ctrl">
      <button id="save">保存这一件的裁决</button>
      <button id="copy">复制全部裁决 JSON</button>
    </div>
    <pre id="out"></pre>
  `;

  const audio = new Audio(item.file);
  audio.loop = document.getElementById("loop").checked;
  const toggle = document.getElementById("toggle");
  const pos = document.getElementById("pos");

  toggle.onclick = () => (audio.paused ? audio.play() : audio.pause());
  audio.onplay = () => (toggle.textContent = "暂停");
  audio.onpause = () => (toggle.textContent = "播放");
  audio.ontimeupdate = () => (pos.textContent = `${mmss(audio.currentTime)} / ${mmss(item.seconds)}`);
  document.getElementById("seam").onclick = () => {
    audio.currentTime = Math.max(0, item.seconds - 3);
    if (audio.paused) audio.play();
  };
  document.getElementById("loop").onchange = (e) => (audio.loop = e.target.checked);

  const buttons = stage.querySelectorAll(".verdict button");
  const paint = () => buttons.forEach((b) => b.classList.toggle("on", b.dataset.v === stored.verdict));
  paint();
  buttons.forEach((b) => (b.onclick = () => { stored.verdict = b.dataset.v; paint(); }));
  document.getElementById("note").oninput = (e) => (stored.note = e.target.value);

  document.getElementById("save").onclick = () => {
    verdicts[item.id] = stored;
    save(verdicts);
    renderQueue();
    document.getElementById("out").textContent = `已保存 ${item.id}：${stored.verdict}`;
  };
  document.getElementById("copy").onclick = () => {
    const text = JSON.stringify({ updated: DATA.updated, verdicts }, null, 2);
    document.getElementById("out").textContent = text;
    navigator.clipboard?.writeText(text);
  };

  drawWave(document.getElementById("wave"), item);
  window.addEventListener("resize", () => drawWave(document.getElementById("wave"), item));
}

render();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
