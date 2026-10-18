// 结业实操的判分：五问写报告
//
// 序章教完，玩家应该能对**一个没见过的软件**写出五问：要了什么、数据发去哪、
// 密钥在哪、有没有隐藏入口、怎么验证。这一关不给模拟终端，直接让他用工作台跑一遍，
// 然后把答案交上来——判分只看两件事：**选对证据**、**说清结论**。
//
// 纯函数：界面把玩家的选择传进来，这里只负责算分和给反馈。

/** 五问。每题满分 2：2 = 选对主项且没选错，1 = 漏了主项或混进一个错的，0 = 选错/空着。 */
export const QUESTIONS = [
  { id: "capabilities", label: "它要了哪些能力？", hint: "权限、系统能力、外部设备" },
  { id: "destination", label: "数据发到了哪里？", hint: "域名、接口路径、上报时机" },
  { id: "secret", label: "密钥藏在哪里？", hint: "代码里、配置里、还是服务器上" },
  { id: "entry", label: "有没有隐藏入口？", hint: "后门、调试通道、开机自启" },
  { id: "verify", label: "你会怎么验证？", hint: "抓包、沙盒、改副本、下断点" },
];

export const PASS_SCORE = 8;
export const DISTINCTION_SCORE = 9;

/**
 * 答案的形状：`{ picks: ["contacts","camera"], none: false }`。
 * `none: true` 表示“查过了，这里确实没有”——和“空着没答”不是一回事，
 * 因为这份报告里，“没有”本身就是一个要写出来的结论。
 * 允许直接传数组（当作 picks，none 为 false）。
 */
function normalizeAnswer(answer) {
  if (Array.isArray(answer)) return { picks: answer, none: false };
  if (answer && typeof answer === "object") {
    return { picks: Array.isArray(answer.picks) ? answer.picks : [], none: answer.none === true };
  }
  return { picks: [], none: false };
}

/** 单题判分。truth: [{ key, critical }]。 */
export function scoreQuestion(questionId, answer = {}, truth = []) {
  const { picks, none } = normalizeAnswer(answer);
  const chosen = new Set(picks);
  const critical = truth.filter((item) => item.critical);
  const optional = truth.filter((item) => !item.critical);
  const hitCritical = critical.filter((item) => chosen.has(item.key)).length;
  const known = new Set(truth.map((item) => item.key));
  // 选了真值里没有的东西，也是误选（夸大结论和技术上选错一样糟）。
  const bad = picks.filter((key) => !known.has(key) || optional.some((item) => item.key === key)).length;
  const missing = critical.filter((item) => !chosen.has(item.key));

  if (!critical.length) {
    // 这道题本来就没有可选项（例如样本确实没有隐藏入口）：要写出“没有”才算对。
    if (none && chosen.size === 0) return { id: questionId, score: 2, reason: "看清楚了：这里确实没有" };
    if (chosen.size > 0) return { id: questionId, score: 0, reason: "选了不存在的东西" };
    return { id: questionId, score: 0, reason: "没写结论：是没有，还是没查？" };
  }
  if (none) return { id: questionId, score: 0, reason: "写了「没有」，可这里其实有" };
  if (chosen.size === 0) return { id: questionId, score: 0, reason: "空着——等于没查" };
  if (hitCritical === critical.length && bad === 0) return { id: questionId, score: 2, reason: "主项全中，没有误选" };
  if (hitCritical > 0) return { id: questionId, score: 1, reason: `漏了：${missing.map((m) => m.key).join("、") || "—"}` };
  return { id: questionId, score: 0, reason: "主项一个都没选对" };
}

/** 整份报告的判分。 */
export function scoreReport({ answers = {}, sample = {} } = {}) {
  const results = QUESTIONS.map((question) => scoreQuestion(question.id, answers[question.id] || [], sample[question.id] || []));
  const total = results.reduce((sum, item) => sum + item.score, 0);
  const max = QUESTIONS.length * 2;
  const verdict = total >= DISTINCTION_SCORE ? "distinction" : total >= PASS_SCORE ? "pass" : "fail";
  return {
    total,
    max,
    verdict,
    passed: verdict !== "fail",
    results,
    // 通过时给一句总评，失败时点出最该补的那一问。
    summary:
      verdict === "distinction"
        ? "五问都落到了证据上。这就是 Lv1 的水平：报告可以被别人复核。"
        : verdict === "pass"
          ? "能独立写出五问了。差的那一两分，多半是没把结论落到具体那一行。"
          : `还差 ${PASS_SCORE - total} 分。先补最空的那一问：${weakest(results)}。`,
  };
}

export function weakest(results = []) {
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const worst = sorted[0];
  return worst ? QUESTIONS.find((q) => q.id === worst.id)?.label || worst.id : "—";
}

/** 毕业清单：通过之后给玩家带走的东西（界面直接渲染成列表）。 */
export const GRADUATION_CHECKLIST = {
  tooling: [
    "REA 工作台（本机），先用它把要查的软件扫一遍",
    "JADX：看 APK 的清单和反编译代码",
    "Ghidra：看 .so / .exe 的反汇编、字符串和函数调用",
    "Wireshark 或 mitmproxy：看它到底把什么发到了哪",
  ],
  drills: [
    "先拿自己常用的一个小工具跑一遍五问，和真实网络请求对一下",
    "再挑一个 APK，只做「权限 vs 功能是否匹配」这一问",
    "最后找同一个软件的两个版本，做一次版本对比",
  ],
  pitfalls: [
    "看到 base64 就写「加密」——它是编码",
    "代码里搜不到就当它没做——加壳和混淆都搜不到",
    "只看静态就当结论——跑不跑得起来本身也是信息",
  ],
  limits: [
    "只分析自己的软件，或你有权研究的软件",
    "绕过授权、外挂、破解别人软件不是这份清单的目的",
  ],
};
