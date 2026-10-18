# 交接提示词：比特镇·人工智能篇（复制给下一位即可接手）

> 用法：把下面整段复制给接手的 AI（或开发者），它自包含——不需要读历史聊天。

---

## 你在接手什么

「比特镇·人工智能篇」——一个**纯前端、无构建**的像素教学 RPG（序章 demo 已可完整玩通）。玩家扮演小侦探路米，在小镇上接委托、进现场、用小游戏破案，学的是 REA 的基础动作：静态读代码、数据流向、权限与声明、编码≠加密、版本对比、加壳混淆……。

- 仓库：GitHub `Asuka0622/rea-`，本地 `D:/gpt/rea`，工作分支 **`codex/art-cloud-handoff`**
- 技术形态：`server.mjs` + `public/*.js`（ES module，无打包器）；美术在 `public/art/pixel/`，另一条工作线在并行产出美术与需求文档

## 怎么跑、怎么验（纪律，先读这个）

1. 起服务：`node server.mjs` → 游戏在 **`http://127.0.0.1:7321/?demo`**（端口是 7321，不是 7411）
2. 回归：`npm test` → 当前 **187/187 全过**。任何改动后必须全绿才算完
3. 实机验证：无头 Chrome 的 CDP 在 **9333** 端口。`.sandbox/*.mjs` 里有一批现成的验证脚本（`takechannels.mjs`、`boardcheck.mjs`、`london-check.mjs`……），都是同一个套路：连 CDP → `Runtime.evaluate` 驱动页面 → 截图 → 断言。写新验证照抄一个改
4. **推送只能走 SSH**（HTTPS 443 被网络层完全阻断）：`git push git@github.com:Asuka0622/rea-.git codex/art-cloud-handoff`。推送前先 `git fetch` 确认没有分叉
5. 仓库里有**另一条美术工作线并行提交**，提交前 `git status` 看清楚，只 add 你改的文件；锁文件/大图别误提交

## 架构速查（哪些文件管什么）

- `public/game-shell.js`（~2400 行）：大本营。小镇移动、对话 `say()`、菜单 `showMenu()`、HUD、委托板 `openQuestBoard()`、委托人对话 `talkToClient()`、世界遭遇 `checkEncounters()`、demo 结局演出。调试钩子 `window.__game`（`go(region)`、`enter(spot)`、`player`）是实机验证的抓手
- `public/prologue-quests.js`：七份委托的**数据**。每个委托带 `discover`（怎么听说）和 **`take`（怎么接：board / talk / encounter）**——这是刚做完的核心设计
- `public/quest-progress.js`：进度存取。三态：`discovered`（听说过）→ `accepted`（接了没做完，左上角追踪条用它）→ `completed`
- `public/quest-board.js`：纯规则（无界面）。`questState` 判定 available/locked/undiscovered/done，前置只有 `after` 和 `knowledge:L几` 两种
- `public/npc-chatter.js`：镇上 NPC。前六位是闲聊+传闻；后三位（朵朵/王奶奶/老秦）是**委托人本人**，带 `quest` 字段
- `public/case-minigames.js` + `case-labs.js`：七种小游戏（塔防/经营/卡牌/节奏/管道/找不同/审讯），`mountLab` 契约，`hasMiniArt` 有图用图、无图代码兜底
- `samples/cases/*/workbench-case.json`：每个案件的内容（台词、知识点标注、小游戏参数）
- 文档：`docs/quest-board.md`（委托设计）、`docs/knowledge-depth.md`（**深度分配表，下一步照它做**）、`docs/art/asset-requirements.md`（美术需求，第 9 节是 12 位 NPC 待画）、`PROGRESS.md`（进度日志，做完事要写）

## 刚完成的事（上一轮）

**任务接取渠道三分类**（参考原神：不是所有任务都在委托板接）：
- `board`（3 份）：小林/阿哲/周姐——只有这三份贴在事务所软木板上
- `talk`（3 份）：朵朵/王奶奶/老秦**本人站在镇上**（住宅区/住宅区/中心广场），走过去当面开口，对话后二选一「接下/先不接」，接了直接进现场
- `encounter`（1 份）：小雨的计算器——先听小石头提过，再走到她家门口，「叮」的一声事情自己撞上来
- 配套：左上角**追踪条**（`game-quest-track`，接了没做完的一直挂着，点一下回现场，进案发现场自动隐藏）；委托板新增「进行中」栏，板头会提示「还有 4 件事不在这块板上」
- 已实测：`node .sandbox/takechannels.mjs 9333 http://127.0.0.1:7321` 全链路通过；截图在 `.sandbox/take-*.png`

## 当前待办（按建议优先级）

1. **深度（最大的欠账）**：12 个知识点全部停在 L2「说得出」，0 个到 L3「做得出」，无复现。`docs/knowledge-depth.md` 有现成分配表：让每份委托的主点真的动手做一遍 + 挑 2 个点在支线里换样本二刷（硬编码密钥→铁叔工具铺发布检查；权限与声明→小卖部小程序）
2. **序章叙事收尾**：周姐时间线 → 线索墙 → 守夜 → 钟楼段落重排（`stakeout.png`、`town-argument.png` 两张插画已交付还没接进流程）
3. **美术侧交接**：`docs/art/codex-cloud-handoff.md` 里挂着返工清单（`london-1843` 底部留空、`weather-keys` 六张奇数尺寸、`anim-kobayashi` 挠头补帧、秋实缺 happy 头像、`public/art/portraits/` 27 张无引用待归档）；`docs/art/asset-requirements.md` 第 9 节的 12 位 NPC 精灵表全部未开工（先画 P1 六位：老周/阿康/小石头/老陈/小铃/老宋，16×32、行序 待机2/下4/上4/侧4/说话2、脚底对齐、透明底，到位后把 `npc-chatter.js` 的 look 换成 sprite 即可）
4. **委托板小尾巴**：「已接」状态的高亮、物件来源（object:xx）、推荐标记（`recommendQuests` 已写好没用上）
5. 镇上的委托人 NPC（朵朵/王奶奶/老秦）目前还是占位小圆点，等第 9 节精灵表

## 陷阱与约定（踩过的坑）

- `h()` 会把 `null` 子节点当文本渲染成 "null"——用展开数组 `...(cond ? [x] : [])` 代替 `cond ? x : null`
- 像素美术规格：2 倍密度（**偶数尺寸**）、满幅 1280×720、透明底、图里不写可读文字；审计脚本 `.sandbox/fullaudit.mjs` / `artaudit.mjs` 可全量扫
- 存档 key：`rea-quest-progress`（进度）、`rea-npc-talked`（聊天）、`rea-workbench-case-stars`（星级→工具）。测试里用 fakeStorage 注入
- 改 JSON 数值小心把 `1.0` 变成 `1`；提交信息里有反引号会被 shell 吃掉，用 `-F 文件` 传
- 中文文案优先；对白要有称呼差异（王奶奶叫玩家「闺女」）；每个小游戏都必须有「不会也过得去、会了更快」的难度自适配思路

从待办第 1 条（知识深度 L3 + 复现）开始。先读 `docs/knowledge-depth.md` 的分配表再动手。
