// 小游戏模块 (docs/minigame-genres.md): the case's sandbox step can be one of these instead of a plain lab.
// Each keeps the lab contract so case-session needs no changes: take { h, icon, lab, onMistake, onHint,
// onDone } and call onDone() when finished. Every mapping is chosen so the action in the game is the
// action in the job — see the genre doc for what each one stands for.
//
// 塔防 borrows from 保卫萝卜 / 明日方舟: one path, deployment slots along it, a deployment budget that
// regenerates, units you place and upgrade, waves of data collectors walking toward what you protect.
// The budget is the point: every control costs something, and the lamp still has to work.
//
// 节奏 borrows from 音游 (Cytus / Muse Dash / 太鼓): notes ride a lane toward a judgment line, hits are
// graded, combo and accuracy are shown, misses say what leaked out.

//
// 经营 borrows from Game Dev Story / Papers, Please: a company, a daily ledger, one switch per
// permission. Ad money only flows while the lamp works; 查处 risk only builds while the dangerous
// ones stay on; when the hammer falls it names the permission that called it down.
//
// 卡牌 borrows from 逆转裁判's cross-examination: the developer claims one thing at a time and the
// player presents the one evidence card that answers exactly that claim. Wrong cards say what they
// DO prove, so a miss is still a lesson in "evidence must match the claim".

const cls = (parts) => parts.filter(Boolean).join(" ");

function head(h, icon, title, onHint) {
  return h("div", { class: "mini-head" }, h("b", {}, title),
    h("button", { class: "btn small", type: "button", onclick: () => onHint?.() }, icon("learn", { size: 14 }), "给个提示"));
}

/**
 * 塔防 · 权限 (王奶奶)
 * 数据：{ budget, regen, hp, slots:[{at}], units:[{id,label,cost,dps,range,slow,note}], waves:[{count,hp,speed}] }
 */
