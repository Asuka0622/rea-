/** Shared environment states. Autumn clear noon is each delivered base image. */
export const ENV_OPTIONS = {
  season: { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
  time: { morning: '清晨', noon: '正午', sunset: '黄昏', night: '夜晚' },
  weather: { clear: '晴', rain: '雨', snow: '雪' },
};
export function normalizeEnvironment(value = {}) {
  return Object.fromEntries(Object.entries(ENV_OPTIONS).map(([key, options]) => [key,
    Object.hasOwn(options, value?.[key]) ? value[key] : { season: 'autumn', time: 'noon', weather: 'clear' }[key]]));
}
export function environmentArt(base, state, has) {
  const variant = `${base}-${state.season}-clear-noon`;
  return state.season !== 'autumn' && has(variant) ? variant : base;
}
// Measured in each 320×180 room, deliberately inside the visible glass, not across the floor.
export const ROOM_WINDOWS = {
  home: [[0, 15, 37, 58]], learn: [[12, 19, 42, 45]], engines: [[11, 21, 37, 35]],
  clients: [[9, 20, 30, 45]], doctor: [[12, 20, 40, 35]], studio: [[35, 12, 75, 34]],
  arcade: [[194, 13, 89, 39]], woodshop: [[20, 16, 50, 35]], archive: [[12, 18, 38, 42]], office: [[255, 20, 54, 45]],
};
// Fixture centers measured against the delivered room artwork; screens retain their own color.
export const ROOM_LIGHTS = {
  home: [[258, 17, '#ffce73']], learn: [[104, 35, '#ffce73'], [224, 18, '#ffce73']],
  engines: [[208, 20, '#ffbd66']], clients: [],
  doctor: [[121, 32, '#e9f6db'], [294, 21, '#e9f6db']], studio: [[17, 47, '#ffce73']],
  arcade: [[44, 73, '#ef73df'], [93, 73, '#73bbff'], [144, 73, '#65e9dd'], [300, 66, '#ffce73']],
  woodshop: [[205, 8, '#ffce73']], archive: [[236, 78, '#ffce73']], office: [[194, 56, '#a9d9ff']],
};
/** Canvas is a low-resolution presentation layer only; it never intercepts navigation. */
export function mountEnvironment({ stage, host, state, room, width, height, lights = [] }) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.className = 'game-environment'; canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return () => {}; }
  ctx.imageSmoothingEnabled = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0, stopped = false, last = 0;
  const draw = (now) => {
    if (stopped) return;
    if (now - last < 80) { frame = requestAnimationFrame(draw); return; }
    last = now;
    ctx.clearRect(0, 0, width, height);
    const tint = { morning: ['#ffd39b', .09], noon: ['#ffffff', 0], sunset: ['#d56b44', .23], night: ['#101d4b', room ? .58 : .53] }[state.time];
    ctx.globalAlpha = tint[1]; ctx.fillStyle = tint[0]; ctx.fillRect(0, 0, width, height);
    // Change only the glass: outdoor sky temperature must agree with the global state.
    // No extra sunbeams are painted over furniture or the baked baseline shadows.
    if (room) {
      const pane = state.time === 'night' ? ['#102344', .58]
        : state.weather === 'rain' ? ['#40627e', .24]
        : state.weather === 'snow' ? ['#cee5f5', .18]
        : state.time === 'sunset' ? ['#ed9a55', .18]
        : state.time === 'morning' ? ['#ffe1ad', .1] : null;
      if (pane) {
        ctx.globalAlpha = pane[1]; ctx.fillStyle = pane[0];
        for (const [x,y,w,h] of ROOM_WINDOWS[room] || []) ctx.fillRect(x,y,w,h);
      }
    }
    if (state.weather !== 'clear') {
      ctx.globalAlpha = room ? .15 : .13; ctx.fillStyle = '#233b58'; ctx.fillRect(0, 0, width, height);
      ctx.save();
      if (room) { ctx.beginPath(); for (const [x,y,w,h] of ROOM_WINDOWS[room] || []) ctx.rect(x,y,w,h); ctx.clip(); }
      ctx.globalAlpha = .65; ctx.fillStyle = state.weather === 'snow' ? '#f5f9ff' : '#a8d4ef';
      const t = reduced ? 0 : now / (state.weather === 'snow' ? 95 : 18);
      for (let i = 0; i < 105; i++) {
        const x = Math.floor((i * 137 + t * .4) % width), y = Math.floor((i * 71 + t) % height);
        ctx.fillRect(x, y, 1, state.weather === 'snow' ? 1 : 5);
      }
      ctx.restore();
    }
    // Warm practical lights stay local, above the shared dusk/night tint.
    if (state.time === 'night' || state.time === 'sunset' || (room && state.weather !== 'clear')) {
      const practicals = room ? ROOM_LIGHTS[room] || [] : lights;
      for (const [x,y,color = '#ffce73'] of practicals) {
        ctx.fillStyle = color;
        ctx.globalAlpha = .10; ctx.fillRect(x-13,y-7,26,14);
        ctx.globalAlpha = .27; ctx.fillRect(x-5,y-3,10,6);
      }
    }
    ctx.globalAlpha = 1;
    if (!reduced && state.weather !== 'clear') frame = requestAnimationFrame(draw);
  };
  stage.dataset.season = state.season; stage.dataset.time = state.time; stage.dataset.weather = state.weather;
  draw(100);
  return () => { stopped = true; cancelAnimationFrame(frame); canvas.remove(); };
}
