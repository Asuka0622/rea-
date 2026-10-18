# 委托房间素材需求：朵朵与小雨（2026-10-17，2026-10-18 更新）

两间委托房间的背景（`public/art/pixel/case-room-farm-save.png`、`case-room-calculator-eggs.png`）、专属道具和人物精灵表均已交付；小雨发布检查表也已补图。背景、人物与头像候选仍需按最终关卡做游戏内验收。

两间房间的专属道具和人物素材已经备齐；小鸡、存钱罐属于已出图但尚未布置的可选装饰。发布检查表刚补成候选。整体范围见 `asset-requirements.md`，总清单见 `list.md`。

## 一、统一规格（这一批都适用）

- **逻辑栅格**：房间 320×180；道具按 2 倍像素密度出（例：显示 14 单位宽就交 28 像素宽的图），接入方按最近邻缩放。
- **锚点**：道具的**底边中点**落在坐标上。桌面约在 `y=70`（小雨房间 `y=71`），地板从 `y=105` 开始，床面约 `y=100`，墙面便签 `y=56–66`。
- **透明底**：真实透明通道，不画白底或棋盘格；不写可读文字，文字和数字由游戏显示。
- **不要画 UI**：问号、菱形提示、点击框、名字条都是代码画的。
- **命名**：小写英文短横线，运行文件进 `public/art/pixel/case-props/`，源图进 `docs/art/review/sources/`。

## 二、朵朵的房间（`case-room-farm-save`）：已齐

| 内容 | 文件 | 交付尺寸 | 游戏内锚点 | 状态 |
|---|---|---|---|---|
| 存档工作台（笔记本） | `laptop-room.png` | 56×40 | `(223, 72)` | 复用已有，效果合格 |
| 掌机 | `console.png` | 28×20 | `(84, 100)` | 已接入 |
| 南瓜抱枕 | `pillow.png` | 32×28 | `(52, 98)` | 已接入 |
| 挂墙日历兼便签 | `calendar.png` | 22×28 | `(282, 58)` | 已接入 |
| 种田笔记 | `notebook.png` | 28×24 | `(272, 72)` | 已接入 |
| U 盘 | `usb.png` | 18×12 | `(118, 150)` | 已接入 |
| 小鸡 | `chick-candidate.png` | 20×20 | 未布置 | 已交付，场景里还没有小鸡的调查点，先留作地板装饰 |

## 三、小雨的房间（`case-room-calculator-eggs`）：素材已齐

粉色学生卧室，黄昏斜光：左边床，中间窗，右边书桌和书架。

| 内容 | 文件 | 交付尺寸 | 游戏内锚点 | 状态 |
|---|---|---|---|---|
| 调试电脑 | `laptop-room.png` | 56×40 | `(225, 71)` | 复用已有，效果合格 |
| 像素计算器 | `calculator.png` | 20×28 | `(264, 72)` | 已接入 |
| 玩偶 | `plush.png` | 24×28 | `(248, 100)` | 已接入，坐在书桌椅子上 |
| 秘籍练习册 | `workbook.png` | 28×24 | `(52, 108)` | 已接入，摊在床上 |
| 调试快捷键便签 | `poster.png` | 24×28 | `(82, 58)` | 已接入，贴在床头墙面 |
| 论坛载体 | `forum.png` | 30×24 | `(26, 56)` | 已接入，贴墙的屏幕 |
| 存钱罐 | `piggy-candidate.png` | 24×22 | 未布置 | 已交付，关卡里还没有调查点 |
| 发布检查表 | `case-props/checklist.png` | 24×26 | `(120, 150)` | 透明候选已补，待场景验收 |

书桌左半边 `x≈215–236` 是调试电脑，右半边 `x≈258–270` 是计算器；植物在 `x≈270–282`，别画到植物上。

## 四、两位委托人的小人

两张精灵表已交付并接入，房间里不再有方块小人。剩下的只是对话头像。

| 角色 | 目标文件 | 动作 | 说明 |
|---|---|---|---|
| 朵朵 `duoduo` | `public/art/pixel/anim-duoduo.png` + `.json` | 待机 2、抱紧抱枕 4 | **已接入**（256×192，4×2 格，64×96/帧） |
| 小雨 `xiaoyu` | `public/art/pixel/anim-xiaoyu.png` + `.json` | 待机 2、蹦一下 4 | **已接入**（同上规格） |

**对话头像**：朵朵四表情与小雨缺的三种表情已出 320×320 WebP，登记为「待验收」；小雨 normal 保留现有资源。

> 2026-10-17 接入时按第一关的构图重裁过：阿哲、朵朵、小雨的源图是半身全身图，用同一个缩放裁出来脸只有小林的四成。`scripts/prepare-portraits.py` 现在按角色记缩放（azhe 0.58 / duoduo 0.64 / xiaoyu 0.57，小林和路米 0.82），新角色来了先和 `kobayashi-normal.webp` 比一比再定系数，不要再图省事用一个全局值。裁切对照见 `docs/art/review/portraits/avatar-crops-320-review.png`，接入方需核对头像裁切和表情映射。

王奶奶四张头像已交付并接入 `public/art/faces/`（320×320，灰白短发、老花镜、深绿开衫，与客厅占位一致）；对话框使用对应表情文件。

王奶奶的小人已交付并接入（`anim-grandma.png` + `.json`），客厅里不再是方块占位；五个可玩委托的委托人现有真人头像和小人。

