// 技能树 (docs/story.md 第 9 节): what the player has learned, lit up step by step. Each skill names the
// quest step that teaches it (`from`); a skill without one is still being made. Branches follow the
// main story: computer → code → network → security → AI, plus interests.

export const SKILL_TREE = [
  {
    id: "computer",
    title: "电脑",
    skills: [
      { id: "basics", label: "入门", from: "visit-library", note: "书奶奶的基础课" },
      { id: "binary", label: "二进制", from: "open-door", note: "0 和 1、位和字节" },
      { id: "parts", label: "电脑的组成", from: "sort-parts", note: "输入、处理、存储、输出" },
      { id: "memory", label: "内存和硬盘", from: "two-drawers", note: "断电就忘 vs 一直记得" },
      { id: "process", label: "进程", note: "电脑为什么会卡" },
    ],
  },
  {
    id: "code",
    title: "编程",
    skills: [
      { id: "sequence", label: "顺序", note: "一步一步执行" },
      { id: "loop", label: "循环", note: "重复 N 次" },
      { id: "if", label: "条件", note: "如果……就……" },
      { id: "debug", label: "调试", note: "找出程序里的虫子" },
    ],
  },
  {
    id: "network",
    title: "网络",
    skills: [
      { id: "ip", label: "地址", note: "IP 地址" },
      { id: "dns", label: "门牌簿", note: "DNS" },
      { id: "packet", label: "数据包", note: "拆开寄、拼回来" },
      { id: "https", label: "加密", note: "明信片和密封信" },
      { id: "ntp", label: "对时", note: "网络延迟" },
    ],
  },
  {
    id: "security",
    title: "安全",
    skills: [
      { id: "privacy", label: "数据去哪了", from: "solve-privacy", note: "联网地址和敏感能力" },
      { id: "secrets", label: "藏不住的钥匙", from: "solve-keys", note: "写死在代码里的密钥" },
      { id: "backdoor", label: "彩蛋和后门", from: "solve-eggs", note: "检查要放在服务器上" },
      { id: "format", label: "文件格式", from: "solve-save", note: "编码不是加密" },
      { id: "versions", label: "版本对比", from: "solve-versions", note: "更新说明没写的变化" },
      { id: "permissions", label: "权限", from: "solve-flashlight", note: "权限和功能对不上" },
      { id: "history", label: "真实故事", from: "read-stories", note: "安全研究员每天在用的方法" },
    ],
  },
  {
    id: "ai",
    title: "AI",
    skills: [
      { id: "learn", label: "从例子里学", note: "AI 是怎么学会的" },
      { id: "data", label: "训练数据", note: "喂什么学什么" },
      { id: "bias", label: "偏见", note: "没见过的就不会" },
      { id: "verify", label: "核实", note: "AI 也会一本正经地出错" },
      { id: "boundary", label: "边界", note: "AI 不该做的事" },
    ],
  },
];

/** Skills a quest step teaches. */
export const skillsFrom = (stepId) => SKILL_TREE.flatMap((branch) => branch.skills.filter((skill) => skill.from === stepId));
