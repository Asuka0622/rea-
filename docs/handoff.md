# 交接说明：比特镇 · 人工智能篇的现状

> 2026-10-19 重写（原 10-15/10-16 版的状态表和 Godot 迁移计划已过时，删掉了；要看旧版去 git 历史）。
> **后续做什么，看 `docs/roadmap.md`**：网页版做完预告版就冻结；正式版迁移到专业游戏引擎，NPC 接本地极小轻量文本模型，动画升级成 CG 过场，人物、地图、建筑由引擎渲染。

## 1. 这是什么

比特镇系列的第一部，只讲人工智能（`docs/series.md`、`docs/concept.md`）。现代的比特镇，钟楼停在 11:58。**玩家扮演路米**——刚开张的侦探事务所的主人（开场可选女生或男生）——和搭档小克一起，用逆向分析查清六个可疑的软件，证据指向钟楼；打开钟楼后坐时光机回到 1843 年，沿着 AI 的历史一路走回今天。

现在的网页版是**测试版**，对外发的是**预告版 = 整个序章**（约 2 小时）。正式版另起引擎重做（`docs/roadmap.md`）。

古代中国（汴京）一站留给系列后面的「计算史」那一部（`docs/archive/era-china.md`），已经画好的美术保留。

## 2. 剧情和设计文档

| 想知道 | 看哪里 |
|---|---|
| 后续路线、引擎、本地模型、CG 过场 | `docs/roadmap.md` |
| 序章逐场剧情（三幕、中场、中点、守夜、打开钟楼） | `docs/story-prologue.md` |
| 第一部主线（六个时代、终章、真相） | `docs/story.md` |
| 总设计 | `docs/concept.md` |
| 主线讲基础、传说任务讲应用 | `docs/quest-tiers.md` |
| 同一知识点分阶段、换玩法 | `docs/knowledge-depth.md` |
| 委托怎么接（委托板 / 当面 / 撞上） | `docs/quest-board.md` |
| 六个委托的玩法 | `docs/case-mechanics.md`、`docs/minigame-genres.md` |
| 结业报告 | `docs/graduation-report.md` |
| 九区地图（定版数据） | `docs/world/town-v2-plan.json`、`docs/world/town-v2-layout.png`、`docs/art/map-expansion-qa.md` 开头 |
| NPC 生活和情境对白 | `docs/world/npc-life-design-2026-10-18.md`、`docs/npc-behavior.md` |
| 美术需求和验收 | `docs/art/asset-requirements.md`、`docs/art/art-team-master-2026-10-18.md` |

## 3. 代码地图（网页版）

无构建步骤：`server.mjs` + `public/*.js`（原生 ES 模块）。

| 文件 | 管什么 |
|---|---|
| `public/game-shell.js` | 游戏外壳：小镇移动、对话、房间、委托板、结局演出、调试钩子 `window.__game`（地址带 `?debug`） |
| `public/game-quests.js` | 任务数据和进度；`DEMO_QUEST` 是预告版的序章流程，`caseReachable` 让委托按幕开放 |
| `public/prologue-scenes.js` | 守夜、打开钟楼两场大戏的演出脚本（也是将来 CG 过场的分镜底稿） |
| `public/prologue-clock.js` | 两个钟：小镇时间和钟楼的 11:58 |
| `public/story-fx.js`、`public/game-director.js` | 对白里的屏幕特效；演出脚本的执行器 |
| `public/lumi-look.js` | 路米的样子（女生 / 男生），男版的图到一张用一张 |
| `public/case-session.js`、`public/case-labs.js`、`public/case-minigames.js` | 委托现场：勘查、搜代码、推理板、动手实验、对质 |
| `public/prologue-quests.js`、`public/quest-board.js`、`public/quest-progress.js` | 委托的发现、接取、前置 |
| `samples/cases/*/workbench-case.json` | 每个委托的内容：现场、线索、台词、实验、对质 |

## 4. 怎么跑、怎么验

- 起服务：`node sandbox.mjs --port 7321`（沙箱模式，用户目录都指向 `./.sandbox`；**不要对真实用户目录跑 REA 安装**）。端口被占会顺延。预告版地址加 `?demo`，调试再加 `&debug`。
- 测试：`npm test`。
- 打包预告版：在一个干净的工作树里跑 `scripts/build-desktop.ps1 -Demo`，再跑 `scripts/test-demo.mjs`。**注意**：现在的自检只查页面和接口，查不出模块缺失；第 5 节那一条修好之前不要发包。

## 5. 眼下的待办

见 `docs/roadmap.md` 第 1 节（网页版收尾的五件事）和第 7 节（里程碑）。NPC 对白模块已经提交（2026-10-19，e28c32b），打包的硬伤解除；下一步给 `scripts/test-demo.mjs` 加模块加载检查，再出包。

## 6. 协作约定

- 仓库 `Asuka0622/rea-`，本地 `D:/gpt/rea`，工作分支 `codex/art-cloud-handoff`，推到 `main`：`git push origin HEAD:main`。
- 有另一条工作线并行改同一批文件。提交前看清 `git status`，只提交自己的改动；别人暂存的文件不要替他提交（`docs/collaboration.md`）。
- 提交说明写清作者。中文文案优先；台词不分性别。
