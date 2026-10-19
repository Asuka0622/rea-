// 任务系统: quest lines (the main story and district side lines) made of chapters and steps, the
// player's difficulty, and saved progress. Game-agnostic on purpose: a line is plain data, and the game
// reports what happened ("entered a building", "solved a case") through event(). The story itself is
// designed in docs/story.md. Progress lives in this browser's localStorage.

const KEY = "rea-game-progress";

/** Knowledge level, chosen by asking about the player's background. */
export const DIFFICULTIES = {
  easy: { label: "零基础", level: "轻松", note: "从来没接触过。全用大白话和比喻讲，题目小，卡住了可以直接看答案。" },
  normal: { label: "学过一点", level: "标准", note: "用过电脑、听说过一些词。比喻加上真正的术语，要自己算答案，有提示。" },
  hard: { label: "有基础", level: "硬核", note: "学过编程或计算机。直接讲原理、看真实的数字和代码，题目更难，没有提示。" },
};

/**
 * What the player came for: it sets how deep the story goes. Lines can be kept to some focuses
 * (`focus: "story"`, `focus: "story balanced"` …), the same way `only` keeps them to some levels.
 */
export const FOCUSES = {
  story: { label: "偏剧情", note: "多一些角色的故事和对话，知识点讲到够用就好。" },
  balanced: { label: "平衡", note: "故事和知识各占一半。推荐第一次玩选这个。", recommended: true },
  knowledge: { label: "偏知识", note: "对话精简，讲解更多；每学会一样东西，都有一张复盘卡帮你记住。" },
};

/*
 * A line: { id, title, subtitle, unlock?, intro?, chapters }.
 *   unlock: { line, chapter } — the line opens when that chapter of another line is done.
 *   intro: what the guide says when the line opens.
 * A chapter: { id, title, steps, done?, badge?, ready?, after? } — ready: false = still being made (shown
 *   in the log as 制作中; the line waits there). after: { line, chapter } — the chapter starts only once
 *   that chapter of another line is done (the line waits there too).
 * A step: { id, type: "enter" | "solve" | "play" | "travel", spot, case?, game?, era?, only?, goal, say, done? }
 *   travel: arrive in an era by the time machine (era "home" = back in Bit Town).
 *   only: the step exists only at those levels ("hard", "easy normal" …).
 *   enter: walk into a building (spot); solve: finish a case; play / travel: a mini-game or the time
 *   machine, kept for the formal version (the web build has none since 2026-10-19). Steps are
 *   started at the spot. `say` is what the guide says when the step
 *   becomes current, `done` when it is finished; a chapter's `done` follows its last step.
 */

