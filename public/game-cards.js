// 卡片编程: programs made of instruction cards instead of typed code (docs/gameplay.md「代码的形式」).
// Shared by every puzzle that needs one: the clock tower's instructions, the loom's punch cards, this
// era's digit-splitting… A puzzle supplies its cards and its world; the engine lays out the program,
// runs it step by step on the first test (lighting the card being run and showing the state), then
// checks every test.
//
// cards: { id: { label, kind: "do" | "while" | "until" | "end", run?(state), test?(state) } }
//   do     an action: run(state) changes the state
//   while  「当……时，重复」: checks test(state) before each round (may run zero times)
//   until  「先做一遍，直到……才停」: runs the body, then stops once test(state) is true
//   end    closes the nearest open repeat
// tests: [{ input, want, label }]; start(input) makes the state, result(state) is compared with want.
// show(state) is the line under the program while it runs.

const MAX_STEPS = 400;

/** Flat card list → tree; returns { tree } or { error }. */
function parse(list, cards) {
  const root = [];
  const stack = [{ body: root }];
  for (const [index, id] of list.entries()) {
    const card = cards[id];
    if (card.kind === "end") {
      if (stack.length === 1) return { error: `第 ${index + 1} 张「${card.label}」前面没有要结束的重复卡。` };
      stack.pop();
    } else if (card.kind === "while" || card.kind === "until") {
      const node = { id, index, body: [] };
      stack[stack.length - 1].body.push(node);
      stack.push(node);
    } else stack[stack.length - 1].body.push({ id, index });
  }
  if (stack.length > 1) return { error: "有一张重复卡还没有配上「结束重复」。" };
  return { tree: root };
}

/** Runs a tree on a state; records every card run (for the animation). Throws on too many steps. */
function execute(tree, cards, state, trace) {
  const step = (node) => {
    if (trace.length > MAX_STEPS) throw new Error("loop");
    const card = cards[node.id];
    trace.push({ index: node.index, state: structuredClone(state) });
    if (card.kind === "do") card.run(state);
    else if (card.kind === "while") {
      while (card.test(state)) {
        node.body.forEach(step);
        trace.push({ index: node.index, state: structuredClone(state) });
        if (trace.length > MAX_STEPS) throw new Error("loop");
      }
    } else if (card.kind === "until") {
      do {
        node.body.forEach(step);
        trace.push({ index: node.index, state: structuredClone(state) });
        if (trace.length > MAX_STEPS) throw new Error("loop");
      } while (!card.test(state));
    }
  };
  tree.forEach(step);
}

/**
 * Builds the card editor. Returns { el, run } — run() is wired to the 运行 button already.
 * onPass(attempts) is called when every test passes.
 */
export function cardProgram({ h, cards, tests, start, result, show, sound, tell, onPass, starter = [] }) {
  let list = [...starter];
  let failures = 0;
  const program = h("ol", { class: "cards-program", "aria-label": "你的程序" });
  const status = h("p", { class: "cards-status", "aria-live": "polite" });
  const results = h("ul", { class: "cards-results" });
  const palette = h("div", { class: "cards-palette", "aria-label": "可用的卡片" },
    ...Object.entries(cards).map(([id, card]) => h("button", { class: `cards-card ${card.kind}`, type: "button", onclick: () => {
      list.push(id);
      sound?.click?.();
      paint();
    } }, card.label)));

  function paint(active = -1) {
    let depth = 0;
    program.replaceChildren(
      ...list.map((id, i) => {
        const card = cards[id];
        if (card.kind === "end") depth = Math.max(0, depth - 1);
        const row = h("li", { class: `cards-row ${card.kind} ${i === active ? "active" : ""}`, style: `--depth:${depth}` },
          h("span", { class: "cards-label" }, card.label),
          h("span", { class: "cards-tools" },
            h("button", { class: "link-btn", type: "button", "aria-label": "上移", onclick: () => move(i, -1) }, "↑"),
            h("button", { class: "link-btn", type: "button", "aria-label": "下移", onclick: () => move(i, 1) }, "↓"),
            h("button", { class: "link-btn", type: "button", "aria-label": "拿掉", onclick: () => remove(i) }, "×")));
        if (card.kind === "while" || card.kind === "until") depth += 1;
        return row;
      }),
    );
    if (!list.length) program.append(h("li", { class: "cards-empty" }, "点上面的卡片，把它们排成一个程序。"));
  }
  function move(i, by) {
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    paint();
  }
  function remove(i) {
    list.splice(i, 1);
    paint();
  }

  let playing = null;
  async function run() {
    if (playing) return;
    results.replaceChildren();
    const parsed = parse(list, cards);
    if (parsed.error) return tell(parsed.error, "bad");
    // Every test, then the first one played back step by step.
    const outcomes = tests.map((t) => {
      const state = start(t.input);
      const trace = [];
      try {
        execute(parsed.tree, cards, state, trace);
        return { t, trace, got: result(state), ok: JSON.stringify(result(state)) === JSON.stringify(t.want) };
      } catch {
        return { t, trace, got: null, ok: false, loop: true };
      }
    });
    playing = true;
    const first = outcomes[0];
    for (const [k, frame] of first.trace.slice(0, 60).entries()) {
      paint(frame.index);
      status.textContent = `${first.t.label}：${show(frame.state)}`;
      await new Promise((r) => setTimeout(r, k < 4 ? 450 : 220));
    }
    paint();
    playing = null;
    let passed = 0;
    results.replaceChildren(
      ...outcomes.map((o) => {
        if (o.ok) passed += 1;
        return h("li", { class: o.ok ? "ok" : "bad" }, `${o.t.label} → ${o.loop ? "停不下来了" : JSON.stringify(o.got)}　${o.ok ? "✓" : `应该是 ${JSON.stringify(o.t.want)}`}`);
      }),
    );
    if (passed === tests.length) {
      tell("全部通过！", "good");
      onPass(failures);
    } else {
      failures += 1;
      tell(outcomes.some((o) => o.loop) ? `通过 ${passed} / ${tests.length} 个。有一次停不下来：重复的条件一直满足？` : `通过 ${passed} / ${tests.length} 个。`, "bad");
    }
  }
  paint();
  const el = h("div", { class: "cards" }, palette, program, status, results);
  return { el, run, reset: () => ((list = [...starter]), results.replaceChildren(), (status.textContent = ""), paint()) };
}
