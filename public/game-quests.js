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
 *   enter: walk into a building (spot); solve: finish a case; play: win a mini-game (game-minigames.js)
 *   started at the spot. `say` is what the guide says when the step
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
        { text: "要打开它，得请工具铺的铁叔帮忙。他最懂机器了。", face: "thinking" },
      ],
    },
    {
      id: "ch1",
      title: "第一章 · 打开钟楼（电脑是什么）",
      steps: [
        {
          id: "meet-smith", type: "enter", spot: "engines", goal: "铁叔回来了！去工具铺找他",
          say: [{ text: "工具铺在广场东北边。我们去找铁叔，请他帮忙打开钟楼。", face: "happy" }],
          done: [
            { who: "smith", text: "哈哈，你们想进钟楼？那可不是一座普通的钟。", face: "happy" },
            { who: "smith", focus: "story", text: "我小时候常爬到钟楼底下听它走，咔、咔、咔，一秒不差。后来我当了铁匠，镇长让我管它的齿轮，一管就是二十年。", face: "normal" },
            { focus: "story", text: "二十年都没停过，偏偏今天停了……铁叔，你一定很难过吧。", face: "thinking" },
            { who: "smith", focus: "story", text: "难过？我是好奇！它停得这么干脆，不像是零件坏了，倒像是……有人让它停的。", face: "thinking" },
            {
              who: "smith", face: "normal",
              text: "门上那串 0 和 1 就是密码。钟楼里面的东西只认两种状态：开和关，记成 1 和 0。",
              easy: "门上那串 0 和 1 就是密码。钟楼里面只认两种样子：开和关。",
              hard: "门上那串 0 和 1 就是密码。钟楼里面用的是二进制：每一位只有 0 和 1，8 位一组，正好对上门边的 8 盏灯。",
            },
            { who: "smith", only: "hard", text: "顺带一提，用 0 和 1 计数的想法很早就有了：三百多年前，德国学者莱布尼茨专门写文章讲过二进制。", face: "happy" },
            { who: "smith", text: "门边有 8 盏小灯，每盏灯代表一个数。把对的灯点亮，门就开了。去试试吧！", face: "normal" },
            { who: "smith", focus: "knowledge", text: "先记住一个规律：每多一盏灯，能表示的数就翻一倍。1 盏灯 2 种，2 盏灯 4 种，8 盏灯就是 256 种。", face: "normal" },
          ],
        },
        {
          id: "open-door", type: "play", game: "binary", spot: "clocktower", goal: "去钟楼，用 8 盏灯打开门",
          say: [{ text: "回北区的钟楼，在门口按 E，试试那 8 盏灯。", face: "normal" }],
          done: [{ text: "门开了！原来 01001101 就是 77。电脑里所有的东西，数字、文字、图片，最后都是这样一串 0 和 1。", face: "happy" }],
        },
        {
          id: "sort-parts", type: "play", game: "parts", spot: "clocktower", goal: "进钟楼，弄清每个零件是干什么的",
          say: [{ text: "里面全是齿轮和发条……铁叔说，看懂一台机器，先看每个零件负责什么。", face: "thinking" }],
          done: [
            {
              who: "smith", face: "happy",
              text: "对喽！拉绳是输入，齿轮是处理，记事板是存储，钟面和铃是输出。你们用的电脑，也是这四样。",
              easy: "对喽！拉绳听消息，齿轮干活，记事板记东西，钟面和铃告诉大家结果。你们的电脑也是这样分工的。",
              hard: "对喽！输入、处理、存储、输出。今天的电脑也是这个结构，叫冯·诺依曼结构：程序和数据都放在存储器里，处理器一条条取来执行。",
            },
            { text: "那钟楼为什么会停呢？零件看起来都好好的……", face: "thinking" },
          ],
        },
        {
          id: "two-drawers", type: "play", game: "drawers", spot: "clocktower", goal: "弄明白钟楼为什么「忘了时间」",
          say: [{ who: "smith", text: "记事板下面有两个抽屉，你们拉开看看就知道了。", face: "normal" }],
        },
      ],
      done: [
        {
          who: "smith", face: "normal",
          text: "停电那一下，「断电就忘」的抽屉全清空了，所以它忘了现在几点；可「一直记得」的抽屉还在，所以它还记得每天该做什么。",
          easy: "停电那一下，会忘的抽屉清空了，所以它忘了几点；不会忘的抽屉还在，所以它还记得每天要做什么。",
          hard: "停电时内存清空，「现在几点」这个运行中的状态丢了；写在硬盘里的时间表还在。电脑也一样，所以主板上有块小电池，专门让时钟断电也继续走。",
        },
        { text: "我们把时间重新拨好了！可是……钟走得一会儿快一会儿慢。", face: "surprised" },
        { focus: "story balanced", text: "指针转动的那一刻，钟楼深处传来一声很轻的「嗡」，像是什么东西醒了过来。", face: "surprised" },
        { who: "smith", text: "零件都没坏，可它的节拍就是稳不住……咦，记事板后面怎么还有一扇小门？", face: "thinking" },
        { text: "门后面是一个黄铜大表盘，上面刻着好多年份……铁叔，这不是钟，这是一台能穿越时间的机器！", face: "surprised" },
        { who: "smith", text: "表盘上只有一格亮着：「汴京 · 约 1088 年」。九百多年前，那里也有人在造一座钟楼。也许，答案在那儿。", face: "thinking" },
      ],
    },
    {
      id: "china",
      title: "时代一 · 古代中国：汴京的钟楼",
      steps: [
        {
          id: "to-china", type: "travel", era: "china", spot: "clocktower", goal: "进钟楼，启动时光机",
          say: [{ text: "进钟楼，转动时光机的表盘，去汴京看看！", face: "happy" }],
          done: [
            { text: "……哎哟！我们这是……落在了一座石桥边？", face: "surprised" },
            { who: "ayan", text: "两位是外地来的书生吧？这是汴河上的州桥！我叫阿砚，在书坊当学徒。", face: "happy" },
            { who: "ayan", only: "normal hard", text: "你们穿得好怪呀……要找人？柳娘子的茶铺就在桥南，来往的人她全认得。", face: "normal" },
            { who: "ayan", only: "easy", text: "要找人？去桥南柳娘子的茶铺问问吧！", face: "normal" },
          ],
        },
        {
          id: "teahouse-bill", type: "play", game: "rods", spot: "teahouse", goal: "去茶铺，帮柳娘子算账",
          say: [{ who: "ayan", text: "柳娘子的茶铺今天客人多，账都算不过来了。你们帮帮她，她一高兴，什么都肯告诉你们！", face: "happy" }],
          done: [
            { who: "liuniangzi", text: "好俊的手法！一纵十横，摆得又快又对。", face: "happy" },
            { who: "liuniangzi", text: "你们问钟楼？城北韩官人的工地，正为一座「水运仪象台」发愁呢，说是怎么也走不稳。", face: "thinking" },
          ],
        },
        {
          id: "tower-beat", type: "play", game: "escapement", spot: "tower-site", goal: "去城北工地，帮韩公廉调好天衡",
          say: [{ text: "水运仪象台……一座会自己走的钟楼！和我们的钟楼一样，节拍也稳不住。去工地看看！", face: "happy" }],
          done: [
            { who: "hangonglian", text: "枢轮一格一格，稳稳地走起来了。多谢二位。", face: "happy" },
            { who: "hangonglian", only: "hard", text: "天衡靠受水壶的重量自己控制节奏：水满一壶就放行一格，不满就拦住。不必有人看着，机器自己会守时。", face: "normal" },
            { text: "听，报时木人敲钟了！……我的怀表也跟着「滴答」一声，时光机的节拍稳住了！", face: "surprised" },
            { text: "按一下怀表，我们回比特镇，把这件事告诉铁叔。", face: "happy" },
          ],
        },
        {
          id: "home-from-china", type: "travel", era: "home", goal: "按怀表，回比特镇",
          say: [{ text: "怀表在导航栏上，按一下就能回家。", face: "normal" }],
          done: [{ text: "回来了！先去工具铺找铁叔吧。", face: "happy" }],
        },
        {
          id: "smith-china", type: "enter", spot: "engines", goal: "去工具铺，把天衡的事讲给铁叔听",
          say: [{ text: "工具铺在广场东北边。", face: "normal" }],
          done: [
            { who: "smith", text: "一壶水满了才放行一格……这不就是「节拍」嘛！", face: "happy" },
            { who: "smith", text: "你们的电脑里也有这么一个节拍，叫时钟信号。CPU 每一拍做一步，一秒钟拍几十亿下，这就是「主频」。", easy: "你们的电脑里也有这么一个节拍。电脑里的「大脑」每拍一下就做一步，一秒钟能拍几十亿下！", hard: "电脑里也有这么一个节拍：时钟信号。CPU 每个时钟周期推进一步，主频 3 GHz 就是每秒 30 亿个周期。主频越高越快，也越费电、越热。", face: "normal" },
          ],
        },
        {
          id: "code-digits", type: "play", game: "code-digits", spot: "engines", only: "hard", goal: "在铁叔这儿，用代码把一个数拆成每一位",
          say: [{ who: "smith", text: "既然你有基础，来试试用真正的代码，把柳娘子摆算筹的那件事再做一遍？", face: "happy" }],
          done: [{ who: "smith", text: "对喽！算筹一位一位地摆，代码一位一位地拆，道理是一样的：位值制。", face: "happy" }],
        },
      ],
      done: [
        { text: "表盘上又亮了一格……下一站是中世纪的欧洲！不过那边的时空还不太稳，得再等等。", face: "surprised" },
      ],
    },
    { id: "medieval", title: "时代二 · 中世纪欧洲：城堡与密码", ready: false, steps: [] },
    { id: "industrial", title: "时代三 · 工业革命：织布机与差分机", ready: false, steps: [] },
    { id: "forties", title: "时代四 · 1940 年代：破译与第一台电脑", ready: false, steps: [] },
    { id: "internet", title: "时代五 · 1960–90 年代：连接世界", ready: false, steps: [] },
    { id: "modern", title: "时代六 · 现代都市：比比", ready: false, steps: [] },
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

