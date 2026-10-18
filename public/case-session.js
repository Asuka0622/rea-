import { mountLab } from "./case-labs.js";
import { shippedLines, searchCode, termsIn, checkGroup, blanksOf, breaks } from "./case-puzzle.js";
import {caseSnapshot,restoreCaseState,caseObjective} from './case-progress.js';
import {createTension,spend,hintCost,loseHeart,retryConfront,tensionStars,left as pointsLeft,overBudget,expandAlias,HEARTS,TOOLS,unlockedTools,progressFromStars,canStamp} from './case-tension.js';

// A puzzle case played inside the game world (game-shell.js draws the client's room and walks the
// player; this file is everything the player does there). Nothing is a web page: clues come from
// looking at things in the room, the code is searched on the client's own laptop (an REA terminal),
// what was found goes into the detective's notebook (N), the deduction page is filled by dragging name
// cards into the sentences, the proof is run in a sandbox on the same laptop, and the case ends in a
// face-to-face confrontation with the app's own claims.
//
// Phases: look → (deduction page all stamped) verify → (sandbox done) confront → done.

const STARS_KEY = "rea-workbench-case-stars";
function saveStars(id, stars) {
  try {
    const all = JSON.parse(localStorage.getItem(STARS_KEY) || "{}") || {};
    all[id] = Math.max(all[id] || 0, stars);
    localStorage.setItem(STARS_KEY, JSON.stringify(all));
  } catch {}
}

// Pixel props for the stand-in room (the art request asks for real ones: docs/art/prompts.md 第六批).
const PROPS = {
  laptop: '<rect x="2" y="2" width="28" height="18" fill="#2a3346"/><rect x="4" y="4" width="24" height="14" fill="#9fd3c7"/><rect x="6" y="6" width="10" height="2" fill="#2a3346"/><rect x="6" y="10" width="6" height="3" fill="#e8c270"/><rect x="14" y="10" width="6" height="3" fill="#e8c270"/><rect x="22" y="10" width="4" height="3" fill="#e8c270"/><rect x="0" y="20" width="32" height="4" fill="#5b6a8a"/>',
  phone: '<rect x="9" y="1" width="14" height="24" fill="#1d2433"/><rect x="11" y="4" width="10" height="16" fill="#f0e3bf"/><rect x="12" y="6" width="8" height="3" fill="#e46a5d"/><rect x="12" y="11" width="6" height="1" fill="#5b6a8a"/><rect x="12" y="13" width="7" height="1" fill="#5b6a8a"/>',
  chat: '<rect x="3" y="3" width="26" height="18" fill="#fbf6e6" stroke="#2a3346"/><rect x="6" y="6" width="14" height="4" fill="#7fb069"/><rect x="12" y="13" width="14" height="4" fill="#9fd3c7"/><rect x="6" y="21" width="4" height="3" fill="#fbf6e6"/>',
  router: '<rect x="2" y="12" width="28" height="10" fill="#2a3346"/><rect x="6" y="2" width="2" height="10" fill="#2a3346"/><rect x="24" y="2" width="2" height="10" fill="#2a3346"/><rect class="led" x="6" y="16" width="3" height="2" fill="#7fb069"/><rect class="led" x="12" y="16" width="3" height="2" fill="#e8c270"/><rect class="led" x="18" y="16" width="3" height="2" fill="#7fb069"/>',
  paper: '<rect x="6" y="2" width="20" height="24" fill="#fbf6e6" stroke="#b19b69"/><rect x="9" y="6" width="14" height="2" fill="#5b6a8a"/><rect x="9" y="11" width="12" height="1" fill="#b19b69"/><rect x="9" y="14" width="13" height="1" fill="#b19b69"/><rect x="9" y="17" width="10" height="1" fill="#b19b69"/><rect x="9" y="20" width="12" height="1" fill="#b19b69"/>',
  clock: '<rect x="6" y="2" width="20" height="22" fill="#2a3346"/><rect x="8" y="4" width="16" height="18" fill="#fbf6e6"/><rect x="15" y="6" width="2" height="7" fill="#2a3346"/><rect class="hand" x="15" y="12" width="6" height="2" fill="#e46a5d"/>',
  cat: '<rect x="6" y="12" width="20" height="10" fill="#e8a25a"/><rect x="20" y="6" width="9" height="9" fill="#e8a25a"/><rect x="20" y="4" width="2" height="3" fill="#e8a25a"/><rect x="27" y="4" width="2" height="3" fill="#e8a25a"/><rect x="22" y="9" width="1" height="1" fill="#2a3346"/><rect x="26" y="9" width="1" height="1" fill="#2a3346"/><rect class="tail" x="2" y="10" width="4" height="2" fill="#e8a25a"/>',
};

/**
 * ui: { say(lines) → Promise (dialogue box, above the case's screens), sound, toast(text), has(picture),
 *       onBusy(open) (a full-screen case screen opened or closed: the player stops walking),
 *       onSolved(stars) }
 * A dialogue line is { who: "client" | undefined (路米), text, face }.
 */
