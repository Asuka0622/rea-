// 成就: playful titles for things the player did. Skill names stay plain (game-skills.js); the fun names
// live here. The game reports what happened through note(); an achievement unlocks when its `when`
// matches, and onUnlock shows it. Kinds of `when`:
//   { step }      a quest step finished          { chapter }   a quest chapter finished
//   { perfect }   a mini-game won without a mistake
//   { regions }   that many regions visited      { region }    a region visited
//   { walked }    map pixels walked in total     { skills }    that many skills lit
//   { hard }      a chapter finished on 硬核      { sound: false } sound switched off
//   { eggs }      easter eggs found              { case }      a case closed at that many stars
//   { claim }     a case ended with that claim (insufficient = 「证据不足」)
//   { board }     that many commissions closed   { side }      that many side quests closed
//   { sprint }    map pixels sprinted in total   { talk }      first conversation with an NPC
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
  // —— 探索与彩蛋 ——
  { id: "egg-first", title: "路边有光", note: "捡到第一个彩蛋", when: { eggs: 1 } },
  { id: "egg-five", title: "捡破烂的侦探", note: "捡到 5 个彩蛋", when: { eggs: 5 } },
  { id: "egg-half", title: "半个小镇都在口袋里", note: "捡到 12 个彩蛋", when: { eggs: 12 } },
  { id: "egg-all", title: "掘地三尺", note: "把镇上的彩蛋全捡齐了", when: { eggs: 23 }, secret: true },
  { id: "craft-regular", title: "手艺街的常客", note: "第一次走进手艺街", when: { region: "craft" } },
  { id: "walked-30k", title: "把小镇走成针眼", note: "走了 30000 个地图像素", when: { walked: 30000 } },
  // —— 冲刺 ——
  { id: "sprint-1k", title: "跑起来", note: "按住 Shift 跑完 1000 个地图像素", when: { sprint: 1000 } },
  { id: "sprint-5k", title: "风一样的侦探", note: "累计冲刺 5000 个地图像素", when: { sprint: 5000 }, secret: true },
  // —— 委托与判断 ——
  { id: "case-three-stars", title: "完美结案", note: "三星结案一次", when: { case: 3 } },
  { id: "claim-insufficient", title: "证据不足也是结论", note: "在一份委托里写下「证据不足」", when: { claim: "insufficient" } },
  { id: "board-clear", title: "委托板清空", note: "把六份基础委托都结案了", when: { board: 6 } },
  { id: "side-first", title: "顺手接了个小活", note: "完成第一条支线", when: { side: 1 } },
  { id: "side-three", title: "支线比主线好玩", note: "完成三条支线", when: { side: 3 } },
  { id: "skills-20", title: "半本大纲", note: "点亮了 20 个技能", when: { skills: 20 } },
  // —— 和镇上的 NPC 说上话 ——
  { id: "npc-pigeon-uncle", title: "听老周讲古", note: "和喂鸽子的老周聊过天", when: { talk: "pigeon-uncle" } },
  { id: "npc-oncall", title: "已读四百次", note: "遇到了边遛狗边看告警的阿康", when: { talk: "oncall" } },
  { id: "npc-paperboy", title: "号外，还是昨天的", note: "从小石头手里接过一份头版没换的报纸", when: { talk: "paperboy" } },
  { id: "npc-lighthouse", title: "灯是给晚上准备的", note: "听老陈讲他为什么白天也擦灯", when: { talk: "lighthouse-keeper" } },
  { id: "npc-apprentice", title: "0.5 秒不算准", note: "和修表学徒小铃争论了一次误差", when: { talk: "apprentice" } },
  { id: "npc-cobbler", title: "鞋底比人诚实", note: "让老宋看了一眼你的鞋底", when: { talk: "cobbler" } },
  { id: "npc-all", title: "把镇上的人聊了一半", note: "和三位镇民说过话", when: { talked: 3 } },
  // —— 能坐的地方 ——
  { id: "sit-once", title: "坐一会儿", note: "在小镇上第一次坐下来", when: { sit: 1 } },
  { id: "sit-three", title: "镇上的椅子都有你的形状", note: "坐过三个不同的地方", when: { sit: 3 } },
  { id: "fountain-coin-touch", title: "扔过硬币吗", note: "在喷泉里看见过一枚正面朝上的硬币", when: { scenery: "fountain" } },
];

function load() {
  try {
    return { got: {}, regions: [], talked: [], sat: [], walked: 0, sprinted: 0, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { got: {}, regions: [], talked: [], sat: [], walked: 0, sprinted: 0 };
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
      case "eggs":
        return Boolean(when.eggs) && event.count >= when.eggs;
      case "case":
        return Boolean(when.case) && event.stars >= when.case;
      case "claim":
        return Boolean(when.claim) && when.claim === event.kind;
      case "board":
        return Boolean(when.board) && event.done >= when.board;
      case "side":
        return Boolean(when.side) && event.done >= when.side;
      case "sprint":
        return Boolean(when.sprint) && state.sprinted >= when.sprint;
      case "talk":
        return when.talk === event.id || (Boolean(when.talked) && state.talked.length >= when.talked);
      case "sit":
        return Boolean(when.sit) && state.sat.length >= when.sit;
      case "scenery":
        return Boolean(when.scenery) && when.scenery === event.id;
      default:
        return false;
    }
  };
  /** Report something that happened; `quiet` grants without announcing (catching up on old saves). */
  function note(event, { quiet = false } = {}) {
    if (event.type === "region" && !state.regions.includes(event.id)) state.regions.push(event.id);
    if (event.type === "talk" && event.id && !state.talked.includes(event.id)) state.talked.push(event.id);
    if (event.type === "sit" && event.id && !state.sat.includes(event.id)) state.sat.push(event.id);
    if (event.type === "walked") state.walked += event.by;
    if (event.type === "sprint") state.sprinted += event.by;
    const fresh = ACHIEVEMENTS.filter((a) => !state.got[a.id] && matches(a.when, event));
    for (const a of fresh) state.got[a.id] = Date.now();
    if (fresh.length || event.type === "region" || event.type === "talk" || event.type === "sit") save();
    if (!quiet) fresh.forEach((a) => onUnlock(a));
    return fresh;
  }
  // Walking is reported often; save it now and then.
  const timer = setInterval(save, 15000);
  timer?.unref?.();
  return {
    note,
    got: (id) => state.got[id] || null,
    count: () => Object.keys(state.got).length,
  };
}
