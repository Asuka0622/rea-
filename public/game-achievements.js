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
  { id: "forge-reviewer", title: "发布前过一眼", note: "听铁叔说起发布检查", when: { talk: "smith-release" } },
  { id: "first-day", title: "初来乍到", note: "第一次走进侦探事务所", when: { step: "visit-office" } },
  { id: "where-data", title: "数据去哪了", note: "查清了小林的记账软件", when: { step: "solve-privacy" } },
  { id: "lost-key", title: "钥匙掉了", note: "找到了阿哲写在代码里的钥匙", when: { step: "solve-weather" } },
  { id: "egg-hunter", title: "彩蛋猎人", note: "找到了计算器里的彩蛋", when: { step: "solve-eggs" } },
  { id: "save-reader", title: "存档读心术", note: "看懂了朵朵的游戏存档", when: { step: "solve-save" } },
  { id: "spot-diff", title: "大家来找茬", note: "找出了新旧两版便签软件的不同", when: { step: "solve-notes" } },
  { id: "flashlight", title: "手电筒想看通讯录？", note: "揭穿了王奶奶的手电筒", when: { step: "solve-flashlight" } },
  { id: "storyteller", title: "故事收藏家", note: "听完了档案馆的真实故事", when: { step: "read-stories" } },
  { id: "detective", title: "见习侦探", note: "拿到了镇长发的见习侦探徽章", when: { step: "pin-act1" } },
  { id: "red-string", title: "红线", note: "把五张线索卡连成了一条线", when: { step: "pin-act2" } },
  { id: "midnight", title: "23:58", note: "在钟楼底下守到了 23:58", when: { step: "wait-night" } },
  { id: "tower-opened", title: "门后不是齿轮", note: "打开了停摆的钟楼", when: { step: "open-tower" } },
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
  // —— 手艺街与镇上的摊主：生活里的人，不是任务发布器 ——
  { id: "npc-baker", title: "又是最后一名", note: "揉着面的阿桃说起她的店总被排在最后", when: { talk: "baker" } },
  { id: "npc-barista", title: "您上次喝哪杯", note: "被小鹿的便签本问住了", when: { talk: "barista" } },
  { id: "npc-disk-vendor", title: "格式化过了，大概", note: "从阿飞手里接过一块没删干净的硬盘", when: { talk: "disk-vendor" } },
  { id: "npc-parcel", title: "24 个格子，60 个人", note: "帮大壮数过快递柜", when: { talk: "parcel" } },
  { id: "npc-student", title: "算是查过吧", note: "撞见小满把练习册往身后藏", when: { talk: "student" } },
  { id: "npc-watchmaker", title: "表没问题", note: "修表摊前，老魏说问题是时间的", when: { talk: "watchmaker" } },
  // —— 街坊：素材到位后接进来的十二位，各自在门口做自己的事 ——
  { id: "npc-carpenter", title: "顺纹路", note: "听木工坊的阿木讲木头怎么裂", when: { talk: "carpenter" } },
  { id: "npc-painter", title: "等墙变色的", note: "在画室门口遇见老墨", when: { talk: "painter" } },
  { id: "npc-gamer", title: "这一把", note: "游戏厅门口和小单说上话", when: { talk: "gamer" } },
  { id: "npc-librarian", title: "书不会告密", note: "给抱着一摞书的书奶奶让了道", when: { talk: "librarian" } },
  { id: "npc-postman", title: "今天第三趟", note: "在广场撞见送信第三趟的阿信", when: { talk: "postman" } },
  { id: "npc-doctor", title: "哪儿不舒服", note: "诊所门口被白医生问了一句", when: { talk: "doctor" } },
  { id: "npc-vendor", title: "先尝", note: "在公告板旁尝了老吴一颗橘子", when: { talk: "vendor" } },
  { id: "npc-musician", title: "不合拍", note: "喷泉边听阿弦弹了两下", when: { talk: "musician" } },
  { id: "npc-clerk", title: "就五分钟", note: "办公楼前遇到抱着文件夹的小方", when: { talk: "clerk" } },
  { id: "npc-jogger", title: "每天一模一样", note: "在住宅区遇到跑固定路线的人", when: { talk: "jogger" } },
  { id: "npc-kid", title: "这是我的剑", note: "被小豆用一根树枝拦下", when: { talk: "kid" } },
  { id: "npc-fisher", title: "网眼大小", note: "南岸遇到收线没收获的老船", when: { talk: "fisher" } },
  // —— 委托人本人：他们的委托不在板上，得走过去当面接 ——
  { id: "npc-duoduo", title: "地是对的，数是错的", note: "在门口蹲着的朵朵那儿接下了她的存档", when: { talk: "duoduo" } },
  { id: "npc-wang-nainai", title: "一个照明要通讯录？", note: "接过王奶奶手里那个不敢装的手电筒", when: { talk: "wang-nainai" } },
  { id: "npc-lao-qin", title: "读不出来也算结论", note: "从档案馆老秦的纸箱里接过一份读不动的程序", when: { talk: "lao-qin" } },
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
