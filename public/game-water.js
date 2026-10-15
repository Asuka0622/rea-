// 水面流动: a canvas over the map that makes its water move, in a pixel-art way. The water's pixels come
// from <map>-water.png (scripts/build-walkmap.py). No new colours are painted on: every water pixel
// shows a pixel of the map picture itself, taken from up to one pixel to the side, and which side moves
// in slow waves along the rows. So the ripples and highlights already painted in the picture sway and
// drift as if the water were flowing. On top, a few sun glints: single pixels that light up, flash into
// a tiny cross and go out. ~8 frames a second keeps the stepped feel of pixel animation; with reduced
// motion the layer stays empty and the picture shows still water.

const FPS = 8;
const GLINT_EVERY = 1400; // about one glint for this many water pixels

export function createWaterLayer({ mask, picture, width, height }) {
  const canvas = document.createElement("canvas");
  canvas.className = "game-water";
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  let water = null; // indices (y * width + x) of water pixels
  let isWater = null;
  let source = null; // the map picture's pixels
  let frame = null;
  let glints = [];
  let running = false;
  let last = 0;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const read = (src) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scratch = document.createElement("canvas");
        scratch.width = width;
        scratch.height = height;
        const sctx = scratch.getContext("2d", { willReadFrequently: true });
        sctx.drawImage(image, 0, 0, width, height);
        resolve(sctx.getImageData(0, 0, width, height).data);
      };
      image.onerror = reject;
      image.src = src;
    });

  if (!still) {
    Promise.all([read(mask), read(picture)])
      .then(([maskData, pictureData]) => {
        source = pictureData;
        isWater = new Uint8Array(width * height);
        const list = [];
        for (let i = 0; i < width * height; i += 1) {
          if (maskData[i * 4 + 3] > 127) {
            isWater[i] = 1;
            list.push(i);
          }
        }
        water = Int32Array.from(list);
        frame = ctx.createImageData(width, height);
        if (running) requestAnimationFrame(loop);
      })
      .catch(() => {});
  }

  function draw(time) {
    const t = time / 1000;
    const out = frame.data;
    out.fill(0);
    for (let n = 0; n < water.length; n += 1) {
      const i = water[n];
      const x = i % width;
      const y = (i - x) / width;
      // Rows sway sideways by -1, 0 or +1 pixel; the wave runs along the row and drifts over time.
      const dx = Math.round(Math.sin(x * 0.07 - t * 1.4 + y * 0.6) * 0.75 + Math.sin(y * 0.27 + t * 0.5) * 0.5);
      const from = isWater[i + dx] ? i + dx : i;
      const o = i * 4;
      const s = from * 4;
      out[o] = source[s];
      out[o + 1] = source[s + 1];
      out[o + 2] = source[s + 2];
      out[o + 3] = 255;
    }
    // Sun glints: born at random water pixels, each lives 4 frames (dot, cross, dot, gone).
    glints = glints.filter((g) => g.age < 4);
    const want = Math.max(1, Math.round(water.length / GLINT_EVERY));
    while (glints.length < want) glints.push({ at: water[Math.floor(Math.random() * water.length)], age: -Math.floor(Math.random() * 12) });
    for (const g of glints) {
      g.age += 1;
      if (g.age < 1) continue;
      const light = (i, a) => {
        if (i < 0 || i >= width * height || !isWater[i]) return;
        const o = i * 4;
        out[o] = out[o] + ((255 - out[o]) * a) / 255;
        out[o + 1] = out[o + 1] + ((255 - out[o + 1]) * a) / 255;
        out[o + 2] = out[o + 2] + ((255 - out[o + 2]) * a) / 255;
      };
      light(g.at, g.age === 2 ? 255 : 200);
      if (g.age === 2) for (const d of [-1, 1, -width, width]) light(g.at + d, 140);
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
      if (water) requestAnimationFrame(loop);
    },
    stop() {
      running = false;
    },
  };
}
