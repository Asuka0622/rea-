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
