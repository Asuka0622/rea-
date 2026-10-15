// 技能树 (docs/story.md 第 9 节): what the player has learned, lit up step by step. Each skill names the
// quest step that teaches it (`from`); a skill without one is still being made. Branches follow the
// main story: computer → code → network → security → AI. Inside a branch skills are learned in order:
// each needs the one above it, like the paths of an RPG skill tree.
// glyph: the character drawn in the node (pixel font, so a CJK character or digits, no emoji); note: one line under the name; recap: what you learned, shown
// once it is lit.

export const SKILL_TREE = [
  {
    id: "computer",
    title: "电脑",
    emblem: "机",
    color: "#e0a03a",
    skills: [
      { id: "basics", label: "入门", glyph: "书", from: "visit-library", note: "书奶奶的基础课", recap: "软件是一串指令，电脑照着指令一步步做事。看懂它，先要认识几个基本的词。" },
      { id: "binary", label: "二进制", glyph: "01", from: "open-door", note: "0 和 1、位和字节", recap: "电脑只认开和关，记成 1 和 0。一位是一个 0 或 1，8 位是一个字节，能表示 0 到 255。" },
      { id: "parts", label: "电脑的组成", glyph: "件", from: "sort-parts", note: "输入、处理、存储、输出", recap: "键盘鼠标是输入，CPU 是处理，内存硬盘是存储，屏幕音箱是输出。钟楼和电脑都是这四样。" },
      { id: "memory", label: "内存和硬盘", glyph: "存", from: "two-drawers", note: "断电就忘 vs 一直记得", recap: "内存快，但断电就清空；硬盘慢一点，东西一直都在。没点保存的作文在内存里，所以要常按保存。" },
      { id: "process", label: "进程", glyph: "卡", note: "电脑为什么会卡" },
    ],
  },
  {
    id: "code",
    title: "编程",
    emblem: "码",
    color: "#5fb36a",
    skills: [
      { id: "sequence", label: "顺序", glyph: "序", note: "一步一步执行" },
      { id: "loop", label: "循环", glyph: "环", note: "重复 N 次" },
      { id: "if", label: "条件", glyph: "若", note: "如果……就……" },
      { id: "debug", label: "调试", glyph: "虫", note: "找出程序里的虫子" },
    ],
  },
  {
    id: "network",
    title: "网络",
    emblem: "网",
    color: "#4d9fd6",
    skills: [
      { id: "ip", label: "地址", glyph: "址", note: "IP 地址" },
      { id: "dns", label: "门牌簿", glyph: "簿", note: "DNS" },
      { id: "packet", label: "数据包", glyph: "包", note: "拆开寄、拼回来" },
      { id: "https", label: "加密", glyph: "锁", note: "明信片和密封信" },
      { id: "ntp", label: "对时", glyph: "时", note: "网络延迟" },
    ],
  },
  {
    id: "security",
    title: "安全",
    emblem: "侦",
    color: "#c9573e",
    skills: [
      { id: "privacy", label: "数据去哪了", glyph: "流", from: "solve-privacy", note: "联网地址和敏感能力", recap: "看软件连了哪些地址、用了哪些敏感能力，就知道你的数据可能被送去哪里。" },
      { id: "secrets", label: "藏不住的钥匙", glyph: "钥", from: "solve-keys", note: "写死在代码里的密钥", recap: "写在代码里的密钥，谁把软件拆开都能看到。密钥要放在服务器上。" },
      { id: "backdoor", label: "彩蛋和后门", glyph: "门", from: "solve-eggs", note: "检查要放在服务器上", recap: "彩蛋可以留，后门不能留。只在软件里做的检查，拆开就能绕过。" },
      { id: "format", label: "文件格式", glyph: "档", from: "solve-save", note: "编码不是加密", recap: "存档只是换了个写法（编码），不是锁起来（加密）；校验码也挡不住看懂代码的人。" },
      { id: "versions", label: "版本对比", glyph: "比", from: "solve-versions", note: "更新说明没写的变化", recap: "把新旧两版放在一起比，更新说明里没写的改动就藏不住了。" },
      { id: "permissions", label: "权限", glyph: "权", from: "solve-flashlight", note: "权限和功能对不上", recap: "手电筒要通讯录？权限和功能对不上，就是最明显的危险信号。" },
      { id: "history", label: "真实故事", glyph: "史", from: "read-stories", note: "安全研究员每天在用的方法", recap: "你学的这些方法，真实世界的安全研究员每天都在用，也真的发现过大问题。" },
    ],
  },
  {
    id: "ai",
    title: "AI",
    emblem: "智",
    color: "#a77ad6",
    skills: [
      { id: "learn", label: "从例子里学", glyph: "学", note: "AI 是怎么学会的" },
      { id: "data", label: "训练数据", glyph: "料", note: "喂什么学什么" },
      { id: "bias", label: "偏见", glyph: "偏", note: "没见过的就不会" },
      { id: "verify", label: "核实", glyph: "验", note: "AI 也会一本正经地出错" },
      { id: "boundary", label: "边界", glyph: "界", note: "AI 不该做的事" },
    ],
  },
];

/** Skills a quest step teaches. */
export const skillsFrom = (stepId) => SKILL_TREE.flatMap((branch) => branch.skills.filter((skill) => skill.from === stepId));

/** Ranks by skills lit: every 3 skills is a level. */
const TITLES = ["新来的助手", "见习侦探助手", "小镇技术员", "工坊学徒", "比特镇达人", "钟楼守护者"];
export function rank(lit) {
  const level = 1 + Math.floor(lit / 3);
  return { level, title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))], into: lit % 3, per: 3 };
}
