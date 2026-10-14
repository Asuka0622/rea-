# Unity 资源真实测试

当前版本已接入 **小型、自包含 Unity 资源包** 的读取和贴图导出。工作台根据文件签名识别 UnityFS / UnityRaw / UnityWeb，通过项目内的 UnityPy 环境读取真实对象，生成带来源的参数表、PNG、OBJ 和 JSON 证据。它不是完整游戏还原器。

## 已验证样本

- 来源：[UnityPy 官方仓库测试目录](https://github.com/K0lb3/UnityPy/tree/417d59522a998fdee9a9c2b29fe35f3063222457/tests/samples)，固定提交 `417d59522a998fdee9a9c2b29fe35f3063222457`。
- `atlas_test` 二进制样本：76,771 字节。下载后按上游 Git LFS 记录校验 SHA-256；完整来源保存在 `samples/unity/SOURCE.json`。
- 识别 UnityFS、Unity 2018.4.11f1；读取 10 个对象：7 个 Sprite、1 个 SpriteAtlas、1 个 AssetBundle、1 个 Texture2D。
- 导出 1 张 PNG；序列化字段 `m_Width = 1024`、`m_Height = 512` 与 PNG 文件头一致。Texture2D 的对象 ID 为 `602278551932518654`，以字符串保存以免丢失精度。
- 这是上游测试资源包；没有测试商业游戏或把资源宽高当成生命、伤害、天气参数。

## 在工作台试用

1. 首页展开“分析自己的文件或文件夹”。
2. 输入 `D:\gpt\rea\samples\unity\atlas_test.bundle`，点击“分析”。
3. 新手报告显示真实读取结果，展开“查看专业细节与数据”查看对象清单、参数来源和输出路径；专业模式直接查看全部细节。
4. 输出保存在 `exports/unity/<独立编号>/`：`texture-1.png`、`evidence.json`、`report.md`。每次分析使用新目录，已有成果不会被覆盖。

输入和工具路径不会发送到外部 AI。点击复制仅写剪贴板；将报告粘贴给 AI 时，再自行选择模型服务。

## 工具安装与复现

本机已使用 CPython 3.12 和 UnityPy 1.25.4 完成实际测试，环境位于 `data/tools/unitypy/venv`。固定依赖在本目录 `requirements.txt`；不改系统 Python 或真实 AI 工作台配置。

另一台 Windows 电脑需要可用的 Python 3.12，然后在项目根目录运行：

```powershell
.\scripts\setup-unity.ps1 -PythonExecutable 'C:\实际安装位置\python.exe'
```

脚本从 PyPI 安装到项目隔离环境，下载固定版本测试样本并核对 SHA-256。单独运行读取器也可以：

```powershell
.\data\tools\unitypy\venv\Scripts\python.exe .\scripts\inspect-unity.py --input .\samples\unity\atlas_test.bundle --output .\exports\unity\my-first-run
```

直接运行时，输出目录必须尚不存在。工作台默认使用上述隔离环境；部署者可通过环境变量 `REA_UNITY_PYTHON` 指定另一份已安装 UnityPy 的 Python。

## 当前范围

输入上限 32 MiB，只读一个自包含资源包；最多展示 1,000 个对象、100 项资源参数，导出 4 张不超过 16M 像素的 Texture2D，以及 4 个不超过 50,000 顶点 / 100,000 三角形 / 8 MiB 的 OBJ。未加载目录外的分离资源文件；其他对象只盘点，不承诺完整读取。OBJ 保留几何与可用 UV/法线，X 轴取反并反转三角形顺序；不包含骨骼、动画、材质连接或场景对象变换。单次工具进程上限 120 秒，用户可以停止。损坏资源会报告失败或具体未完成项。

UnityPy 是第三方二进制解析器；大小和时间限制不构成面向任意恶意输入的完整安全隔离。游戏代码不被执行，但解析器及图像解码器会运行。

本轮尚未接入音频转换、IL2CPP / Mono 脚本分析、Unity 工程重建、Godot MCP 或游戏内修改验证。v0.1.1 最小发布包包含可迁移的 Python / UnityPy 运行时，不直接复制开发虚拟环境；官方二进制测试样本需另行下载。

## 官方工具资料

- [UnityPy](https://github.com/K0lb3/UnityPy)：本轮实际使用的资源解析库。
- [AssetRipper](https://github.com/AssetRipper/AssetRipper)：后续工程导出候选；当前未安装或测试。
- [Il2CppDumper](https://github.com/Perfare/Il2CppDumper)：后续类型与字段分析候选；DummyDll 不包含完整方法实现，当前未安装或测试。
- [vgmstream](https://github.com/vgmstream/vgmstream)：后续音频转换候选；当前未安装或测试。

二进制样本和导出的素材不纳入 Git。本轮只用其验证解析能力，不能据此宣称拥有或可发布样本中的美术素材。

## 本次验证记录（2026-10-14）

最近一次网页分析输出：[真实报告](../../exports/unity/f6630a7b-2547-4ab4-aa5c-e639ebbc9873/report.md)、[参数证据](../../exports/unity/f6630a7b-2547-4ab4-aa5c-e639ebbc9873/evidence.json)、[导出 PNG](../../exports/unity/f6630a7b-2547-4ab4-aa5c-e639ebbc9873/texture-1.png)。PNG 为 173708 字节，SHA-256 为 d22fc287cb2cf89132682f79aa7efc96060303990a0bf73969574e9994bf4c31。解析没有未完成项。

完整自动测试 56/56 通过，0 失败、0 跳过；资源练习边界修正后，相关 15/15 测试再次通过。Unity 测试中的二进制集成项需要上述隔离环境与已下载样本；在未配置环境的机器上明确跳过，不伪造通过。Node 语法、PowerShell 安装脚本语法与 diff 格式检查通过。

网页流程：本机路径输入 → 真实分析 → 新手报告 → 展开专业细节 / 切换专业模式。内置浏览器 1117px 桌面、390px 手机页面无横向溢出，报告显示完整对象 ID 和 m_Width / m_Height 来源。Browser 插件技能未提供，使用已有 CUA 内置浏览器的 Playwright API；未安装额外浏览器依赖。

| 检查 | 结果 |
|---|---|
| 页面 URL 和标题 | 127.0.0.1:7321 / REA 工作台，通过 |
| 非空内容 | Unity 报告与参数可见，通过 |
| 框架错误页 | 未发现，通过 |
| 控制台 | 无错误或警告，通过 |
| 截图 | 桌面及手机报告已保存到当前会话验证目录 |
| 实际交互 | 本机输入、真实分析、细节展开、模式切换通过 |

这是网页工作台扩展，尚未注册为上游 REA MCP 的新工具。AI 可阅读导出的证据或使用脚本命令行；本轮没有自动调用外部 AI 或连接实际 AI 工作台。

## 第二轮：Mesh → OBJ（2026-10-14）

在首页输入 D:\gpt\rea\samples\unity\mesh_test.bundle 后点击“分析”。本轮新增真实 Mesh 导出，输出 mesh-1.obj，并记录顶点、三角形、UV、法线、坐标转换、边界、资源对象 ID 和 SHA-256。新手摘要、专业报告和 Markdown/JSON 证据同步显示。

固定版本上游样本 xinzexi_2_n_tex 为 634,283 字节，Unity 2017.4.37f1；真实读取 4 个对象，导出 1 个 OBJ（724 顶点、362 三角形、724 UV、0 法线）与 1 张 2048 × 976 PNG，提取 17 项资源字段。网格所有 Z 坐标均为零，是平面网格；本轮没有验证带骨骼的三维人物。来源及参考 OBJ 的校验信息见 samples/unity/MESH-SOURCE.json。

几何位置、UV 和三角形顶点顺序逐项与上游参考一致。上游 OBJ 带有不存在的法线索引，因此本实现采用合法的 v/vt 面格式，不复制这些缺失法线引用。纯几何测试覆盖 UV/法线缺失、非法索引、非有限坐标、通道数量不一致及空/超限几何。OBJ 未在 Blender/Unity 编辑器中导入，未还原材质或场景变换。

旧报告没有 meshExports 时仍按 0 个 OBJ 展示；原贴图样本的提取结果保留。安装脚本同步下载两个资源包和参考文件，并核对三个 Git LFS SHA-256。

第二轮网页输出：[OBJ 网格](../../exports/unity/3817a990-2774-446d-bdcc-c2984a896740/mesh-1.obj)、[实测报告](../../exports/unity/3817a990-2774-446d-bdcc-c2984a896740/report.md)、[参数证据](../../exports/unity/3817a990-2774-446d-bdcc-c2984a896740/evidence.json)。OBJ 为 38630 字节，SHA-256 66d6362464dff16ec68b743cd8ae2261fc721fc0558d29902cc6e852e9a14445；无未完成项。

验证：59/59 完整自动测试通过，0 失败、0 跳过。最后将依赖加载限制在资源包内部后，相关 12/12 测试再次通过；其 Python 测试还覆盖外部文件依赖拒绝。已安装第三方解析库使用内存文件系统，加载器拒绝文件路径依赖；这限制了本轮资源来源，但不构成任意恶意二进制的安全沙箱。

浏览器：首页输入 mesh_test.bundle → 分析 → 新手/专业报告 → 展开 OBJ 数据 → 核对数量、来源和等价命令。1117px 桌面、390px 手机无页面横向溢出，数量组合不拆行；页面非空、无错误页，控制台无警告或错误。使用现有 CUA 浏览器 Playwright API，未安装额外浏览器依赖；截图保存在当前会话验证目录。等价命令已改为项目内实际 Python 读取器，不再虚构上游 rea 子命令。
