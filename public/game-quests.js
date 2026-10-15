// 任务系统: quest chains made of chapters and steps, the player's difficulty, and saved progress.
// Game-agnostic on purpose: a quest line (REA's detective branch now, programming / network / AI
// districts later) is plain data, and the game reports what happened ("entered a building",
// "solved a case") through event(). Progress lives in this browser's localStorage.

const KEY = "rea-game-progress";

export const DIFFICULTIES = {
  easy: { label: "轻松", note: "大白话讲解，提示随便用、不扣分，卡住了可以直接看答案。适合完全没接触过技术的人。" },
  normal: { label: "标准", note: "跟着线索自己找答案，提示会影响评价。适合大多数人。" },
  hard: { label: "硬核", note: "直接看专业报告，没有提示，每个案子多一道挑战题。适合有基础、想学深一点的人。" },
};

/**
 * The REA side quest (侦探事务所支线). Steps:
 *   { id, type: "enter", spot }  enter a building or walk into a client's home
 *   { id, type: "solve", case }  finish a case (its conclusion is shown)
 * `say` is what the guide says when the step becomes current; `done` when the chapter ends.
 */
export const REA_QUEST = {
  id: "rea",
  title: "侦探事务所支线",
  subtitle: "学会拆开软件，看清它在做什么",
  chapters: [
    {
      id: "prologue",
      title: "序章 · 新来的侦探助手",
      steps: [{ id: "visit-office", type: "enter", spot: "home", goal: "去侦探事务所找路米", say: [{ text: "欢迎来到比特镇！我是路米，在镇上开了一家侦探事务所，专门帮大家查软件。", face: "happy" }, { text: "你愿意当我的助手吗？先跟我回事务所看看吧，就在广场正北边。", face: "normal" }] }],
      done: [{ text: "这就是我们的事务所。我们的工作叫「逆向分析」：把软件拆开，看清它到底在做什么。", face: "happy" }, { text: "不过开工之前，你得先学点基础。图书馆的书奶奶最会讲这些了。", face: "normal" }],
    },
    {
      id: "basics",
      title: "第一课 · 书奶奶的图书馆",
      steps: [{ id: "visit-library", type: "enter", spot: "learn", goal: "去图书馆上第一课", say: [{ text: "图书馆在小镇西北边，石头砌的那栋。", face: "normal" }] }],
      done: [{ text: "基础课的书都在书架上了，随时可以回来翻。现在，镇上已经有人来找我们帮忙了！", face: "happy" }],
    },
    {
      id: "case-1",
      title: "委托一 · 小林的记账软件",
      steps: [{ id: "solve-privacy", type: "solve", case: "privacy-ledger", spot: "privacy-ledger", goal: "去小林的宿舍，查查「小账本」", say: [{ text: "第一个委托来自小林，他住在广场西边的宿舍。他说新装的记账软件有点不对劲。", face: "thinking" }] }],
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
      steps: [{ id: "solve-save", type: "solve", case: "farm-save", spot: "farm-save", goal: "去朵朵的农场，看懂游戏存档", say: [{ text: "朵朵想知道她的种田游戏是怎么存档的。农场在小镇东北角。", face: "normal" }] }],
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
      title: "准备工具 · 铁叔的工具铺",
      steps: [{ id: "visit-tools", type: "enter", spot: "engines", goal: "去工具铺，准备分析手机 App 的工具", say: [{ text: "下一个委托是手机 App，要用专门的工具才能拆开。去工具铺看看吧，在小镇东北边。", face: "normal" }] }],
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
      steps: [{ id: "read-stories", type: "solve", case: "real-stories", spot: "real-stories", goal: "去小镇档案馆，听听真实发生过的故事", say: [{ text: "你已经破了六个案子。档案馆的老秦收集了很多真实发生过的故事，去听听吧。", face: "normal" }] }],
      done: [{ text: "这些都是真事。你学到的方法，真正的安全研究员每天都在用。", face: "thinking" }],
    },
    {
      id: "finale",
      title: "结局 · 见习侦探",
      steps: [{ id: "report-back", type: "enter", spot: "home", goal: "回事务所向路米报告", say: [{ text: "回事务所来吧，我有东西要给你。", face: "happy" }] }],
      done: [{ text: "这枚「见习侦探」徽章是你的了！逆向分析的基础，你已经全部学会。", face: "happy" }, { text: "小镇里还有很多地方等你去学：编程、网络、电脑、AI……我们下次见！", face: "happy" }],
    },
  ],
};

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function createQuests(quest = REA_QUEST) {
  const saved = load();
  const state = {
    difficulty: saved.difficulty || null,
    done: new Set(saved.done?.[quest.id] || []),
    badges: new Set(saved.badges || []),
  };
  const listeners = new Set();
  const save = () => {
    try {
      const all = load();
      all.difficulty = state.difficulty;
      all.done = { ...(all.done || {}), [quest.id]: [...state.done] };
      all.badges = [...state.badges];
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
  };

  const steps = () => quest.chapters.flatMap((chapter) => chapter.steps.map((step) => ({ ...step, chapter })));
  /** The first step not done yet, with its chapter; null when the whole line is finished. */
  const current = () => steps().find((step) => !state.done.has(step.id)) || null;
  const chapterDone = (chapter) => chapter.steps.every((step) => state.done.has(step.id));

  function complete(step) {
    state.done.add(step.id);
    const finishedChapter = chapterDone(step.chapter) ? step.chapter : null;
    if (finishedChapter?.id === "finale") state.badges.add("rea-detective");
    save();
    const next = current();
    for (const listen of listeners) listen({ finishedChapter, next });
  }

  return {
    quest,
    get difficulty() {
      return state.difficulty;
    },
    setDifficulty(value) {
      state.difficulty = value;
      save();
    },
    current,
    chapterDone,
    isDone: (stepId) => state.done.has(stepId),
    badges: () => [...state.badges],
    /** Report what happened in the game; completes the current step when it matches. */
    event(kind, id) {
      const step = current();
      if (!step) return false;
      const match = (step.type === "enter" && kind === "enter" && step.spot === id) || (step.type === "solve" && kind === "solve" && step.case === id);
      if (match) complete(step);
      // A case solved out of order still counts, so free exploration is never wasted.
      else if (kind === "solve") {
        const later = steps().find((s) => s.type === "solve" && s.case === id && !state.done.has(s.id));
        if (later) {
          state.done.add(later.id);
          save();
        }
      }
      return match;
    },
    onChange(listen) {
      listeners.add(listen);
    },
    reset() {
      state.done.clear();
      state.badges.delete("rea-detective");
      save();
    },
  };
}
