// Builds a beginner "replicate this feature" exercise from analysis reports.
// Pure functions (no DOM) so they can be unit-tested in Node.
//
// The exercise follows a light clean-room approach: the spec describes what a feature does and
// how it is organised, never the original code, names, artwork or text, and the learner's
// implementation is written from the spec alone.

/** Report sections whose rows are features a learner could rebuild. `kind` shapes the wording. */
const FEATURE_SECTIONS = [
  { title: "主进程提供的功能（IPC 通道）", kind: "通道", hint: "界面请求后台完成的一件事" },
  { title: "App 自己写的组件", kind: "组件", hint: "App 自己实现的页面或后台部分" },
  { title: "用到的现成能力", kind: "能力", hint: "借助现成库实现的一类功能" },
  { title: "方法最多的类", kind: "类", hint: "承担主要功能的一组代码" },
  { title: "模块与源码位置", kind: "模块", hint: "源码里的一个功能模块" },
  { title: "游戏与 Mod 入口", kind: "入口", hint: "Mod 或游戏里的一个功能入口" },
  { title: "实际代码中的属性与数值线索", kind: "数值", hint: "游戏里的一个属性或数值" },
  { title: "游戏 Mod 与数值结构", kind: "数值", hint: "Mod 调整的一项内容" },
];

/** Sections that describe the technology around a feature; quoted as context in the spec. */
const CONTEXT_SECTIONS = ["用到的外部能力", "用到的现成能力", "申请的权限", "暴露给界面的接口", "依赖清单", "依赖的程序集", "界面、图形与基础库线索", "代码入口", "命名空间"];

/** Report types that are not software features (asset mods); the exercise points elsewhere. */
const NOT_SOFTWARE = ["人物模型 Mod · 文件与资源", "Unity 资源包 · 真实读取与导出"];