// 预告版 = 整个序章（docs/story-prologue.md，用户 2026-10-19 定）：六个委托分三幕，幕与幕之间回事务所钉线索，
// 第三幕之后守夜、打开钟楼，然后时光机 → 1843 伦敦 → 字卡。每一章的 act 决定哪些委托开放（caseReachable）：
// 第一幕的三份可以任意顺序做，第二幕的要等中场之后，第三幕的要等中点之后。
export const DEMO_CASES = ["privacy-ledger", "farm-save", "calculator-eggs", "weather-keys", "notes-versions", "flashlight-apk"]; // all six are played in their puzzle rooms, which need no analysis engine
const WALL_ACT1 = ["小账本 → 悄悄统计（沙盒里抓到了）", "朵朵的存档：23:58 的同步字段", "小雨的调试页：23:58 · 钟楼（配置）"];
const WALL_ACT2 = [...WALL_ACT1, "阿哲的「统计小库」→ db.quiet-stats", "周姐的截图：每晚 23:58 → 悄悄统计"];
export const DEMO_QUEST = {
  id: "demo",
  title: "侦探事务所 · 序章",
  subtitle: "钟楼停在 11:58：六个可疑的软件，一条线",
  chapters: [
    {
      id: "d-prologue",
      act: 1,
      title: "序章 · 路米的第一份档案",
      steps: [
        {
          id: "visit-office", type: "enter", spot: "home", goal: "去侦探事务所，开始路米的第一天",
          say: [
            { text: "我叫路米。证件照拍好了，接下来该去事务所看看今天的委托了。", face: "happy" },
            { text: "我的事务所就在广场正北边，红屋顶、挂着放大镜招牌的那栋。", face: "normal" },
          ],
          done: [
            { text: "这就是我的事务所。侦探的工作叫「逆向分析」：把软件拆开，看清它到底在做什么。", face: "happy" },
            { focus: "story balanced", text: "镇上的人遇到可疑的软件，都会来这儿找我。先从一份委托开始，把每条证据查清楚。", face: "thinking" },
            { focus: "story balanced", text: "墙上这块软木板还空着。每查清一件事，就钉一张卡上去。", face: "normal" },
            { who: "xiaoke", text: "叮！你好，我是小克，比特镇的 AI 助手。事务所的电脑里也有我。查案要帮忙，尽管叫我！", face: "happy", fx: { type: "xiaoke", face: "happy" } },
            { text: "那先考考你：北区的钟楼，为什么停在 11:58？", face: "thinking" },
            { who: "xiaoke", text: "这个我知道！钟楼年久失修，齿轮全生锈了。", face: "happy" },
            { text: "……说得跟真的一样。钟楼一直归铁叔照看，他可不会让齿轮生锈。", face: "thinking" },
            { text: "记下了：小克说的话，核实过再信。", face: "normal" },
          ],
        },
      ],
      done: [{ text: "眼下有三份委托。小林的贴在委托板上，朵朵要当面接，小雨的事得先找小石头打听。先从小林开始吧！", face: "happy" }],
    },
    {
      id: "d-case-1",
      act: 1,
      title: "第一幕 · 小林的记账软件",
      steps: [{ id: "solve-privacy", type: "solve", case: "privacy-ledger", spot: "privacy-ledger", goal: "去小林的宿舍，查查「小账本」", say: [{ who: "xiaoke", text: "小林住在住宅区的宿舍楼：从广场往西走，好多窗户的那栋三层楼就是。", face: "normal" }] }],
      done: [{ who: "xiaoke", text: "漂亮！软件往哪里发数据、偷偷用了哪些能力，你都查出来了。", face: "happy" }],
    },
    {
      id: "d-case-2",
      act: 1,
      title: "第一幕 · 朵朵的存档",
      steps: [{ id: "solve-save", type: "solve", case: "farm-save", spot: "farm-save", goal: "去住宅区找朵朵，当面接存档委托", say: [{ text: "下一份委托是朵朵的：她想知道种田游戏是怎么存档的。这次要拆的是一个文件。", face: "thinking" }, { who: "xiaoke", text: "朵朵就在住宅区红色谷仓的门口。走近她按 E，当面接下委托，再进农场。", face: "normal" }] }],
      done: [{ text: "编码不是加密，校验码也挡不住看懂代码的人。文件格式，我也能看懂了。", face: "happy" }],
    },
    {
      id: "d-case-3",
      act: 1,
      title: "第一幕 · 小雨的计算器",
      steps: [{ id: "solve-eggs", type: "solve", case: "calculator-eggs", spot: "calculator-eggs", goal: "向广场的小石头打听，再去小雨家", say: [{ text: "还有一份委托来自小雨，说她的计算器里藏着秘密。", face: "happy" }, { who: "xiaoke", text: "先去中心广场找小石头，按 E 听他讲计算器的传闻；小雨家是住宅区粉色屋顶的那栋。", face: "normal" }] }],
      done: [{ text: "彩蛋可以留，后门不能留：藏起来的入口，要看门后面是什么。", face: "normal" }],
    },
    {
      id: "d-interlude",
      act: 1,
      title: "中场 · 这三件事有关系吗",
      badge: { id: "rea-detective", label: "见习侦探" },
      steps: [{ id: "pin-act1", type: "enter", spot: "home", goal: "回事务所，把三条线索钉上墙", say: [{ text: "三份委托都办完了。回事务所，把手账里的线索钉上墙。", face: "thinking" }] }],
      done: [
        { who: "smith", text: "路米在吗？镇上的规矩：新开的事务所办成三件委托，就发「见习侦探」徽章。喏，镇长让我捎来的。", face: "happy" },
        { text: "谢谢铁叔！……对了，钟楼的钥匙一直在您那儿吧？它怎么就停了？", face: "happy" },
        { who: "smith", text: "钥匙我守了二十年。规矩是：钟坏了，得镇长点头才能开门。镇长说「现在谁还看钟楼呀，大家都看手机」——不急。", face: "thinking" },
        { who: "smith", text: "可我急。它停得太干脆了，不像是零件坏了。", face: "thinking" },
        { text: "不过，手账里有三条线索，哪个委托都没问，我却放不下。", face: "thinking" },
        { text: "小林的小账本，确实把数据发给了「悄悄统计」。朵朵的存档里有 23:58 的同步字段，小雨的调试页也写着 23:58 和「钟楼」。后两条还只是记录和配置，是否真上传过，要继续验证。", face: "thinking", fx: { type: "wall", cards: WALL_ACT1, ask: "悄悄统计 · 23:58 · 钟楼" } },
        { text: "悄悄统计、23:58、钟楼……这三件事，有关系吗？", face: "thinking" },
        { who: "xiaoke", text: "我可以帮你查悄悄统计！……嗯，我只查到它的广告：「让数据为你服务」。它具体在做什么，我不确定。", face: "unsure" },
        { text: "能说「不确定」，比上回编一个「齿轮生锈」强多了。委托板上又来了新的委托——接着查。", face: "happy" },
      ],
    },
    {
      id: "d-case-4",
      act: 2,
      title: "第二幕 · 阿哲的天气小助手",
      steps: [{ id: "solve-weather", type: "solve", case: "weather-keys", spot: "weather-keys", goal: "接下阿哲的委托：发布前的安全自查", say: [{ text: "阿哲的委托贴在委托板上：他的「天气小助手」下周要发给全校用，想先做一次安全自查。", face: "normal" }] }],
      done: [{ text: "钥匙不能跟着软件走：该在服务器的放服务器。还有——他那个「统计小库」，开在悄悄统计。", face: "thinking" }],
    },
    {
      id: "d-case-5",
      act: 2,
      title: "第二幕 · 周姐的便签更新",
      steps: [{ id: "solve-notes", type: "solve", case: "notes-versions", spot: "notes-versions", goal: "接下周姐的委托：新版本到底改了什么", say: [{ text: "周姐的委托也在委托板上：便签软件的更新说明只有一句「修复了一些小问题」，她总觉得不对劲。", face: "normal" }, { who: "xiaoke", text: "周姐的公司在北区，钟楼旁边那栋大办公楼。", face: "normal" }] }],
      done: [{ text: "只看更新说明，永远不知道改了什么。新旧两版一对，再快进一天，全都看清了。", face: "happy" }],
    },
    {
      id: "d-midpoint",
      act: 2,
      title: "中点 · 红线",
      steps: [{ id: "pin-act2", type: "enter", spot: "home", goal: "回事务所，把新线索也钉上墙", say: [{ text: "回事务所。墙上的卡片，该连起来了。", face: "thinking" }] }],
      done: [
        { text: "五张卡片。我拿一卷红线，一张张连起来——", face: "thinking", fx: { type: "wall", cards: WALL_ACT2, ask: "每条线都指向：悄悄统计 · 23:58 · 钟楼" } },
        { text: "每一条，都指向悄悄统计。每一晚，都是 23:58。目的地，都是钟楼。", face: "surprised" },
        { text: "五个软件，五条线，全连到同一个地方。镇上用着悄悄统计的，恐怕不止这五个。", face: "thinking" },
        { text: "住宅区的王奶奶，前两天说她想装个手电筒，问我们手机老弹东西是怎么回事。去看看她吧。", face: "normal" },
      ],
    },
    {
      id: "d-case-6",
      act: 3,
      title: "第三幕 · 王奶奶的手电筒",
      steps: [{ id: "solve-flashlight", type: "solve", case: "flashlight-apk", spot: "flashlight-apk", goal: "去住宅区找王奶奶，当面接下委托", say: [{ who: "xiaoke", text: "王奶奶家在住宅区，院子里晾着衣服的那栋老房子。先在门口和她聊聊，再进屋。", face: "normal" }] }],
      done: [{ text: "六个了。广告组件是悄悄统计做的，数据最后报给钟楼。", face: "thinking" }],
    },
    {
      id: "d-vigil",
      act: 3,
      title: "高潮 · 守夜",
      steps: [{ id: "wait-night", type: "enter", spot: "home", goal: "回事务所，等到夜里", say: [{ text: "回事务所。今晚我们不睡了——23:58，去钟楼底下守着。", face: "thinking" }] }],
      done: [{ text: "天黑了。带上笔记本，我们走。", face: "normal" }],
    },
    {
      id: "d-finale",
      act: 3,
      title: "结尾 · 打开钟楼",
      steps: [{ id: "open-tower", type: "enter", spot: "clocktower", goal: "天亮了，去北区钟楼找铁叔", say: [] }],
      done: [{ text: "铁叔已经在门口等着了。", face: "normal" }],
    },
  ],
};