export function mountTower({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.tower || {};
  const units = spec.units || [];
  const slots = (spec.slots || []).map((slot) => ({ ...slot, unit: null }));
  const waves = spec.waves || [];
  let budget = spec.budget ?? 24;
  let hp = spec.hp ?? 3;
  let wave = -1;
  let enemies = [];
  let picked = units[0]?.id || null;
  let running = false;
  let last = 0;

  const bar = h("div", { class: "mini-td-bar" });
  const path = h("div", { class: "mini-td-path" }, h("div", { class: "mini-td-home" }, "隐私"));
  const say = h("p", { class: "mini-say", role: "status" }, "先选一个措施，点路径上的位置放下去。收集者从右边来，走到最左边就泄出去了。");
  const palette = h("div", { class: "mini-td-units" });
  const start = h("button", { class: "btn primary", type: "button", onclick: () => nextWave() }, icon("scan", { size: 14 }), "放下一波");
  const root = h("div", { class: "mini mini-td" }, head(h, icon, lab.sampleTitle || "权限塔防", onHint), bar, path, palette, h("div", { class: "mini-controls" }, start), say);

  const slotEls = slots.map((slot) => h("button", {
    class: "mini-td-slot", type: "button", style: `left:${slot.at}%`,
    onclick: () => {
      if (slot.unit) return upgrade(slot);
      const unit = units.find((u) => u.id === picked);
      if (!unit) return;
      if (budget < unit.cost) { say.textContent = `${unit.label}：预算不够（剩 ${Math.round(budget)}）。`; return; }
      budget -= unit.cost;
      slot.unit = { ...unit, level: 1 };
      say.textContent = `${unit.label}：${unit.note || "放在这里"}。`;
      paint();
    },
  }, h("small", {}, "空位")));
  slotEls.forEach((el) => path.append(el));
  path.append(h("div", { class: "mini-td-spawn" }, "收集者"));

  const upgrade = (slot) => {
    const unit = slot.unit;
    if (budget < unit.cost) { say.textContent = `${unit.label}：预算不够升级。`; return; }
    budget -= unit.cost;
    unit.level += 1;
    unit.dps = Math.round(unit.dps * 1.6);
    say.textContent = `${unit.label} 升到 ${unit.level} 级。`;
    paint();
  };

  const paletteEls = units.map((unit) => h("button", {
    class: cls(["mini-td-unit", picked === unit.id && "picked"]), type: "button", onclick: () => { picked = unit.id; paint(); },
  }, h("b", {}, unit.label), h("span", {}, `${unit.cost} 点`), ...(unit.note ? [h("small", {}, unit.note)] : [])));
  palette.append(...paletteEls);

  const paint = () => {
    const maxHp = spec.hp ?? 3;
    bar.replaceChildren(
      h("span", { class: "mini-td-stat" }, `预算 ${Math.round(budget)}`),
      h("span", { class: "mini-td-stat" }, `隐私 ${"●".repeat(Math.max(0, hp))}${"○".repeat(Math.max(0, maxHp - hp))}`),
      h("span", { class: "mini-td-stat" }, `第 ${Math.max(1, wave + 1)}/${waves.length} 波`));
    slotEls.forEach((el, i) => {
      const slot = slots[i];
      el.className = cls(["mini-td-slot", slot.unit && "placed"]);
      el.replaceChildren(...(slot.unit ? [h("b", {}, slot.unit.label), h("i", {}, `Lv${slot.unit.level}`)] : [h("small", {}, "空位")]));
    });
    paletteEls.forEach((el, i) => el.classList.toggle("picked", units[i].id === picked));
  };

  const drawEnemies = () => {
    path.querySelectorAll(".mini-td-enemy").forEach((el) => el.remove());
    for (const enemy of enemies) path.append(h("div", { class: "mini-td-enemy", style: `left:${enemy.x}%` }, "数据包"));
  };

  const tick = (now) => {
    if (!running) return;
    const dt = Math.min(0.4, (now - last) / 1000);
    last = now;
    budget = Math.min(spec.budget ?? 24, budget + (spec.regen ?? 1.5) * dt);
    for (const enemy of enemies) {
      enemy.x -= enemy.speed * (enemy.slow > 0 ? 0.45 : 1) * dt;
      enemy.slow = Math.max(0, enemy.slow - dt);
      if (enemy.x <= 0) {
        enemy.dead = true;
        hp -= 1;
        onMistake();
        say.textContent = "泄出去了：有收集者走到了最左边。";
      }
    }
    for (const enemy of enemies) for (const slot of slots) {
      const unit = slot.unit;
      if (!unit || enemy.dead) continue;
      if (Math.abs(enemy.x - slot.at) <= (unit.range ?? 22)) {
        enemy.hp -= unit.dps * dt;
        if (unit.slow) enemy.slow = 1.2;
        if (enemy.hp <= 0) { enemy.dead = true; say.textContent = `${unit.label}拦下了一个。`; }
      }
    }
    enemies = enemies.filter((enemy) => !enemy.dead);
    paint();
    drawEnemies();
    if (hp <= 0) return finish(false);
    if (!enemies.length && wave < waves.length - 1) return nextWave();
    if (!enemies.length && wave >= waves.length - 1) return finish(true);
    requestAnimationFrame(tick);
  };

  const nextWave = () => {
    if (wave >= waves.length - 1) return finish(true);
    wave += 1;
    const spec2 = waves[wave];
    say.textContent = `第 ${wave + 1} 波：${spec2.count} 个收集者。`;
    for (let i = 0; i < spec2.count; i += 1) enemies.push({ x: 100 - i * 8, hp: spec2.hp ?? 3, speed: spec2.speed ?? 6, slow: 0 });
    running = true;
    last = performance.now();
    paint();
    requestAnimationFrame(tick);
  };

  const finish = (ok) => {
    running = false;
    start.disabled = true;
    say.textContent = ok ? "守住了：只用了该用的措施，灯也一直亮着。" : "隐私被掏空了——想想哪些门本可以不开。";
    onDone();
  };
  paint();
  return root;
}

/**
 * 节奏 · 定时上报 (小林)
 * 数据：{ bpm, lead, approach, notes:[{beat, kind:'upload'|'sync', label}] }
 */
export function mountRhythm({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const pattern = lab.rhythm || { bpm: 100, lead: 3, approach: 2.4, notes: [
    { beat: 0, kind: "sync", label: "你点的同步" },
    { beat: 2, kind: "upload", label: "自动上传" },
    { beat: 3.5, kind: "upload", label: "自动上传" },
    { beat: 5, kind: "sync", label: "你点的同步" },
    { beat: 6.5, kind: "upload", label: "自动上传" },
    { beat: 8, kind: "upload", label: "自动上传" }] };
  const beatMs = 60000 / (pattern.bpm || 100);
  const approach = (pattern.approach || 2.4) * beatMs;
  const notes = (pattern.notes || []).map((note, i) => ({ ...note, i, at: (pattern.lead ?? 3) * beatMs + note.beat * beatMs, judged: null }));
  const lane = h("div", { class: "mini-rh-lane" }, h("div", { class: "mini-rh-line" }));
  const say = h("p", { class: "mini-say", role: "status" }, "红色是它在偷偷上传——拍点上按空格切断；绿色是你自己点的同步，别切。");
  const score = h("div", { class: "mini-rh-score" });
  let running = false, start0 = 0, combo = 0, best = 0, perfect = 0, good = 0, missed = 0;
  const noteEls = notes.map((note) => h("div", { class: cls(["mini-rh-note", note.kind]), "data-note": note.i }, note.kind === "upload" ? "上传" : "同步"));
  const hit = h("div", { class: "mini-rh-hit", hidden: true }, "");
  lane.append(...noteEls, hit);
  const root = h("div", { class: "mini mini-rhythm" }, head(h, icon, lab.sampleTitle || "行为监视器", onHint), lane,
    h("div", { class: "mini-controls" }, h("button", { class: "btn primary", type: "button", onclick: () => go() }, icon("scan", { size: 14 }), "开始"), score), say);

  const show = (text, kind) => {
    hit.textContent = text;
    hit.className = cls(["mini-rh-hit", kind]);
    hit.hidden = false;
    clearTimeout(hit.timer);
    hit.timer = setTimeout(() => { hit.hidden = true; }, 550);
  };
  const paintScore = () => {
    const acc = Math.round(((perfect + good * 0.6) / (notes.length || 1)) * 100);
    score.replaceChildren(h("span", {}, `连击 ${combo}（最高 ${best}）`), h("span", {}, `准度 ${acc}%`), h("span", {}, `漏 ${missed}`));
  };
  const finish = () => {
    running = false;
    paintScore();
    say.textContent = missed ? `有 ${missed} 拍漏了——那些已经发出去了。` : "一拍没漏：它确实是自己在定时传。";
    onDone();
  };
  const step = (now) => {
    if (!running) return;
    const t = now - start0;
    for (const note of notes) {
      noteEls[note.i].style.left = `${100 - 85 * ((t - (note.at - approach)) / approach)}%`;
      if (!note.judged && t > note.at + 190) {
        if (note.kind === "upload") {
          note.judged = "miss";
          missed += 1;
          combo = 0;
          onMistake();
          say.textContent = `${note.label || "上传"}：漏了，东西已经发走了。`;
          show("漏掉", "miss");
        } else {
          note.judged = "ok";
          combo += 1;
          best = Math.max(best, combo);
          show("没切（对）", "good");
        }
      }
    }
    paintScore();
    if (t > (notes[notes.length - 1]?.at || 6000) + 900) return finish();
    requestAnimationFrame(step);
  };
  const press = (event) => {
    if (!running) return;
    if (event.type === "keydown" && event.key !== " ") return;
    event.preventDefault?.();
    const t = performance.now() - start0;
    const near = notes.filter((n) => !n.judged).sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0];
    if (!near || Math.abs(near.at - t) > 260) return;
    const grade = Math.abs(near.at - t) <= 90 ? "perfect" : "good";
    near.judged = grade;
    if (near.kind === "upload") {
      if (grade === "perfect") perfect += 1; else good += 1;
      combo += 1;
      best = Math.max(best, combo);
      show(grade === "perfect" ? "完美切断" : "还行", grade);
      say.textContent = `${near.label || "上传"}：${grade === "perfect" ? "干净地切断了" : "切断了，但慢了半拍"}。`;
    } else {
      onMistake();
      combo = 0;
      show("切错了", "miss");
      say.textContent = `${near.label || "同步"}：这是你要的同步，切了反而坏了。`;
    }
    paintScore();
  };
  const go = () => {
    if (running) return;
    running = true;
    start0 = performance.now();
    say.textContent = "来了——红拍上按空格。";
    requestAnimationFrame(step);
  };
  document.addEventListener("keydown", press);
  lane.addEventListener("click", () => press({ type: "click", preventDefault: () => {} }));
  paintScore();
  return root;
}

/**
 * 管道 · 数据流向 (阿哲): route the secret into the server, not into the package you are about to ship.
 */
export function mountPipes({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.pipes || { size: 4, tiles: [], start: [0, 0], exits: [] };
  const size = spec.size;
  const tiles = spec.tiles.map((tile) => ({ ...tile, dirs: [...tile.dirs] }));
  const at = (x, y) => tiles.find((t) => t.x === x && t.y === y);
  const grid = h("div", { class: "mini-grid", style: `--n:${size}` });
  const say = h("p", { class: "mini-say", role: "status" }, "点格子转动管道：把密钥接到「服务器」，别接到「发布包」。");
  const count = h("span", {}, "还没接通");
  let ended = false;
  const rotate = (tile) => {
    if (tile.fixed) return;
    tile.dirs.unshift(tile.dirs.pop());
    paint();
  };
  const reach = () => {
    const [sx, sy] = spec.start;
    const seen = new Set([`${sx},${sy}`]);
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      const [up, right, down, left] = (at(x, y) || { dirs: [0, 0, 0, 0] }).dirs;
      const move = (nx, ny, open, back) => {
        if (!open) return;
        const other = at(nx, ny);
        if (!other || !other.dirs[back] || seen.has(`${nx},${ny}`)) return;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      };
      move(x, y - 1, up, 2); move(x + 1, y, right, 3); move(x, y + 1, down, 0); move(x - 1, y, left, 1);
    }
    return spec.exits.map((exit) => ({ exit, reached: seen.has(`${exit.x},${exit.y}`) }));
  };
  const cells = [];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const tile = at(x, y) || { x, y, dirs: [0, 0, 0, 0], fixed: true };
    const pipe = h("span", { class: "mini-pipe" }, h("i", { class: "a-u" }), h("i", { class: "a-r" }), h("i", { class: "a-d" }), h("i", { class: "a-l" }), h("b", {}));
    cells.push(h("button", { class: "mini-cell", type: "button", "data-x": x, "data-y": y, onclick: () => rotate(tile) }, pipe));
  }
  grid.append(...cells);
  const cellAt = (x, y) => cells.find((cell) => Number(cell.dataset.x) === x && Number(cell.dataset.y) === y);
  for (const exit of spec.exits) cellAt(exit.x, exit.y)?.append(h("span", { class: `mini-exit ${exit.kind}` }, exit.kind === "server" ? "服务器" : "发布包"));
  cellAt(spec.start[0], spec.start[1])?.append(h("span", { class: "mini-exit start" }, "密钥"));
  const paint = () => {
    for (const cell of cells) {
      const tile = at(Number(cell.dataset.x), Number(cell.dataset.y));
      const [up, right, down, left] = tile?.dirs || [0, 0, 0, 0];
      cell.classList.toggle("fixed", Boolean(tile?.fixed));
      cell.querySelector(".mini-pipe").className = cls(["mini-pipe", up && "u", right && "r", down && "d", left && "l"]);
    }
    const state = reach();
    if (state.find((s) => s.exit.kind === "package")?.reached) {
      onMistake();
      count.textContent = "走错了";
      say.textContent = "密钥流进了发布包——谁拆开都能看到。转回去。";
      return;
    }
    if (state.find((s) => s.exit.kind === "server")?.reached) {
      count.textContent = "已接通服务器";
      say.textContent = "接通了：密钥该在服务器上，不该留在要发出去的包里。";
      if (!ended) { ended = true; onDone(); }
      return;
    }
    count.textContent = "还没接通";
  };
  paint();
  return h("div", { class: "mini mini-pipes" }, head(h, icon, lab.sampleTitle || "数据流向", onHint), grid, h("div", { class: "mini-controls" }, count), say);
}

