// 小游戏模块 (docs/minigame-genres.md): the case's sandbox step can be one of these instead of a plain lab.
// Each one keeps the same contract as a lab mount so case-session needs no changes: take { h, icon, lab,
// onMistake, onHint, onDone } and call onDone() when the player has finished. Every mapping here is chosen
// so the action in the game is the action in the job — see the genre doc for what each one stands for.

const cls = (parts) => parts.filter(Boolean).join(" ");

/** A shared header: what this is, how far along you are, and the hint button the session counts. */
function header(h, icon, title, count, onHint) {
  return h("div", { class: "mini-head" },
    h("b", {}, title),
    h("span", { class: "mini-count" }, count),
    h("button", { class: "btn small", type: "button", onclick: () => onHint?.() }, icon("learn", { size: 14 }), "给个提示"));
}

/**
 * 节奏 · 定时上报 (小林): the app uploads on a timer whether you asked it to or not. Upload beats must be
 * cut on the beat; the sync beats are the ones you actually asked for, and cutting those breaks the app.
 * Space or a click on the track judges the beat under the playhead.
 */
export function mountRhythm({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  // A default run lets the game be tried on its own (see ?debug&mini=<case>&kind=rhythm).
  const pattern = lab.rhythm || { window: 300, beats: [
    { at: 1400, kind: 'sync', label: '你点的同步' }, { at: 3200, kind: 'upload', label: '自动上传' },
    { at: 5200, kind: 'upload', label: '自动上传' }, { at: 7000, kind: 'sync', label: '你点的同步' },
    { at: 8800, kind: 'upload', label: '自动上传' }] };
  const beats = (pattern.beats || []).map((beat, i) => ({ ...beat, i, done: false }));
  const windowMs = pattern.window || 260;
  const span = (beats[beats.length - 1]?.at || 6000) + 1200;
  const track = h("div", { class: "mini-track" });
  const say = h("p", { class: "mini-say", role: "status" }, "点「开始」，红色的上传拍点上按空格切断；绿色的同步别切。");
  const count = h("span", {}, `0/${beats.filter((b) => b.kind === "upload").length}`);
  const cursor = h("div", { class: "mini-cursor" });
  const marks = beats.map((beat) => h("button", {
    class: cls(["mini-beat", beat.kind]), type: "button", style: `left:${(beat.at / span) * 100}%`, "data-beat": beat.i,
    onclick: () => judge(beat),
  }, beat.kind === "upload" ? "上传" : "同步"));
  track.append(...marks, cursor);

  let running = false;
  let start = 0;
  let cut = 0;
  const judge = (beat) => {
    if (!running || beat.done) return;
    beat.done = true;
    const el = track.querySelector(`[data-beat="${beat.i}"]`);
    el?.classList.add("judged");
    if (beat.kind === "upload") {
      cut += 1;
      el?.classList.add("cut");
      say.textContent = `${beat.label || "上传"}：切断了。`;
      count.textContent = `${cut}/${beats.filter((b) => b.kind === "upload").length}`;
      if (beats.every((b) => b.kind !== "upload" || b.done)) finish();
    } else {
      onMistake();
      el?.classList.add("wrong");
      say.textContent = `${beat.label || "同步"}：这是你要的同步，切了反而坏了。`;
    }
  };
  const finish = () => {
    running = false;
    say.textContent = "全部上传都切断了。它确实是自己在定时发。";
    onDone();
  };
  const step = (now) => {
    if (!running) return;
    const t = now - start;
    cursor.style.left = `${Math.min(100, (t / span) * 100)}%`;
    for (const beat of beats) if (!beat.done && Math.abs(beat.at - t) < windowMs / 2) track.querySelector(`[data-beat="${beat.i}"]`)?.classList.add("live");
    for (const beat of beats) if (beat.kind === "upload" && !beat.done && t > beat.at + windowMs) {
      beat.done = true;
      track.querySelector(`[data-beat="${beat.i}"]`)?.classList.add("missed");
      onMistake();
      say.textContent = `${beat.label || "上传"}：漏了一拍，东西已经发走了。`;
    }
    if (t < span) requestAnimationFrame(step);
    else if (running) finish();
  };
  const go = h("button", { class: "btn primary", type: "button", onclick: () => {
    if (running) return;
    running = true;
    start = performance.now();
    say.textContent = "来了——红色拍点上按空格。";
    requestAnimationFrame(step);
  } }, icon("scan", { size: 14 }), "开始");
  const press = (event) => {
    if (!running || (event.type === "keydown" && event.key !== " ")) return;
    event.preventDefault?.();
    const t = performance.now() - start;
    const near = beats.filter((b) => !b.done).sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0];
    if (near && Math.abs(near.at - t) <= windowMs) judge(near);
  };
  const root = h("div", { class: "mini mini-rhythm" }, header(h, icon, lab.sampleTitle || "行为监视器", "", onHint), track, h("div", { class: "mini-controls" }, go, count), say);
  root.addEventListener("keydown", press);
  root.tabIndex = 0;
  setTimeout(() => root.focus?.(), 0);
  document.addEventListener("keydown", press);
  return root;
}

