// 演出系统: little cutscenes written as a list of steps, shared by every era (docs/concept.md「表现形式」).
// The game supplies the hooks; a script says who walks where, where the camera looks, what is said,
// and adds shakes, flashes, emotes and sounds. While a cutscene plays the player cannot move.
//
//   { say: [lines] }            dialogue; waits until the player has clicked through it
//   { walk: { x, y } }          the player walks there; waits until arrived
//   { camera: { x, y }, ms }    the camera glides to look at a point; waits
//   { camera: "player", ms }    the camera glides back to the player; waits
//   { wait: ms }                pause
//   { shake: ms }               the screen shakes (does not wait)
//   { flash: ms, color }        a flash of light (does not wait)
//   { emote: "!" }              a bubble over the player: ! ? ♪ … ♥ (does not wait)
//   { sound: "door", pitch }    a sound from game-sound.js (does not wait)
//   { call: () => … }           anything else (waits if it returns a promise)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createDirector(hooks) {
  let playing = false;
  async function run(step) {
    if (step.say) return hooks.say(step.say);
    if (step.walk) return hooks.walk(step.walk.x, step.walk.y);
    if (step.camera) return step.camera === "player" ? hooks.release(step.ms ?? 500) : hooks.focus(step.camera.x, step.camera.y, step.ms ?? 700);
    if (step.wait) return sleep(step.wait);
    if (step.shake) return void hooks.shake(step.shake);
    if (step.flash) return void hooks.flash(step.flash, step.color);
    if (step.emote) return void hooks.emote(step.emote, step.ms ?? 1400);
    if (step.sound) return void hooks.sound(step.sound, step.pitch);
    if (step.call) return step.call();
  }
  return {
    get playing() {
      return playing;
    },
    /** Play a script; resolves when it is over (the player can move again). */
    async play(script) {
      playing = true;
      hooks.lock(true);
      try {
        for (const step of script) await run(step);
      } finally {
        playing = false;
        hooks.lock(false);
      }
    },
  };
}
