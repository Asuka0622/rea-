// 会说话的 NPC：先说上话，再等美术
//
// 镇上这六位暂时是文字 + 占位小人（一个带名字的小圆点）。走过去就会说话，
// 第一次说完给一个成就；之后路过只留一句短的。
// 等 `docs/art/npcs.md` 第 2 节那六张精灵表到位，只要把 look 换成 sprite-<id>.png 就行。
//
// 其中四位还承担「传闻」：聊过之后，你才听说了这件事
// （discover 的值要写进 quest-progress 的 discovered，见 prologue-quests.js 的 discover 字段）。
//
// 还有三位是**委托人本人**（下面带 quest 的那几位）：他们自己站在镇上，走过去就当面开口。
// 他们的委托不进委托板——板子上只贴 `take: "board"` 的那几份（docs/quest-board.md 第 7 节）。
// 委托人自己会先亮一句闲话（first），再说正事（prologue-quests.js 里的 ask），
// 然后由玩家决定接不接；接了就记进 accepted，镇上会一直提醒你去哪儿。

export const NPC_TALKED_KEY = "rea-npc-talked";

export const CHATTER_NPCS = [
  {
    id: "pigeon-uncle",
    name: "老周",
    region: "center",
    x: 452,
    y: 300,
    look: "#9aa4b2",
    first: ["钟楼没停之前，镇上没人看表。", "现在人人都知道 11:58 了。"],
    after: "钟楼停了以后，鸽子倒是准时。",
    discover: "npc:王奶奶",
    hear: "对了，王奶奶昨天举着手电筒问我，装个照明怎么还要她的通讯录。你要是懂这个，去问问她。",
  },
  {
    id: "oncall",
    name: "阿康",
    region: "homes",
    x: 862,
    y: 300,
    look: "#6d7f9b",
    first: ["（手机响了）……这条我已经看了四百次。", "它每天都响，我就每天都按掉。"],
    after: "（手机又响了）别管它。",
    discover: "npc:朵朵",
    hear: "隔壁朵朵倒是真遇上事了：她的种田存档，读出来的数字跟种出来的地对不上，正到处找人看。",
  },
  {
    id: "paperboy",
    name: "小石头",
    region: "center",
    x: 300,
    y: 206,
    look: "#c1554a",
    first: ["今天的头版和昨天一样。", "我问过报社，他们说「明天就换」，说了三个月。"],
    after: "号外！还是昨天的号外！",
    discover: "rumor:计算器",
    hear: "要说新鲜事，倒有一桩：小雨那台计算器，按出来的数有点邪门，她自己好像还挺得意。",
  },
  {
    id: "lighthouse-keeper",
    quest: "beacon-release",
    pending: "副本还在，想好怎么改就再来。",
    later: "先去办一份基础委托，理解这个问题，再来帮我吧。",
    name: "老陈",
    region: "south",
    x: 830,
    y: 300,
    look: "#7f8f7a",
    first: ["白天不亮灯。", "万一今晚要用呢。"],
    after: "灯擦过了。",
    discover: "npc:老秦",
    hear: "档案馆的老秦前两天收了个读不动的程序，谁打开都是一屏乱码。他说，得找个不怕看不懂的人。",
  },
  /* ----- 委托人本人：他们的委托不在板上，得走过去当面接 ----- */
  {
    id: "duoduo",
    name: "朵朵",
    region: "homes",
    x: 806,
    y: 328,
    look: "#e08a9b",
    quest: "farm-save",
    first: ["（蹲在门口，掌机摊在膝盖上）", "我的地……昨天还是对的。"],
    // 已经接下还没做完：再来一次只催一句，并给「现在就去」的选择。
    pending: "存档还在机器里，你什么时候看都行。",
    after: "谢谢你。地是对的，数是错的——我现在知道该信哪个了。",
    later: "（她抱着掌机，欲言又止）……你要是懂了别的，再来找我？",
  },
  {
    id: "wang-nainai",
    name: "王奶奶",
    region: "homes",
    x: 452,
    y: 428,
    look: "#c8b28a",
    quest: "flashlight-apk",
    first: ["（手里攥着一个手电筒，屏幕亮着）", "这玩意儿我不敢装。"],
    pending: "手电筒我留着呢，你什么时候看都行。",
    after: "原来它要我的通讯录，跟照明一点关系都没有。",
    later: "（她把手电筒收进口袋）你先忙，我等等也不碍事。",
  },
  {
    id: "lao-qin",
    name: "老秦",
    // 小人图交付时的名字是 archivist（档案馆员），npc id 是 lao-qin。
    sprite: "archivist",
    region: "center",
    x: 218,
    y: 396,
    look: "#8b7f6b",
    quest: "packed-echo",
    first: ["（档案馆门口，纸箱里一摞软盘）", "这些都是别人不要的，我留着。"],
    pending: "那个程序还在箱子里，你什么时候试都行。",
    after: "读不出来也是个结论——这话我记住了。",
    later: "（他翻着纸箱）等你再会点别的，我再拿出来。",
  },
  /* ----- 手艺街与镇上的摊主：这批是「生活里」的人，不进委托板，也不点亮传闻 -----
     每人身上挂着一件正在发生的事（docs/npc-behavior.md 第 6.2 节），台词由他们自己说。 */
  {
    id: "baker",
    name: "阿桃",
    region: "craft",
    x: 430,
    y: 250,
    look: "#d9a066",
    first: ["（揉着面，抬头看你一眼）新面孔。", "别老最后一名——我是说我的店，不是说排名。"],
    after: "对面小鹿又被她那堆便签绕进去了，你要不要去看看热闹。",
  },
  {
    id: "barista",
    name: "小鹿",
    region: "craft",
    x: 560,
    y: 300,
    look: "#e8c9a0",
    first: ["（笑着递上便签本）您几位？", "……抱歉，您上次喝的是哪一杯来着？"],
    after: "便签一乱我就全错。记下来了，怎么反而更糊涂了呢。",
  },
  {
    id: "disk-vendor",
    name: "阿飞",
    region: "center",
    x: 620,
    y: 430,
    look: "#7f8f9b",
    first: ["（拍着一箱硬盘）格式化过了，我发誓——大概。", "上一位主人？不认识了，真不认识。"],
    after: "老秦那箱软盘，谁读谁头大。他说得找个不怕看不懂的人——我看你就不错。",
  },
  {
    id: "parcel",
    name: "大壮",
    region: "homes",
    x: 520,
    y: 250,
    look: "#b85c3c",
    first: ["（指着一柜子包裹）24 个格子，一天 60 个人。", "你来得正好，帮我数数今天塞了几个。"],
    after: "柜子就这么大，人不会少。阿康那个手机也是，一天响八百回，他看都不看。",
  },
  {
    id: "student",
    name: "小满",
    region: "homes",
    x: 450,
    y: 430,
    look: "#6b9bd1",
    first: ["（把练习册往身后藏）干嘛。", "……这笔记是我自己写的。查过资料的——算是查过吧。"],
    after: "周姐的表天天 11:58 停，邪门。你既然是弄这个的，去帮她看看呗。",
  },
  {
    id: "watchmaker",
    name: "老魏",
    region: "north",
    x: 736,
    y: 320,
    look: "#8a9a8f",
    first: ["（头也不抬）表？", "表没问题，是时间的问题。"],
    after: "钟停了以后，我这摊倒天天排队。小铃非要跟我争 0.5 秒算不算准——你说呢。",
  },
  {
    id: "apprentice",
    quest: "clock-import",
    pending: "副本还在，想好怎么改就再来。",
    later: "先去办一份基础委托，理解这个问题，再来帮我吧。",
    name: "小铃",
    region: "north",
    x: 620,
    y: 340,
    look: "#b08ac1",
    first: ["误差 0.5 秒算不算准？", "师傅说算，我说不算。"],
    after: "我又调了一遍。",
  },
  {
    id: "cobbler",
    quest: "cobbler-booking",
    pending: "副本还在，想好怎么改就再来。",
    later: "先去办一份基础委托，理解这个问题，再来帮我吧。",
    name: "老宋",
    region: "craft",
    x: 500,
    y: 300,
    look: "#a3765c",
    first: ["你这双鞋，走的是近路。", "鞋底比人诚实。"],
    after: "鞋跟磨偏了，改天给你钉钉。",
  },
{
  "id": "smith-release",
  "name": "铁叔",
  "region": "center",
  "x": 740,
  "y": 220,
  "look": "#9c7857",
  "quest": "forge-release",
  "first": [
    "先别急着发布，帮我过一眼这个量尺程序。"
  ],
  "pending": "发布副本还没交，你慢慢核对。",
  "later": "先去看看阿哲的钥匙问题，学会了再来帮我。",
  "after": "量尺还能用，钥匙也不在安装包里了。"
}
,
  /* ----- 街坊：素材到位后接进来的十二位。四位有名字（木工坊、诊所、图书馆、邮差），
     八位是「镇上本来就有人」的街坊——他们在各自的门口做自己的事，不等玩家。 ----- */
  {
    id: "carpenter", name: "阿木", region: "craft", x: 300, y: 410, look: "#a0764f",
    first: ["（刨花落了一地）这块得顺纹路。", "你踩的那块地板，是我铺的。"],
    after: "木头会告诉你它想怎么裂。人不一定。",
  },
  {
    id: "painter", name: "老墨", region: "craft", x: 330, y: 190, look: "#8c6f9e",
    first: ["（手里全是颜料）站那儿别动——就这样，光刚好。", "抱歉，我在等这面墙的颜色变。"],
    after: "下午的影子会从这儿爬过去，那时候墙就是另一种颜色了。",
  },
  {
    id: "gamer", name: "小单", region: "craft", x: 740, y: 190, look: "#5f7fa8",
    first: ["（盯着屏幕）等一下，这一把。", "……你玩过那种，非要把所有箱子推到一起的游戏吗。"],
    after: "我不是在玩。我是在看它怎么骗我。",
  },
  {
    id: "librarian", name: "书奶奶", region: "center", x: 280, y: 215, look: "#8f8a6e",
    first: ["（抱着一摞书）别挡道，这些要还。", "图书馆里最安静的地方，其实一直有人在翻书。"],
    after: "书不会告密。但借书卡会。",
  },
  {
    id: "postman", name: "阿信", region: "center", x: 520, y: 300, look: "#6e8f6a",
    first: ["（背着一整包信）今天第三趟。", "地址写错一个字，信就多走一天。"],
    after: "信封上写的东西，比信里少。可它也在说话。",
  },
  {
    id: "doctor", name: "白医生", region: "center", x: 330, y: 300, look: "#c9d4d8",
    first: ["（摘下一只手套）哪儿不舒服？", "……不是身体的话，也可以说。"],
    after: "病历上写的都不算秘密，只有你不肯说的那些才算。",
  },
  {
    id: "vendor", name: "老吴", region: "center", x: 700, y: 300, look: "#b8873f",
    first: ["（守着一车橘子）甜的，先尝。", "招牌？我写了，写在牌子上。"],
    after: "人多的时候，我记不住谁买过什么。收钱的机器记得。",
  },
  {
    id: "musician", name: "阿弦", region: "center", x: 560, y: 400, look: "#9c7a5c",
    first: ["（拨了两下弦）免费的，今天。", "喷泉的水声，其实不合拍。"],
    after: "有人往盒子里扔钱，也有人往里面扔传单。",
  },
  {
    id: "clerk", name: "小方", region: "north", x: 505, y: 250, look: "#7c8b9c",
    first: ["（抱着一叠文件夹）等我五分钟，就五分钟。", "打卡机坏的那天，全楼都迟到了。"],
    after: "我不知道我签的那些同意书里写了什么。",
  },
  {
    id: "jogger", name: "跑者", region: "homes", x: 560, y: 380, look: "#c47f5f",
    first: ["（原地踏步）你挡着道了——开玩笑的。", "我这条路线，每天一模一样。"],
    after: "手表说我今天比昨天快了三秒。它记着，我记不住。",
  },
  {
    id: "kid", name: "小豆", region: "homes", x: 380, y: 460, look: "#d4896a",
    first: ["（举着一根树枝）这是我的剑。", "大人说不能告诉别人住哪儿。可你家是不是那栋？"],
    after: "我知道你家有几口人。看灯就知道了。",
  },
  {
    id: "fisher", name: "老船", region: "south", x: 400, y: 320, look: "#5f7a7f",
    first: ["（收着线）今天没鱼。", "水底下什么都看不见，可它什么都看得见。"],
    after: "网眼大一点，小鱼就能走。可谁定多大算大。",
  },
];

export const npcsInRegion = (region) => CHATTER_NPCS.filter((npc) => npc.region === region);
export const npcById = (id) => CHATTER_NPCS.find((npc) => npc.id === id) || null;

export function loadTalked(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(NPC_TALKED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveTalked(talked = [], storage = globalThis.localStorage) {
  try {
    storage?.setItem(NPC_TALKED_KEY, JSON.stringify([...new Set(talked)]));
    return true;
  } catch {
    return false;
  }
}

/** 第一次说话返回 true（用来发成就）。 */
export function markTalked(talked = [], id) {
  if (!npcById(id)) return { talked, first: false };
  if (talked.includes(id)) return { talked, first: false };
  return { talked: [...talked, id], first: true };
}