/**
 * 塔防 · 权限 (王奶奶): the app is a keep and every permission is a gate. Data collectors walk down a lane;
 * an open gate lets them through, and every leak counts. Only the gate the lamp needs stays open.
 */
export function mountTower({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const data = lab.tower || { gates: [], waves: [] };
  const gates = data.gates.map((gate) => ({ ...gate, open: true })); // the app asked for all of them
  const lanes = h("div", { class: "mini-lanes" });
  const say = h("p", { class: "mini-say", role: "status" }, "一波波数据收集者来了。开着的门就是入口——只留开灯要用的那扇。");
  const count = h("span", {}, "0 次泄露");
  let leaks = 0;
  let wave = 0;
  let walking = false;

  const rows = gates.map((gate) => {
    const door = h("button", {
      class: cls(["mini-gate", gate.need ? "needed" : "", gate.open ? "open" : ""]), type: "button",
      onclick: () => {
        gate.open = !gate.open;
        door.classList.toggle("open", gate.open);
        const label = door.querySelector("small");
        if (label) label.textContent = gate.open ? "开着" : "关着";
        say.textContent = `${gate.label}：${gate.open ? "打开了" : "关上了"}。`;
      },
    }, gate.label, h("small", {}, gate.open ? "开着" : "关着"));
    return h("div", { class: "mini-lane" }, h("span", { class: "mini-lane-name" }, gate.label), h("div", { class: "mini-lane-path" }, h("div", { class: "mini-walker", hidden: true }, "数据包")), door);
  });
  lanes.append(...rows);

  const nextWave = () => {
    if (wave >= data.waves.length) return finish();
    const spec = data.waves[wave];
    const row = rows.find((_, i) => gates[i].id === spec.gate);
    const walker = row?.querySelector(".mini-walker");
    if (!walker) return nextWave();
    walking = true;
    walker.hidden = false;
    walker.style.left = "0%";
    say.textContent = `第 ${wave + 1} 波：往「${spec.label || gates.find((g) => g.id === spec.gate)?.label}」来了。`;
    let left = 0;
    const tick = setInterval(() => {
      left += 6;
      walker.style.left = `${left}%`;
      if (left >= 100) {
        clearInterval(tick);
        walker.hidden = true;
        walking = false;
        const gate = gates.find((g) => g.id === spec.gate);
        if (gate.open) {
          leaks += 1;
          onMistake();
          count.textContent = `${leaks} 次泄露`;
          say.textContent = `${gate.label}：门开着，数据出去了。`;
        } else say.textContent = `${gate.label}：门关着，被挡住了。`;
        wave += 1;
        setTimeout(nextWave, 400);
      }
    }, 40);
  };
  const finish = () => {
    const lamp = gates.find((g) => g.need);
    if (lamp && !lamp.open) {
      onMistake();
      say.textContent = `${lamp.label}：这扇关了——灯也就不亮了。开灯要用的门得留着。`;
    } else say.textContent = "守住了：只留了开灯要用的那扇门。";
    onDone();
  };
  const go = h("button", { class: "btn primary", type: "button", onclick: () => { if (!walking && wave === 0) nextWave(); } }, icon("scan", { size: 14 }), "放第一波进来");
  return h("div", { class: "mini mini-tower" }, header(h, icon, lab.sampleTitle || "权限塔防", "", onHint), lanes, h("div", { class: "mini-controls" }, go, count), say);
}

/**
 * 管道 · 数据流向 (阿哲): route the secret out of the code and into the server, not into the package you
 * are about to ship. Rotating a tile is the whole verb; the check is which exit the data reaches.
 */
export function mountPipes({ h, icon, lab, onMistake = () => {}, onHint = () => {}, onDone = () => {} }) {
  const spec = lab.pipes || { size: 4, tiles: [], start: [0, 0], exits: [] };
  const size = spec.size;
  // dirs are [up, right, down, left]
  const tiles = spec.tiles.map((tile) => ({ ...tile, dirs: [...tile.dirs] }));
  const at = (x, y) => tiles.find((t) => t.x === x && t.y === y);
  const grid = h("div", { class: "mini-grid", style: `--n:${size}` });
  const say = h("p", { class: "mini-say", role: "status" }, "点格子转动管道：把密钥接到「服务器」，别接到「发布包」。");
  const count = h("span", {}, "还没接通");

  const rotate = (tile) => {
    if (tile.fixed) return;
    tile.dirs.unshift(tile.dirs.pop());
    paint();
  };
  const solved = () => {
    const [sx, sy] = spec.start;
    const seen = new Set([`${sx},${sy}`]);
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      const tile = at(x, y);
      const [up, right, down, left] = tile.dirs;
      const move = (nx, ny, open, back) => {
        if (!open) return;
        const other = at(nx, ny);
        if (!other || !other.dirs[back] || seen.has(`${nx},${ny}`) || nx < 0 || ny < 0 || nx >= size || ny >= size) return;
        seen.add(`${nx},${ny}`);
        queue.push([nx, ny]);
      };
      move(x, y - 1, up, 2);
      move(x + 1, y, right, 3);
      move(x, y + 1, down, 0);
      move(x - 1, y, left, 1);
    }
    return spec.exits.map((exit) => ({ exit, reached: seen.has(`${exit.x},${exit.y}`) }));
  };
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tile = at(x, y) || { x, y, dirs: [0, 0, 0, 0], fixed: true };
      const pipe = h("span", { class: "mini-pipe" }, h("i", { class: "a-u" }), h("i", { class: "a-r" }), h("i", { class: "a-d" }), h("i", { class: "a-l" }), h("b", {}));
      cells.push(h("button", { class: "mini-cell", type: "button", "data-x": x, "data-y": y, onclick: () => rotate(tile) }, pipe));
    }
  }
  grid.append(...cells);
  const cellAt = (x, y) => cells.find((cell) => Number(cell.dataset.x) === x && Number(cell.dataset.y) === y);
  for (const exit of spec.exits) {
    cellAt(exit.x, exit.y)?.append(h("span", { class: `mini-exit ${exit.kind}` }, exit.kind === "server" ? "服务器" : "发布包"));
  }
  cellAt(spec.start[0], spec.start[1])?.append(h("span", { class: "mini-exit start" }, "密钥"));
  const paint = () => {
    for (const cell of cells) {
      const tile = at(Number(cell.dataset.x), Number(cell.dataset.y));
      const [up, right, down, left] = tile?.dirs || [0, 0, 0, 0];
      cell.classList.toggle("fixed", Boolean(tile?.fixed));
      cell.querySelector(".mini-pipe").className = cls(["mini-pipe", up && "u", right && "r", down && "d", left && "l"]);
    }
    const state = solved();
    const good = state.find((s) => s.exit.kind === "server");
    const bad = state.find((s) => s.exit.kind === "package");
    if (bad?.reached) {
      onMistake();
      count.textContent = "走错了";
      say.textContent = "密钥流进了发布包——谁拆开都能看到。转回去。";
      return;
    }
    if (good?.reached) {
      count.textContent = "已接通服务器";
      say.textContent = "接通了：密钥该在服务器上，不该留在要发出去的包里。";
      onDone();
      return;
    }
    count.textContent = "还没接通";
  };
  paint();
  return h("div", { class: "mini mini-pipes" }, header(h, icon, lab.sampleTitle || "数据流向", "", onHint), grid, h("div", { class: "mini-controls" }, count), say);
}
