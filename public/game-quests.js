// 任务系统: quest lines (the main story and district side lines) made of chapters and steps, the
// player's difficulty, and saved progress. Game-agnostic on purpose: a line is plain data, and the game
// reports what happened ("entered a building", "solved a case") through event(). The story itself is
// designed in docs/story.md. Progress lives in this browser's localStorage.

const KEY = "rea-game-progress";

export const DIFFICULTIES = {
  easy: { label: "轻松", note: "大白话讲解，提示随便用、不扣分，卡住了可以直接看答案。适合完全没接触过技术的人。" },
  normal: { label: "标准", note: "跟着线索自己找答案，提示会影响评价。适合大多数人。" },
  hard: { label: "硬核", note: "直接看专业报告，没有提示，每个案子多一道挑战题。适合有基础、想学深一点的人。" },
};

/*
 * A line: { id, title, subtitle, unlock?, intro?, chapters }.
 *   unlock: { line, chapter } — the line opens when that chapter of another line is done.
 *   intro: what the guide says when the line opens.
 * A chapter: { id, title, steps, done?, badge?, ready? } — ready: false = still being made (shown in the
 *   log as 制作中; the line waits there).
 * A step: { id, type: "enter" | "solve", spot, case?, goal, say, done? }
 *   enter: walk into a building (spot); solve: finish a case. `say` is what the guide says when the step
 *   becomes current, `done` when it is finished; a chapter's `done` follows its last step.
 */

/** 主线「停摆的钟楼」(docs/story.md). Only the prologue is playable so far. */
export const MAIN_QUEST = {
  id: "main",
  title: "主线 · 停摆的钟楼",
  subtitle: "修好钟楼，一路弄懂电脑、编程、网络、安全和 AI",
  chapters: [
    {
      id: "prologue",
      title: "序章 · 新来的助手",
      steps: [
        {
          id: "visit-office", type: "enter", spot: "home", goal: "去侦探事务所找路米",
          say: [{ text: "欢迎来到比特镇！我是路米，在镇上开了一家侦探事务所，专门帮大家查软件。", face: "happy" }, { text: "你愿意当我的助手吗？先跟我回事务所看看吧，就在广场正北边。", face: "normal" }],
          done: [{ text: "这就是我们的事务所。我们的工作叫「逆向分析」：把软件拆开，看清它到底在做什么。", face: "happy" }, { text: "……咦，都中午了，钟楼怎么没响？算了，先办正事。开工之前，你得先学点基础。", face: "thinking" }],
        },
        {
          id: "visit-library", type: "enter", spot: "learn", goal: "去图书馆找书奶奶上第一课",
          say: [{ text: "图书馆在广场西北边，紫色屋顶、石头砌的那栋。书奶奶最会讲基础了。", face: "normal" }],
          done: [{ text: "书奶奶说，钟楼从她小时候起就没停过一天。今天中午它却一声都没响……", face: "thinking" }],
        },
        {
          id: "visit-tower", type: "enter", spot: "clocktower", goal: "去北区看看停摆的钟楼",
          say: [{ text: "走，去北区看看钟楼！从广场一直往北走就到了。", face: "normal" }],
        },
      ],
      done: [
        { text: "钟楼的门锁得紧紧的，门上刻着一串 0 和 1……这钟楼，好像不只是一座钟？", face: "surprised" },
        { text: "要打开它，得请工具铺的铁叔帮忙。他出门进货了，过几天才回来。", face: "thinking" },
        { text: "在那之前，事务所的委托板上已经有人来求助了。我们先帮帮大家吧！", face: "happy" },
      ],
    },
    { id: "ch1", title: "第一章 · 打开钟楼（电脑是什么）", ready: false, steps: [] },
    { id: "ch2", title: "第二章 · 重写指令（编程）", ready: false, steps: [] },
    { id: "ch3", title: "第三章 · 对时（网络）", ready: false, steps: [] },
    { id: "ch4", title: "第四章 · 谁动了钟（安全与逆向）", ready: false, steps: [] },
    { id: "ch5", title: "第五章 · 小故障（AI）", ready: false, steps: [] },
    { id: "finale", title: "终章 · 钟声响起", ready: false, steps: [] },
  ],
};

