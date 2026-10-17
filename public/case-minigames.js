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
