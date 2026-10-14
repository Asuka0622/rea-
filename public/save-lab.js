// 存档实验室: decode the farm game's save step by step, change a value, and see why the checksum
// matters. The format mirrors samples/cases/farm-save/save.js:
//   base64( JSON.stringify({ v, body: JSON.stringify(state), sum: sha256(salt + body).slice(0, 16) }) )

export function fromBase64(text) {
  const bytes = Uint8Array.from(atob(text.trim()), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function toBase64(text) {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function checksum(salt, body) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + body));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Unpack a save: { packed, state }. Throws if it is not this game's format. */
export function openSave(text) {
  const packed = JSON.parse(fromBase64(text));
  if (typeof packed.body !== "string" || typeof packed.sum !== "string") throw new Error("不是这个游戏的存档格式");
  return { packed, state: JSON.parse(packed.body) };
}

/** Re-pack a state, keeping the old checksum (what a naive edit does) or computing a fresh one. */
export async function packSave(packed, state, { salt, fixChecksum }) {
  const body = JSON.stringify(state);
  const sum = fixChecksum ? await checksum(salt, body) : packed.sum;
  return toBase64(JSON.stringify({ ...packed, body, sum }));
}

/** What the game does when loading: { ok, state } or { ok: false } when the checksum does not match. */
export async function gameLoads(text, salt) {
  const { packed, state } = openSave(text);
  return (await checksum(salt, packed.body)) === packed.sum ? { ok: true, state } : { ok: false };
}

export function mountSaveLab({ h, icon, lab }) {
  const root = h("div", { class: "save-lab" });
  const { packed, state } = openSave(lab.content);
  const field = lab.field;
  let step = 0;
  let value = state[field] * 100 + 99;
  let naive = "";
  let naiveResult = null;
  let fixed = "";
  let fixedResult = null;

  const pre = (text, label) => h("pre", { class: "save-lab-code", tabindex: "0", "aria-label": label }, text);
  const result = (outcome) =>
    h("p", { class: `save-lab-result ${outcome.ok ? "ok" : "bad"}`, role: "status" }, icon(outcome.ok ? "check" : "alert", { size: 16 }),
      outcome.ok ? `游戏读档：校验通过，${lab.fieldLabel} ${outcome.state[field]}` : "游戏读档：校验码对不上，弹出「存档被修改过，已重新开始」");

  async function tryNaive() {
    const next = { ...state, [field]: Number(value) || 0 };
    naive = await packSave(packed, next, { salt: lab.salt, fixChecksum: false });
    naiveResult = await gameLoads(naive, lab.salt);
    step = Math.max(step, 3);
    render();
  }

  async function tryFixed() {
    const next = { ...state, [field]: Number(value) || 0 };
    fixed = await packSave(packed, next, { salt: lab.salt, fixChecksum: true });
    fixedResult = await gameLoads(fixed, lab.salt);
    step = Math.max(step, 4);
    render();
  }

  function render() {
    const blocks = [
      h("h4", {}, icon("wrench", { size: 18 }), "存档实验室"),
      h("p", { class: "save-lab-intro" }, "下面是一份真实的存档文件。按照你刚才在报告里发现的规则，一步步把它拆开、改掉、再装回去。"),
      h("div", { class: "save-lab-step" }, h("b", {}, "① 原始存档 slot1.sav"), pre(lab.content, "原始存档内容")),
    ];
    if (step < 1) blocks.push(h("button", { class: "btn primary", type: "button", onclick: () => ((step = 1), render()) }, "用 Base64 还原它"));
    if (step >= 1) {
      blocks.push(
        h("div", { class: "save-lab-step" }, h("b", {}, "② Base64 还原后：外面一层"), pre(JSON.stringify(packed, null, 2), "外层内容"),
          h("p", {}, "body 是游戏进度，sum 是校验码。把 body 再展开："), pre(JSON.stringify(state, null, 2), "游戏进度")),
      );
    }
    if (step === 1) blocks.push(h("button", { class: "btn primary", type: "button", onclick: () => ((step = 2), render()) }, `去改${lab.fieldLabel}`));
    if (step >= 2) {
      blocks.push(
        h("div", { class: "save-lab-step" }, h("b", {}, `③ 把${lab.fieldLabel}改掉，直接装回去`),
          h("label", { class: "save-lab-field" }, `${lab.fieldLabel}：`, h("input", { type: "number", min: "0", max: "99999999", value, oninput: (e) => (value = e.target.value) })),
          h("button", { class: "btn", type: "button", onclick: tryNaive }, "只改数字，校验码不动"),
          naive && pre(naive, "直接修改后的存档"),
          naiveResult && result(naiveResult),
          naiveResult && !naiveResult.ok && h("p", {}, "内容变了，校验码却还是旧的，游戏一算就发现了。")),
      );
    }
    if (step >= 3) {
      blocks.push(
        h("div", { class: "save-lab-step" }, h("b", {}, "④ 按游戏的规则重新算校验码"),
          h("p", {}, "规则在 save.js 里：校验码 = SHA-256( ", h("code", {}, lab.saltName), " + body ) 的前 16 位。报告里遮住的 ", h("code", {}, lab.saltName), " 完整值也写在那里：", h("code", {}, lab.salt), "。"),
          h("button", { class: "btn primary", type: "button", onclick: tryFixed }, "重新计算校验码，再装回去"),
          fixed && pre(fixed, "重新计算校验码后的存档"),
          fixedResult && result(fixedResult),
          fixedResult?.ok && h("p", {}, "成功了。盐写在游戏自己的代码里，所以挡不住看懂代码的人。")),
      );
    }
    root.replaceChildren(...blocks.filter(Boolean));
  }

  render();
  return root;
}
