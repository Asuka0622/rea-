// 成就: playful titles for things the player did. Skill names stay plain (game-skills.js); the fun names
// live here. The game reports what happened through note(); an achievement unlocks when its `when`
// matches, and onUnlock shows it. Kinds of `when`:
//   { step }      a quest step finished          { chapter }   a quest chapter finished
//   { perfect }   a mini-game won without a mistake
//   { regions }   that many regions visited      { region }    a region visited
//   { walked }    map pixels walked in total     { skills }    that many skills lit
//   { hard }      a chapter finished on 硬核      { sound: false } sound switched off
// `secret` ones show as ？？？ until unlocked. Saved in this browser's localStorage.

const KEY = "rea-game-achievements";

export const ACHIEVEMENTS = [
  { id: "first-day", title: "初来乍到", note: "第一次走进侦探事务所", when: { step: "visit-office" } },
  { id: "bookworm", title: "书虫上线", note: "去图书馆上了第一课", when: { step: "visit-library" } },
  { id: "silent-tower", title: "钟楼怎么不响了", note: "看到了停摆的钟楼", when: { step: "visit-tower" } },
  { id: "open-sesame", title: "芝麻开门", note: "用 8 盏灯打开了钟楼的门", when: { step: "open-door" } },
  { id: "teardown", title: "拆机小能手", note: "弄清了钟楼每个零件是干什么的", when: { step: "sort-parts" } },
  { id: "amnesia", title: "断电就失忆", note: "弄明白了钟楼为什么忘了时间", when: { step: "two-drawers" } },
  { id: "tick-tock", title: "滴答滴答", note: "让钟楼重新走了起来（完成第一章）", when: { chapter: "ch1" } },
  { id: "time-traveler", title: "九百年前的州桥", note: "第一次坐时光机，到了汴京", when: { step: "to-china" } },
  { id: "teahouse", title: "州桥算账", note: "帮柳娘子算完了一天的账", when: { step: "teahouse-bill" } },
  { id: "beat", title: "天衡定拍", note: "让水运仪象台的枢轮稳稳地走", when: { step: "tower-beat" } },
  { id: "rods-ace", title: "一纵十横", note: "摆算筹一笔都没算错", when: { perfect: "rods" } },
  { id: "beat-ace", title: "踩准每个鼓点", note: "调天衡时节拍一次都没乱", when: { perfect: "escapement" } },
  { id: "code-rods", title: "代码也会摆算筹", note: "用真正的代码把数拆成每一位", when: { step: "code-digits" } },
  { id: "where-data", title: "数据去哪了", note: "查清了小林的记账软件", when: { step: "solve-privacy" } },
  { id: "lost-key", title: "钥匙掉了", note: "找到了学长写在代码里的钥匙", when: { step: "solve-keys" } },
  { id: "egg-hunter", title: "彩蛋猎人", note: "找到了计算器里的彩蛋", when: { step: "solve-eggs" } },
  { id: "save-reader", title: "存档读心术", note: "看懂了朵朵的游戏存档", when: { step: "solve-save" } },
  { id: "spot-diff", title: "大家来找茬", note: "找出了新旧两版便签软件的不同", when: { step: "solve-versions" } },
  { id: "flashlight", title: "手电筒想看通讯录？", note: "揭穿了王奶奶的手电筒", when: { step: "solve-flashlight" } },
  { id: "storyteller", title: "故事收藏家", note: "听完了档案馆的真实故事", when: { step: "read-stories" } },
  { id: "detective", title: "见习侦探", note: "拿到了路米给的徽章", when: { step: "report-back" } },
  { id: "binary-ace", title: "二进制神算子", note: "二进制灯一次都没错", when: { perfect: "binary" } },
  { id: "parts-ace", title: "一个零件都不落", note: "零件归类零失误", when: { perfect: "parts" } },
  { id: "memory-ace", title: "记性满分", note: "两个抽屉零失误", when: { perfect: "drawers" } },
  { id: "riverside", title: "河对岸的风景", note: "第一次过桥去了南岸", when: { region: "south" } },
  { id: "wanderer", title: "比特镇漫游者", note: "五个区都去过了", when: { regions: 5 } },
  { id: "marathon", title: "腿都走酸了", note: "在小镇里走了很远很远", when: { walked: 15000 } },
  { id: "skills-5", title: "小有所成", note: "点亮了 5 个技能", when: { skills: 5 } },
  { id: "skills-10", title: "技能达人", note: "点亮了 10 个技能", when: { skills: 10 } },
  { id: "hardcore", title: "硬核到底", note: "用硬核难度完成了一章", when: { hard: true } },
  { id: "shh", title: "嘘——", note: "把音效关掉了。安静也挺好。", when: { sound: false }, secret: true },
];

function load() {
  try {
    return { got: {}, regions: [], walked: 0, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { got: {}, regions: [], walked: 0 };
  }
}

export function createAchievements({ onUnlock = () => {} } = {}) {
  const state = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  };
  const matches = (when, event) => {
    switch (event.type) {
      case "step":
        return when.step === event.id;
      case "chapter":
        return when.chapter === event.id || (when.hard && event.difficulty === "hard");
      case "perfect":
        return when.perfect === event.id;
      case "region":
        return when.region === event.id || (when.regions && state.regions.length >= when.regions);
      case "walked":
        return when.walked && state.walked >= when.walked;
      case "skills":
        return when.skills && event.count >= when.skills;
      case "sound":
        return when.sound === event.on;
      default:
        return false;
    }
  };
  /** Report something that happened; `quiet` grants without announcing (catching up on old saves). */
  function note(event, { quiet = false } = {}) {
    if (event.type === "region" && !state.regions.includes(event.id)) state.regions.push(event.id);
    if (event.type === "walked") state.walked += event.by;
    const fresh = ACHIEVEMENTS.filter((a) => !state.got[a.id] && matches(a.when, event));
    for (const a of fresh) state.got[a.id] = Date.now();
    if (fresh.length || event.type === "region") save();
    if (!quiet) fresh.forEach((a) => onUnlock(a));
    return fresh;
  }
  // Walking is reported often; save it now and then.
  setInterval(save, 15000);
  return {
    note,
    got: (id) => state.got[id] || null,
    count: () => Object.keys(state.got).length,
  };
}
