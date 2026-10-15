// 小镇场景: every page is a place in a small town, with a scene banner, a wooden sign and a line from
// the guide. A pixel picture (public/art/pixel/<art>.png) is used when it exists; otherwise the banner
// draws a simple pixel landscape or room in CSS, so the page never asks for a missing file.

export const SCENES = {
  "real-stories": { place: "小镇档案馆", purpose: "真实世界故事", icon: "learn", line: "我是老秦。这里保存着真实事件；我们一起从事实中找出计算机与安全的教训。" },
  painter: { place: "彩姐的画室", purpose: "ArtCraft 创作软件", icon: "learn", line: "我是彩姐。像素、颜色和分辨率决定了作品的样子。来读读真实开源创作软件的源码，看看它们的结构吧。" },
  arcade: { place: "像素游戏厅", purpose: "真实游戏与 Mod", icon: "learn", line: "我是像素哥。Mod 会改变游戏的数据或规则。先备份，再从一个小改动开始验证效果。" },
  woodshop: { place: "阿木的木工坊", purpose: "动手重建与复刻", icon: "wrench", line: "我是阿木。先观察输入和输出，拆成小步骤，再亲手重建一个功能。" },
  office: { place: "周姐的办公楼", purpose: "版本侦探", icon: "scan", line: "我是周姐。同一个软件升级以后，行为可能变了。到委托板选版本侦探，对比两个版本的证据。" },
  home: { place: "侦探事务所", purpose: "接委托 · 查软件", icon: "scan", art: "scene-office", look: "town", sprites: [["lumi", "28%"]], line: "欢迎回来！委托板上有几个案子在等你。也可以把你自己想查的软件带过来，我们一起拆开看看。" },
  learn: { place: "小镇图书馆", purpose: "新手教程", icon: "learn", art: "scene-library", look: "room", sprites: [["lumi", "72%"]], line: "这里的书按顺序读一遍，就知道拆软件是怎么回事了。不着急，一课大概一分钟。" },
  engines: { place: "工具铺", purpose: "分析引擎", icon: "engines", art: "scene-workshop", look: "town", sprites: [["lumi", "24%"]], line: "大部分软件空手就能查。想看安卓 App 或者程序内部的代码，就得来这儿添置专门的工具。" },
  clients: { place: "驿站", purpose: "接入 AI 助手", icon: "plug", art: "scene-post", look: "town", sprites: [["lumi", "74%"]], line: "想让你常用的 AI 助手也学会拆软件？在这里把工具寄过去，一键就能接上。" },
  doctor: { place: "小镇诊所", purpose: "装备体检", icon: "pulse", art: "scene-clinic", look: "room", sprites: [["lumi", "26%"]], line: "给你的装备做个体检。显示「没装」的大多是可选工具，不影响平常使用。" },
};

/**
 * A scene banner: picture (or drawn stand-in), a hanging sign, and optionally a line of dialogue.
 * `art` is the set of available pixel picture names; `say(text)` builds the dialogue box.
 */
export function sceneBanner({ h, icon, id, place, purpose, iconName, art: picture, look = "town", sprites = [], line, say, have, compact = false }) {
  const hasArt = picture && have.has(picture);
  const banner = h(
    "div",
    { class: `scene ${compact ? "compact" : ""}`, "data-scene": id, "data-look": hasArt ? "art" : look, role: "img", "aria-label": `场景：${place}` },
    hasArt && h("img", { class: "scene-art", src: `/art/pixel/${picture}.png`, alt: "" }),
    !hasArt && h("div", { class: "scene-drawn", "aria-hidden": "true" }, h("span", { class: "scene-sun" }), h("span", { class: "scene-cloud" }), h("span", { class: "scene-cloud two" }), h("span", { class: "scene-window" }), h("span", { class: "scene-ground" })),
    // Characters in the scene (public/art/pixel/sprite-<name>.png, 16x32), drawn at the scene's pixel size.
    ...sprites.filter(([name]) => have.has(`sprite-${name}`)).map(([name, x]) => h("img", { class: "scene-sprite", src: `/art/pixel/sprite-${name}.png`, alt: "", style: `--x:${x}` })),
    h("div", { class: "scene-sign" }, iconName && icon(iconName, { size: 18 }), h("b", {}, place), purpose && h("small", {}, purpose)),
  );
  return h("header", { class: "scene-wrap" }, banner, line && say && say(line));
}

/** Put a scene at the top of every page. */
export function mountScenes({ h, icon, say, have }) {
  for (const [id, scene] of Object.entries(SCENES)) {
    const panel = document.querySelector(`#tab-${id}`);
    if (!panel) continue;
    panel.querySelector(":scope > .scene-wrap")?.remove();
    panel.prepend(sceneBanner({ h, icon, id, place: scene.place, purpose: scene.purpose, iconName: scene.icon, art: scene.art, look: scene.look, sprites: scene.sprites, line: scene.line, say, have }));
  }
}
