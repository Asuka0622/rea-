/**
 * Turn REA's Evidence JSON into a beginner-friendly Chinese report:
 * { title, headline, facts[], sections[], cautions[], nextSteps[] }.
 * Every summary keeps to facts REA actually returned; nothing is guessed.
 */

const fmtBytes = (n) => {
  if (n == null || Number.isNaN(n)) return "未知";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};
const countBy = (items, key) => {
  const counts = new Map();
  for (const item of items) {
    const value = typeof key === "function" ? key(item) : item[key];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

/** Known REA limitation sentences, in plain Chinese. Unknown ones are shown in English as-is. */
const LIMITATION_ZH = [
  [/parsed as inert text|never executed|not execute|without execut/i, "全程只「读」文件，没有运行它，所以不会对你的电脑产生影响；但也因此看不到程序运行时才会出现的行为。"],
  [/do not prove runtime execution|does not establish runtime/i, "代码里写了某个调用，不代表它运行时一定会被执行。"],
  [/dynamic or obfuscated|unresolved when expressions are dynamic/i, "如果代码被混淆或使用了动态拼接，部分关系可能找不出来。"],
  [/central-directory entries only/i, "压缩包只统计了目录里登记的文件，签名块等附加数据不计入。"],
  [/bounded static hypotheses/i, "这是一次快速盘点，只给出初步判断和下一步建议，不做深入的格式分析。"],
  [/Webpack\/Rspack/i, "打包工具生成的模块是从语法结构里还原的，没有实际运行打包代码。"],
  [/resolved only within the inventoried/i, "模块之间的引用只在这次分析的文件范围内查找，外部依赖不会展开。"],
  [/did not load the assembly|decompile C#/i, "只读取了程序的元数据，没有加载或运行它，也没有反编译出 C# 源码。"],
  [/header and metadata root were admitted/i, null],
  [/architecture .* is derived from PE machine/i, null],
  [/Electron API identity follows/i, "Electron 接口按代码字面识别；被改名、动态选择的调用可能识别不到——「没找到」不等于「不存在」。"],
  [/Electron relationships are derived from inert syntax/i, "Electron 的窗口、通道关系都是从代码文本推断的，运行时是否真的注册、是否生效没有验证。"],
];
export function translateLimitations(list = []) {
  const out = [];
  for (const raw of list) {
    const text = typeof raw === "string" ? raw : raw?.detail || raw?.message || JSON.stringify(raw);
    const hit = LIMITATION_ZH.find(([pattern]) => pattern.test(text));
    if (hit && hit[1] === null) continue; // technical bookkeeping, not useful to a beginner
    const line = hit ? hit[1] : `（原文）${text}`;
    if (!out.includes(line)) out.push(line);
  }
  return out;
}

/** REA follow-up operations the workbench can run with nothing but the same file. */
export const FOLLOW_UPS = {
  inspect_managed_artifact: { command: "inspect-managed-artifact", label: "识别 .NET 程序信息", why: "看它是不是 C#/.NET 写的、依赖哪些库" },
  inspect_managed_members: { command: "inspect-managed-members", label: "列出 .NET 类和方法", why: "看程序里有哪些类、哪些功能函数" },
  inspect_pe_resources: { command: "inspect-pe-resources", label: "查看程序内嵌资源", why: "图标、版本信息、清单等打包在程序里的资源" },
  inspect_android_package: { command: "inspect-android-package", label: "解析安卓清单与类", why: "包名、版本、权限、四大组件和代码类", engine: "jadx" },
  decode_android_resources: { command: "decode-android-resources", label: "解码安卓资源与多语言文字", why: "应用里的文字、支持的语言、版本信息", engine: "apktool" },
  inspect_macho: { command: "inspect-macho", label: "查看苹果程序结构", why: "架构、依赖的系统库、加载命令" },
  inspect_signature: { command: "inspect-signature", label: "查看苹果签名", why: "开发者团队、签名证书、权限声明" },
  analyze_javascript_application: { command: "analyze-javascript-application", label: "分析 JavaScript 代码结构", why: "模块、依赖、Electron 窗口和通信" },
  inspect_binary_layout: { command: "inspect-binary-layout", label: "查看二进制布局", why: "段、节、符号与安全加固选项" },
  analyze: { command: "analyze", label: "深度分析（反编译概览）", why: "需要 Ghidra 等引擎，能看到函数和伪代码", engine: "ghidra" },
};

function nextStepsFrom(probes = []) {
  const steps = [];
  for (const probe of probes) {
    const op = typeof probe === "string" ? probe : probe.operation;
    const follow = FOLLOW_UPS[op];
    if (follow && !steps.some((step) => step.command === follow.command)) steps.push({ ...follow });
  }
  return steps;
}

const KIND_ZH = {
  javascript: "JavaScript 代码",
  resource: "资源文件",
  executable: "可执行程序",
  container: "压缩包/容器",
  "native-library": "原生库",
  library: "库文件",
  dex: "安卓字节码（dex）",
  manifest: "清单文件",
  image: "图片",
  certificate: "证书/签名",
  directory: "文件夹",
};

function summarizeArtifact(result) {
  const r = result.normalized_result;
  const manifest = r.substeps?.find((s) => s.operation === "inventory_artifact")?.evidence?.normalized_result;
  const occurrences = manifest?.occurrences || [];
  const files = occurrences.filter((o) => o.logical_path !== "." && o.entry_kind !== "directory");
  const root = occurrences.find((o) => o.logical_path === ".");
  const format = r.subject?.root_format || root?.artifact_format;
  const facts = [
    { label: "文件格式", value: format || "未知" },
    { label: "大小", value: fmtBytes(root?.declared_size ?? result.subject?.size) },
  ];
  const sections = [];
  if (files.length) {
    facts.push({ label: "包含文件", value: `${files.length} 个` });
    const encrypted = files.filter((o) => o.encrypted).length;
    if (encrypted) facts.push({ label: "加密文件", value: `${encrypted} 个`, hint: "加了密码的文件无法查看内容" });
    sections.push({
      title: "里面都有什么",
      explain: "按文件类型分类统计。",
      table: { columns: ["类型", "数量"], rows: countBy(files, (o) => KIND_ZH[o.artifact_kind] || o.artifact_kind || "其他").map(([k, v]) => [k, v]) },
    });
    sections.push({
      title: "最大的 10 个文件",
      explain: "体积大的通常是核心代码、资源或内置的库。",
      table: {
        columns: ["路径", "类型", "大小"],
        rows: [...files].sort((a, b) => (b.declared_size || 0) - (a.declared_size || 0)).slice(0, 10).map((o) => [o.logical_path, KIND_ZH[o.artifact_kind] || o.artifact_kind, fmtBytes(o.declared_size)]),
      },
    });
  }
  const hypotheses = (r.hypotheses || []).map((h) => h.statement);
  if (hypotheses.length) sections.push({ title: "初步判断（英文原文）", explain: "REA 根据格式提出的推测，可信度较低，需要下一步验证。", items: hypotheses });
  return {
    title: "文件盘点",
    headline: files.length ? `这是一个 ${format} 格式的包，里面有 ${files.length} 个文件。` : `这是一个 ${format || "未知格式"} 文件，大小 ${fmtBytes(root?.declared_size)}。`,
    facts,
    sections,
    cautions: translateLimitations(r.limitations),
    nextSteps: nextStepsFrom(r.next_probes),
  };
}

/** How the main process answers a channel, in plain words. */
const IPC_MODE_ZH = { handle: "请求后回复结果", on: "只接收消息", once: "只接收一次" };

function summarizeJavaScript(result) {
  const r = result.normalized_result;
  const nodes = r.graph?.nodes || [];
  const edges = r.graph?.edges || [];
  const stats = r.statistics || {};
  const s = r.summary || {};
  const sourceModules = nodes.filter((n) => n.identity?.namespace === "source-module");
  const exportsCount = nodes.filter((n) => n.identity?.namespace === "module-export").length;
  const external = nodes
    .filter((n) => n.identity?.namespace === "unresolved-reference")
    .map((n) => String(n.identity.key).replace(/^(require|static-import|dynamic-import|import):/, ""))
    .filter((name) => !name.startsWith("."));
  const builtins = external.filter((name) => name.startsWith("node:") || /^(fs|path|os|child_process|events|crypto|http|https|net|url|util|stream|zlib|process)$/.test(name));
  const packages = external.filter((name) => !builtins.includes(name));
  const isElectron = s.browser_windows > 0 || s.preload_entrypoints > 0 || (s.ipc?.operations || 0) > 0;

  const importTargets = countBy(
    edges.filter((e) => e.relation === "imports" && e.properties?.resolved_path),
    (e) => e.properties.resolved_path,
  ).slice(0, 10);

  const facts = [
    { label: "应用类型", value: isElectron ? "Electron 桌面应用" : "JavaScript 程序/库" },
    { label: "相关文件", value: `${stats.relevant_files ?? "?"} 个` },
    { label: "成功解析的 JS", value: `${stats.parsed_javascript_files ?? "?"} 个`, hint: stats.parse_failures ? `${stats.parse_failures} 个解析失败` : "全部解析成功" },
    { label: "源码模块", value: `${sourceModules.length} 个` },
    { label: "对外导出", value: `${exportsCount} 项`, hint: "模块提供给别处使用的函数/变量" },
  ];

  const sections = [];
  if (sourceModules.length) {
    sections.push({
      title: "代码文件",
      explain: "应用自己的源码模块（不含第三方依赖展开）。",
      items: sourceModules.map((n) => String(n.identity.key).replace(/^[0-9a-f]{64}:/, "")).slice(0, 60),
    });
  }
  if (importTargets.length) {
    sections.push({
      title: "被引用最多的模块",
      explain: "被别的文件 import/require 次数越多，通常越是核心或公共代码——想了解某个功能，可以从这里入手。",
      table: { columns: ["文件", "被引用次数"], rows: importTargets },
    });
  }
  if (packages.length || builtins.length) {
    sections.push({
      title: "用到的外部能力",
      explain: "Node 内置模块说明它会做什么类型的事：fs=读写文件，child_process=启动其他程序，net/http=联网。",
      items: [...new Set([...builtins.map((b) => `Node 内置：${b.replace(/^node:/, "")}`), ...packages.map((p) => `第三方包：${p}`)])],
    });
  }
  const observed = (node) => node.observations?.[0] || {};
  const ofKind = (kind) => nodes.filter((n) => n.kind === kind);
  const handlers = ofKind("ipc-handler").map(observed);
  if (handlers.length) {
    const lines = (p) => (p.handler_location ? `第 ${p.handler_location.start.line} 行` : "");
    sections.push({
      title: "主进程提供的功能（IPC 通道）",
      explain: "界面通过这些「通道名」请求主进程办事，名字往往直接说明了功能，是研究这个应用最好的入口。",
      table: {
        columns: ["通道名", "方式", "位置"],
        rows: [...handlers]
          .sort((a, b) => (a.properties?.handler_location?.start.line ?? 0) - (b.properties?.handler_location?.start.line ?? 0))
          .map((o) => [o.properties?.channel ?? o.label, IPC_MODE_ZH[o.properties?.mode] ?? o.properties?.mode ?? "", lines(o.properties || {})]),
      },
    });
  }
  const bridges = ofKind("context-bridge-api").map(observed);
  if (bridges.length) {
    sections.push({
      title: "暴露给界面的接口",
      explain: "preload 通过 contextBridge 放到网页里的对象，界面代码只能通过这些函数调用系统能力。",
      items: bridges.flatMap((o) => (o.properties?.members || []).map((m) => `window.${o.properties?.api_key ?? o.label}.${m}()`)),
    });
  }
  const endpoints = ofKind("endpoint").map((n) => observed(n).label).filter(Boolean);
  if (endpoints.length) {
    sections.push({ title: "代码里出现的网络地址", explain: "写在代码里的网址或接口地址，说明它可能会连接这些服务器（不代表一定会连）。", items: [...new Set(endpoints)].slice(0, 60) });
  }
  const risky = ofKind("browser-window")
    .map(observed)
    .flatMap((o) => (o.properties?.web_preferences || []).map((p) => [p.name, p.value?.value]))
    .filter(([name, value]) => (name === "nodeIntegration" && value === true) || (name === "contextIsolation" && value === false) || (name === "webSecurity" && value === false) || (name === "sandbox" && value === false));
  if (risky.length) {
    sections.push({
      title: "安全设置提醒",
      explain: "这些窗口设置会让网页内容拥有更高的系统权限，如果页面加载了外部内容，风险会更大。",
      items: risky.map(([name, value]) => `${name} = ${value}`),
    });
  }
  if (isElectron) {
    sections.push({
      title: "Electron 结构",
      explain: "Electron 应用分「主进程」（有系统权限）和「页面」（界面），二者通过 IPC 通道通信。preload 是连接两边的桥。",
      table: {
        columns: ["项目", "数量"],
        rows: [
          ["窗口（BrowserWindow）", s.browser_windows],
          ["preload 入口", s.preload_entrypoints],
          ["暴露给页面的 API", s.exposed_api_members],
          ["IPC 通信操作", s.ipc?.operations],
          ["IPC 通道名", s.ipc?.literal_channels],
          ["主进程处理函数", s.ipc?.main_handlers],
          ["原生插件（.node）", s.native_addon_bindings],
        ],
      },
    });
  }
  const priority = ["主进程提供的功能（IPC 通道）", "暴露给界面的接口", "安全设置提醒", "代码里出现的网络地址", "用到的外部能力", "Electron 结构", "被引用最多的模块", "代码文件"];
  sections.sort((a, b) => priority.indexOf(a.title) - priority.indexOf(b.title));
  return {
    title: "JavaScript 应用分析",
    headline: `${isElectron ? "这是一个 Electron 桌面应用" : "这是一个 JavaScript 程序"}，共 ${sourceModules.length} 个源码模块，引用了 ${packages.length} 个第三方包、${new Set(builtins).size} 个 Node 内置模块。`,
    facts,
    sections,
    cautions: translateLimitations(r.limitations),
    nextSteps: [],
  };
}

function summarizeManagedArtifact(result) {
  const r = result.normalized_result;
  const c = r.classification || {};
  const managed = c.status === "managed";
  const facts = [
    { label: "是否 .NET 程序", value: managed ? "是（C#/VB.NET 等编写）" : "不是（原生程序）" },
    { label: "架构", value: c.managed_architecture && c.managed_architecture !== "unknown" ? (c.managed_architecture === "anycpu" ? "AnyCPU（32/64 位通用）" : c.managed_architecture) : r.pe?.architecture || "未知" },
  ];
  if (r.assembly?.name) facts.push({ label: "程序集", value: `${r.assembly.name} ${r.assembly.version || ""}`.trim() });
  if (r.target_frameworks?.length) facts.push({ label: "目标框架", value: r.target_frameworks.map((f) => f.name || f).join("、") });
  const sections = [];
  if (r.references?.length) sections.push({ title: "依赖的程序集", explain: "它调用了哪些其他 .NET 库。", items: r.references.map((ref) => `${ref.name || ref} ${ref.version || ""}`.trim()) });
  const issues = (c.evidence || []).map((e) => e.detail).filter(Boolean);
  return {
    title: ".NET 程序识别",
    headline: managed ? "这是一个 .NET 托管程序，可以进一步列出它的类和方法。" : "这不是 .NET 程序，需要原生反编译引擎（如 Ghidra）才能看代码。",
    facts,
    sections,
    cautions: [...issues.map((i) => `（原文）${i}`), ...translateLimitations(r.limitations)],
    nextSteps: managed ? [FOLLOW_UPS.inspect_managed_members] : [FOLLOW_UPS.analyze],
  };
}

function summarizeManagedMembers(result) {
  const r = result.normalized_result;
  const types = (r.types || []).filter((t) => t.name !== "<Module>");
  const methods = r.methods || [];
  const namespaces = countBy(types, (t) => t.namespace || "（无命名空间）").slice(0, 15);
  const methodsPerType = countBy(methods, "declaring_type").slice(0, 15);
  const unavailable = r.coverage?.state === "unavailable";
  return {
    title: ".NET 类与方法",
    headline: unavailable ? "这个程序太大，超出了 REA 的单次读取上限，暂时无法列出成员。" : `找到 ${types.length} 个类型、${methods.length} 个方法。`,
    facts: [
      { label: "类型（类/接口/结构）", value: `${types.length}` },
      { label: "方法", value: `${methods.length}` },
      { label: "字段", value: `${(r.fields || []).length}` },
      { label: "完整度", value: unavailable ? "不可用" : r.coverage?.state === "complete" ? "完整" : r.coverage?.state || "未知" },
    ],
    sections: [
      namespaces.length && { title: "命名空间", explain: "命名空间就像文件夹，按功能把类分组，名字通常能看出用途。", table: { columns: ["命名空间", "类型数"], rows: namespaces } },
      methodsPerType.length && { title: "方法最多的类", explain: "方法多的类往往承担主要功能，适合优先研究。", table: { columns: ["类", "方法数"], rows: methodsPerType } },
      types.length && { title: "全部类型（前 80 个）", items: types.slice(0, 80).map((t) => t.full_name || t.name) },
    ].filter(Boolean),
    cautions: [...(r.coverage?.issues || []).map((i) => `（原文）${i.detail}`), ...translateLimitations(r.limitations)],
    nextSteps: [],
  };
}

const SKIP_KEY = /(^|_)(id|ids|sha256|digest|hash|token|offset|row_offset)$|_id$|evidence/i;

/** Fallback for operations without a dedicated summary: show the scalar facts and list sizes REA returned. */
function summarizeGeneric(result, command) {
  const r = result.normalized_result ?? result;
  const facts = [];
  const sections = [];
  const walk = (value, prefix, depth) => {
    if (!value || typeof value !== "object" || depth > 2) return;
    for (const [key, item] of Object.entries(value)) {
      if (SKIP_KEY.test(key) || key === "limitations") continue;
      const label = prefix ? `${prefix}.${key}` : key;
      if (item == null) continue;
      if (Array.isArray(item)) {
        if (item.length && item.every((x) => typeof x !== "object")) sections.push({ title: label, items: item.slice(0, 50).map(String) });
        else facts.push({ label, value: `${item.length} 项` });
      } else if (typeof item === "object") walk(item, label, depth + 1);
      else if (facts.length < 40) facts.push({ label, value: String(item).slice(0, 200) });
    }
  };
  walk(r, "", 0);
  return {
    title: command,
    headline: "分析完成。这一项还没有专门的中文解读，下面列出 REA 返回的主要字段（英文字段名）。",
    facts,
    sections,
    cautions: translateLimitations(r.limitations),
    nextSteps: [],
  };
}

/** Android API level → the Android version people know. */
const ANDROID_VERSION = { 21: "5.0", 22: "5.1", 23: "6", 24: "7.0", 25: "7.1", 26: "8.0", 27: "8.1", 28: "9", 29: "10", 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15", 36: "16" };
const androidVersion = (sdk) => (sdk == null ? "未知" : ANDROID_VERSION[Number(sdk)] ? `Android ${ANDROID_VERSION[Number(sdk)]}（API ${sdk}）` : `API ${sdk}`);

/** Common permissions in plain words; `level` marks what deserves a second look. */
const PERMISSIONS_ZH = {
  INTERNET: ["联网", "普通"],
  ACCESS_NETWORK_STATE: ["查看网络是否连接", "普通"],
  ACCESS_WIFI_STATE: ["查看 Wi-Fi 状态", "普通"],
  VIBRATE: ["让手机振动", "普通"],
  WAKE_LOCK: ["防止手机休眠（后台任务用）", "普通"],
  RECEIVE_BOOT_COMPLETED: ["开机后自动启动（用于恢复提醒等）", "留意"],
  FOREGROUND_SERVICE: ["在前台持续运行（通知栏常驻）", "留意"],
  POST_NOTIFICATIONS: ["发送通知", "普通"],
  SCHEDULE_EXACT_ALARM: ["设置精确闹钟", "留意"],
  USE_EXACT_ALARM: ["设置精确闹钟", "留意"],
  REQUEST_INSTALL_PACKAGES: ["安装其他 App", "敏感"],
  CAMERA: ["使用相机", "敏感"],
  RECORD_AUDIO: ["录音", "敏感"],
  ACCESS_FINE_LOCATION: ["精确定位", "敏感"],
  ACCESS_COARSE_LOCATION: ["大致定位", "敏感"],
  ACCESS_BACKGROUND_LOCATION: ["在后台定位", "敏感"],
  READ_CONTACTS: ["读取通讯录", "敏感"],
  WRITE_CONTACTS: ["修改通讯录", "敏感"],
  READ_PHONE_STATE: ["读取手机状态和识别码", "敏感"],
  CALL_PHONE: ["直接拨打电话", "敏感"],
  READ_SMS: ["读取短信", "敏感"],
  SEND_SMS: ["发送短信", "敏感"],
  READ_CALENDAR: ["读取日历", "敏感"],
  WRITE_CALENDAR: ["修改日历", "敏感"],
  READ_EXTERNAL_STORAGE: ["读取手机存储", "留意"],
  WRITE_EXTERNAL_STORAGE: ["写入手机存储", "留意"],
  READ_MEDIA_IMAGES: ["读取相册图片", "留意"],
  READ_MEDIA_VIDEO: ["读取相册视频", "留意"],
  READ_MEDIA_AUDIO: ["读取音频文件", "留意"],
  MANAGE_EXTERNAL_STORAGE: ["管理全部文件", "敏感"],
  SYSTEM_ALERT_WINDOW: ["显示在其他 App 上层（悬浮窗）", "敏感"],
  BLUETOOTH_CONNECT: ["连接蓝牙设备", "留意"],
  BLUETOOTH_SCAN: ["扫描附近蓝牙设备", "留意"],
  NFC: ["使用 NFC", "留意"],
  USE_BIOMETRIC: ["使用指纹或面容解锁", "普通"],
  BODY_SENSORS: ["读取身体传感器", "敏感"],
  ACTIVITY_RECOGNITION: ["识别运动状态（步数等）", "留意"],
  QUERY_ALL_PACKAGES: ["查看手机里装了哪些 App", "敏感"],
  GET_ACCOUNTS: ["读取手机上的账号列表", "敏感"],
  "com.google.android.c2dm.permission.RECEIVE": ["接收推送消息", "普通"],
};

/** Component name prefixes that reveal which ready-made capability an app uses. */
const LIBRARY_HINTS = [
  [/^io\.flutter\.plugins\.imagepicker/, "从相册或相机选图（Flutter 插件）"],
  [/^io\.flutter\.plugins\.urllauncher/, "打开网页链接（Flutter 插件）"],
  [/^io\.flutter/, "Flutter 框架"],
  [/^com\.dexterous\.flutterlocalnotifications/, "本地定时通知（Flutter 插件）"],
  [/^androidx\.glance/, "桌面小组件（Jetpack Glance）"],
  [/^androidx\.core\.widget/, "桌面小组件辅助"],
  [/^androidx\.work/, "后台定时任务（WorkManager）"],
  [/^androidx\.room/, "本地数据库（Room）"],
  [/^androidx\.startup/, "启动初始化（App Startup）"],
  [/^androidx\.profileinstaller/, "启动速度优化（Baseline Profile）"],
  [/^androidx\.camera/, "相机（CameraX）"],
  [/^com\.google\.firebase\.messaging/, "推送通知（Firebase）"],
  [/^com\.google\.firebase/, "Firebase 云服务"],
  [/^com\.google\.android\.gms\.ads/, "谷歌广告"],
  [/^com\.google\.android\.gms/, "谷歌 Play 服务"],
  [/^com\.tencent\.mm/, "微信 SDK（登录/分享/支付）"],
  [/^com\.tencent\.bugly/, "腾讯 Bugly 崩溃统计"],
  [/^com\.tencent/, "腾讯 SDK"],
  [/^com\.alipay/, "支付宝 SDK"],
  [/^com\.umeng/, "友盟统计/推送"],
  [/^com\.bytedance|^com\.pangle/, "字节跳动（穿山甲广告等）SDK"],
  [/^cn\.jpush|^cn\.jiguang/, "极光推送"],
  [/^com\.huawei/, "华为服务 SDK"],
  [/^com\.xiaomi/, "小米服务 SDK"],
  [/^com\.facebook\.react/, "React Native 框架"],
  [/^com\.unity3d/, "Unity 游戏引擎"],
];
const COMPONENT_ZH = { activity: "页面", service: "后台服务", receiver: "事件接收器", provider: "数据提供者" };

function summarizeAndroidPackage(result) {
  const r = result.normalized_result;
  const manifest = r.manifest?.text || "";
  const components = [...manifest.matchAll(/<(activity|activity-alias|service|receiver|provider)\b[^>]*?android:name="([^"]+)"/g)].map(([, kind, name]) => ({
    kind: kind === "activity-alias" ? "activity" : kind,
    name: name.startsWith(".") ? `${r.package_name}${name}` : name,
  }));
  const own = components.filter((c) => r.package_name && c.name.startsWith(r.package_name));
  const library = new Map();
  for (const c of components.filter((c) => !own.includes(c))) {
    const hit = LIBRARY_HINTS.find(([pattern]) => pattern.test(c.name));
    const label = hit ? hit[1] : c.name.split(".").slice(0, 3).join(".");
    library.set(label, (library.get(label) || 0) + 1);
  }
  const framework = /io\.flutter/.test(manifest) ? "Flutter" : /com\.facebook\.react/.test(manifest) ? "React Native" : /com\.unity3d/.test(manifest) ? "Unity" : /io\.dcloud|uni-app/i.test(manifest) ? "uni-app" : "原生安卓（或未识别）";
  const permissions = (r.permissions || []).map((p) => {
    const short = p.replace(/^android\.permission\./, "");
    const [meaning, level] = PERMISSIONS_ZH[short] || PERMISSIONS_ZH[p] || (p.startsWith(`${r.package_name}.`) ? ["App 自己定义的内部权限", "普通"] : [short, "未知"]);
    return { name: short, meaning, level };
  });
  const sensitive = permissions.filter((p) => p.level === "敏感");
  const order = { 敏感: 0, 留意: 1, 未知: 2, 普通: 3 };

  const sections = [
    permissions.length && {
      title: "申请的权限",
      explain: "App 想要的手机能力。「敏感」的权限涉及隐私，值得留意它为什么需要；「留意」表示会影响耗电或在后台运行。",
      table: { columns: ["能力", "程度", "系统名称"], rows: [...permissions].sort((a, b) => order[a.level] - order[b.level]).map((p) => [p.meaning, p.level, p.name]) },
    },
    library.size && {
      title: "用到的现成能力",
      explain: "从清单里登记的组件推断出它接入了哪些现成的库或服务。名字能直接看出功能，比如「桌面小组件」「后台定时任务」。",
      table: { columns: ["能力", "登记的组件数"], rows: [...library.entries()].sort((a, b) => b[1] - a[1]) },
    },
    own.length && {
      title: "App 自己写的组件",
      explain: "页面是你能看到的界面；事件接收器会在某些时机被唤醒（比如开机、桌面小组件刷新）。",
      table: { columns: ["名称", "类型"], rows: own.map((c) => [c.name.replace(`${r.package_name}.`, ""), COMPONENT_ZH[c.kind] || c.kind]) },
    },
  ].filter(Boolean);

  return {
    title: "安卓 App 清单",
    headline: `这是「${r.package_name}」${r.version_name ? ` ${r.version_name}` : ""}，用 ${framework} 开发，申请了 ${permissions.length} 项权限${sensitive.length ? `，其中 ${sensitive.length} 项涉及隐私` : "，没有涉及隐私的敏感权限"}。`,
    facts: [
      { label: "包名", value: r.package_name || "未知" },
      { label: "版本", value: `${r.version_name || "?"}（${r.version_code || "?"}）` },
      { label: "开发技术", value: framework },
      { label: "最低支持", value: androidVersion(r.min_sdk) },
      { label: "面向版本", value: androidVersion(r.target_sdk) },
      { label: "代码类", value: `${r.class_count ?? "?"} 个`, hint: framework === "Flutter" ? "Flutter 的业务代码在 libapp.so 里，不在这些类中" : null },
    ],
    sections,
    cautions: [
      ...(framework === "Flutter" ? ["这是 Flutter 应用：界面和业务逻辑编译在 libapp.so 里，JADX 只能看到安卓外壳和插件，看不到主要业务代码。"] : []),
      ...(r.signature_verification === "not_performed" ? ["没有校验 APK 的签名，不能据此判断安装包是否被改动过。"] : []),
      ...translateLimitations(r.limitations),
    ],
    nextSteps: [FOLLOW_UPS.decode_android_resources],
  };
}

const SUMMARIZERS = {
  "inspect-artifact": summarizeArtifact,
  "analyze-javascript-application": summarizeJavaScript,
  "inspect-managed-artifact": summarizeManagedArtifact,
  "inspect-managed-members": summarizeManagedMembers,
  "inspect-android-package": summarizeAndroidPackage,
};

export function summarize(command, result) {
  const fn = SUMMARIZERS[command];
  try {
    return fn ? fn(result) : summarizeGeneric(result, command);
  } catch (error) {
    const report = summarizeGeneric(result, command);
    report.cautions.unshift(`中文解读出错（${error.message}），以下为原始字段。`);
    return report;
  }
}

/** Plain-language explanation of a REA error, plus which engine would fix it. */
export function explainError(error) {
  const text = `${error?.message || ""} ${error?.remediation?.action || ""}`;
  const engines = [
    [/REA_JADX_MCP_JAR|jadx/i, "jadx", "需要先安装 JADX 安卓反编译器"],
    [/GHIDRA_INSTALL_DIR|ghidra/i, "ghidra", "需要先安装 Ghidra 反编译器"],
    [/JAVA_HOME|java/i, "java", "需要先安装 Java（JDK 21）"],
    [/REA_APKTOOL_COMMAND|apktool/i, "apktool", "需要先安装 Apktool"],
    [/REA_ADB_PATH|\badb\b/i, "adb", "需要先安装 ADB"],
    [/REA_BROWSER_EXECUTABLE|browser/i, "browser", "需要 Chrome 或 Edge 浏览器"],
    [/HOPPER|no .*provider|provider .*not|analysis engine/i, "ghidra", "需要一个原生反编译引擎（推荐免费的 Ghidra）"],
  ];
  const hit = engines.find(([pattern]) => pattern.test(text));
  const byCode = {
    cancelled: "已取消。",
    timeout: error?.message,
    artifact_operation_failed: "REA 无法处理这个文件，它可能已损坏、格式不受支持，或打包方式不标准。",
  };
  return {
    title: hit ? hit[2] : "分析没有成功",
    plain: hit ? `这一步要用到额外的分析引擎。去「分析引擎」页一键安装后再试。` : byCode[error?.code] || "REA 返回了错误，下面是原始信息，可以复制给 AI 帮你看。",
    engine: hit?.[1] || null,
    original: error?.message || JSON.stringify(error).slice(0, 2000),
    code: error?.code || null,
  };
}
