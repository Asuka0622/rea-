# 网上真实的游戏与 Mod 案例

获取日期：2026-10-13。完整官方源码快照保留作者文件、许可证与素材署名；工作台仅增加 workbench-source.json 元数据，不编译、不执行上游代码。未发现这些项目使用 REA 制作的证据；适合作为源码阅读和 AI 修改的学习材料。

## terraria-examplemod

官方 ExampleMod；武器伤害、击退、攻击间隔与配方。分析 ExampleMod 子目录；快照来自开发分支，不保证与当前安装版匹配。

- 来源：https://github.com/tModLoader/tModLoader
- 提交：c90e19230b4cd82181776812b0513ac8f0fbb596
- 许可证：MIT（原文保留于项目根目录）
- 分析目录：samples/games/terraria-examplemod/ExampleMod
- 解压文件总大小：108.0 MiB

## stardew-cjb

实际发布的 SMAPI Mod；生命、体力、移动速度与配置菜单。分析 CJBCheatsMenu 子目录。

- 来源：https://github.com/CJBok/SDV-Mods
- 提交：9bf8e959209eb19b047c6bfca81783408ade1db8
- 许可证：MIT（原文保留于项目根目录）
- 分析目录：samples/games/stardew-cjb/CJBCheatsMenu
- 解压文件总大小：6.2 MiB

## minecraft-fabric

官方最小 Mod 模板；初始化、元数据和 Mixin；尚未实现武器或数值功能。

- 来源：https://github.com/FabricMC/fabric-example-mod
- 提交：1685ed178a113092f8aa002c4f7d78181643d75b
- 许可证：CC0-1.0（原文保留于项目根目录）
- 分析目录：samples/games/minecraft-fabric
- 解压文件总大小：0.1 MiB

## godot-open-rpg

GDQuest 持续开发中的 RPG Demo；角色属性、回合战斗与地图。快照 README 要求 Godot 4.6.2。

- 来源：https://github.com/gdquest-demos/godot-open-rpg
- 提交：19bd328fae9e4b534d3bb6db380a3d871d6ea58f
- 许可证：MIT（原文保留于项目根目录）
- 分析目录：samples/games/godot-open-rpg
- 解压文件总大小：19.9 MiB

来源与 ZIP SHA-256 见 SOURCES.json。可从工作台独立游戏案例区打开原仓库、查看入口、分析本地源码。源码静态线索不等于完整调用关系；实际运行需按各项目 README 准备游戏、SMAPI/tModLoader/Fabric/Godot 环境。