export function createCaseSession({ h, icon, item, layer, ui, drill = null }) {
  // 复勘 (docs/progression.md): the same room and puzzle, with the hints taken away and a couple
  // of decoy words in the notebook. Its progress is saved apart from the story run.
  const harder = drill?.harder || {};
  const noHints = harder.hints === false;
  const puzzle = item.game.puzzle;
  const lab = item.game.lab;
  const client = item.game.client;
  const computerLabel=puzzle.computerLabel || `${client.name}的电脑`;
  const sampleName=puzzle.sampleName || "小账本";
  const labSource=puzzle.labSource || "沙盒抓包";
  const code = shippedLines(lab.sources);
  const terms = puzzle.terms;
  const sound = ui.sound;
  // A line is spoken by the client, by 路米 (no who), or by another speaker the shell knows (小克: "xiaoke").
  // Level and focus variants (easy / hard / only / focus) are passed through for the shell to pick.
  const line = (l, face) => {
    if (typeof l === "string") return { text: l, face: face || "normal" };
    const base = { ...l, face: l.face || face || "normal" };
    if (l.who === "client") return { ...base, who: client.portrait, name: client.name, text: String(l.text ?? "").replace(/^[^：「]+：/, "") };
    return base;
  };
  const say = (lines) => ui.say(lines.map((l) => line(l)));

  const saveKey=`rea-case-checkpoint-v1:${item.id}${drill ? `:drill:${drill.id}` : ""}`;
  let saved=null;
  try {const raw=localStorage.getItem(saveKey);if(raw&&raw.length<100000)saved=JSON.parse(raw);}catch{}
  const state=restoreCaseState(item,saved);
  // 张力：行动点预算与心证。难度和已解锁的侦探工具由 game-shell 传进来。
  const tension=createTension({difficulty:ui.difficulty||'normal',tools:ui.tools||[],spent:state.spent,hearts:state.hearts,fails:state.fails});
  function meterText(){
    return `行动点 ${pointsLeft(tension)}/${tension.budget} · 心证 ${'♥'.repeat(tension.hearts)}${'♡'.repeat(HEARTS-tension.hearts)}`;
  }
  /** 花行动点：永不阻止玩家，超出预算的部分直接计入星级。 */
  function charge(cost=1,label='行动'){
    const result=spend(tension,cost);
    state.spent=tension.spent;
    if(result.wentOver) ui.toast(`行动点超支（${label}）：这一步会拉低评价`);
    checkpoint();
    return result;
  }
  let saveFailed=false;
  function checkpoint(){
    try{localStorage.setItem(saveKey,JSON.stringify(caseSnapshot(item,state)));saveFailed=false;}catch{saveFailed=true;}
    refreshGuide();
  }
  // Decoy words the code never uses: searching them costs the player a turn.
  for (const decoy of harder.decoys || []) if (!state.dict.some((d) => d.zh === decoy.zh)) state.dict.push({ zh: decoy.zh, code: decoy.code });
  const props = new Map();
  let screen = null; // the open full-screen view: "notebook" | "terminal" | "confront" | "closed"

  /* ----- the room's props (drawn by the shell; the session keeps their look up to date) ----- */
  function propEl(thing) {
    const size = thing.size || 30;
    const el = h("button", {
      type:'button',
      class: `case-prop ${thing.look} ${state.seen.has(thing.id) ? "seen" : ""} ${thing.wall ? "wall" : ""}${thing.hidden ? " hidden" : ""}`,
      style: `left:calc(${thing.at[0]}px * var(--px));top:calc(${thing.at[1]}px * var(--px));width:calc(${size}px * var(--px));z-index:${thing.wall ? 1 : Math.round(thing.at[1])}`,
      'aria-label':`${state.seen.has(thing.id)?'再次调查':'调查'}：${thing.label}`,
      title:thing.label,
      onclick:()=>ui.navigate?.(`item:${thing.id}`),
    });
    el.innerHTML = `<svg viewBox="0 0 32 28" shape-rendering="crispEdges">${PROPS[thing.look] || PROPS.paper}</svg>`;
    const art = thing.art || thing.id;
    if (ui.has(`case-props/${art}`)) el.innerHTML = `<img src="/art/pixel/case-props/${art}.png" alt="">`;
    el.append(h("span", {class:"case-hit-target", "aria-hidden":"true"}));
    props.set(thing.id, el);
    return el;
  }
  const markSeen = (id) => {const el=props.get(id);el?.classList.add('seen');if(el)el.setAttribute('aria-label','再次调查：'+puzzle.scene.items.find(x=>x.id===id).label);};
  /** The shell highlights what the player is standing next to. */
  function near(id) {
    for (const [key, el] of props) el.classList.toggle("near", key === id);
  }

  /* ----- full-screen views ----- */
  function open(name, el) {
    screen = name;
    layer.replaceChildren(el);
    layer.hidden = false;
    layer.dataset.view = name;
    ui.onBusy(true);
    guide.hidden=true;
    checkpoint();
  }
  function close() {
    if (!screen) return;
    screen = null;
    layer.hidden = true;
    layer.replaceChildren();
    ui.onBusy(false);
    guide.hidden=false;
    checkpoint();
  }

  /* ----- the notebook ----- */
  function addClue(clue) {
    if (!clue || state.clues.some((c) => c.id === clue.id)) return false;
    state.clues.push(clue);
    for (const entry of clue.dict || []) if (!state.dict.some((d) => d.zh === entry.zh)) state.dict.push(entry);
    return true;
  }
  const flash = (text) => {
    ui.toast(text);
    checkpoint();
    hud.classList.remove("got");
    void hud.offsetWidth;
    hud.classList.add("got");
  };
  // A small notebook button in the corner of the room (also N).
  const hud = h("button", { class: "case-hud-book", type: "button", onclick: () => openNotebook() }, h("span", { class: "case-book-icon", "aria-hidden": "true" }), h("span", {}, "侦探手账"), h("kbd", {}, "N"));
  const guideTitle=h('summary',{}),guideText=h('p',{'aria-live':'polite'}),saveText=h('small',{});
  const guideAction=h('button',{type:'button',class:'case-goal-action',onclick:()=>{const target=caseObjective(item,state).target;if(target)ui.navigate?.(target);}},'');
  const guide=h('details',{class:'case-goal','aria-label':'当前委托目标',open:true},guideTitle,guideText,h('div',{class:'case-goal-controls'},guideAction,h('button',{type:'button',class:'case-goal-action',onclick:()=>openNotebook('board')},'查看推理')),saveText);
  let lastGuide='';
  function refreshGuide(){
    const next=caseObjective(item,state),signature=JSON.stringify([next,state.words.size,state.evidence.length,saveFailed,tension.spent,tension.hearts,tension.fails]);
    if(signature===lastGuide)return;lastGuide=signature;
    // The bar states the request, not a to-do list: what to look at is the player's call. Asking 路米
    // (the hint) is what turns the "take me to the next clue" shortcut on.
    guideTitle.textContent=`${client.name}的委托`;
    guideText.textContent=puzzle.ask||next.text;
    guideAction.textContent=next.action;guideAction.hidden=!(state.hints>0&&next.target);guideAction.disabled=!next.target;
    saveText.textContent=saveFailed?'浏览器无法保存进度，请保持当前页面打开。':`线索 ${next.found}/${next.total} · 名字 ${state.words.size} · 证据 ${state.evidence.length} · ${meterText()} · 进度自动保存在本浏览器`;
  }
  refreshGuide();
  window.addEventListener('pagehide',checkpoint);

  function openNotebook(page = state.page) {
    state.page = page;
    sound.page();
    open("notebook", notebookView());
  }
  function notebookView() {
    const pages = [
      ["clues", "线索"],
      ["dict", "小词典"],
      ["evidence", "名字和证据"],
      ["board", "推理"],
    ];
    const body = h("div", { class: "nb-page" });
    const say = h("p", { class: "nb-say", role: "status" });
    const paint = () => {
      body.replaceChildren(...{ clues: cluesPage, dict: dictPage, evidence: evidencePage, board: () => boardPage(say) }[state.page]());
      book.querySelectorAll(".nb-tab").forEach((tab) => tab.classList.toggle("on", tab.dataset.page === state.page));
      const count = book.querySelector('.nb-tab[data-page="board"] small');
      if (count) count.textContent = `${state.solved.size}/${puzzle.board.length}`;
      checkpoint();
    };
    const book = h("div", { class: "nb", role: "dialog", "aria-label": "侦探手账" },
      h("div", { class: "nb-cover-edge", "aria-hidden": "true" }),
      h("div", { class: "nb-paper" },
        h("div", { class: "nb-head" }, h("b", {}, "侦探手账 · ", item.game.puzzle.title || client.name + "的委托"),
          noHints ? h("span", { class: "nb-nohint" }, "复勘：没有提示") : h("button", { class: "nb-hint", type: "button", onclick: () => hint(say) }, "问路米"),
          h("button", { class: "nb-close", type: "button", "aria-label": "合上手账", onclick: close }, "✕")),
        body,
        say),
      h("div", { class: "nb-tabs" }, pages.map(([id, text]) => h("button", { type: "button", class: "nb-tab", "data-page": id, onclick: () => {
        state.page = id;
        sound.page();
        paint();
      } }, text, id === "board" && h("small", {}, `${state.solved.size}/${puzzle.board.length}`)))));
    paint();
    book.repaint = paint;
    return h("div", { class: "case-screen dim", onclick: (e) => e.target === e.currentTarget && close() }, book);
  }
  function cluesPage() {
    if (!state.clues.length) return [h("p", { class: "nb-empty" }, "还没有线索。在房间里走走，靠近东西按 E 看看。")];
    return state.clues.map((c, i) => h("div", { class: "nb-clue", style: `--tilt:${((i * 7) % 5) - 2}deg` }, h("b", {}, c.title), h("p", {}, c.text)));
  }
  function dictPage() {
    if (!state.dict.length) return [h("p", { class: "nb-empty" }, "代码是用英文写的。看过的线索会在这里教你几个词。")];
    return [h("p", { class: "nb-note" }, "中文 → 代码里可能的名字。拿这些词去电脑上搜。"), ...state.dict.map((d) => h("p", { class: "nb-dict" }, h("span", {}, d.zh), h("i", { "aria-hidden": "true" }, "→"), h("code", {}, d.code), d.note && h("small", {}, d.note)))];
  }
  function evidencePage() {
    return [
      h("p", { class: "nb-note" }, "记下的名字（推理时要用）："),
      state.words.size ? h("p", { class: "nb-words" }, [...state.words].map((w) => h("code", {}, w))) : h("p", { class: "nb-empty" }, "在电脑上搜代码，点黄色的名字就能记下来。"),
      h("p", { class: "nb-note" }, "证据（对质时要用）："),
      ...(state.evidence.length ? state.evidence.map((e) => h("div", { class: "nb-evidence" }, h("small", {}, e.where), h("code", {}, e.text))) : [h("p", { class: "nb-empty" }, "搜代码时，把关键的一行「记为证据」。")]),
    ];
  }

  /* ----- the deduction page: drag name cards into the sentences ----- */
  let picked = null; // a name card picked by click (for players who do not drag)
  let stamped = null; // the group stamped just now: only its stamp comes down with a thud
  function boardPage(sayEl) {
    const cards = h("div", { class: "nb-cards" }, [...state.words].map((w) => {
      const card = h("button", { type: "button", class: `nb-card ${picked === w ? "picked" : ""}`, "data-word": w }, w);
      card.addEventListener("pointerdown", (event) => drag(event, w, sayEl));
      card.addEventListener("click", () => {
        picked = picked === w ? null : w;
        sound.click();
        book().repaint();
      });
      return card;
    }));
    const groups = puzzle.board.map((group, g) => {
      const done = state.solved.has(g);
      let blank = 0;
      const sentence = group.text.split(/(\{[^}]+\})/).filter(Boolean).map((part) => {
        if (!part.startsWith("{")) return part;
        const i = blank++;
        const word = state.chosen[g][i];
        return h("button", {
          type: "button",
          class: `nb-slot ${word ? "filled" : ""}`,
          "data-g": g,
          "data-i": i,
          disabled: done,
          onclick: () => {
            if (picked) state.chosen[g][i] = picked, (picked = null);
            else state.chosen[g][i] = "";
            sound.click();
            book().repaint();
          },
        }, word || "　　　");
      });
      return h("div", { class: `nb-deduce ${done ? "done" : ""}` },
        h("b", {}, `${"①②③④⑤"[g]} ${group.title}`),
        h("p", {}, sentence),
        done ? h("span", { class: `nb-stamp ${stamped === g ? "fresh" : ""}` }, "成立") : h("button", { class: "nb-seal", type: "button", onclick: (e) => seal(g, e.currentTarget.closest(".nb-deduce"), sayEl) }, "盖章"));
    });
    return [
      h("p", { class: "nb-note" }, "把下面的名字卡拖进句子的空格里（也可以先点卡片，再点空格）。一条全对才能盖上章。"),
      ...groups,
      state.words.size ? cards : h("p", { class: "nb-empty" }, "还没有名字卡。去电脑上搜代码，把名字记下来。"),
    ];
  }
  const book = () => layer.querySelector(".nb");
  function drag(event, word, sayEl) {
    if (event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY };
    let ghost = null;
    const move = (e) => {
      if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
      if (!ghost) {
        ghost = h("span", { class: "nb-card ghost", "aria-hidden": "true" }, word);
        document.body.append(ghost);
      }
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      layer.querySelectorAll(".nb-slot").forEach((slot) => slot.classList.toggle("over", slot === document.elementFromPoint(e.clientX, e.clientY)?.closest(".nb-slot")));
    };
    const up = (e) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!ghost) return;
      ghost.remove();
      const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest(".nb-slot:not(:disabled)");
      if (slot) {
        state.chosen[slot.dataset.g][slot.dataset.i] = word;
        sound.click();
      }
      picked = null;
      book()?.repaint();
      // A drag also fires a click on the card: swallow it.
      const swallow = (c) => (c.stopPropagation(), c.preventDefault());
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  async function seal(g, box, sayEl) {
    const group = puzzle.board[g];
    if (state.chosen[g].some((w) => !w)) {
      sayEl.textContent = "还有空格没填。";
      return;
    }
    const { ok, wrong } = checkGroup(group, state.chosen[g]);
    if (!ok) {
      state.mistakes += 1;
      sound.wrong();
      box.classList.remove("shake");
      void box.offsetWidth;
      box.classList.add("shake");
      sayEl.textContent = wrong <= 2 ? "路米：差一点……有一两处不对。" : "路米：好像还不对，有好几处要再想想。";
      checkpoint();
      return;
    }
    const gate = canStamp(group, state.evidence.length);
    if (!gate.ok) {
      state.mistakes += 1;
      sound.wrong();
      box.classList.remove("shake");
      void box.offsetWidth;
      box.classList.add("shake");
      sayEl.textContent = `路米：这句话本身没错，可手账里只有 ${gate.have} 件证据，要 ${gate.need} 件才能盖章。先去把证据补够——连「证据不足」也要有证据。`;
      checkpoint();
      return;
    }
    state.solved.add(g);
    sound.stamp();
    stamped = g;
    book().repaint();
    stamped = null;
    sayEl.textContent = `路米：${group.explain}`;
    if (state.solved.size === puzzle.board.length) {
      state.phase = "verify";
      checkpoint();
      await sleep(700);
      close();
      await say([...(group.done || []), ...(puzzle.toLab || []), { text: `去${computerLabel}，输入 sandbox，在沙盒里跑一遍。`, face: "happy" }]);
    } else await say(group.done || []);
  }

  /* ----- the laptop: an REA terminal ----- */
  function openTerminal() {
    sound.door();
    open("terminal", terminalView());
    focusTerminal();
  }
  const focusTerminal = () => setTimeout(() => layer.querySelector(".term-input")?.focus(), 30);
  function print(kind, content) {
    state.termLog.push({ kind, content });
    if (state.termLog.length > 200) state.termLog.splice(0, state.termLog.length - 200);
  }
  function terminalView() {
    const out = h("div", { class: "term-out", role: "log", "aria-live": "polite" });
    const input = h("input", { class: "term-input", spellcheck: "false", autocomplete: "off", "aria-label": "输入命令" });
    let back = 0;
    const paint = () => {
      out.replaceChildren(...state.termLog.map(renderTermLine));
      out.scrollTop = out.scrollHeight;
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") return close();
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        back = Math.max(0, Math.min(state.history.length, back + (event.key === "ArrowUp" ? 1 : -1)));
        input.value = back ? state.history[state.history.length - back] : "";
        return;
      }
      if (event.key !== "Enter") return sound.key();
      const command = input.value.trim();
      input.value = "";
      back = 0;
      if (!command) return;
      state.history.push(command);
      print("cmd", command);
      run(command, paint);
      checkpoint();
      paint();
    });
    if (!state.termLog.length) {
      print("sys", `REA 0.1 · 已载入「${sampleName}」的原创教学样本。代码搜索保留原行号，整行注释不参与检索。`);
      print("sys", "输入 help 看看能做什么。");
    }
    const shortcuts=h('div',{class:'term-shortcuts','aria-label':'终端操作'},
      ...[['help','命令说明'],['notebook','打开手账'],['sandbox','进入实验沙盒']].map(([command,label])=>h('button',{type:'button',onclick:()=>{state.history.push(command);print('cmd',command);run(command,paint);paint();checkpoint();}},label)));
    const view = h("div", { class: "case-screen laptop" },
      h("div", { class: "lt-lid" },
        h("div", { class: "term" },
          h("div", { class: "term-bar" }, h("span", {}, `${computerLabel} · REA 终端`), h("button", { type: "button", class: "term-close", onclick: close }, "合上电脑 ✕")),
          shortcuts,
          out,
          h("label", { class: "term-line" }, h("span", { class: "term-prompt" }, "rea:~$"), input))),
      h("div", { class: "lt-base", "aria-hidden": "true" }));
    view.addEventListener("click", (e) => !e.target.closest("button, input, .lab") && focusTerminal());
    paint();
    view.repaint = paint;
    return view;
  }
  function renderTermLine({ kind, content }) {
    if (kind === "cmd") return h("p", { class: "t-cmd" }, h("span", {}, "rea:~$ "), content);
    if (kind === "hit") return termHit(content);
    return h("p", { class: `t-${kind}` }, content);
  }
  function termHit(hit) {
    const id = `${hit.file}:${hit.n}`;
    const pinned = state.evidence.some((e) => e.id === id);
    return h("div", { class: "t-hit" },
      h("p", { class: "t-where" }, `${hit.file}:${hit.n}`, h("button", { type: "button", class: "t-pin", disabled: pinned, onclick: (e) => {
        state.evidence.push({ id, text: hit.text.trim(), where: id });
        sound.clue();
        flash("这一行记为证据");
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = "已记为证据";
      } }, pinned ? "已记为证据" : "[记为证据]")),
      // Two lines either side, as shipped: developer comments are gone, so those lines are blank.
      h("div", { class: "t-code" }, [hit.n - 2, hit.n - 1, hit.n, hit.n + 1, hit.n + 2].filter((n) => n >= 1 && n <= hit.all.length).map((n) => {
        const text = hit.all[n - 1];
        const blank = /^\s*(\/\/|<!--)/.test(text);
        return h("p", { class: `t-src ${n === hit.n ? "hit" : ""}` }, h("i", {}, String(n).padStart(3)), blank ? "" : termsIn(text, terms).map((part) => typeof part === "string" ? part : termButton(part.term)));
      })));
  }
  function termButton(term) {
    return h("button", {
      type: "button",
      class: `t-term ${state.words.has(term) ? "got" : ""}`,
      onclick: (e) => {
        if (state.words.has(term)) return;
        state.words.add(term);
        sound.clue();
        flash(`「${term}」记进手账`);
        layer.querySelectorAll(".t-term").forEach((t) => t.textContent === term && t.classList.add("got"));
        flyToBook(e.currentTarget);
      },
    }, term);
  }
  function flyToBook(from) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = from.getBoundingClientRect();
    const b = hud.getBoundingClientRect();
    const chip = h("span", { class: "nb-card fly", "aria-hidden": "true" }, from.textContent);
    chip.style.left = `${a.left}px`;
    chip.style.top = `${a.top}px`;
    document.body.append(chip);
    chip.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(.5)`, opacity: 0.3 }], { duration: 600, easing: "cubic-bezier(.5,0,.3,1)" }).finished.then(() => chip.remove(), () => chip.remove());
  }
  function run(command, paint) {
    const [verb, ...rest] = command.split(/\s+/);
    const arg = rest.join(" ");
    switch (verb.toLowerCase()) {
      case "help":
        print("sys", "find <词>    在代码里找含有这些词的行（可以写好几个词）");
        print("sys", "ls           看看拆出了哪些文件");
        print("sys", `sandbox      进入「${sampleName}」的隔离实验`);
        print("sys", "clear        清屏      exit  合上电脑");
        print("sys", "小提示：点黄色的名字记进手账；关键的一行点 [记为证据]。");
        return;
      case "ls":
        print("out", Object.keys(lab.sources).join("    "));
        return;
      case "notebook":
        return openNotebook();
      case "clear":
        state.termLog.length = 0;
        return;
      case "exit":
        return close();
      case "sandbox":
        if (state.phase === "look") return print("err", "还不知道要验证什么。先在手账里把推理拼完整（N）。");
        return openSandbox();
      case "find":
      case "grep":
      case "search":
        return find(arg);
      default:
        // A bare word is a search too, with a nudge towards the command.
        if (rest.length === 0) {
          print("sys", `（当成 find ${verb} 了）`);
          return find(verb);
        }
        print("err", `不认识「${verb}」这个命令。输入 help 看看。`);
    }
  }
  function find(rawQuery) {
    if (!rawQuery) return print("err", "要找什么？比如：find fetch");
    const alias = expandAlias(rawQuery, state.dict, tension.tools);
    if (alias.expanded) print("sys", `（别名：${alias.from} → ${alias.to}）`);
    const query = alias.query;
    charge(1, "搜索");
    const { hits, more } = searchCode(code, query);
    if (!hits.length) {
      if (/[一-鿿]/.test(query)) print("err", "没找到。发布版里没有中文注释，名字都是英文的。翻翻手账里的小词典。");
      else print("err", "没找到。换个词试试，名字的一部分也行。");
      return;
    }
    for (const hit of hits) print("hit", hit);
    if (more) print("sys", `……还有 ${more} 处没显示。多写一个词缩小范围，比如 find fetch URL。`);
  }

  /* ----- the sandbox (the lab), on the same laptop ----- */
  let labEl = null;
  function openSandbox() {
    if (!labEl) {
      labEl = mountLab({ h, icon, lab: { ...lab, tasks: puzzle.labTasks || lab.tasks }, story: (lines) => say(lines), difficulty: ui.difficulty || "normal", startAt: state.labStage, onStage: (i) => {state.labStage = i;checkpoint();}, onMistake: () => {state.mistakes += 1;checkpoint();}, onHint: () => {state.hints += 1;checkpoint();}, finishLabel: puzzle.confront ? `合上电脑，去找${client.name}` : "合上电脑，整理结论", onDone: () => {
        for (const e of puzzle.labEvidence || []) if (!state.evidence.some((x) => x.id === e.id)) state.evidence.push({ ...e, where: labSource });
        sound.beep();
        flash(`${labSource}记录记为证据`);
        if (puzzle.confront) state.phase = "confront";
        else state.phase = "done";
        checkpoint();
        say(lab.done || []);
      }, onFinish: async () => {
        close();
        if (!puzzle.confront) {
          // 没有对质的委托：实验做完就结案，结论写在结案卡里。
          await say([{ text: "实验记录收好了。这份委托能下的结论，写进结案里了。", face: "thinking" }]);
          return finish();
        }
        await say([{ text: `证据齐了。去和${client.name}当面说清楚吧：走到他旁边按 E。`, face: "happy" }]);
      } });
    }
    open("terminal", h("div", { class: "case-screen laptop" },
      h("div", { class: "lt-lid" },
        h("div", { class: "term sandbox" },
          h("div", { class: "term-bar" }, h("span", {}, `${computerLabel} · REA 沙盒`), h("button", { type: "button", class: "term-close", onclick: () => openTerminal() }, "回到终端")),
          h("div", { class: "term-lab" }, labEl))),
      h("div", { class: "lt-base", "aria-hidden": "true" })));
  }

  /* ----- the confrontation ----- */
  function startConfront() {
    sound.tension();
    state.statement = state.statement || 0;
    open("confront", confrontView());
    say(puzzle.confront.intro || []);
  }
  const portrait = (who, face) => {
    const name = `${who}-${face}`;
    return ui.portraits().has(name) || ui.portraits().has(`${who}-normal`) ? h("img", { src: `/art/faces/${ui.portraits().has(name) ? name : `${who}-normal`}.webp`, alt: "" }) : h("span", { class: "cf-standin" }, who === "lumi" ? "路" : client.name.slice(0, 1));
  };
  function confrontView() {
    const c = puzzle.confront;
    const falseOnes = c.statements.filter((s) => s.accept).length;
    const card = h("div", { class: "cf-card" });
    const strip = h("div", { class: "cf-strip", hidden: true });
    const count = h("p", { class: "cf-count" });
    const lumi = h("div", { class: "cf-lumi" }, portrait("lumi", "normal"));
    const them = h("div", { class: "cf-them" }, portrait(client.portrait, "thinking"));
    const paint = () => {
      const s = c.statements[state.statement];
      const broken = state.broken.has(state.statement);
      card.className = `cf-card ${broken ? "broken" : ""}`;
      card.replaceChildren(...[h("small", {}, `${client.name}的陈述 · 第 ${state.statement + 1} / ${c.statements.length} 句`), h("p", {}, s.text), broken && h("span", { class: "cf-x" }, "戳穿")].filter(Boolean));
      count.textContent = `已经戳穿 ${state.broken.size} / ${falseOnes} 句`;
      checkpoint();
      view.querySelectorAll(".cf-act").forEach((b) => (b.disabled = broken));
      strip.replaceChildren(...(state.evidence.length ? state.evidence.map((e) => h("button", { type: "button", class: "cf-ev", onclick: () => present(e) }, h("small", {}, e.where), h("code", {}, e.text))) : [h("p", {}, "手账里还没有证据。")]));
    };
    const go = (d) => {
      state.statement = (state.statement + d + c.statements.length) % c.statements.length;
      strip.hidden = true;
      sound.page();
      paint();
    };
    async function press() {
      const s = c.statements[state.statement];
      strip.hidden = true;
      await say(s.press || []);
    }
    async function present(e) {
      const s = c.statements[state.statement];
      strip.hidden = true;
      if (s.accept && breaks(s, e)) {
        state.broken.add(state.statement);
        await objection();
        paint();
        await say(s.broken || []);
        const left = c.statements.findIndex((x, i) => x.accept && !state.broken.has(i));
        if (left < 0) return finish();
        state.statement = left;
        paint();
        return;
      }
      state.mistakes += 1;
      const heartsLeft = loseHeart(tension);
      state.hearts = heartsLeft;
      sound.wrong();
      view.classList.remove("shake");
      void view.offsetWidth;
      view.classList.add("shake");
      if (heartsLeft === 0) {
        checkpoint();
        await say([{ who: "client", text: c.objection, face: "surprised" }, { text: "最后一条心证也丢了。这次对质只能先停下来。", face: "surprised" }]);
        open("confront", failView());
        return;
      }
      checkpoint();
      await say([{ who: "client", text: c.objection, face: "surprised" }, { text: s.accept ? "这件证据和这句话对不上。这句话到底哪里不对？" : "这一句……说不定是真的。破绽在别的地方，可以先「追问」看看。", face: "thinking" }]);
    }
    async function objection() {
      sound.objection();
      const bang = h("div", { class: "cf-objection", "aria-hidden": "true" }, "异议！");
      view.append(bang);
      view.classList.remove("shake");
      void view.offsetWidth;
      view.classList.add("shake");
      await sleep(1100);
      bang.remove();
    }
    const view = h("div", { class: "case-screen confront" },
      h("div", { class: "cf-lines", "aria-hidden": "true" }),
      lumi, them,
      h("div", { class: "cf-center" },
        h("p", { class: "cf-title" }, "对质"),
        h("div", { class: "cf-row" }, h("button", { type: "button", class: "cf-arrow", "aria-label": "上一句", onclick: () => go(-1) }, "◀"), card, h("button", { type: "button", class: "cf-arrow", "aria-label": "下一句", onclick: () => go(1) }, "▶")),
        h("div", { class: "cf-actions" },
          h("button", { type: "button", class: "cf-act", onclick: press }, "追问"),
          h("button", { type: "button", class: "cf-act primary", onclick: () => ((strip.hidden = !strip.hidden), sound.page()) }, "出示证据"),
          h("button", { type: "button", class: "cf-act ghost", onclick: () => hint(null) }, "问路米")),
        count,
        strip));
    view.repaint = paint;
    paint();
    return view;
  }
  /** 心证扣光：当庭失败。可以重来，但这一轮会记进评价。 */
  function failView() {
    const retry = (closeFirst) => () => {
      retryConfront(tension);
      state.hearts = tension.hearts;
      state.fails = tension.fails;
      state.mistakes += 2;
      checkpoint();
      if (closeFirst) close();
      else startConfront();
    };
    return h("div", { class: "case-screen dim" },
      h("div", { class: "cs-card" },
        h("span", { class: "cs-stamp" }, "当庭失败"),
        h("h3", {}, "心证用完了"),
        h("p", {}, `${client.name}把每一件证据都驳了回去，这次对质没能进行下去。翻一翻手账，换一件更贴切的证据再来——这一轮会计入这次委托的评价。`),
        h("div", { class: "cf-actions" },
          h("button", { type: "button", class: "cf-act primary", onclick: retry(false) }, "重新对质"),
          h("button", { type: "button", class: "cf-act ghost", onclick: retry(true) }, "先去补线索"))));
  }
  async function finish() {
    state.phase = "done";
    const stars = tensionStars(tension, { mistakes: state.mistakes, hints: state.hints });
    const readStars = () => { try { return JSON.parse(localStorage.getItem(STARS_KEY) || "{}") || {}; } catch { return {}; } };
    const before = unlockedTools(progressFromStars(readStars()));
    saveStars(item.id, stars);
    const fresh = unlockedTools(progressFromStars(readStars())).filter((id) => !before.includes(id));
    checkpoint();
    ui.onSolved(stars);
    await sleep(300);
    sound.unlock();
    open("closed", h("div", { class: "case-screen dim" },
      h("div", { class: "cs-card" },
        h("span", { class: "cs-stamp" }, "结案"),
        h("p", { class: "cs-kicker" }, "侦探事务所 · 委托完成"),
        h("h3", {}, item.title),
        h("p", { class: "cs-stars", "aria-label": `评价 ${stars} 星` }, "★".repeat(stars) + "☆".repeat(3 - stars)),
        h("p", { class: "cs-score" }, `犯错 ${state.mistakes} 次 · 问路米 ${state.hints} 次 · 行动点 ${tension.spent}/${tension.budget}${overBudget(tension) ? `（超支 ${overBudget(tension)}）` : ""} · 心证 ${tension.hearts}/${HEARTS}`),
        fresh.length && h("p", { class: "cs-tools" }, "新工具：", fresh.map((id) => {
          const tool = TOOLS.find((t) => t.id === id);
          return tool ? `${tool.name}（${tool.desc}）` : id;
        }).join(" · ")),
        puzzle.debrief?.length && h("div", {class:"case-debrief"},h("h4",{},"这次查明了什么"),h("ul",{},puzzle.debrief.map(text=>h("li",{},text)))),
        h("button", { class: "btn primary", type: "button", onclick: async () => {
          close();
          await say([{ who: "client", text: item.game.verdict.closing, face: "happy" }]);
        } }, "好"))));
  }

  /* ----- hints ----- */
  async function hint(sayEl) {
    if (noHints) {
      const text = "复勘的时候没有路米提示：自己看代码。";
      if (sayEl) sayEl.textContent = `路米：${text}`;
      else await say([{ text, face: "thinking" }]);
      return;
    }
    state.hints += 1;
    charge(hintCost(tension), "问路米");
    checkpoint();
    let text;
    if (state.phase === "confront") text = puzzle.confront.statements[state.statement].hint || "先「追问」，听听这句话背后还有什么。";
    else if (state.phase === "verify") text = `去${computerLabel}输入 sandbox，把推理一条条验证一遍。`;
    else if (state.seen.size < Math.min(4, puzzle.scene.items.length)) text = "先在房间里多看看，靠近东西按 E。东西会告诉你该去代码里找什么。";
    else if (state.words.size < 4) text = `去${computerLabel}搜代码。用小词典里的词，比如 find ${state.dict[0]?.code.split(" ")[0] || puzzle.terms[0]}。`;
    else {
      const g = puzzle.board.findIndex((_, i) => !state.solved.has(i));
      text = g >= 0 ? puzzle.board[g].hint : "推理都盖章了。";
    }
    if (sayEl) sayEl.textContent = `路米：${text}`;
    else await say([{ text, face: "thinking" }]);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  return {
    hud,
    guide,
    propEl,
    near,
    get busy() {
      return Boolean(screen);
    },
    get done() {
      return state.phase === "done";
    },
    /** Walking in: the request the first time, a reminder of what is next later. */
    async arrive() {
      if(state.phase==='done'){ui.onSolved(tensionStars(tension,{mistakes:state.mistakes,hints:state.hints}));await say([{text:'上次的结案结果已经恢复，可以继续探索小镇。',face:'happy'}]);return;}
      if (!state.told) {
        state.told = true;
        await say([...client.lines.map((l, i) => ({ who: "client", text: l.text ?? l, face: l.face || (i ? "thinking" : "normal") })), ...(puzzle.brief || []), { text: puzzle.meterBrief || `这次委托有 ${tension.budget} 个行动点：调查、搜代码、问路米都要花，超支会拉低评价。对质时有 ${HEARTS} 条心证，出示错一件证据就少一条。`, face: "thinking" }]);
        checkpoint();
        return;
      }
      ui.toast('已恢复这个委托的调查进度。');
      if (state.phase === "verify") await say([{ text: `推理已经拼好了。去${computerLabel}输入 sandbox 验证一下。`, face: "normal" }]);
      if (state.phase === "confront") await say([{ text: `证据齐了，去找${client.name}吧。`, face: "normal" }]);
    },
    label(thing) {
      return thing.id === puzzle.terminal ? `用电脑 · ${thing.label}` : `调查 · ${thing.label}`;
    },
    /** E next to a prop. */
    async inspect(id) {
      const thing = puzzle.scene.items.find((t) => t.id === id);
      if (!thing) return;
      const first = !state.seen.has(id);
      state.seen.add(id);
      if (first) charge(1, "调查");
      markSeen(id);
      const discovered=addClue(thing.clue);
      checkpoint();
      if (first || id !== puzzle.terminal) await say(thing.lines || []);
      if(ui.active && !ui.active())return;
      if (discovered) {
        sound.clue();
        flash(`线索「${thing.clue.title}」记进手账`);
      }
      if (id === puzzle.terminal) openTerminal();
    },
    /** E next to the client. */
    async talk() {
      if (state.phase === "done") return say([{ who: "client", text: "谢谢你！以后装软件之前，我都先找你看看。", face: "happy" }]);
      if (state.phase === "confront") return startConfront();
      const lines = puzzle.room?.clientTalk?.[state.phase] || [{ who: "client", text: "有什么发现吗？我就在这儿，需要什么尽管问。" }];
      return say(lines);
    },
    openNotebook,
    close,
    /** Keys while a case screen is open (the shell passes them on). Returns true when used. */
    key(event) {
      if (event.key === "Escape" && screen && screen !== "closed") {
        close();
        return true;
      }
      if (event.key.toLowerCase() === "n" && !event.target.closest?.("input,textarea")) {
        if (screen === "notebook") close();
        else if (!screen) openNotebook();
        else return false;
        return true;
      }
      return false;
    },
    state,
  };
}
