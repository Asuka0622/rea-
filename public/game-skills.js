// 技能树 (docs/story.md 第 9 节): what the player has learned, and the whole course laid out ahead. Five
// branches, each its own page: a tree of skills on a grid (`at: [column, row]`, 5 columns, rows going
// down), where a skill opens once every skill it `needs` is learned, like an RPG talent tree.
// A skill names the quest step that teaches it (`from`); one without is still being made.
// glyph: the character drawn in the node (pixel font, so a CJK character or digits, no emoji);
// label: a plain, clear name (playful names belong to achievements, game-achievements.js);
// note: one line under the name; recap: what you learned, shown once it is lit.

export const SKILL_TREE = [
  {
    id: "computer",
    part: 2, // 留给系列第二部（计算史与计算机基础）
    title: "电脑",
    emblem: "机",
    color: "#e0a03a",
    motto: "钟楼里藏着一台电脑：先弄懂它由什么组成、怎么记东西。",
    skills: [
      { id: "basics", label: "基础概念", glyph: "书", at: [2, 0], from: "visit-library", note: "书奶奶的基础课", recap: "软件是一串指令，电脑照着指令一步步做事。看懂它，先要认识几个基本的词。" },
      { id: "binary", label: "二进制", glyph: "01", at: [1, 1], needs: ["basics"], from: "open-door", note: "0 和 1、位和字节", recap: "电脑只认开和关，记成 1 和 0。一位是一个 0 或 1，8 位是一个字节，能表示 0 到 255。" },
      { id: "placevalue", label: "位值制", glyph: "位", at: [0, 1], needs: ["basics"], from: "teahouse-bill", note: "同一个数字，放在不同的位置大小不同", recap: "算筹往左一位大十倍，空着的位就是 0。我们写数字的十进制、电脑的二进制，都是位值制，只是每位能放的数字不同。" },
      { id: "clock", label: "时钟信号", glyph: "拍", at: [4, 1], needs: ["basics"], from: "tower-beat", note: "一拍走一步，主频就是一秒多少拍", recap: "水运仪象台靠天衡一格一格地走；CPU 也靠时钟信号一拍一拍地工作，主频 3 GHz 就是每秒 30 亿拍。" },
      { id: "parts", label: "电脑组成", glyph: "件", at: [3, 1], needs: ["basics"], from: "sort-parts", note: "输入、处理、存储、输出", recap: "键盘鼠标是输入，CPU 是处理，内存硬盘是存储，屏幕音箱是输出。钟楼和电脑都是这四样。" },
      { id: "text", label: "文字编码", glyph: "字", at: [0, 2], needs: ["binary"], note: "一个字怎么变成 0 和 1" },
      { id: "color", label: "像素与颜色", glyph: "色", at: [1, 2], needs: ["binary"], note: "像素、RGB 三原色" },
      { id: "memory", label: "内存和硬盘", glyph: "存", at: [3, 2], needs: ["parts"], from: "two-drawers", note: "断电就忘 vs 一直记得", recap: "内存快，但断电就清空；硬盘慢一点，东西一直都在。没点保存的作文在内存里，所以要常按保存。" },
      { id: "cpu", label: "CPU", glyph: "芯", at: [4, 2], needs: ["parts", "clock"], note: "时钟、指令、每秒几十亿次" },
      { id: "units", label: "存储单位", glyph: "量", at: [1, 3], needs: ["color"], note: "文件为什么有大有小" },
      { id: "files", label: "文件和文件夹", glyph: "档", at: [2, 3], needs: ["text", "memory"], note: "文件名、扩展名、路径" },
      { id: "process", label: "进程", glyph: "卡", at: [3, 3], needs: ["memory", "cpu"], note: "电脑为什么会卡" },
      { id: "os", label: "操作系统", glyph: "系", at: [4, 3], needs: ["cpu"], note: "管着所有程序的大管家" },
      { id: "compress", label: "数据压缩", glyph: "压", at: [0, 4], needs: ["text", "units"], note: "ZIP 和图片压缩的秘密" },
      { id: "boot", label: "开机过程", glyph: "启", at: [4, 4], needs: ["os"], note: "从按下电源到看见桌面" },
      { id: "build", label: "组装电脑", glyph: "装", at: [2, 5], needs: ["files", "process", "boot"], note: "把零件拼成一台能用的电脑" },
    ],
  },
  {
    id: "code",
    part: 4, // 留给系列后面的「编程与软件」那一部
    title: "编程",
    emblem: "码",
    color: "#5fb36a",
    motto: "钟楼的指令被改过：学会写指令，才能把它改回来。",
    skills: [
      { id: "sequence", label: "顺序执行", glyph: "序", at: [2, 0], note: "一步一步执行" },
      { id: "variable", label: "变量", glyph: "变", at: [1, 1], needs: ["sequence"], note: "给数据起个名字" },
      { id: "loop", label: "循环", glyph: "环", at: [3, 1], needs: ["sequence"], note: "重复 N 次" },
      { id: "types", label: "数据类型", glyph: "型", at: [0, 2], needs: ["variable"], note: "数字、文字、真假" },
      { id: "if", label: "条件判断", glyph: "若", at: [2, 2], needs: ["variable", "loop"], note: "如果……就……" },
      { id: "list", label: "列表", glyph: "列", at: [4, 2], needs: ["loop"], note: "一串数据排成队" },
      { id: "string", label: "字符串", glyph: "串", at: [0, 3], needs: ["types"], note: "处理一段文字" },
      { id: "function", label: "函数", glyph: "函", at: [1, 3], needs: ["if"], note: "把常用的步骤打包" },
      { id: "debug", label: "调试", glyph: "虫", at: [3, 3], needs: ["if"], note: "找出程序里的虫子" },
      { id: "object", label: "对象", glyph: "物", at: [0, 4], needs: ["string", "function"], note: "把数据和动作放在一起" },
      { id: "event", label: "事件", glyph: "触", at: [2, 4], needs: ["function"], note: "点一下按钮，发生什么" },
      { id: "algorithm", label: "查找与排序", glyph: "算", at: [4, 4], needs: ["list", "debug"], note: "最常用的算法" },
      { id: "webpage", label: "网页制作", glyph: "页", at: [1, 5], needs: ["object", "event"], note: "HTML、CSS 和一点 JavaScript" },
      { id: "project", label: "小项目实战", glyph: "作", at: [3, 5], needs: ["event", "algorithm"], note: "从想法到能用的程序" },
    ],
  },
  {
    id: "network",
    part: 3, // 留给系列后面的「网络与互联网」那一部
    title: "网络",
    emblem: "网",
    color: "#4d9fd6",
    motto: "钟楼要和远方对时：信是怎么寄出去、又怎么寄回来的？",
    skills: [
      { id: "ip", label: "IP 地址", glyph: "址", at: [2, 0], note: "IP 地址：网络上的门牌号" },
      { id: "dns", label: "域名和 DNS", glyph: "簿", at: [1, 1], needs: ["ip"], note: "DNS：把名字查成地址" },
      { id: "packet", label: "数据包", glyph: "包", at: [3, 1], needs: ["ip"], note: "拆开寄、拼回来" },
      { id: "email", label: "电子邮件", glyph: "信", at: [0, 2], needs: ["dns"], note: "一封邮件的旅程" },
      { id: "url", label: "网址结构", glyph: "链", at: [1, 2], needs: ["dns"], note: "一个网址由哪几段组成" },
      { id: "tcp", label: "TCP 传输", glyph: "稳", at: [3, 2], needs: ["packet"], note: "丢了就补寄：TCP" },
      { id: "router", label: "路由", glyph: "路", at: [4, 2], needs: ["packet"], note: "信件怎么找到路" },
      { id: "http", label: "HTTP 请求", glyph: "求", at: [2, 3], needs: ["url", "tcp"], note: "打开网页时发生了什么：HTTP" },
      { id: "ntp", label: "时间同步", glyph: "时", at: [4, 3], needs: ["router"], note: "网络延迟和时间同步" },
      { id: "https", label: "HTTPS 加密", glyph: "锁", at: [1, 4], needs: ["http"], note: "明信片和密封信：HTTPS" },
      { id: "cookie", label: "Cookie 与登录", glyph: "饼", at: [3, 4], needs: ["http"], note: "网站怎么记住你" },
      { id: "phishing", label: "钓鱼识别", glyph: "钓", at: [0, 5], needs: ["email", "https"], note: "假网站和假邮件" },
      { id: "api", label: "API 接口", glyph: "接", at: [2, 5], needs: ["https", "cookie"], note: "程序之间怎么说话" },
      { id: "cloud", label: "云服务器", glyph: "云", at: [4, 5], needs: ["cookie", "ntp"], note: "「云」其实是别人的电脑" },
    ],
  },
  {
    id: "security",
    part: 1, // 序章 REA 篇：本作唯一已经能玩的知识线
    title: "安全",
    emblem: "侦",
    color: "#c9573e",
    motto: "侦探事务所的本事：把软件拆开，看清它到底在做什么。",
    skills: [
      { id: "privacy", label: "数据流向", glyph: "流", at: [2, 0], from: "solve-privacy", note: "联网地址和敏感能力", recap: "看软件连了哪些地址、用了哪些敏感能力，就知道你的数据可能被送去哪里。" },
      { id: "secrets", label: "密钥泄露", glyph: "钥", at: [1, 1], needs: ["privacy"], from: "solve-keys", note: "写死在代码里的密钥", recap: "写在代码里的密钥，谁把软件拆开都能看到。密钥要放在服务器上。" },
      { id: "permissions", label: "应用权限", glyph: "权", at: [3, 1], needs: ["privacy"], from: "solve-flashlight", note: "权限和功能对不上", recap: "手电筒要通讯录？权限和功能对不上，就是最明显的危险信号。" },
      { id: "password", label: "密码安全", glyph: "密", at: [0, 2], needs: ["secrets"], note: "又长又好记的密码" },
      { id: "backdoor", label: "后门与隐藏功能", glyph: "门", at: [1, 2], needs: ["secrets"], from: "solve-eggs", note: "检查要放在服务器上", recap: "彩蛋可以留，后门不能留。只在软件里做的检查，拆开就能绕过。" },
      { id: "format", label: "文件格式", glyph: "档", at: [2, 2], needs: ["secrets", "permissions"], from: "solve-save", note: "编码不是加密", recap: "存档只是换了个写法（编码），不是锁起来（加密）；校验码也挡不住看懂代码的人。" },
      { id: "versions", label: "版本对比", glyph: "比", at: [3, 2], needs: ["permissions"], from: "solve-versions", note: "更新说明没写的变化", recap: "把新旧两版放在一起比，更新说明里没写的改动就藏不住了。" },
      { id: "malware", label: "恶意软件", glyph: "毒", at: [4, 2], needs: ["permissions"], note: "病毒、木马和勒索软件" },
      { id: "twofa", label: "两步验证", glyph: "双", at: [0, 3], needs: ["password"], note: "密码丢了也进不来" },
      { id: "history", label: "安全案例", glyph: "史", at: [2, 3], needs: ["backdoor", "format", "versions"], from: "read-stories", note: "安全研究员每天在用的方法", recap: "你学的这些方法，真实世界的安全研究员每天都在用，也真的发现过大问题。" },
      { id: "update", label: "软件更新", glyph: "补", at: [4, 3], needs: ["malware"], note: "为什么要及时更新" },
      { id: "social", label: "防骗（社会工程）", glyph: "骗", at: [0, 4], needs: ["twofa"], note: "骗人比骗电脑容易" },
      { id: "reverse", label: "逆向分析", glyph: "逆", at: [2, 4], needs: ["history"], note: "反编译、动态分析" },
      { id: "disclosure", label: "漏洞报告", glyph: "报", at: [3, 5], needs: ["reverse", "update"], note: "发现问题后，负责任地告诉对方" },
    ],
  },
  {
    id: "ai",
    part: 1, // 第一部的主线：人工智能
    title: "AI",
    emblem: "智",
    color: "#a77ad6",
    motto: "小 AI 比比学歪了：AI 是怎么学的，又会在哪里出错？",
    skills: [
      { id: "learn", label: "机器学习", glyph: "学", at: [2, 0], note: "AI 是怎么学会的" },
      { id: "data", label: "训练数据", glyph: "料", at: [1, 1], needs: ["learn"], note: "喂什么学什么" },
      { id: "pattern", label: "分类", glyph: "规", at: [3, 1], needs: ["learn"], note: "找规律、分成几类" },
      { id: "bias", label: "数据偏见", glyph: "偏", at: [0, 2], needs: ["data"], note: "没见过的就不会" },
      { id: "label", label: "数据标注", glyph: "标", at: [2, 2], needs: ["data", "pattern"], note: "告诉 AI 正确答案" },
      { id: "predict", label: "预测", glyph: "预", at: [4, 2], needs: ["pattern"], note: "从过去猜未来" },
      { id: "verify", label: "事实核查", glyph: "验", at: [1, 3], needs: ["bias"], note: "AI 也会一本正经地出错" },
      { id: "neural", label: "神经网络", glyph: "神", at: [3, 3], needs: ["label", "predict"], note: "一层层的小开关" },
      { id: "boundary", label: "AI 使用边界", glyph: "界", at: [0, 4], needs: ["verify"], note: "AI 不该做的事" },
      { id: "llm", label: "大语言模型", glyph: "语", at: [2, 4], needs: ["neural"], note: "会聊天的 AI 是怎么回事" },
      { id: "image", label: "AI 绘图", glyph: "画", at: [4, 4], needs: ["neural"], note: "从文字变出图片" },
      { id: "ethics", label: "AI 伦理", glyph: "德", at: [0, 5], needs: ["boundary"], note: "版权、隐私和公平" },
      { id: "prompt", label: "提示词", glyph: "问", at: [1, 5], needs: ["llm", "verify"], note: "把问题说清楚" },
      { id: "agent", label: "AI 助手", glyph: "助", at: [3, 5], needs: ["llm"], note: "让 AI 用工具帮你做事" },
    ],
  },
];

/** 第一部只讲人工智能 (docs/series.md)：其余分支留给后面的部，数据留着但不在本作的技能树上显示。 */
export const PART = 1;
export const branchesOfPart = (part = PART) => SKILL_TREE.filter((branch) => (branch.part || 1) === part);

/** Skills a quest step teaches. */
export const skillsFrom = (stepId) => SKILL_TREE.flatMap((branch) => branch.skills.filter((skill) => skill.from === stepId));

/** Ranks by skills lit: every 3 skills is a level. */
const TITLES = ["新开张的侦探", "见习侦探", "小镇技术员", "工坊学徒", "比特镇达人", "钟楼守护者"];
export function rank(lit) {
  const level = 1 + Math.floor(lit / 3);
  return { level, title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))], into: lit % 3, per: 3 };
}