const clip = (text, max = 60) => {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

/** Common words in channel, class and module names, for a plain-language guess. */
const WORDS = {
  save: "保存", load: "读取", list: "列出", get: "读取", set: "设置", add: "添加", create: "新建", new: "新建", delete: "删除", remove: "删除",
  update: "更新", edit: "编辑", export: "导出", import: "导入", open: "打开", close: "关闭", search: "搜索", find: "查找", sync: "同步",
  upload: "上传", download: "下载", copy: "复制", paste: "粘贴", print: "打印", share: "分享", send: "发送", login: "登录", logout: "退出登录",
  sign: "登录", auth: "认证", user: "用户", account: "账号", note: "笔记", notes: "笔记", file: "文件", files: "文件", image: "图片", photo: "照片",
  video: "视频", audio: "音频", music: "音乐", setting: "设置", settings: "设置", config: "配置", window: "窗口", menu: "菜单", tray: "托盘",
  notify: "通知", notification: "通知", notifications: "通知", reminder: "提醒", alarm: "闹钟", widget: "小组件", today: "今日", progress: "进度",
  clipboard: "剪贴板", theme: "主题", update_check: "检查更新", cache: "缓存", history: "历史记录", favorite: "收藏", tag: "标签", task: "任务", todo: "待办",
  calendar: "日历", chat: "聊天", message: "消息", payment: "支付", order: "订单", cart: "购物车", map: "地图", location: "位置", camera: "相机",
  weapon: "武器", damage: "伤害", item: "物品", player: "玩家", health: "生命", stamina: "体力", speed: "速度", recipe: "配方", battle: "战斗", dialog: "对话",
};

/** "notes:save" → "可能是：保存 笔记". Returns "" when no word is recognised. */
export function guessMeaning(name) {
  const words = String(name)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  const known = words.map((word) => WORDS[word]).filter(Boolean);
  if (!known.length) return "";
  // Verbs usually come last in channel names (notes:save); read them first.
  const verbs = new Set(["保存", "读取", "列出", "设置", "添加", "新建", "删除", "更新", "编辑", "导出", "导入", "打开", "关闭", "搜索", "查找", "同步", "上传", "下载", "复制", "粘贴", "打印", "分享", "发送", "登录", "退出登录", "认证", "检查更新"]);
  const ordered = [...known.filter((word) => verbs.has(word)), ...known.filter((word) => !verbs.has(word))];
  return `可能是：${[...new Set(ordered)].join(" ")}`;
}

function rowsOf(section) {
  if (section.table) return section.table.rows.map((row) => ({ label: clip(row[0], 48), detail: clip(row.slice(1).filter((cell) => cell !== "" && cell != null).join(" · "), 60) }));
  return (section.items || []).map((item) => ({ label: clip(item, 48), detail: "" }));
}

/**
 * Feature candidates grouped by report section, plus a "simplified whole app" option.
 * Returns { supported, reason?, groups: [{ title, hint, options: [{ id, label, detail, kind }] }] }.
 */
export function buildCandidates(reports) {
  if (!reports?.length) return { supported: false, reason: "还没有报告。先完成一次探索，再来做复刻练习。", groups: [] };
  if (reports.every((report) => NOT_SOFTWARE.includes(report.title))) {
    const unity=reports.some(report=>report.title==="Unity 资源包 · 真实读取与导出");
    return { supported: false, reason: unity ? "本次得到的是资源与参数证据，尚未读取游戏行为。先查看导出的贴图和参数来源；需要脚本或玩法证据后，再生成游戏复刻说明书。" : "这份报告是人物模型的文件检查，不是软件功能。想练习改模型，请看首页的「人物模型 Mod」指南。", groups: [] };
  }
  const groups = [];
  let index = 0;
  for (const report of reports) {
    for (const section of report.sections || []) {
      const rule = FEATURE_SECTIONS.find((candidate) => candidate.title === section.title);
      if (!rule) continue;
      const options = rowsOf(section)
        .filter((row) => row.label)
        .slice(0, 12)
        .map((row) => ({ id: `f${index++}`, label: row.label, detail: row.detail, meaning: rule.kind === "能力" ? "" : guessMeaning(row.label), kind: rule.kind, section: section.title }));
      if (options.length) groups.push({ title: section.title, hint: rule.hint, options });
    }
  }
  const whole = { id: "whole", label: "做一个整体的简化版", detail: "挑最重要的几项功能，做一个属于自己的小版本", kind: "整体", section: "" };
  return { supported: true, groups: [{ title: "整体", hint: "适合想“自己做一个类似的软件”的情况", options: [whole] }, ...groups] };
}

function contextLines(reports) {
  const lines = [];
  for (const report of reports) {
    for (const section of report.sections || []) {
      if (!CONTEXT_SECTIONS.includes(section.title)) continue;
      const rows = rowsOf(section).slice(0, 8).map((row) => (row.detail ? `${row.label}（${row.detail}）` : row.label));
      if (rows.length) lines.push(`- ${section.title}：${rows.join("；")}`);
    }
  }
  return lines;
}

export const PLATFORMS = [
  { id: "web", label: "网页小工具", detail: "一个 HTML 文件，双击就能在浏览器里打开。最适合新手。", level: "最简单" },
  { id: "desktop", label: "电脑软件", detail: "用 Electron 做成能装在电脑上的程序，需要先装 Node.js。", level: "中等" },
  { id: "android", label: "安卓 App", detail: "需要安装 Android Studio，步骤最多。", level: "较难" },
  { id: "existing", label: "加到我已有的项目里", detail: "适合已经有自己项目、在用 AI 编程工具的人。", level: "视项目而定" },
];

export const ROUTES = [
  { id: "web-ai", label: "我不会编程：交给网页版 AI", detail: "豆包、Kimi、DeepSeek、通义千问都可以。AI 写好代码，你照着步骤保存、打开。" },
  { id: "coding-tool", label: "我在用 AI 编程工具", detail: "优先 Trae CN、CodeBuddy 国内站、Qoder CN（原通义灵码），确认实际使用的国模。AI 会在项目里写代码。" },
];

/** Where the analysed thing came from decides the reuse wording. */
export function sourceKind(target) {
  return /[\\/]samples[\\/]/i.test(String(target || "")) ? "open" : "third-party";
}

/** The replication spec as Markdown. `goal` is the learner's own one-line description. */
export function buildSpec({ reports, target, choice, platform, goal, now = new Date() }) {
  const candidates = buildCandidates(reports);
  const all = candidates.groups.flatMap((group) => group.options);
  const picked = all.find((option) => option.id === choice) || all[0];
  const name = String(target || "").split(/[\\/]/).filter(Boolean).pop() || "目标软件";
  const kind = sourceKind(target);
  const form = PLATFORMS.find((item) => item.id === platform) || PLATFORMS[0];
  const features = picked?.id === "whole" ? all.filter((option) => option.id !== "whole").slice(0, 8) : [picked];
  const related = picked && picked.id !== "whole" ? all.filter((option) => option.section === picked.section && option.id !== picked.id).slice(0, 4) : [];
  const headline = reports.map((report) => report.headline).filter(Boolean).join(" ");

  const lines = [
    `# 复刻说明书：${goal?.trim() || (picked?.id === "whole" ? `一个类似「${name}」的简化版` : `「${picked?.label}」这个功能`)}`,
    "",
    "## 1. 学习对象",
    `- 分析对象：${name}`,
    `- 来源：${kind === "open" ? "工作台自带的示例或开源项目" : "第三方软件或你自己的软件"}`,
    `- 报告摘要：${headline}`,
    `- 说明书生成时间：${now.toLocaleString("zh-CN", { hour12: false })}`,
    "",
    "## 2. 原软件里和这个功能相关的线索",
    "下面的名字只用来帮你理解原软件是怎么组织的。你的实现请用自己的命名。",
    ...features.map((feature) => `- ${feature.kind}：${feature.label}${feature.detail ? `（${feature.detail}）` : ""}${feature.meaning ? ` — ${feature.meaning}` : ""}`),
    ...(related.length ? ["", "同一部分的其他线索（可以参考它们之间的分工）：", ...related.map((option) => `- ${option.label}${option.detail ? `（${option.detail}）` : ""}`)] : []),
    ...(contextLines(reports).length ? ["", "原软件用到的技术和能力（只作参考，可以换成你熟悉的做法）：", ...contextLines(reports)] : []),
    "",
    "## 3. 我要做的东西",
    `- 做成：${form.label}（${form.detail}）`,
    `- 一句话目标：${goal?.trim() || "（还没写，建议用自己的话补上：它帮我做什么？）"}`,
    "- 先做最小能用的版本，能跑起来之后再加功能。",
    "",
    "## 4. 复刻规则（净室练习）",
    "1. 只参考上面写的“做什么、怎么分工”，不要去找或复制原软件的源代码。",
    "2. 不使用原软件的名字、图标、图片、文案和界面截图。",
    "3. 代码全部重新写，变量、函数、文件都用自己的命名。",
    kind === "open"
      ? "4. 这是开源项目：如果以后想直接参考它的代码，要遵守它的许可证并保留作者声明；这次练习请先自己写。"
      : "4. 只用于自己学习和使用，不发布、不售卖，也不要冒充原软件。",
    "",
    "## 5. 做完后对照检查",
    ...features.map((feature) => `- [ ] 能完成：${feature.label}${feature.meaning ? `（${feature.meaning.replace("可能是：", "")}）` : ""}`),
    "- [ ] 关掉再打开后，需要保存的内容还在",
    "- [ ] 没有用到原软件的名字、图标和图片",
    "- [ ] 我能用自己的话说清楚：每个部分负责什么",
  ];
  return lines.join("\n");
}

/** What to paste into the AI, wrapped for the learner's route. */
export function buildPrompt({ spec, route, platform }) {
  const web = platform === "web" || !platform;
  if (route === "coding-tool") {
    return [
      "我在做一个学习练习，想按下面的「复刻说明书」从零实现一个自己的版本。",
      "请先用 3～5 句话说明你的实现方案和文件结构，等我确认后再写代码。",
      "写代码时：遵守说明书里的复刻规则；每完成一步就告诉我怎么运行、怎么看到效果；代码里加简短的中文注释。",
      "不要搜索或参考原软件的源代码。",
      "",
      spec,
    ].join("\n");
  }
  return [
    "我是完全不会编程的新手，在做一个学习练习：按下面的「复刻说明书」，自己做一个类似的小工具给自己用。",
    web
      ? "请帮我做成【一个单独的 HTML 文件】：把 HTML、CSS、JavaScript 都写在同一个文件里，不需要安装任何东西，双击就能在浏览器里打开。需要保存数据的话用浏览器的 localStorage；访问失败时暂存在内存并提示下载后测试。不要使用外部库或联网请求。"
      : "请一步一步教我：先告诉我需要安装什么、怎么新建项目，再给出完整代码，最后告诉我怎么运行。",
    "要求：",
    "1. 一次给出完整代码，不要省略任何部分；",
    "2. 代码里加简单的中文注释；",
    "3. 代码后面用最简单的话告诉我怎么保存、怎么打开；",
    "4. 遵守说明书里的复刻规则，不要使用原软件的名字、图标和图片。",
    "",
    spec,
  ].join("\n");
}
