# Windows 最小可运行版本 v0.1.1

完整解压 REA-Workbench-v0.1.1-win-x64.zip，双击“启动 REA 工作台.bat”。这是 Windows x64 免安装包，使用本机浏览器作为界面。首次启动不需要安装 Node.js、Python 或登录 AI。

已包含笔记示例分析、中文报告、新手/专业、像素/简洁、AI 练习说明书、HTML 粘贴预览与保存、Unity PNG 与 OBJ 导出。Unity 读取器限制为小型自包含资源包；大型游戏、完整工程、骨骼动画恢复不在本版已验证范围。

运行时：Node.js 24.21.0、CPython 3.12.14、UnityPy 1.25.4。Python 使用相对、隔离的搜索路径，不依赖打包机器上的虚拟环境。许可证和第三方依赖说明随包保留。数据保存在解压目录的 data / exports 文件夹；复制成果需要保留整个应用目录。

最小包保留 ArtCraft、游戏案例和模型 Mod 的介绍、来源及入口；较大的上游源码和测试素材需要另行下载。分析按钮会按本地源码是否存在显示可用状态。

## 可选样本下载

在解压目录打开 PowerShell：

- ArtCraft 源码：powershell -File scripts/prepare-artcraft.ps1
- 四个游戏 / Mod 源码：powershell -File scripts/prepare-game-sources.ps1
- Unity 官方测试资源：powershell -File scripts/setup-unity.ps1 -PythonExecutable runtime/python/python.exe

Unity 官方样本不随发布包分发；下载来源、固定提交和哈希保存在 samples/unity。外部 AI、分析引擎安装和可选源码下载需要网络。接入 AI 客户端仍由用户在界面发起，本包不预置账号、API key 或接入配置。

## 从源码构建

需要 Node 与一份可再分发的 CPython 3.12 环境，按 docs/unity/README.md 安装项目 UnityPy。运行：

```powershell
pwsh scripts/build-desktop.ps1 -PythonBase 'C:/实际Python目录'
```

默认不包含大型游戏、ArtCraft 源码。可用 -IncludeGameSources / -IncludeArtcraft 增大包的示例范围。构建输出 ZIP 与 SHA-256 文件。启动与分析验证脚本为 scripts/test-desktop.mjs。

## 预告测试版（demo）v0.2.1

比特镇 · 侦探事务所的序章第一幕，主线约 1 小时：序章、三份委托（小林的记账软件、朵朵的存档、小雨的计算器）、结案徽章、中场线索和正式版预告。三份委托都是能走进去的解谜关卡：勘查房间、自己搜代码、填推理板、在沙盒里动手实验、当面对质。

主线只讲基础；每份委托结案后会解锁委托人的**传说任务**，讲更深一步的实际应用，用和主线不同的玩法，不做也不影响主线（任务分层见 docs/quest-tiers.md）：

- 小林：主线用行为监视器「抓现行」；小林传说 · 防火墙值班（节奏游戏三轮，AI 助手小克第二轮帮忙、第三轮说错）。
- 朵朵：主线用存档编辑器「改存档」；朵朵传说 · 谁说了算（《种田日记》联网版：每样数据放本地还是服务器，上线两周看结果）。
- 小雨：主线核对五条传言；小雨传说 · 发布前夜（以开发者身份决定留哪些彩蛋、删哪些后门）。

关与关之间、同一个小游戏的难度段之间都有对话，难度跟着开局选的「零基础 / 学过一点 / 有基础」走。三个案子各留下一条主线线索（悄悄统计、每晚 23:58、钟楼），结局第一次把它们摆到一起。样本代码在隔离的沙盒框架里运行；不含 Python，也不需要联网或安装分析引擎。

```powershell
pwsh scripts/build-desktop.ps1 -Demo
node scripts/test-demo.mjs dist/BitTown-Detective-Demo-v<版本>-win-x64.zip
```

测试脚本会在 dist/test-demo 里解压、用包内的 Node 以 demo 模式启动（用户目录都指向测试文件夹），并用包内样本真跑三个案例，核对每条线索和质疑，以及每个动手实验需要的样本文件都在包里。玩家解压后双击「开始游戏.bat」即可。开发时可以在网址后加 `?demo` 预览。
