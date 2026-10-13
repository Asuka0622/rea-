// All beginner-facing copy lives here so it can be edited without touching app logic.

/** 小词典. `auto: false` keeps a term out of automatic highlighting (too short / too common). */
export const GLOSSARY = {
  文件头: { text: "每种文件开头几个固定的字节，像「身份证号」一样表明文件类型。比如 Windows 程序以 4D 5A（字母 MZ）开头，压缩包以 50 4B（PK）开头。" },
  标本编号: { text: "文件的 SHA-256 指纹的前几位。只要文件有一丁点不同，编号就会完全不同，可以用来确认两次分析的是不是同一个文件。" },
  逆向分析: { text: "在没有源代码的情况下，通过查看软件本身来弄清楚它是怎么做出来的。就像没有说明书，把收音机拆开看零件。" },
  软件: { text: "电脑或手机上的程序，比如微信、QQ 音乐、记事本。", auto: false },
  路径: { text: "文件在电脑里的「地址」，例如 C:\\Program Files\\微信。工作台的「选择文件」按钮会帮你自动填好，一般不用手动输入。" },
  文件夹: { text: "装文件的「抽屉」。电脑软件通常是一整个文件夹，里面有很多文件。", auto: false },
  APK: { text: "安卓手机 App 的安装包文件（文件名以 .apk 结尾），相当于电脑上的安装程序。" },
  ipa: { text: "苹果手机 App 的安装包。从 App Store 下载的一般是加密的，普通用户拿不到可分析的版本。" },
  exe: { text: "Windows 电脑上可以双击运行的程序文件。" },
  dll: { text: "Windows 程序用到的「零件库」，自己不能双击运行，给其他程序调用。" },
  so: { text: "安卓和 Linux 上的「零件库」，作用类似 Windows 的 dll。", auto: false },
  asar: { text: "Electron 软件把自己的代码打包成的一个文件，通常叫 app.asar。" },
  Electron: { text: "一种用网页技术（HTML、JavaScript）做电脑软件的方法。VS Code、钉钉、飞书、Discord 等很多软件都是用它做的。好消息是：这类软件不用装任何引擎就能分析得很清楚。" },
  JavaScript: { text: "网页和 Electron 软件使用的编程语言，简称 JS。" },
  "主进程": { text: "Electron 软件的「后台大脑」，有权限读写文件、联网、调用系统功能。" },
  "IPC": { text: "Electron 软件里界面和后台大脑之间「打电话」的方式。每个通道名（比如 notes:save）通常就代表一个功能。" },
  preload: { text: "Electron 软件里连接界面和后台的「桥」，决定界面能使用哪些功能。" },
  ".NET": { text: "微软的一套开发技术，用 C# 等语言写的 Windows 程序大多基于它。这类程序能直接列出类和方法。" },
  "类": { text: "程序里按功能组织代码的单位，比如「登录管理」「订单处理」。名字往往能看出用途。", auto: false },
  "方法": { text: "类里面的一个具体功能，比如「保存笔记」「检查密码」。", auto: false },
  命名空间: { text: "给类分组的「文件夹名」，比如 Company.Payment 一看就和支付有关。" },
  模块: { text: "程序被拆成的一个个代码文件，每个负责一部分功能。" },
  第三方包: { text: "开发者从网上直接拿来用的现成代码，比如做数据库、做图表的工具库。看它用了哪些包，就知道它用了什么技术。" },
  "Node 内置": { text: "JavaScript 自带的基础能力，比如 fs（读写文件）、http（联网）、child_process（启动其他程序）。" },
  伪代码: { text: "反编译出来的、近似人类可读的代码。不是原始源码，变量名常常丢失，但能看出逻辑。" },
  反编译: { text: "把机器能看懂的程序翻译回人能读懂的代码的过程。" },
  引擎: { text: "工作台用来「看得更深」的辅助工具。不装也能用，装了能看到更多，比如安卓代码、程序伪代码。" },
  权限: { text: "手机 App 申请的能力，比如读取通讯录、使用相机、获取位置。看权限能知道 App 想做什么。" },
  MCP: { text: "让 AI 工具调用外部工具的一种「插头标准」。接入后，你的 AI 编程工具就能自己用 REA 分析软件。" },
  "AI 工具": { text: "这里指能在电脑上运行、可以接入插件的 AI 软件，比如 Trae、Cursor、通义灵码。只用网页版 AI（豆包、Kimi、DeepSeek）的话，用「复制给 AI」就够了。" },
  JSON: { text: "一种程序之间交换数据的文字格式。原始数据是给专业人士或 AI 看的，你不需要读懂它。" },
  HAR: { text: "浏览器保存下来的「网络请求记录」文件，能看到网页和哪些服务器通信过。" },
  "SHA-256": { text: "文件的「指纹」。下载后核对指纹，就能确认文件没有被篡改或损坏。" },
};

