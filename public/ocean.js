// A procedural ocean drawn with WebGL: sky and sun above the waterline, waves seen from above,
// and an underwater world (rippled surface light, sun shafts, drifting particles) that darkens
// as `depth` goes from 0 (at the surface) to 1 (the deepest layer of an analysis).

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDepth;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
// Rippled light on the underside of the surface.
float caustic(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.006), p.y / (cos(i.y + tt) / 0.006)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;
  float d = clamp(uDepth, 0.0, 1.0);

  // The waterline rises past the camera as it dives.
  float rise = smoothstep(0.0, 0.34, d);
  float swell = 0.016 * sin(p.x * 3.1 + t * 0.9) + 0.011 * sin(p.x * 7.7 - t * 1.4) + 0.035 * (fbm(vec2(p.x * 1.4 + t * 0.12, t * 0.18)) - 0.5);
  swell *= 1.0 + 6.0 * rise * (1.0 - rise);
  float line = mix(0.29, 1.32, rise) + swell;
  vec2 sun = vec2(0.76 * aspect, mix(0.35, 1.30, rise));
  vec3 col;

  if (uv.y > line) {
    float h = uv.y - line;
    vec3 skyTop = vec3(0.34, 0.56, 0.80);
    vec3 skyLow = vec3(0.98, 0.79, 0.60);
    col = mix(skyLow, skyTop, smoothstep(0.0, 0.5, h));
    float cloud = smoothstep(0.52, 0.86, fbm(vec2(p.x * 1.8 + t * 0.012, uv.y * 7.0 - t * 0.01)));
    col = mix(col, vec3(1.0, 0.94, 0.89), cloud * 0.55 * smoothstep(0.02, 0.3, h));
    float sd = length((p - sun) * vec2(1.0, 1.5));
    col += vec3(1.0, 0.80, 0.48) * exp(-sd * 10.0) * 0.95 + vec3(1.0, 0.62, 0.36) * exp(-sd * 2.6) * 0.22;
    col = mix(col, vec3(0.97, 0.82, 0.70), exp(-h * 30.0) * 0.35);
  } else {
    float below = line - uv.y;

    // The sea seen from above, with a glitter path under the sun.
    float persp = 0.12 + uv.y * 2.6;
    float n = fbm(vec2(p.x * 3.6 / persp + t * 0.05, uv.y * 26.0 / persp - t * 0.35));
    vec3 above = mix(vec3(0.03, 0.11, 0.17), vec3(0.22, 0.34, 0.42), smoothstep(0.0, line, uv.y));
    above += (n - 0.5) * 0.14;
    // Sun path: soft glints that shrink toward the horizon (kept low-frequency so the half-resolution render stays smooth).
    float path = exp(-pow((p.x - sun.x) * 2.4 / persp, 2.0));
    float sparkle = noise(vec2(p.x * 22.0 / persp, uv.y * 48.0 / persp - t * 1.3)) * noise(vec2(p.x * 9.0 / persp + t * 0.4, uv.y * 31.0 / persp));
    float glint = smoothstep(0.42, 0.8, sparkle);
    above += vec3(1.0, 0.84, 0.58) * glint * path * smoothstep(0.0, line, uv.y) * 1.1;
    above += vec3(1.0, 0.74, 0.5) * path * smoothstep(line - 0.12, line, uv.y) * 0.16;

    // Under the surface: brighter near the top while shallow, near-black in the deepest layer.
    float deep = smoothstep(0.32, 1.0, d);
    vec3 top = mix(vec3(0.24, 0.60, 0.66), vec3(0.03, 0.09, 0.16), deep);
    vec3 bottom = mix(vec3(0.03, 0.19, 0.31), vec3(0.004, 0.018, 0.04), deep);
    vec3 under = mix(bottom, top, smoothstep(0.0, 1.0, uv.y));
    float nearSurface = smoothstep(0.45, 1.0, uv.y) * (1.0 - deep);
    under += vec3(0.78, 0.96, 0.96) * caustic(p * vec2(2.6, 5.2) + vec2(0.0, t * 0.05), t * 0.32) * nearSurface * 0.55;
    vec2 dir = p - vec2(0.72 * aspect, 1.3);
    float angle = atan(dir.x, -dir.y);
    float rays = pow(smoothstep(0.48, 0.92, fbm(vec2(angle * 8.0, t * 0.12))), 1.4);
    under += vec3(0.86, 0.96, 0.82) * rays * exp(-length(dir) * 1.25) * (1.0 - deep * 0.85) * 0.6;
    vec2 g = p * 16.0 + vec2(t * 0.05, t * 0.22);
    vec2 cell = floor(g);
    vec2 offset = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
    float speck = smoothstep(0.07, 0.0, length(fract(g) - 0.5 - offset * 0.6)) * step(0.84, hash(cell));
    under += speck * mix(0.22, 0.45, deep) * vec3(0.8, 0.92, 1.0);

    col = mix(above, under, smoothstep(0.06, 0.30, d));
    col += vec3(0.92, 0.96, 1.0) * exp(-below * 80.0) * 0.38 * (1.0 - deep);
  }

  col *= 1.0 - 0.32 * pow(length(uv - vec2(0.5, 0.55)), 2.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
  return shader;
}

/**
 * Start the ocean on a canvas. Returns controls; without WebGL the page keeps its CSS gradient.
 * Renders at reduced resolution and ~30 fps, and stops entirely while hidden or paused.
 */
export function createOcean(canvas, { scale = 0.55 } = {}) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power", preserveDrawingBuffer: false });
  const noop = { setDepth() {}, setActive() {}, setPaused() {}, get depth() { return 0; }, onDepth() {}, supported: false };
  if (!gl) return noop;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link failed");
  } catch (error) {
    console.warn("Ocean background disabled:", error.message);
    return noop;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uDepth = gl.getUniformLocation(program, "uDepth");

  let depth = 0;
  let target = 0;
  let active = true;
  let paused = false;
  let clock = 0;
  let last = performance.now();
  let lastDraw = 0;
  let frame = 0;
  const listeners = new Set();

  function resize() {
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, clock);
    gl.uniform1f(uDepth, depth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const still = paused || reduceMotion.matches;
    if (!still) clock += dt;
    // Ease toward the target depth: a dive takes about two seconds.
    const step = still ? 1 : Math.min(1, dt * 1.6);
    const before = depth;
    depth += (target - depth) * step;
    if (Math.abs(target - depth) < 0.0005) depth = target;
    if (depth !== before) for (const fn of listeners) fn(depth);
    if (now - lastDraw > 33 || depth !== before) {
      lastDraw = now;
      draw();
    }
    if (active && (!still || depth !== target)) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (!frame && active && document.visibilityState === "visible") {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  document.addEventListener("visibilitychange", () => (document.visibilityState === "visible" ? wake() : (cancelAnimationFrame(frame), (frame = 0))));
  new ResizeObserver(() => (draw(), wake())).observe(canvas);
  reduceMotion.addEventListener?.("change", wake);
  draw();
  wake();

  return {
    supported: true,
    get depth() {
      return depth;
    },
    setDepth(value) {
      target = Math.max(0, Math.min(1, value));
      wake();
    },
    setActive(value) {
      active = value;
      if (active) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    setPaused(value) {
      paused = value;
      wake();
    },
    onDepth(fn) {
      listeners.add(fn);
    },
  };
}
