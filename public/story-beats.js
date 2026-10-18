// Short visual story actions; no quest/progress writes.
export const STORY_BEATS = {
  key: { title: "铁叔打开钟楼", art: "scenes/tower-open", duration: 2800,
    lines: ["铁叔把守了二十年的钥匙插入锁孔。", "咔哒。锁舌退开，门缝透出微光。", "门打开了。里面传来机器低低的嗡鸣。"] },
  boot: { title: "钟楼里的电脑", art: "scenes/tower-open", duration: 3000,
    lines: ["黑暗里，一块屏幕先亮了。", "一排排指示灯接着亮起。", "屏幕上是不断变化的数字。它们代表什么？"] },
  watch: { title: "怀表回应了时光机", art: "scenes/london-1843", duration: 3200,
    lines: ["小克的光点出现在怀表里。", "表盘与黄铜机关一起转动。", "第一格亮起：1843。雾中的街道渐渐显现。"] },
};

export function createStoryBeats({ host, h, reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches, sound = () => {} }) {
  let active = null;
  function stop() { active?.(); }
  function play(id, { hold = false } = {}) {
    const spec = STORY_BEATS[id];
    if (!spec) return Promise.reject(new Error("Unknown story beat: " + id));
    stop();
    const previous = document.activeElement;
    const quiet = reduced();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let timers = [], settled = false, resolvePlay;
    const finished = new Promise(resolve => { resolvePlay = resolve; });
    const caption = h("p", { class: "story-beat-caption", role: "status", "aria-live": "polite" }, spec.lines[0]);
    const svgKey = '<svg viewBox="0 0 320 180" aria-hidden="true"><g class="story-lock"><rect x="192" y="58" width="48" height="64" rx="3" fill="#382b1c" stroke="#d6aa57" stroke-width="4"/><circle cx="216" cy="82" r="7" fill="#0b0906"/><path d="M216 86v17" stroke="#0b0906" stroke-width="6"/><path class="story-bolt" d="M240 86h28v14h-28" fill="#d6aa57"/></g><g class="story-key" stroke="#d6aa57" stroke-width="7" fill="none"><circle cx="68" cy="89" r="15"/><path d="M84 89h132m-26 0v14m15-14v14"/></g><path class="story-door-light" d="M274 20v140" stroke="#f8dfaa" stroke-width="6"/></svg>';
    const lock = h("div", { class: "story-key-detail" });
    lock.innerHTML = svgKey;
    const screen = h("div", { class: "story-console", "aria-hidden": "true" },
      ...Array.from({length: 5}, (_,i) => h("div", { class: "story-screen-row", style: "--i:"+i },
        ...Array.from({length: 14}, (_,j) => h("span", { style: "--j:"+j }, (i*19+j*7)%10)))),
      h("div", { class: "story-console-lights" }, ...Array.from({length: 7}, () => h("i", {}))));
    const watch = h("div", { class: "story-watch", "aria-hidden": "true" },
      h("img", { src: "/art/pixel/ui/pocket-watch-xiaoke.png", alt: "" }),
      h("div", { class: "story-watch-ring" }),
      h("b", { class: "story-watch-year" }, "1843"));
    const button = h("button", { class: "btn story-beat-skip", type: "button", onclick: () => finish() }, hold ? "关闭动画" : "跳过动画");
    const root = h("section", { class: "game-story-beat", role: "region", "aria-label": spec.title, "data-beat": id, "data-phase": "0", "data-reduced": String(quiet) },
      h("img", { class: "story-beat-background", src: "/art/pixel/"+spec.art+".png", alt: "" }),
      h("h2", {}, spec.title),
      id === "key" ? lock : id === "boot" ? screen : watch,
      caption, button);
    function finish() {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout); timers = [];
      root.remove();
      document.body.style.overflow = previousOverflow;
      removeEventListener("pagehide", finish);
      if (active === finish) active = null;
      if (previous?.isConnected && document.activeElement === document.body) previous.focus?.({preventScroll:true});
      resolvePlay();
    }
    active = finish;
    addEventListener("pagehide", finish, { once: true });
    host.append(root);
    button.focus({ preventScroll: true });
    const duration = quiet ? 1800 : spec.duration;
    for (let phase = 1; phase <= 2; phase++) {
      timers.push(setTimeout(() => {
        root.dataset.phase = String(phase); caption.textContent = spec.lines[phase];
        if (!quiet) sound(id === "key" ? "door" : "blip", phase === 1 ? 330 : 440);
      }, duration * phase / 3));
    }
    if (!hold) timers.push(setTimeout(finish, duration));
    return finished;
  }
  return { play, stop };
}

