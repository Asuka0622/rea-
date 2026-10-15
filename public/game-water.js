// 水面流动: a canvas over the map that makes its water shimmer. The water's pixels come from
// <map>-water.png (scripts/build-walkmap.py). Each frame, slow waves move across them and where a wave
// crests, a pixel lights up a little: soft highlights drifting downstream, like sunlight on moving
// water. Highlights are quantized to two brightness steps so they stay pixel-crisp. ~12 frames per
// second is plenty and costs little; with reduced motion the layer draws one still frame.

const FPS = 12;

export function createWaterLayer(src, { width, height }) {
  const canvas = document.createElement("canvas");
  canvas.className = "game-water";
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  let pixels = null; // indices (y * width + x) of water pixels
  let frame = null;
  let running = false;
  let last = 0;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const mask = new Image();
  mask.onload = () => {
    const scratch = document.createElement("canvas");
    scratch.width = width;
    scratch.height = height;
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(mask, 0, 0);
    const alpha = sctx.getImageData(0, 0, width, height).data;
    const list = [];
    for (let i = 0; i < width * height; i += 1) if (alpha[i * 4 + 3] > 127) list.push(i);
    pixels = Int32Array.from(list);
    frame = ctx.createImageData(width, height);
    draw(0);
    if (running && !still) requestAnimationFrame(loop);
  };
  mask.src = src;

  function draw(time) {
    if (!pixels) return;
    const t = time / 1000;
    const data = frame.data;
    data.fill(0);
    for (let n = 0; n < pixels.length; n += 1) {
      const i = pixels[n];
      const x = i % width;
      const y = (i - x) / width;
      // Two waves at angles to each other, drifting; their product crests in small moving patches.
      const a = Math.sin(x * 0.11 + y * 0.05 - t * 1.3 + Math.sin(y * 0.03 + t * 0.4) * 2);
      const b = Math.sin(y * 0.23 - x * 0.04 + t * 0.9);
      const v = a * 0.65 + b * 0.35;
      if (v < 0.72) continue;
      const o = i * 4;
      data[o] = 235;
      data[o + 1] = 250;
      data[o + 2] = 255;
      data[o + 3] = v > 0.86 ? 120 : 60;
    }
    ctx.putImageData(frame, 0, 0);
  }

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (now - last < 1000 / FPS) return;
    last = now;
    draw(now);
  }

  return {
    canvas,
    start() {
      if (running) return;
      running = true;
      if (pixels && !still) requestAnimationFrame(loop);
    },
    stop() {
      running = false;
    },
  };
}