## 五、验收怎么算过

1. 图落在目标路径，PNG 有真实透明通道，四周没有白底或棋盘格。
2. 底边中点对齐锚点后，道具看起来**站在/放在**那个家具上，不悬空、不陷进地板。
3. 和背景同一像素颗粒，不出现明显更细或更粗的笔触。
4. 交接时更新 `docs/art/delivery-2026-10-17.csv`，`status` 写「待验收」；接入方放进游戏、走通调查流程后再改「已接入」。

接入完成后，接入方负责把 `samples/cases/*/workbench-case.json` 里对应 `items[].art` 换成新图，并复核 `stand` 站位与 `room.blocks` 碰撞（站位之间要留 ≥24 的间距，交互半径是 22）。

## 六、阿哲的机房（`case-room-weather-keys`）：背景与道具已接入

序章第四个委托「天气小助手」已经做成能走进去的房间。**背景和六件道具都交付并接入了**（`public/art/pixel/case-room-weather-keys.png`，640×360，道具已经画进图里）：便签、电脑、打印件在桌上，发布清单挂在墙上，机柜在右边，路由器在地上。

调查点按图重排了锚点，图标不再叠画（`items[].hidden`，只留问号标记和点击区），行走碰撞也按真图重设（可行走上边界 `top=130`，左边柜子、桌子、右边机柜各一块）。

**阿哲房间里的小人**：4×2 像素精灵候选已生成并放入 `public/art/pixel/anim-azhe.png` + `.json`（256×192，64×96/帧；待机 2 帧 + 推眼镜 4 帧）。状态为「待验收」；接入方需检查房间内比例、脚底基线和动作映射后再标记已接入。预览见 `docs/art/review/animations/anim-azhe-preview.png`。

| 要交什么 | 目标文件 | 逻辑尺寸 | 说明 |
|---|---|---|---|
| 机房背景 | `public/art/pixel/case-room-weather-keys.png` | 640×360 运行图（逻辑 320×180） | 秋季雨天白天；房间背景与六件调查物已合成并接入 |
| 电脑 / 便签 / 打印件 / 机柜服务器 / 发布清单 / 路由器 | `public/art/pixel/case-props/weather-keys-{monitor,todo,printout,rack,poster,router}.png` | 宽 60 / 40 / 44 / 52 / 40 / 40 px（2×逻辑宽） | 独立透明像素源图已交；运行场景采用背景合成，隐藏调查点保留点击区 |

道具裁切和当前房间图见 `docs/art/review/weather-keys/weather-keys-props-contact.png` 与 `docs/art/review/weather-keys/case-room-weather-keys-art-preview.png`；无道具背景源稿见 `docs/art/review/case-room-weather-keys-v2-candidate.png`，完整道具源稿为 `docs/art/review/sources/weather-keys-props-sheet-source.png`。当前关卡用 `scene.art` 加载合成背景，并通过 `items[].hidden` 保留调查热点，勿再叠加独立道具图。

当前坐标与碰撞以 `samples/cases/weather-keys/workbench-case.json` 为准：

- 左机柜碰撞块 `(20,40,60,85)`；桌子 `(125,112,75,14)`；右机柜 `(230,48,70,78)`
- 可行走上边界 `top=130`，出生点 `(160,168)`，门口 `(160,176)`，阿哲站 `(225,168)`

## 七、王奶奶的客厅（`case-room-flashlight-apk`）：2026-10-18 美术候选已交付

序章第五个委托「小光手电筒」也做成了能走进去的房间：左边一辆旧沙发（上面放着电视遥控），中间一张茶几（手机、电话本、老花镜），右边一只书架，墙上有电视和一张全家福。现在用代码画的暖色客厅占位，`scene.look` 是 `living`，家具位置与碰撞块一致。

| 要交什么 | 目标文件 | 逻辑尺寸 | 说明 |
|---|---|---|---|
| 客厅背景 | `public/art/pixel/case-room-flashlight-apk-evening.png`、`case-room-flashlight-apk-night.png` | 各 640×360（逻辑 320×180） | 傍晚与夜景候选；傍晚版兼容路径 `case-room-flashlight-apk.png`；不烘焙调查物 |
| 手机 / 老花镜 / 座钟 / 全家福 / 通讯录 / 小夜灯 / 遥控器 / 拖鞋 | `public/art/pixel/case-props/` 下同名文件 | 透明 PNG，2×逻辑像素 | 八件均已出图，候选见 `docs/art/review/case-props/`；锚点和热点待关卡验收 |

- 沙发 `x 18–122, y 92–140`；茶几 `x 128–212, y 100–132`；书架 `x 228–302, y 46–142`
- 墙上的电视 `x 140–190, y 30–80`；全家福 `(120, 54)`
- 可行走上边界 `top=134`，出生点 `(160,168)`，门口 `(160,176)`，王奶奶站 `(222,166)`

周姐办公室背景、六件道具、四张头像和4×2人物精灵均已生成候选，分别见 `public/art/pixel/case-room-notes-versions.png`、`public/art/pixel/case-props/`、`public/art/faces/zhoujie-*.webp`、`public/art/pixel/anim-zhoujie.png`。锚点、遮挡和动画待游戏内验收。发布检查表候选已放入 `public/art/pixel/case-props/checklist.png`。