/**
 * The dive: every analysis goes one layer deeper. `depth` drives the ocean background (0–1),
 * `commands` are the REA commands whose results belong to that layer.
 */
export const LAYERS = [
  { id: "surface", meters: 0, name: "水面", verb: "识别", question: "这是什么文件？", detail: "看文件头和格式，认出它是电脑程序、手机 App 还是安装包。", depth: 0.16, commands: [] },
  { id: "shallow", meters: 10, name: "浅水", verb: "盘点", question: "里面装了什么？", detail: "列出包里的所有文件：代码、图片、库，哪些最大。", depth: 0.42, commands: ["inspect-artifact", "inspect-pe-resources", "inspect-web-network-capture"] },
  {
    id: "mid",
    meters: 60,
    name: "中层",
    verb: "结构",
    question: "它由哪些部分组成？",
    detail: "模块、依赖、窗口、对外提供的功能，用了什么技术。",
    depth: 0.63,
    commands: ["analyze-javascript-application", "inspect-managed-artifact", "inspect-android-package", "decode-android-resources", "inspect-macho", "inspect-signature", "inspect-binary-layout"],
  },
  { id: "deep", meters: 300, name: "深海", verb: "细节", question: "具体是怎么做的？", detail: "类和方法、反编译出来的代码。有些需要装分析引擎。", depth: 0.84, commands: ["inspect-managed-members", "analyze"] },
  { id: "abyss", meters: 1000, name: "海底", verb: "理解", question: "用大白话讲给我听", detail: "把整份报告交给你常用的 AI，让它解释给你。", depth: 1, commands: [] },
];

/** First-run walkthrough. The last slide's choices are wired up in app.js. */
export const ONBOARDING = [
  {
    icon: "scan",
    title: "欢迎使用 REA 工作台",
    body: [
      "这个工具能帮你「看懂」电脑和手机上的软件是怎么做出来的：它由哪些部分组成、用了什么技术、有哪些功能。",
      "就像把一台收音机拆开看看里面的零件——不过我们只「看」，不「动」。",
    ],
  },
  {
    icon: "shield",
    title: "放心用，它很安全",
    checks: ["只读取文件，不会运行被分析的软件", "全程在你自己的电脑上进行，不会上传任何文件", "不会修改或损坏你的软件"],
    note: "请只分析你自己的软件，或你有权研究的软件。",
  },
  {
    icon: "down",
    title: "像潜水一样，一层层往下看",
    steps: [
      ["水面：认出它是什么", "选一个软件，工作台先看它是什么类型的文件"],
      ["往下潜：看清它的组成", "每深一层，报告就多回答一个问题，全部用中文写"],
      ["到达海底：交给 AI", "看不懂的地方，一键复制给豆包、Kimi、DeepSeek，让它讲给你听"],
    ],
  },
  {
    icon: "compass",
    title: "先从哪里开始？",
    body: ["推荐先跟着示例潜一次，30 秒就知道这个工具能告诉你什么。"],
    choices: true,
  },
];