/**
 * 正式模式（地址不带 ?demo）的主线：第一部的序章，和预告版同一份流程；之后是正式版的第一章（网页版不做）。
 * 旧主线（第一章「电脑是什么」、汴京一站和后面五个旧时代）是「一部讲全部计算机学科」时的设计，
 * 属于系列后面几部，2026-10-19 从网页版删掉（路线见 docs/series.md）。
 */
export const MAIN_QUEST = {
  id: "main",
  title: "主线 · 钟楼停在 11:58",
  subtitle: "第一部 · 人工智能：先查清六个可疑的软件，再坐时光机回到 AI 的起点",
  chapters: [
    ...DEMO_QUEST.chapters,
    { id: "london-1843", title: "第一章 · 1843 年的伦敦（正式版制作中）", ready: false, steps: [] },
  ],
};

/** 支线 · 档案馆的故事：序章结束后，去听真实发生过的安全事件（这个案例只在正式模式里有）。 */
export const ARCHIVE_QUEST = {
  id: "archive",
  title: "支线 · 档案馆的故事",
  subtitle: "真实发生过的事，用的是同一套方法",
  unlock: { line: "main", chapter: "d-finale" },
  intro: [{ text: "住宅区档案馆的老秦收集了很多真实发生过的故事。闲下来去听听吧。", face: "normal" }],
  chapters: [
    {
      id: "stories",
      title: "档案馆的故事",
      steps: [{ id: "read-stories", type: "solve", case: "real-stories", spot: "real-stories", goal: "去住宅区的档案馆，听听真实发生过的故事", say: [{ who: "xiaoke", text: "档案馆在住宅区，老秦就在门口。", face: "normal" }] }],
      done: [{ text: "这些都是真事。我用的这些方法，真正的安全研究员每天都在用。", face: "thinking" }],
    },
  ],
};