/**
 * 经营 · 权限的代价 (王奶奶手电筒公司): the board handed you every switch turned on. Run the company for
 * a week — ad income flows only while the lamp works, users drain and 查处 risk builds while the
 * dangerous permissions stay on, and rent goes out either way. When the hammer falls it names the
 * permission that called it down.
 * 数据：{ days, users, rent, riskMax, bankFloor, perms:[{id,label,need,income,churn,risk,note}],
 *         events:[{at,lose,label,text}] }
 */
export function mountManage({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.manage || {
    days: 7, users: 100, rent: 4, riskMax: 120, bankFloor: -20,
    perms: [
      { id: "flash", label: "闪光灯（开灯用）", need: true, income: 0, churn: 0, risk: 0, note: "灯的本职。关了它，App 就是个摆设。" },
      { id: "internet", label: "INTERNET（联网）", income: 9, churn: 0, risk: 5, note: "广告要它；SDK 把数据传出去，也要它。" },
      { id: "contacts", label: "READ_CONTACTS（通讯录）", income: 6, churn: 2, risk: 6, note: "广告 SDK 想认识你的朋友。" },
      { id: "location", label: "FINE_LOCATION（精确定位）", income: 5, churn: 3, risk: 5, note: "好推「附近」的广告。" },
      { id: "boot", label: "BOOT_COMPLETED（开机自启）", income: 2, churn: 3, risk: 3, note: "一开机就开始干活。" },
      { id: "camera", label: "CAMERA（相机）", income: 0, churn: 1, risk: 2, note: "开灯用不着摄像头。" },
    ],
    events: [
      { at: 40, lose: 15, label: "商店问询", text: "商店来问：一个手电筒，为什么要读通讯录？" },
      { at: 80, lose: 30, label: "通报批评", text: "被通报「超范围收集」，用户吵翻了。" },
      { at: 120, lose: 999, label: "下架", text: "应用被下架了。" },
    ],
  };
  const perms = spec.perms.map((perm) => ({ ...perm, on: true }));
  const events = spec.events || [];
  let day = 1;
  let users = spec.users ?? 100;
  let cash = spec.cash ?? 0;
  let risk = 0;
  let fired = new Set();
  let notified = 0;
  let over = false;

  const say = h("p", { class: "mini-say", role: "status" }, "董事会把权限全开了，广告收入到账、用户在流失、查处风险在涨。该关哪几项，你来定——每过一天结一次账。");
  const log = h("div", { class: "mini-mg-log" });
  const meter = h("span", { class: "mini-mg-meter" }, h("i", {}));
  const bar = h("div", { class: "mini-mg-bar" });
  const next = h("button", { class: "btn primary", type: "button", onclick: () => endDay() }, icon("scan", { size: 14 }), "过一天");
  const restart = h("button", { class: "btn", type: "button", hidden: true, onclick: () => reset() }, "重新开张");
  const permEls = perms.map((perm) => h("button", {
    class: "mini-mg-perm on", type: "button",
    onclick: () => {
      if (over) return;
      perm.on = !perm.on;
      if (perm.need && !perm.on) { onMistake(); say.textContent = "这是开灯本身要用的权限——灯不亮，什么都谈不上。"; }
      else if (!perm.need && perm.on) say.textContent = `${perm.label}：${perm.note || "打开它"}。`;
      else if (!perm.need) say.textContent = `关掉 ${perm.label}：广告少一份，风险也少一份。`;
      paint();
    },
  }, h("b", {}, perm.label),
    ...(perm.income ? [h("span", { class: "gain" }, `广告 +${perm.income}/天`)] : []),
    ...(perm.churn ? [h("span", { class: "cost" }, `掉粉 ${perm.churn}/天`)] : []),
    ...(perm.risk ? [h("span", { class: "cost" }, `风险 +${perm.risk}/天`)] : []),
    ...(perm.need ? [h("span", { class: "gain" }, "开灯必须")] : []),
    ...(perm.note ? [h("small", {}, perm.note)] : [])));
  const root = h("div", { class: "mini mini-manage" }, head(h, icon, lab.manageTitle || "权限的代价", onHint),
    bar, h("div", { class: "mini-mg-perms" }, ...permEls), h("div", { class: "mini-controls" }, next, restart), say, log);

  const paint = () => {
    const maxRisk = spec.riskMax ?? 120;
    bar.replaceChildren(
      h("span", { class: "mini-td-stat" }, `第 ${Math.min(day, spec.days)}/${spec.days} 天`),
      h("span", { class: "mini-td-stat" }, `现金 ¥${Math.round(cash)}`),
      h("span", { class: "mini-td-stat" }, `用户 ${Math.max(0, Math.round(users))}`),
      h("span", { class: "mini-td-stat" }, `被查风险 ${Math.round(risk)}/${maxRisk}`));
    bar.append(meter);
    meter.firstChild.style.width = `${Math.min(100, (risk / maxRisk) * 100)}%`;
    permEls.forEach((el, i) => { el.className = cls(["mini-mg-perm", perms[i].on ? "on" : "off"]); });
  };

  const endDay = () => {
    if (over) return;
    const on = perms.filter((perm) => perm.on);
    const lamp = on.find((perm) => perm.need);
    const income = lamp ? on.reduce((sum, perm) => sum + (perm.income || 0), 0) : 0;
    const churn = on.reduce((sum, perm) => sum + (perm.churn || 0), 0);
    const rent = spec.rent ?? 4;
    const topRisk = () => [...perms].filter((perm) => perm.on && !perm.need && perm.risk).sort((a, b) => b.risk - a.risk)[0];
    cash += income - rent;
    users -= churn;
    risk += on.reduce((sum, perm) => sum + (perm.risk || 0), 0);
    const lines = [`第 ${day} 天：${lamp ? `进账 ¥${income}` : "灯没亮，收入 ¥0"}，房租 ¥${rent}${churn ? `，掉粉 ${churn}` : ""}。`];
    if (!lamp) {
      onMistake();
      lines.push("开灯要用的权限被关了——灯都不亮，谈不上生意。");
      say.textContent = "灯没亮。开灯那项是本职权限，不能关。";
    }
    for (const event of events) {
      if (risk >= event.at && !fired.has(event.label)) {
        fired.add(event.label);
        notified += 1;
        users -= event.lose;
        const culprit = topRisk();
        lines.push(`【${event.label}】${event.text}${culprit ? `（风险最大的一项：${culprit.label}）` : ""}`);
        say.textContent = `${event.label}：${event.text}`;
        if (event.label !== "商店问询") onMistake();
      }
    }
    users = Math.max(0, users);
    log.prepend(...lines.map((line) => h("div", {}, line)));
    if (users <= 0) return finish(false, `用户跑光了。${topRisk()?.label || "多余的权限"}把大家吓走了。`);
    if (cash < (spec.bankFloor ?? -20)) return finish(false, `钱烧完了（¥${Math.round(cash)}）：房租都交不起。`);
    if (day >= spec.days) return finish(true);
    day += 1;
    paint();
  };

  const finish = (ok, text) => {
    over = true;
    next.hidden = true;
    restart.hidden = false;
    if (ok) {
      say.textContent = `撑过 ${spec.days} 天：现金 ¥${Math.round(cash)}，剩 ${Math.round(users)} 个用户${notified ? `，被查 ${notified} 次` : ""}。`
        + (cash <= 10 ? "只留本职最安全，但也最穷——这就是最小权限的代价与安心。"
          : "钱赚到了，风险也在账上写着：每一项权限都要有人负责。");
      onDone();
    } else {
      say.textContent = text;
      onMistake();
      log.prepend(h("div", {}, text));
    }
    paint();
  };

  const reset = () => {
    day = 1;
    users = spec.users ?? 100;
    cash = spec.cash ?? 0;
    risk = 0;
    fired = new Set();
    notified = 0;
    over = false;
    for (const perm of perms) perm.on = true;
    next.hidden = false;
    restart.hidden = true;
    log.replaceChildren();
    say.textContent = "再开一次：这回先想好，哪几项是本职。";
    paint();
  };
  paint();
  return root;
}

/**
 * 卡牌 · 对质 (通用): the developer claims one thing at a time; the player presents the one evidence
 * card that answers exactly that claim, 逆转裁判 style. 出对牌 == 用对证据 — a wrong card says what it
 * does prove instead, so every miss still teaches "evidence must match the claim".
 * 数据：{ opponent, cards:[{id,label,note}], claims:[{text,answer,why}] }
 */
export function mountCards({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.cards || {
    opponent: "开发者",
    cards: [
      { id: "capture", label: "抓包记录", note: "你没点任何东西，它每 30 秒上传一次" },
      { id: "timer", label: "代码：setInterval(…, 30000)", note: "每 30 秒干一次活的，只有定时器" },
      { id: "sdk", label: "安装包里的 SDK 名单", note: "上传的收件人是广告 SDK 的地址" },
      { id: "terms", label: "用户协议第 14 条", note: "写着「可能收集信息」" },
      { id: "changelog", label: "更新日志", note: "只写了「修复闪退」" },
      { id: "lamp", label: "手电筒 APK 的权限清单", note: "另一个案子的证据，和本案无关" },
    ],
    claims: [
      { text: "我从不收集。你不点同步，它就不会上传。", answer: "capture", why: "抓包记录：你一下都没点，它每 30 秒自己传一次。" },
      { text: "就算有，那也是一次性的统计，不会自己定时跑。", answer: "timer", why: "代码里的 setInterval(30000)：会自己定时跑的，只有定时器。" },
      { text: "数据发到我们自己的服务器，没给过别人。", answer: "sdk", why: "收件地址在 SDK 名单里，是广告公司的，不是开发者的。" },
      { text: "用户都同意了，协议里写得明明白白。", answer: "terms", why: "第 14 条写的是「可能收集」，没说定时——还藏在 9 页长文里。" },
    ],
  };
  const cards = spec.cards || [];
  const claims = spec.claims || [];
  let idx = 0;
  let wrong = 0;

  const bubble = h("div", { class: "mini-cd-claim" });
  const verdict = h("p", { class: "mini-cd-verdict" }, "");
  const count = h("span", { class: "mini-count" });
  const say = h("p", { class: "mini-say", role: "status" }, `${spec.opponent || "对方"}一句句说，你出对应的那张证据牌。对质不是吵架：让每一句话都对上一件证据。`);
  const paint = () => {
    bubble.replaceChildren(h("b", {}, `${spec.opponent || "对方"}：`), ` ${claims[idx]?.text || "……（他不说话了）"}`);
    count.textContent = `已驳回 ${idx}/${claims.length} · 打错 ${wrong}`;
  };
  const play = (card) => {
    const claim = claims[idx];
    if (!claim || !card) return;
    if (card.id === claim.answer) {
      idx += 1;
      verdict.className = "mini-cd-verdict refute";
      verdict.textContent = `【等一下！】${claim.why || "这句话被证据驳倒了。"}`;
      if (idx >= claims.length) {
        say.textContent = wrong
          ? `全部驳回，打错 ${wrong} 次——每张牌只说明一件事，出牌前先听清对面在主张什么。`
          : "一张没错。证据和主张一一对应，这就是证据链。";
        onDone();
      } else {
        say.textContent = "驳倒了。他换了种说法，下一句。";
      }
    } else {
      wrong += 1;
      onMistake();
      verdict.className = "mini-cd-verdict";
      verdict.textContent = `${card.label}——这张牌说明不了这句：它${card.note || "讲的是另一件事"}。`;
      say.textContent = "证据要对着主张出：先听清这句话在主张什么，再挑牌。";
    }
    paint();
  };
  const cardEls = cards.map((card) => h("button", { class: "mini-cd-card", type: "button", onclick: () => play(card) },
    h("b", {}, card.label), ...(card.note ? [h("small", {}, card.note)] : [])));
  paint();
  return h("div", { class: "mini mini-cards" }, head(h, icon, lab.cardsTitle || "当面对质", onHint),
    bubble, verdict, h("div", { class: "mini-cd-cards" }, ...cardEls), h("div", { class: "mini-controls" }, count), say);
}
