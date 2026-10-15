// 音效: small sounds made on the fly with Web Audio (no sound files): a blip per character of dialogue,
// a door, right and wrong answers, a skill unlocked. Soft by default; the menu bar has a switch, saved
// in this browser. The audio starts on the first click or key press (browsers require a gesture).

const KEY = "rea-game-sound";

export function createSound() {
  let on = true;
  try {
    on = localStorage.getItem(KEY) !== "0";
  } catch {}
  let ctx = null;
  let master = null;
  const wake = () => {
    if (ctx) return ctx.state === "suspended" ? ctx.resume() : undefined;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
  };
  window.addEventListener("pointerdown", wake, { capture: true });
  window.addEventListener("keydown", wake, { capture: true });

  /** One note: frequency (Hz), start delay and length (s), wave shape, loudness. */
  function note(freq, { at = 0, length = 0.08, type = "square", volume = 0.5, slide = 0 } = {}) {
    if (!on || !ctx || ctx.state !== "running") return;
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  const sounds = {
    /** A dialogue character; the pitch wobbles a little so speech sounds alive. */
    blip: (pitch = 520) => note(pitch + Math.random() * 60, { length: 0.04, volume: 0.18 }),
    door: () => {
      note(140, { length: 0.12, type: "triangle", volume: 0.6, slide: -60 });
      note(660, { at: 0.1, length: 0.18, type: "sine", volume: 0.3 });
    },
    step: () => note(90 + Math.random() * 20, { length: 0.03, type: "triangle", volume: 0.12 }),
    right: () => [523, 659, 784].forEach((f, i) => note(f, { at: i * 0.07, length: 0.12, volume: 0.35 })),
    wrong: () => note(180, { length: 0.22, type: "sawtooth", volume: 0.25, slide: -60 }),
    unlock: () => [659, 784, 988, 1319].forEach((f, i) => note(f, { at: i * 0.08, length: 0.16, type: "triangle", volume: 0.4 })),
    click: () => note(880, { length: 0.03, volume: 0.15 }),
  };

  return {
    ...sounds,
    get on() {
      return on;
    },
    toggle() {
      on = !on;
      try {
        localStorage.setItem(KEY, on ? "1" : "0");
      } catch {}
      wake();
      if (on) sounds.click();
      return on;
    },
  };
}
