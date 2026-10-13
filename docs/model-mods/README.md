# 人物模型 Mod：工具与 MCP

核查日期：2026-10-13。从现有 Mod 的文件结构入手，学习替换贴图、修改网格和适配角色模型。工作台检查文件并整理 AI 任务；3D 编辑与导出在 Blender 中完成。

本次已核实来源并添加指南；未安装或连接任何外部 MCP，也未核验本机 Blender 版本。

## 制作阶段

1. **准备模型与现有 Mod**：确定要替换的目标角色，准备有权使用的模型或现有 Mod 的副本。先阅读作者说明，确认游戏、导入器与插件版本。
2. **检查文件结构**：在下方选择已解压的 Mod 文件夹。工作台盘点 INI、VB / IB / BUF 与 DDS 文件，检查静态 filename 引用是否存在。
3. **编辑外观与适配**：在 Blender 中修改网格、UV、材质与骨骼权重。只改贴图时可选 Krita；完整换人物需要检查分组、权重和动作变形。
4. **导出并核对资源**：使用与目标格式兼容的导出插件生成 Mod 文件；按需转换 DDS。重新检查导出目录，核对文件名、资源引用与贴图。
5. **预览与验证**：先在 Blender 中检查材质与姿态，再在适用的测试环境验证效果。工作台文件检查通过不代表游戏内兼容或动作正确。

## 工具与 MCP 来源

### Blender

改模型时必需。编辑网格、UV、材质和骨骼权重，检查动作变形。

- 发布方：Blender
- 工具来源：https://www.blender.org/download/
- MCP：已找到官方 MCP；https://www.blender.org/lab/mcp-server/

Blender Lab 官方项目。官方页面要求 Blender 5.1+，另装官方扩展与 MCP Server，并连接支持 MCP 的 AI 客户端；并非 Blender 内置功能。模型导出插件的版本需单独确认。

可通过 Blender Python API 操作场景；MCP 不会自动解决角色骨骼适配。

### 3DMigoto / GIMI Blender 插件

导入、导出游戏模型时必需。在 Blender 与 Mod 的网格缓冲区文件之间转换。

- 发布方：Mod 工具作者（非米哈游）
- 工具来源：https://github.com/SilentNightSound/GI-Model-Importer
- MCP：未找到作者官方 MCP

作者项目包含 Blender 导入导出工具和历史教程；旧教程标注过时，不能据此保证兼容 Blender 5.1+ 或当前游戏。MCP 和模型格式插件是两种不同的扩展。

可考虑通过 Blender API 调用插件暴露的操作，须先核对实际插件与导出格式。

### XXMI Launcher / GIMI

在对应游戏中加载时需要。管理对应游戏的模型导入器与 Mod。

- 发布方：SpectrumQT 与 GIMI 维护者（非米哈游）
- 工具来源：https://github.com/SpectrumQT/XXMI-Launcher
- MCP：未找到作者官方 MCP

GIMI 旧仓库已建议使用 XXMI。已核对作者 README 与相关搜索，未发现公开官方 MCP；不是对所有社区实现的穷尽结论。

本工作台提供作者入口与文件检查；加载器仍需按作者文档配置。

### Krita

改贴图时可选。绘制颜色、图案与纹理；也可用其他图像编辑器。

- 发布方：Krita
- 工具来源：https://krita.org/en/download/
- MCP：找到社区 MCP，未核实官方 MCP；https://github.com/SanSaSane/krita-mcp

SanSaSane/krita-mcp 是社区作者项目，提供文档、图层、绘制和导出工具；README 要求 Krita 5.2+ 与 Python 3.8+，实际兼容性尚未本机验证。

Krita Python 插件桥接；当前工作台未安装或连接。

### DirectXTex · texconv

贴图格式转换时可选。转换 DDS / PNG 等贴图格式，按目标 Mod 选择压缩格式与 mipmap。

- 发布方：Microsoft
- 工具来源：https://github.com/microsoft/DirectXTex/wiki/Texconv
- MCP：未找到微软官方 MCP

微软维护的命令行纹理转换工具。已有 CLI 不等于已有官方 MCP。

可由脚本调用 CLI；工作台尚未接入自动转换。

### Substance 3D Painter

进阶贴图制作可选。在 3D 模型上制作、烘焙和导出材质贴图。

- 发布方：Adobe
- 工具来源：https://www.adobe.com/products/substance3d/apps/painter.html
- MCP：找到社区 MCP，未核实 Adobe 官方 MCP；https://github.com/jwang47/substance-painter-mcp

这是社区桥接项目。Painter 的脚本接口与 Adobe Substance 3D 云 API 都不等于官方 Painter MCP。需要适用的软件许可，本机未验证。

通过 Painter 插件与脚本接口桥接；做基础换色不必准备此工具。

## Blender 官方 MCP