export const QUEST_LINES = [MAIN_QUEST, ARCHIVE_QUEST];

function load(key = KEY) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

/** key: where progress is saved (the demo keeps its own). */
export function createQuests(lines = QUEST_LINES, { key = KEY } = {}) {
  const saved = load(key);
  const done = Object.fromEntries(lines.map((line) => [line.id, new Set(saved.done?.[line.id] || [])]));
  // Saves from before the main line: the prologue's first two steps were the REA line's.
  if (!saved.done?.main && done.main && saved.done?.rea) for (const id of ["visit-office", "visit-library"]) if (saved.done.rea.includes(id)) done.main.add(id);
  // Saves from before the focus question count as balanced.
  const state = { difficulty: saved.difficulty || null, focus: saved.focus || (saved.difficulty ? "balanced" : null), badges: new Set(saved.badges || []), tracked: saved.tracked || null, drills: { ...(saved.drills || {}) } }; // drill id -> best stars (game-drills.js)
  const listeners = new Set();
  const save = () => {
    try {
      const all = load(key);
      all.difficulty = state.difficulty;
      all.focus = state.focus;
      all.done = { ...(all.done || {}), ...Object.fromEntries(lines.map((line) => [line.id, [...done[line.id]]])) };
      all.badges = [...state.badges];
      all.tracked = state.tracked;
      all.drills = state.drills;
      localStorage.setItem(key, JSON.stringify(all));
    } catch {}
  };

  const lineById = (id) => lines.find((line) => line.id === id);
  // A step with `only` exists only at those levels (e.g. a coding task on 硬核).
  const applies = (step) => !step.only || step.only.split(" ").includes(state.difficulty || "normal");
  const chapterDone = (line, chapter) => chapter.ready !== false && chapter.steps.filter(applies).every((step) => done[line.id].has(step.id));
  const unlocked = (line) => {
    if (!line.unlock) return true;
    const other = lineById(line.unlock.line);
    const chapter = other?.chapters.find((c) => c.id === line.unlock.chapter);
    return Boolean(other && chapter && chapterDone(other, chapter));
  };
  /** A chapter that has to wait: still being made, or for another line's chapter. */
  const blocked = (chapter) => {
    if (chapter.ready === false) return true;
    if (!chapter.after) return false;
    const other = lineById(chapter.after.line);
    const need = other?.chapters.find((c) => c.id === chapter.after.chapter);
    return !(other && need && chapterDone(other, need));
  };
  /** Playable steps, in order: a line stops at its first chapter that has to wait. */
  function steps(line) {
    const out = [];
    for (const chapter of line.chapters) {
      if (blocked(chapter)) break;
      for (const step of chapter.steps) if (applies(step)) out.push({ ...step, chapter, line });
    }
    return out;
  }
  const lineCurrent = (line) => (unlocked(line) ? steps(line).find((step) => !done[line.id].has(step.id)) || null : null);
  /** The step the tracker shows: the tracked line's, else the main story's, else the first open side line's. */
  function current() {
    const tracked = lineById(state.tracked);
    if (tracked && lineCurrent(tracked)) return lineCurrent(tracked);
    for (const line of lines) {
      const step = lineCurrent(line);
      if (step) return step;
    }
    return null;
  }
  /** A line's first chapter that has to wait, once everything before it is done (where the line waits). */
  const waitingAt = (line) => {
    const index = line.chapters.findIndex(blocked);
    return index >= 0 && line.chapters.slice(0, index).every((c) => chapterDone(line, c)) ? line.chapters[index] : null;
  };
  /** Why a chapter waits, for the log. */
  const waitReason = (chapter) => {
    if (chapter.ready === false) return "制作中，敬请期待";
    const other = lineById(chapter.after?.line);
    const need = other?.chapters.find((c) => c.id === chapter.after.chapter);
    return need ? `完成「${need.title}」后继续` : "";
  };

  function complete(step) {
    const before = current();
    const wasUnlocked = new Set(lines.filter(unlocked).map((line) => line.id));
    done[step.line.id].add(step.id);
    const finishedChapter = chapterDone(step.line, step.chapter) ? step.chapter : null;
    if (finishedChapter?.badge) state.badges.add(finishedChapter.badge.id);
    save();
    const opened = lines.filter((line) => unlocked(line) && !wasUnlocked.has(line.id));
    const next = current();
    // What the guide says, in order: this step's ending, the chapter's ending, new lines opening, the next step.
    const story = [...(step.done || []), ...(finishedChapter?.done || []), ...opened.flatMap((line) => line.intro || [])];
    if (next && next.id !== before?.id) story.push(...(next.say || []));
    for (const listen of listeners) listen({ step, finishedChapter, opened, next, story });
  }

  return {
    lines,
    get difficulty() {
      return state.difficulty;
    },
    setDifficulty(value) {
      state.difficulty = value;
      save();
    },
    get focus() {
      return state.focus;
    },
    setFocus(value) {
      state.focus = value;
      save();
    },
    current,
    lineCurrent,
    unlocked,
    waitingAt,
    waitReason,
    chapterDone,
    isDone: (lineId, stepId) => done[lineId]?.has(stepId) || false,
    /** A step finished in any line (skills are keyed by the step that teaches them). */
    stepDone: (stepId) => lines.some((line) => done[line.id].has(stepId)),
    get tracked() {
      return state.tracked;
    },
    track(lineId) {
      state.tracked = lineId;
      save();
    },
    /**
     * A case the story has reached (the demo opens its cases act by act): every chapter before the
     * first chapter of that case's act is done. Cases outside every line count as reachable.
     */
    caseReachable(caseId) {
      for (const line of lines) {
        const at = line.chapters.findIndex((c) => c.steps.some((s) => s.type === "solve" && s.case === caseId));
        if (at < 0) continue;
        const act = line.chapters[at].act;
        const start = act == null ? at : line.chapters.findIndex((c) => c.act === act);
        return line.chapters.slice(0, start).every((c) => chapterDone(line, c));
      }
      return true;
    },
    /** Best stars per drill, from the 复勘 ladder (game-drills.js). */
    get drills() {
      return state.drills;
    },
    /** A finished drill: only the best run counts, and a replay can never lower it. */
    recordDrill(id, stars) {
      const earned = Math.max(0, Math.min(3, Math.round(stars)));
      if (!id || earned <= (state.drills[id] || 0)) return false;
      state.drills[id] = earned;
      save();
      return true;
    },
    /** Earned badges with their names. */
    badges: () => lines.flatMap((line) => line.chapters.filter((c) => c.badge && state.badges.has(c.badge.id)).map((c) => c.badge)),
    /**
     * 钟楼的钟面（docs/story-prologue.md 第 1 节）：第一部的序章里一直停在 11:58（小镇时间照常走）；
     * 正式版每找回一个时代往前走 20 秒。
     */
    clockState() {
      return "stopped";
    },
    /** Report what happened in the game; completes the matching current step of every open line. */
    event(kind, id) {
      let matched = false;
      for (const line of lines) {
        const step = lineCurrent(line);
        if (!step) continue;
        const match =
          (step.type === "enter" && kind === "enter" && step.spot === id) ||
          (step.type === "solve" && kind === "solve" && step.case === id) ||
          (step.type === "play" && kind === "play" && step.game === id) ||
          (step.type === "travel" && kind === "travel" && step.era === id);
        if (match) {
          complete(step);
          matched = true;
        }
      }
      // A case solved out of order still counts, so free exploration is never wasted.
      if (kind === "solve") {
        for (const line of lines) {
          const later = steps(line).find((s) => s.type === "solve" && s.case === id && !done[line.id].has(s.id));
          if (later) {
            done[line.id].add(later.id);
            save();
          }
        }
      }
      return matched;
    },
    onChange(listen) {
      listeners.add(listen);
    },
    /** Start every line over (difficulty and finished cases' stars are kept). */
    reset() {
      for (const line of lines) done[line.id].clear();
      state.badges.clear();
      state.tracked = null;
      state.drills = {};
      save();
    },
  };
}