/** 侦探事务所支线: REA's six cases and the real stories. */
export const REA_QUEST = {
  id: "rea",
  title: "支线 · 侦探事务所",
  subtitle: "学会拆开软件，看清它在做什么",
  unlock: { line: "main", chapter: "prologue" },
  chapters: [
    {
      id: "case-1",
      title: "委托一 · 小林的记账软件",
      steps: [{ id: "solve-privacy", type: "solve", case: "privacy-ledger", spot: "privacy-ledger", goal: "去小林的宿舍，查查「小账本」", say: [{ text: "第一个委托来自小林，他住在住宅区的宿舍楼：从广场往西走就到。他说新装的记账软件有点不对劲。", face: "thinking" }] }],
      done: [{ text: "漂亮！你已经学会看软件往哪里发数据、用了哪些敏感能力了。", face: "happy" }],
    },
    {
      id: "case-2",
      title: "委托二 · 学长的钥匙",
      steps: [{ id: "solve-keys", type: "solve", case: "weather-keys", spot: "weather-keys", goal: "去学长的机房，帮他做发布前的安全自查", say: [{ text: "学长写了个天气软件，想发布前检查一下。机房就是屋顶带天线的那栋。", face: "normal" }] }],
      done: [{ text: "写死在代码里的钥匙，谁拆开都能看到。这一课很多大公司都吃过亏。", face: "thinking" }],
    },
    {
      id: "case-3",
      title: "委托三 · 计算器的秘密",
      steps: [{ id: "solve-eggs", type: "solve", case: "calculator-eggs", spot: "calculator-eggs", goal: "去小雨家，找找计算器里的彩蛋", say: [{ text: "小雨说她的计算器里藏着秘密。走，去她家看看！", face: "happy" }] }],
      done: [{ text: "彩蛋可以留，后门不能留。重要的检查要放在服务器上，这条要记住。", face: "normal" }],
    },
    {
      id: "case-4",
      title: "委托四 · 朵朵的存档",
      steps: [{ id: "solve-save", type: "solve", case: "farm-save", spot: "farm-save", goal: "去朵朵的农场，看懂游戏存档", say: [{ text: "朵朵想知道她的种田游戏是怎么存档的。农场在住宅区，红色谷仓那里。", face: "normal" }] }],
      done: [{ text: "编码不是加密，校验码也挡不住看懂代码的人。你已经能看懂文件格式了！", face: "happy" }],
    },
    {
      id: "case-5",
      title: "委托五 · 周姐的便签",
      steps: [{ id: "solve-versions", type: "solve", case: "notes-versions", spot: "home", goal: "回事务所，从委托板接周姐的委托", say: [{ text: "周姐的便签软件更新后不太对劲。她今天在办公室走不开，委托单放在我们事务所的委托板上了。", face: "thinking" }] }],
      done: [{ text: "对比新旧版本，更新说明没写的变化就藏不住了。", face: "happy" }],
    },
    {
      id: "tools",
      title: "准备工具 · 工具铺",
      steps: [{ id: "visit-tools", type: "enter", spot: "engines", goal: "去工具铺，准备分析手机 App 的工具", say: [{ text: "下一个委托是手机 App，要用专门的工具才能拆开。去工具铺看看吧，在广场东北边。", face: "normal" }] }],
      done: [{ text: "工具备好了（如果还没装，随时可以回来装）。王奶奶在等我们呢。", face: "normal" }],
    },
    {
      id: "case-6",
      title: "委托六 · 王奶奶的手电筒",
      steps: [{ id: "solve-flashlight", type: "solve", case: "flashlight-apk", spot: "flashlight-apk", goal: "去王奶奶家，看看手电筒为什么要通讯录", say: [{ text: "王奶奶装了个手电筒，它却要看通讯录。王奶奶家门口晾着衣服，很好认。", face: "thinking" }] }],
      done: [{ text: "权限和功能对不上，就是最明显的危险信号。王奶奶要谢谢你呢！", face: "happy" }],
    },
    {
      id: "stories",
      title: "尾声 · 档案馆的故事",
      steps: [{ id: "read-stories", type: "solve", case: "real-stories", spot: "real-stories", goal: "去档案馆，听听真实发生过的故事", say: [{ text: "你已经破了六个案子。住宅区档案馆的老秦收集了很多真实发生过的故事，去听听吧。", face: "normal" }] }],
      done: [{ text: "这些都是真事。你学到的方法，真正的安全研究员每天都在用。", face: "thinking" }],
    },
    {
      id: "finale",
      title: "结案 · 见习侦探",
      badge: { id: "rea-detective", label: "见习侦探" },
      steps: [{ id: "report-back", type: "enter", spot: "home", goal: "回事务所向路米报告", say: [{ text: "回事务所来吧，我有东西要给你。", face: "happy" }] }],
      done: [{ text: "这枚「见习侦探」徽章是你的了！逆向分析的基础，你已经全部学会。", face: "happy" }, { text: "以后钟楼的案子，也要靠你这双侦探的眼睛了。", face: "happy" }],
    },
  ],
};

