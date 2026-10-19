// 对白里的演出：一句台词可以带一个 fx 字段，播到这一句时触发，整段对话结束时收场。
// 这样剧情不只靠文字推动——线索卡飞上墙、钟面停在 23:58、窗外下雨、天黑下来、小克从屏幕里冒出来、
// 委托人头上冒「！」。全部是代码画的占位，美术交图后由 hasArt 换成图（需求见 docs/art/briefs/story-fx.md）。
//
//   { text, fx: "rain" }                         一个名字
//   { text, fx: { type: "clue", text: "…" } }    带参数
//   { text, fx: ["night", { type: "clue", … }] } 好几个
//
// 种类：
//   shake · flash {color}            震一下 / 闪一下（一次性）
//   clue {title, text}               主线线索卡：飞到屏幕中间、盖章、再缩到右上角钉住
//   wall {cards:[…], ask}            线索墙：卡片一张张钉上去，红线连起来，中间一个问题
//   clock {time}                     钟面：指针转到 time 停住，钟声
//   night · rain                     天黑 / 下雨的整屏滤镜
//   xiaoke {face}                    小克从屏幕下方冒出来（光点 + 头像）
//   stamp {text}                     一枚大印章
// night / rain / clock / xiaoke / clue / wall 会一直留着，直到这段对话结束（end()）。

/** 能用的演出种类（测试用它检查剧情数据里没有拼错的）。 */
export const FX_TYPES = ["shake", "flash", "clue", "wall", "clock", "night", "rain", "xiaoke", "stamp", "feed"];

export function createStoryFx({ h, host, sound = {}, hasArt = () => false }) {
  const layer = h("div", { class: "sfx-layer", "aria-hidden": "true" });
  host.append(layer);
  let pinned = 0; // 这段对话里钉在右上角的线索卡

  const play = (name) => sound[name]?.();
  const keep = (el) => (layer.append(el), el);
  const once = (el, ms) => (layer.append(el), setTimeout(() => el.remove(), ms));

  const FX = {
    shake() {
      host.classList.remove("sfx-shake");
      void host.offsetWidth;
      host.classList.add("sfx-shake");
      setTimeout(() => host.classList.remove("sfx-shake"), 500);
    },
    flash({ color = "#fff6dc" } = {}) {
      once(h("div", { class: "sfx-flash", style: `--c:${color}` }), 700);
    },
    clue({ title = "主线线索", text = "" } = {}) {
      play("clue");
      const card = keep(h("div", { class: "sfx-clue", style: `--slot:${pinned}` }, h("small", {}, title), h("b", {}, text), h("i", { class: "sfx-pin" })));
      pinned += 1;
      setTimeout(() => (card.classList.add("stamped"), play("stamp")), 700);
      setTimeout(() => card.classList.add("pinned"), 1700);
    },
    wall({ cards = [], ask = "" } = {}) {
      const board = h("div", { class: "sfx-wall" });
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "sfx-strings");
      svg.setAttribute("viewBox", "0 0 100 60");
      svg.setAttribute("preserveAspectRatio", "none");
      board.append(svg);
      const spots = [[18, 16], [50, 10], [82, 18], [22, 50], [78, 50]];
      cards.forEach((text, i) => {
        const [x, y] = spots[i % spots.length];
        const card = h("div", { class: "sfx-wall-card", style: `left:${x}%;top:${y / 0.6}%;--d:${i * 550}ms;--tilt:${(i % 2 ? 1 : -1) * (2 + i)}deg` }, h("i", { class: "sfx-pin" }), text);
        board.append(card);
        setTimeout(() => play("page"), i * 550 + 200);
      });
      // 红线：所有卡片连到中间那个问题上
      const center = [50, 42];
      cards.forEach((_, i) => {
        const [x, y] = spots[i % spots.length];
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        Object.entries({ x1: x, y1: y, x2: center[0], y2: center[1], style: `--d:${cards.length * 550 + i * 250}ms` }).forEach(([k, v]) => line.setAttribute(k, v));
        svg.append(line);
      });
      if (ask) {
        const q = h("div", { class: "sfx-wall-ask", style: `--d:${cards.length * 550 + cards.length * 250 + 200}ms` }, ask);
        board.append(q);
        setTimeout(() => play("tension"), cards.length * 800 + 200);
      }
      keep(h("div", { class: "sfx-wall-wrap" }, board));
    },
    clock({ time = "23:58" } = {}) {
      const [hh, mm] = time.split(":").map(Number);
      const face = h("div", { class: "sfx-clock", style: `--h:${((hh % 12) + mm / 60) * 30}deg;--m:${mm * 6}deg` },
        h("i", { class: "hour" }), h("i", { class: "minute" }), h("b", {}, time));
      keep(h("div", { class: "sfx-clock-wrap" }, face));
      setTimeout(() => play("beep"), 900);
    },
    night() {
      keep(h("div", { class: "sfx-night" }));
    },
    rain() {
      keep(h("div", { class: "sfx-rain" }));
    },
    xiaoke({ face = "happy" } = {}) {
      play("unlock");
      const art = hasArt(`xiaoke-${face}`) ? h("img", { src: `/art/faces/xiaoke-${face}.webp`, alt: "" }) : h("span", { class: "sfx-xiaoke-dot" });
      keep(h("div", { class: "sfx-xiaoke" }, h("span", { class: "sfx-xiaoke-glow" }), art, h("small", {}, "小克")));
    },
    // 行为监视器刷屏：一行行很快地冒出来（守夜 23:58，六个软件同时往钟楼送数据）
    feed({ title = "行为监视器", lines = [], gap = 260 } = {}) {
      const list = h("ol", {});
      keep(h("div", { class: "sfx-feed" }, h("b", {}, title), list));
      lines.forEach((text, i) => setTimeout(() => {
        list.append(h("li", {}, text));
        play("beep");
      }, 300 + i * gap));
    },
    stamp({ text = "" } = {}) {
      play("stamp");
      once(h("div", { class: "sfx-stamp" }, text), 1600);
    },
  };

  /** 播到一句台词时调用。 */
  function line(l) {
    if (!l?.fx) return;
    for (const item of [].concat(l.fx)) {
      const spec = typeof item === "string" ? { type: item } : item;
      try {
        FX[spec.type]?.(spec);
      } catch {}
    }
  }
  /** 一段对话说完：留着的演出淡出。 */
  function end() {
    pinned = 0;
    for (const el of [...layer.children]) {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 450);
    }
  }
  return { line, end, play: (fx) => line({ fx }) };
}