/** Home-page task cards. */
export const TASKS = [
  { id: "sample", icon: "specimen", title: "先看个示例", desc: "30 秒了解能得到什么样的报告", badge: "推荐新手" },
  { id: "desktop", icon: "monitor", title: "看看电脑上的软件", desc: "从你装过的软件里挑一个，比如 VS Code、钉钉" },
  { id: "phone", icon: "phone", title: "看看手机 App", desc: "分析安卓 App 的安装包（APK）" },
  { id: "mine", icon: "box", title: "检查我自己做的安装包", desc: "发布前看看有没有多余的文件" },
  { id: "ai", icon: "spark", title: "让 AI 帮我分析", desc: "把结果交给豆包、Kimi，或接入 AI 编程工具" },
];

/** 新手教程 chapters. Each block is a paragraph string, or { steps: [...] }, or { tip }, or { warn }. */
export const LESSONS = [
  {
    icon: "info",
    title: "这个工具是干什么的？",
    blocks: [
      "你有没有好奇过：某个软件的某个功能是怎么做出来的？它用了什么技术？它会偷偷联网吗？",
      "REA 工作台能在没有源代码的情况下，读取软件本身，告诉你它的组成、用到的技术、对外提供的功能、写在代码里的网址等等。这种做法叫「逆向分析」。",
      { tip: "你不需要懂编程。看不懂的地方，点报告里的「看不懂？让 AI 解释」，把结果交给你常用的 AI 就行。" },
    ],
  },
  {
    icon: "specimen",
    title: "第一次使用：先看个示例",
    blocks: [
      "我们准备了一个小小的「笔记软件」作为示例，用来演示报告长什么样。",
      { steps: ["回到「首页」", "点「先看个示例」", "等几秒，往下翻就能看到报告"] },
      "报告最上面那一句话就是总结；下面的灰色小方块是关键数字；再往下是详细内容，可以点开或收起。",
    ],
    action: { label: "现在就看示例", task: "sample" },
  },
  {
    icon: "monitor",
    title: "怎么分析电脑上的软件？",
    blocks: [
      "最简单的方法：在首页点「看看电脑上的软件」，工作台会列出你电脑里可以直接分析的软件，点一下名字就开始。",
      "如果列表里没有你想要的软件，需要先找到它装在哪个文件夹：",
      { steps: ["在桌面上找到这个软件的图标", "鼠标右键点它，选「打开文件所在的位置」", "这时打开的文件夹就是它的安装位置", "回到工作台，点「选择文件夹」，选中这个文件夹"] },
      { tip: "图标在开始菜单里？在开始菜单里右键点软件名 → 更多 → 打开文件位置，会打开一个快捷方式，再右键快捷方式 → 打开文件所在的位置。" },
      { tip: "苹果电脑：软件都在「访达 → 应用程序」里。" },
    ],
    action: { label: "去看电脑上的软件", task: "desktop" },
  },
  {
    icon: "phone",
    title: "怎么拿到手机 App 的安装包（APK）？",
    blocks: [
      "安卓 App 的安装包是一个以 .apk 结尾的文件。常见的拿法有三种：",
      { steps: ["在电脑浏览器里打开 App 的官网，很多官网有「安卓下载」按钮，下载得到的就是 APK", "用安卓模拟器（如 MuMu、雷电）安装 App 后，在模拟器的文件管理里导出", "手机用数据线连电脑，配合「分析引擎」里的 ADB 导出（适合进阶用户）"] },
      "拿到 APK 后，在首页点「看看手机 App」→「选择 APK 文件」。",
      { tip: "想看到 App 申请了哪些权限、有哪些页面，需要先在「分析引擎」里一键安装 JADX（免费，约 40 MB）。" },
      { warn: "苹果手机的 App（ipa）从 App Store 下载时是加密的，普通用户几乎拿不到能分析的版本。" },
    ],
    action: { label: "去分析手机 App", task: "phone" },
  },
  {
    icon: "learn",
    title: "怎么读懂报告？",
    blocks: [
      "每份报告都由这几部分组成：",
      { steps: ["一句话总结：最重要的结论", "关键数字：灰色小方块，比如有多少个文件、多少个功能", "详细内容：表格和列表，点标题可以展开或收起", "需要知道的局限：分析的边界，比如「没有运行软件，所以看不到运行时的行为」", "下一步：可以继续深入的分析，点一下就开始"] },
      "报告里带虚线下划线的词可以点开，看它是什么意思。",
      { tip: "Electron 软件的报告里，最值得看的是「主进程提供的功能」——每一行通常对应软件的一个功能。" },
    ],
  },
  {
    icon: "spark",
    title: "怎么让 AI 帮我解释？",
    blocks: [
      "方法一（最简单，推荐）：用网页版 AI。",
      { steps: ["在报告上方点「看不懂？让 AI 解释」", "工作台会把报告整理好并复制下来", "打开豆包、Kimi、DeepSeek 或通义千问的网页", "在输入框里按 Ctrl+V 粘贴（苹果电脑按 ⌘+V），然后发送", "接着问它任何问题，比如「这个软件的登录功能大概是怎么做的？」"] },
      "方法二（进阶）：如果你在用 Trae、Cursor、通义灵码这类 AI 编程工具，可以在「接入 AI 工具」页一键接入。接入后直接对 AI 说「帮我分析某某软件」，它会自己调用 REA。",
    ],
  },
  {
    icon: "engines",
    title: "「分析引擎」要不要装？",
    blocks: [
      "大部分情况不用装。分析 Electron 电脑软件、.NET 程序、各种安装包，开箱即用。",
      { steps: ["想看安卓 App 的权限和代码 → 装 JADX 和 Apktool", "想看普通 exe 程序的内部代码 → 装 Ghidra（比较大，约 450 MB，读起来也有门槛）", "想连接手机 → 装 ADB"] },
      "所有免费引擎都能在「分析引擎」页一键安装，不会改动你的系统设置。",
    ],
  },
  {
    icon: "compass",
    title: "常见问题",
    blocks: [
      { q: "会不会弄坏我的软件或电脑？", a: "不会。工作台只读取文件，不运行、不修改被分析的软件。" },
      { q: "会把我的文件上传到网上吗？", a: "不会。分析全部在你自己的电脑上完成。只有你主动点「复制给 AI」并粘贴到 AI 网站时，报告内容才会发给那个 AI。" },
      { q: "为什么有些内容是英文？", a: "工作台已经把常见内容翻译成中文，少数专业说明保留了英文原文（标有「原文」）。看不懂可以交给 AI 翻译解释。" },
      { q: "分析失败了怎么办？", a: "报告会说明原因。如果提示需要某个引擎，点「去安装引擎」即可；其他错误可以点开「原始错误信息」，复制给 AI 帮你看。" },
      { q: "这样做合法吗？", a: "研究自己的软件、做兼容和安全研究一般没有问题；但不同软件的用户协议和不同地区的法律可能有限制。请不要用它破解收费功能、制作外挂，或照搬别人的代码和素材。" },
      { q: "怎么彻底删除工作台？", a: "删除工作台所在的文件夹，以及用户目录下的 .rea-workbench 文件夹即可。如果接入过 AI 工具，先在对应页面点「断开」。" },
    ],
  },
];

/** Where beginners paste a copied report. */
export const WEB_AIS = [
  ["豆包", "https://www.doubao.com/chat/"],
  ["Kimi", "https://kimi.moonshot.cn/"],
  ["DeepSeek", "https://chat.deepseek.com/"],
  ["通义千问", "https://tongyi.aliyun.com/qianwen/"],
];