1. 先确认 Blender 5.1+ 和模型导出插件兼容；官方 MCP 与 3DMigoto 导出插件需要分别准备。
2. 从 Blender 官方 MCP 页面进入 Blender Lab 扩展与 Server 的下载、Setup 文档，避免把同名社区包当成官方包。
3. 安装扩展与 Server 后，在支持 MCP 的 AI 客户端中配置；通过实际工具列表、读取当前场景等操作验证连接。
4. 先在场景副本中测试。官方说明其 MCP 能执行 AI 生成的 Python，且没有保护本地数据的沙箱。

官方源码：https://projects.blender.org/lab/blender_mcp

官方 Setup 文档：https://projects.blender.org/lab/blender_mcp/wiki/Setup

社区替代：https://github.com/ahujasid/mcp-for-blender。明确声明与 Blender Foundation 无关联；是另一套社区 MCP，不能与 Blender Lab 的扩展、命令或包名混用。

官方落地页已读取；Setup 子页当前被访问验证拦截，未据此生成具体 MCP 启动配置。官方 MCP 与 GIMI 插件的联用尚未测试。

## 工作台已实现的检查

首页「人物模型 Mod」选择或输入已解压目录；本地扫描 INI、VB / IB / BUF / FMT、DDS 等资源，引用相对于 INI 解析。静态目录内引用检查存在性；动态表达式和目录外引用单独标明、不读取外部路径。跳过符号链接。不执行配置、脚本或游戏。每次最多 5,000 文件、4 MiB INI；报告最多展示 150 行，完整数据在 raw JSON。

报告与原始数据默认保存于项目 data/game-mods/results；设置测试沙箱时写入对应沙箱。CLI：node lib/model-mods.mjs "模型Mod目录"。

只检查静态配置与文件存在性，不能解析模型拓扑、骨骼权重或游戏运行效果。

原神官服使用第三方模型工具存在封号风险，GIMI 作者明确提醒；视觉替换不保证账号安全。

## AI 学习任务

请根据我提供的模型 Mod 静态报告，先解释 INI 的资源段、hash 与 filename 如何对应本地网格和贴图。引用实际文件与行号，区分已找到、缺失、动态表达式和目录外引用。然后制定一个最小外观修改方案，列出 Blender 的网格、UV、权重与导出检查步骤。不要把文件存在当作兼容性证明；如有 MCP，先确认它的维护者、版本和实际工具列表，优先 Blender Lab 官方方案。

## 核查来源

- [Blender 官方 MCP 页面](https://www.blender.org/lab/mcp-server/)：官方来源、Blender 5.1+ 与外部组件要求、Python 执行范围。已读取官方页面；Setup 子页被访问验证拦截，未核实具体启动命令。
- [GIMI 作者项目与历史制作指南](https://github.com/SilentNightSound/GI-Model-Importer)：Blender 插件、模型制作流程、旧独立加载器弃用与官服风险。
- [GIMI 模型制作指南（历史）](https://github.com/SilentNightSound/GI-Model-Importer/blob/main/Guides/UsageInstructions.md)：网格分组、贴图与缓冲区文件组织；需结合当前工具版本。
- [XXMI 作者项目](https://github.com/SpectrumQT/XXMI-Launcher)：支持的模型导入器与安装入口；README 未发现 MCP。
- [Blender 社区 MCP 作者声明](https://github.com/ahujasid/mcp-for-blender)：作者明确标注为第三方项目。
- [Krita 社区 MCP 作者项目](https://github.com/SanSaSane/krita-mcp)：社区实现与作者声明的依赖；未进行本机验证。
- [微软 texconv 文档](https://github.com/microsoft/DirectXTex/wiki/Texconv)：官方 CLI 功能；未找到官方 MCP。
- [Painter 社区 MCP 作者项目](https://github.com/jwang47/substance-painter-mcp)：社区插件桥接；未找到 Adobe 官方 Painter MCP。

核对上述官方或作者文档，并搜索 Blender/Krita/Adobe/微软/XXMI 的 MCP；插件目录搜索 Blender 与 Painter 未返回结果。未找到不等于确定不存在，后续发布可能改变。

## 新手与专业模式

跟随工作台顶部现有模式切换，无需独立设置。

- 新手：先选改贴图或改模型，按四步向导一次阅读一项任务；工具清单按目标缩减。第 2 步选择文件夹检查，宝箱领取报告；路径输入默认折叠。AI 提示词用简单语言、一次给一步。MCP 用通俗解释并保留官方来源与未接入状态。
- 专业：优先展示路径输入、完整资源检查规范、真实 CLI 用法、六类工具和 MCP 接入/验证细节；分析后直接显示报告，可查看原始 JSON 与等价命令。AI 任务强调路径、行号和资源字段。

切换模式时保留 Mod 路径、修改目标和向导进度，不触发检查或安装。
