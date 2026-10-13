# 游戏 Mod 工坊

四个例子均为本工作台原创教学样本，与 ArtCraft 七款开源源码分开保存：

| 例子 | 目标游戏 / 环境 | 制作练习 |
| --- | --- | --- |
| 训练剑 Mod | Luanti 5.9+ / Minetest Game | 武器注册、伤害、满伤害间隔、耐久、合成 |
| 回血食物与配方 Mod | Luanti 5.9+ / Minetest Game | 物品、回血回调、无序合成产量 |
| 防御墙数值 Mod | Mindustry | 建筑生命、护甲、铜成本、贴图、研究树 |
| 像素战斗 Demo | 原创 JavaScript 网页 | 回合状态、双方生命和攻击、胜负、重开 |

首页点击「游戏 Mod 与 Demo 制作」，选择「制作与改数值」。数值输入有范围与步长校验；「生成修改预览」显示默认值对照和真实生成文件。网页 Demo 会在隔离的 iframe 内试玩；修改后需重新生成。Luanti / Mindustry 模组未在游戏内加载，导出的 README 提供安装条件和验证步骤。

「分析当前版本」将修改后的实际文件写成新草稿并只读分析，默认新手模式开箱看报告，专业模式直接看报告；失败不授予报告。报告支持原有复制给 AI 的学习流程。「导出 ZIP」在项目目录内保存包，并提供浏览器下载副本。不会自动安装到游戏目录。

目录统一位于 `D:\gpt\rea`：

- `samples/game-mods/`：四个默认样本与此说明。
- `samples/game-mods/.drafts/`：修改后的独立版本，不覆盖默认样本。
- `exports/game-mods/`：实际导出的 ZIP。
- `data/game-mods/results/`：游戏例子的原始分析报告。
- `.impeccable/review/game-workshop-*`：桌面、手机、实际视口预览与审查记录。
- `lib/game-mods.mjs`：教学模板、参数校验、只读扫描与 ZIP 生成。
- `public/game-mods.js`：独立制作面板。

默认样本缺失时，运行 `node scripts/prepare-game-demos.mjs`。该命令只生成缺失样本，保留已有目录。

API 参考：

- [Luanti 工具数值定义](https://api.luanti.org/tool-capabilities/)
- [Luanti 物品注册、食用与合成](https://api.luanti.org/core-namespace-reference/)
- [Minetest Game 默认工具与纹理引用](https://github.com/luanti-org/minetest_game/blob/master/mods/default/tools.lua)
- [Mindustry 官方 Mod 文档](https://mindustrygame.github.io/wiki/modding/1-modding/)

教学代码采用 MIT 许可，样本内保留 LICENSE。Mindustry 的 32×32 RGBA 墙体贴图由 `wallSprite()` 程序绘制并嵌入 Origin 元数据；Luanti 纹理引用已安装的 Minetest Game，不复制其资产。

验证记录：23/23 自动测试通过，包含真实修改值读取、不执行源码、非法参数拒绝、API 授权、独立平台 ZIP 解码、沙箱输出和现有分析回归。浏览器验证攻击 12 / 敌方反击 5、胜利、重开、ZIP 导出，以及修改版开箱报告。尚未进行 Luanti / Mindustry 的游戏内验证。
