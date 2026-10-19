# 交接提示词：比特镇·人工智能篇（复制给下一位即可接手）

> 用法：把下面整段复制给接手的 AI（或开发者），它自包含——不需要读历史聊天。2026-10-19 重写（旧版的端口、测试数、待办都过时了）。

---

## 你在接手什么

「比特镇·人工智能篇」：一个**纯前端、无构建**的像素教学 RPG。**玩家扮演路米**（开场可选女生或男生），刚开张的侦探事务所的主人，和搭档小克一起查清六个可疑软件，证据指向停在 11:58 的钟楼。现在的网页版是测试版；对外发的是**预告版 = 整个序章**。

**先读 `docs/roadmap.md`**：网页版做完预告版就冻结；正式版迁移到专业游戏引擎，NPC 接本地极小轻量文本模型，动画升级成 CG 过场，人物、地图、建筑由引擎渲染。现状和文档索引在 `docs/handoff.md`。

- 仓库：GitHub `Asuka0622/rea-`，本地 `D:/gpt/rea`，工作分支 `codex/art-cloud-handoff`，推到 `main`（`git push origin HEAD:main`）
- 技术形态：`server.mjs` + `public/*.js`（原生 ES 模块，无打包器）；美术在 `public/art/`，另一条工作线在并行产出美术、需求文档和代码

## 怎么跑、怎么验（纪律，先读这个）

1. 起服务：`node sandbox.mjs --port 7321`（沙箱，用户目录都指向 `./.sandbox`；**不要对真实用户目录跑 REA 安装**）。端口被占会顺延。预告版地址加 `?demo`，调试加 `&debug`（`window.__game` 有 `enter`、`play`、`skipTime` 等钩子）
2. 回归：`npm test`，改完必须全绿
3. 提交前 `git status` 看清楚：**另一条工作线经常有暂存但没提交的文件**，只提交你自己的改动，别替它提交

## 网页版收尾（按顺序）

见 `docs/roadmap.md` 第 1 节：

1. **修打包**：NPC 对白模块已提交（2026-10-19）；还要给 `scripts/test-demo.mjs` 加「所有模块都能加载」的检查（现在的自检只查页面和接口）
2. 完整试玩一遍序章，记下卡点
3. 一页预告版说明（`RELEASE.md` 顶部还是旧的工作台说明）
4. 重新打包、自检、发布
5. ~~把旧主线从网页版摘掉~~ 已完成（2026-10-19），去向见 `docs/series.md` 第 4 节

## 素材接入机制

- **一条命令看现状**：`npm run wiring`（`scripts/art-wiring.mjs`）。它扫 `public/art/`，分三档报：已接线 / 数据驱动（`minigames/`、`regions/`、`case-props/` 等目录，文件进目录就由 `has()`/`artBg()` 拾取）/ **孤儿**。孤儿必须是 0。
- **新素材到位**：放进 `public/art/pixel/<子目录>/` 或 `public/art/faces/` → 跑 `npm run wiring` → 孤儿仍为 0 就自动生效。
- **男版路米**：文件名把 `lumi` 换成 `lumi-m` 放进同一目录，`public/lumi-look.js` 自动识别，没交的那张继续用女版。
- **候选不接入**：`docs/art/review/` 下的图是候选，验收前不进 `public/art/`。九区地图的旧扩区候选已经判不通过并删掉了（`docs/art/map-expansion-qa.md` 开头）。
- **立绘不进部署**：游戏只用 `faces/*.webp` 小头像；立绘源图在 `docs/art/portraits-archive/`。
- **跨分支素材**：美术常驻在另一个工作树 `D:/gpt/rea-artwork`。那边是源分辨率，不能直接拷进 `public/art/`，要用 `scripts/convert-artwork-sprites.py` 和 `scripts/crop-artwork-faces.py` 转换，转完跑 `npm run wiring`。

## 音频接线（2026-10-19 建立）

需求与清单：**`docs/audio/audio-requirements-2026-10-19.md`** + **`docs/audio/audio-cues.csv`**（27 项：8 背景音乐 / 5 短音乐 / 6 环境声 / 8 待补音效）。现有 `public/game-sound.js` 的 14 种合成音效保留。

- **`npm run wiring` 现在跑两条**：先美术（`scripts/art-wiring.mjs`），再音频（`scripts/audio-wiring.mjs`）。音频那条以 CSV 为唯一清单源，分五档报：已接线 / 已交付待接 / 待审试样 / 待制作 / 孤儿。**孤儿必须是 0。**
- **交付路径约定**：
  - 待审试样 → `docs/audio/review/<id>-review.wav`（**不入库**，已加 `.gitignore`）
  - 通过后的母版 → `docs/audio/master/<id>.wav`（不进打包产物）
  - 运行压缩版 → `public/audio/{music,stingers,ambience,sfx}/<id>.ogg|mp3`（这个才进部署）
  - 每首附同名 sidecar JSON：id / version / use / seconds / bpm / loopStartSample / loopEndSample / hasIntro / hasTail / source / license
- **播放层还没接线**：`public/` 里没有 BGM 切换、环境声或短音乐调度。需求文档第 8 节的 7 条播放规则全是待办，不能当已完成。
- **首批试样已体检**：`docs/audio/review/bgm-town-day-review-report.md`。小镇白天曲时长 85.33 秒达标，但**尾部有约 0.65 秒淡出，不能直接无缝循环**；响度 -15.0 LUFS、LRA 1.0 LU 偏响偏平。已给出返修要求，暂不入库。

## 陷阱与约定（踩过的坑）

- `h()` 会把 `null` 子节点渲染成文字 "null"：用 `...(cond ? [x] : [])` 代替 `cond ? x : null`
- 像素美术：偶数尺寸、透明底、图里不写可读文字
- 改 `samples/cases/*/workbench-case.json` 会让该委托的进行中存档失效（按内容哈希校验）；没上线前可以接受
- 改 JSON 数值小心把 `1.0` 变成 `1`；提交说明里有反引号会被 shell 吃掉，用 `-F 文件` 传
- **台词不分性别**：路米可男可女，称呼用「孩子」「路米」，不用「闺女」「小伙子」这类词
- **路米的台词是路米自己的话**：指路、教操作、提示交给小克；不要再写「你愿意当我的助手吗」这种路米对玩家说的话
- 每个小游戏都要「不会也过得去、会了更快」
- **季节固定秋天**（2026-10-19 用户定）：不做季节系统，美术不出春夏冬版本；代码里是 `public/prologue-clock.js` 的 `SEASON`，季节放到正式版
