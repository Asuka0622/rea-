---
name: REA 像素冒险工作台
description: 以像素世界组织真实的软件探索任务
colors:
  gold: "#d6aa57"
  gold-hover: "#e7c36b"
  midnight: "#111722"
  parchment: "#f0e3bf"
  parchment-secondary: "#e7d7ac"
  ink: "#282b26"
  ink-soft: "#61614f"
  pine: "#263e37"
  night-text: "#e6ddc3"
  day-camp: "#e4d8b6"
  day-text: "#31462f"
  field: "#faf1d9"
typography:
  display:
    fontFamily: "Fusion Pixel, Microsoft YaHei, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.4
  title:
    fontFamily: "Fusion Pixel, Microsoft YaHei, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "system-ui, -apple-system, PingFang SC, Microsoft YaHei UI, Microsoft YaHei, Noto Sans SC, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Fusion Pixel, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, Cascadia Code, Consolas, monospace"
rounded:
  square: "0px"
spacing:
  tight: "8px"
  related: "12px"
  standard: "16px"
  panel: "24px"
  desktop-inset: "30px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "8px 17px"
  button-primary-hover:
    backgroundColor: "{colors.gold-hover}"
  field:
    backgroundColor: "{colors.field}"
    textColor: "#30362d"
    rounded: "{rounded.square}"
    height: "40px"
  parchment-panel:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
---

> 2026-10-14：像素冒险风格已停用（地图、宝箱、像素字体已移除），当前界面为简洁风格；下文保留为历史记录。新的方向是二次元动漫风格，见 docs/anime-style/prompts.md。

# Design System: REA 像素冒险工作台

## Overview

**Creative North Star: "像素冒险工作台"**

像素地图是视觉主体，羊皮纸面板承载任务与报告，金色菜单突出行动。中文像素字体负责游戏标题与菜单，普通正文负责长报告与配置说明。

四张地图共享同一套操作界面：森林、沙漠、雪山和秋林拥有独立节点坐标，周围营地遵守主题偏好；午夜页眉始终使用浅色文字。

**Key Characteristics:**

- 像素场景与方形菜单
- 中文像素显示字体和可读正文
- 地图独立坐标
- 真实成果与宝箱动效

## Colors

### Primary

金色用于主要行动、当前阶段与键盘焦点，悬停使用更明亮的金色。

### Secondary

松林绿用于地图框和向导。每张地图的自然色彩属于素材，不替换共享 UI 色板。

### Neutral

午夜用于周围营地与固定页眉，羊皮纸用于日志、装备和报告。浅色营地改变周围底色与正文，午夜页眉保留独立的浅色前景。主题解析遵守显式浅色、深色或系统偏好。

## Typography

本地 Fusion Pixel 12px 简体中文比例字体为 OFL 许可。显示标题使用 display；1150px以下为24px，900px以下中屏为29px，650px以下为24px。页面标题为 title，手机为27px。

菜单使用 label。报告标题为23px像素字体，摘要为19px；长正文使用 body，路径与代码使用 mono。

## Layout

主容器最大1536px，水平内距桌面30px、中屏20px、手机15px。日志栏桌面300px，中屏254px或230px；650px以下改为上下排列。四项阶段列表始终保留。

地图使用 cover。节点与角色坐标定义在各自原图空间，按缩放与裁切映射，并限制在可见边界。每次打开或刷新随机选图，排除紧接着的上一张；同一次探索保持地图不变。坐标配置来自 public/maps.js。

## Elevation & Depth

使用色面、方形边框和像素内描边建立层次。羊皮纸有内描边，按钮有上下像素明暗边；报告没有浮起阴影。场景空间来自实际像素素材。

## Shapes

共享圆角为 square。SVG 图标使用清晰直角描绘，宝箱是可动画的像素几何；树林和地形来自光栅素材。

## Components

### Buttons

主要按钮为金色、方形、两像素边框，标准内距来自 button-primary，最小高度42px。悬停变亮，按下下移2px，禁用降低透明度。键盘焦点为3px金色轮廓，偏移4px。

### Inputs / Fields

浅色 field 背景、方形边框、普通字体和40px最小高度。输入、选择与文本区域使用专用 focus-visible 规则，避免基础样式移除轮廓。

### Navigation

午夜页眉的菜单选中项使用金色文字和底部指示线。小屏标签栏水平滚动，全部入口保留。

### Cards / Containers

任务面板、报告和引擎条目共享羊皮纸面板。任务面板顶部是步骤标签（第 N 步 / 共 4 步），下面是向导气泡，再下面只放当前这一步的按钮。报告保留普通文本、表格、折叠区与代码。

### Adventure Map and Chest

四阶段由真实分析状态推进。失败与取消结束加载，保留已有报告，不能解锁新成果。成功后点击宝箱，箱盖分步弹起并出现像素光点，1050ms后显露报告并转移焦点。减少动态效果时即时显露并停用动画。

四张地图与字体来源记录在 .impeccable/assets/provenance.json，生成 PNG 保留原生 C2PA 元数据。

## Do's and Don'ts

### Do:

- Do 使用本地像素资产和中文像素菜单。
- Do 用普通正文和等宽代码承载长报告。
- Do 为每张地图分别设置节点与角色坐标。
- Do 保留键盘焦点与减少动态效果的路径。

### Don't:

- Don't 在分析进行中自动换图。
- Don't 把取消或失败表现为获得成果。
- Don't 用远程字体替代已打包字体。