/*
 * 预告测试版 (demo, about 30 minutes): Bit Town and the detective agency only. Three cases of different
 * kinds — where data goes, a file format, hidden entries — then the badge and a teaser of the whole game.
 * Progress is saved apart from the full game's.
 */
export const DEMO_CASES = ["privacy-ledger", "farm-save", "calculator-eggs"]; // none needs an extra analysis engine
export const DEMO_QUEST = {
  id: "demo",
  title: "侦探事务所 · 预告测试版",
  subtitle: "跟着路米，拆开三个可疑的软件",
  chapters: [
    {
      id: "d-prologue",
      title: "序章 · 新来的助手",
      steps: [
        {
          id: "visit-office", type: "enter", spot: "home", goal: "去侦探事务所找路米",
          say: [
            { text: "欢迎来到比特镇！我是路米，在镇上开了一家侦探事务所，专门帮大家查软件。", face: "happy" },
            { text: "你愿意当我的助手吗？事务所就在广场正北边，红屋顶、挂着放大镜招牌的那栋。", face: "normal" },
          ],
          done: [
            { text: "这就是我们的事务所。我们的工作叫「逆向分析」：把软件拆开，看清它到底在做什么。", face: "happy" },
            { focus: "story balanced", text: "镇上的人遇到可疑的软件，都会来这儿找我。最近委托特别多，一个人实在忙不过来。", face: "thinking" },
          ],
        },
      ],
      done: [{ text: "委托板上已经有三份委托了。第一份来自小林，我带你一步一步查，查完你就会了！", face: "happy" }],
    },
    {
      id: "d-case-1",
      title: "委托一 · 小林的记账软件",
      steps: [{ id: "solve-privacy", type: "solve", case: "privacy-ledger", spot: "privacy-ledger", goal: "去小林的宿舍，查查「小账本」", say: [{ text: "小林住在住宅区的宿舍楼：从广场往西走，看到一栋好多窗户的三层楼就是。", face: "normal" }] }],
      done: [{ text: "漂亮！软件往哪里发数据、偷偷用了哪些能力，你已经会查了。", face: "happy" }],
    },
    {
      id: "d-case-2",
      title: "委托二 · 朵朵的存档",
      steps: [{ id: "solve-save", type: "solve", case: "farm-save", spot: "farm-save", goal: "去朵朵的农场，看懂游戏存档", say: [{ text: "下一份委托是朵朵的：她想知道种田游戏是怎么存档的。这次要拆的是一个文件。朵朵的农场也在住宅区，红色谷仓那里。", face: "thinking" }] }],
      done: [{ text: "编码不是加密，校验码也挡不住看懂代码的人。你已经能看懂文件格式了！", face: "happy" }],
    },
    {
      id: "d-case-3",
      title: "委托三 · 小雨的计算器",
      steps: [{ id: "solve-eggs", type: "solve", case: "calculator-eggs", spot: "calculator-eggs", goal: "去小雨家，找找计算器里的秘密", say: [{ text: "最后一份委托来自小雨：她说计算器里藏着秘密。她家是住宅区里粉色屋顶的那栋。", face: "happy" }] }],
      done: [{ text: "彩蛋可以留，后门不能留。重要的检查要放在服务器上，这条要记住。", face: "normal" }],
    },
    {
      id: "d-finale",
      title: "结案 · 见习侦探",
      badge: { id: "rea-detective", label: "见习侦探" },
      steps: [{ id: "report-back", type: "enter", spot: "home", goal: "回事务所向路米报告", say: [{ text: "三份委托都办完了！回事务所来吧，我有东西要给你。", face: "happy" }] }],
      done: [
        { text: "这枚「见习侦探」徽章是你的了！拆开软件、收集证据、拿证据说话，你都学会了。", face: "happy" },
        { focus: "story balanced", text: "……对了，你有没有发现？今天中午，北边钟楼的钟一声都没响。", face: "thinking" },
        { text: "钟楼那边好像有动静。我们去看看！", face: "surprised" },
      ],
    },
  ],
};

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
    /** A mini-game step waiting at this spot (in any open line), or null. */
    playAt: (spot) => lines.map(lineCurrent).find((step) => step?.type === "play" && step.spot === spot) || null,
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
    /** Best stars per drill, from the 进阶副本 ladder (game-drills.js). */
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
      if (doneAt("modern")) return "running";
      if (doneAt("ch1")) return "drifting";
      return "stopped";
    },
    /** Eras the time machine can take you to now: the first one whose chapter has begun or is next. */
    erasOpen() {
      const main = lineById("main");
      if (!main) return [];
      const eraChapters = main.chapters.filter((c) => c.steps.some((s) => s.type === "travel" && s.era !== "home"));
      return eraChapters.filter((c, i) => (i === 0 ? chapterDone(main, main.chapters.find((x) => x.id === "ch1")) : chapterDone(main, eraChapters[i - 1]))).map((c) => c.steps.find((s) => s.type === "travel").era);
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