export const QUEST_LINES = [MAIN_QUEST, REA_QUEST];

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function createQuests(lines = QUEST_LINES) {
  const saved = load();
  const done = Object.fromEntries(lines.map((line) => [line.id, new Set(saved.done?.[line.id] || [])]));
  // Saves from before the main line: the prologue's first two steps were the REA line's.
  if (!saved.done?.main && done.main && saved.done?.rea) for (const id of ["visit-office", "visit-library"]) if (saved.done.rea.includes(id)) done.main.add(id);
  const state = { difficulty: saved.difficulty || null, badges: new Set(saved.badges || []), tracked: saved.tracked || null };
  const listeners = new Set();
  const save = () => {
    try {
      const all = load();
      all.difficulty = state.difficulty;
      all.done = { ...(all.done || {}), ...Object.fromEntries(lines.map((line) => [line.id, [...done[line.id]]])) };
      all.badges = [...state.badges];
      all.tracked = state.tracked;
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  };

  const lineById = (id) => lines.find((line) => line.id === id);
  const chapterDone = (line, chapter) => chapter.ready !== false && chapter.steps.every((step) => done[line.id].has(step.id));
  const unlocked = (line) => {
    if (!line.unlock) return true;
    const other = lineById(line.unlock.line);
    const chapter = other?.chapters.find((c) => c.id === line.unlock.chapter);
    return Boolean(other && chapter && chapterDone(other, chapter));
  };
  /** Playable steps, in order: a line stops at its first chapter still being made. */
  function steps(line) {
    const out = [];
    for (const chapter of line.chapters) {
      if (chapter.ready === false) break;
      for (const step of chapter.steps) out.push({ ...step, chapter, line });
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
  /** A line's first chapter still being made, once everything before it is done (where the line waits). */
  const waitingAt = (line) => {
    const index = line.chapters.findIndex((chapter) => chapter.ready === false);
    return index >= 0 && line.chapters.slice(0, index).every((c) => chapterDone(line, c)) ? line.chapters[index] : null;
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
    current,
    lineCurrent,
    unlocked,
    waitingAt,
    chapterDone,
    isDone: (lineId, stepId) => done[lineId]?.has(stepId) || false,
    get tracked() {
      return state.tracked;
    },
    track(lineId) {
      state.tracked = lineId;
      save();
    },
    /** Earned badges with their names. */
    badges: () => lines.flatMap((line) => line.chapters.filter((c) => c.badge && state.badges.has(c.badge.id)).map((c) => c.badge)),
    /**
     * The town clock follows the main story (docs/story.md 第 8 节): stopped until the tower is opened
     * (chapter 1), wrong until the AI chapter is solved, then right.
     */
    clockState() {
      const main = lineById("main");
      if (!main) return "running";
      const doneAt = (id) => {
        const chapter = main.chapters.find((c) => c.id === id);
        return chapter ? chapterDone(main, chapter) : false;
      };
      if (doneAt("ch5")) return "running";
      if (doneAt("ch1")) return "drifting";
      return "stopped";
    },
    /** Report what happened in the game; completes the matching current step of every open line. */
    event(kind, id) {
      let matched = false;
      for (const line of lines) {
        const step = lineCurrent(line);
        if (!step) continue;
        const match = (step.type === "enter" && kind === "enter" && step.spot === id) || (step.type === "solve" && kind === "solve" && step.case === id);
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
      save();
    },
  };
}
