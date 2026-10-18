# 第七批：小镇常驻 NPC（12 位）

> 2026-10-18。现有 NPC 见 `prompts.md` 的 K（教学内容 10 位）、L（路人 5 位）、R（新角色）。
> 这一批补的是**让小镇像有人住**的常驻角色：每人都有一个具体的生活场景、一句口头禅、一个能给玩家的小麻烦，
> 其中 6 位带支线、6 位带彩蛋/闲聊。**规格全部沿用 A（立绘）/ G（小人）/ J（精灵表）。**

## 0. 交付规格（照抄 prompts.md，不另立标准）

| 东西 | 规格 | 文件名 | 放在 |
|---|---|---|---|
| 对话头像（二次元立绘） | 约 1086×1448，3:4，透明背景，头在上方 82% 的正方形里 | `<id>-<表情>.png` | `public/art/portraits/` |
| 场景小人精灵表 | 16×32 一帧，一行一个动作：待机 2、向下走 6、向上走 6、侧面走 6、说话 2 | `sprite-<id>.png` | `public/art/pixel/` |
| 对话小头像（必交） | 80×80，透明背景，头肩 | `<id>-<表情>.webp` | `public/art/faces/` |

**表情**：说话多的角色 4 个（normal / happy / surprised / thinking）；只发支线或彩蛋的 3 个即可（去掉 surprised）。

**统一风格词（画小人/立绘都带上）**：温馨像素 RPG，16×32 原始尺寸，大头小身体，清晰的方形像素点，无抗锯齿，约 12 色调色板，深色像素描边，透明背景，3/4 俯视。

---

## 1. 带支线的 6 位（P0）

| id | 名字 | 身份 · 在哪 | 给玩家的小麻烦（支线） | 性格与口头禅 | 外观要点 |
|---|---|---|---|---|---|
| `baker` | 阿桃 | 面包店老板 · 手艺街 | **外卖排序**：她的店总被排到最后，玩家帮她看出排序规则对老店不利（算法公平） | 急脾气、心软；「我不是要第一名，我是要别老最后一名。」 | 30 岁上下女性，栗色短卷发，白围裙上有面粉手印，袖子挽起，手里总捏着记订单的小本子 |
| `watchmaker` | 老魏 | 修表匠 · 北区钟楼下小摊 | **钟停之后**：镇上所有的钟都停了，他的生意反而变好——玩家帮他面对“靠别人的麻烦吃饭”这件事（伦理） | 话少，手不停；「表没问题，是时间的问题。」 | 60 多岁，秃顶，圆框放大镜卡在右眼，灰蓝工装，桌面摊满齿轮和螺丝刀 |
| `student` | 小满 | 放学的学生 · 住宅区 | **AI 写的作业**：她让 AI 写了读书笔记，老师问“这句什么意思”她答不上来（抄 vs 学） | 心虚又嘴硬；「我查过资料的……算是查过吧。」 | 13 岁左右，校服配大号书包，短马尾，膝盖上贴创可贴，手里夹着一本翻烂的练习册 |
| `disk-vendor` | 阿飞 | 卖旧硬盘的摊主 · 广场边 | **没删干净**：他卖的硬盘里还有上一位主人的东西，玩家示范“删除 ≠ 消失”（数据删除） | 油嘴滑舌但讲义气；「格式化过了，我发誓——大概。」 | 20 多岁男生，反戴鸭舌帽，宽松马甲，脖子上挂着好几个 U 盘，脚边一箱硬盘 |
| `barista` | 小鹿 | 咖啡店店员 · 手艺街 | **记不住名字**：她用便签记客人，便签一乱就全错（记忆 vs 记录；也讲索引） | 温柔、手忙脚乱；「您上次喝的是……哪一杯来着？」 | 20 岁出头女生，浅棕丸子头，格纹围裙，围裙口袋里塞满彩色便签，手里端着一杯拉花 |
| `parcel` | 大壮 | 快递柜管理员 · 住宅区 | **柜子总满**：玩家帮他想怎么分配格子（队列、限流） | 大嗓门、热心；「柜子就 24 个，人一天来 60 个！」 | 30 多岁壮实男性，短寸头，工装背心，腰上别着扫码枪，脚边堆着纸箱 |

## 2. 带彩蛋/闲聊的 6 位（P1）

只要**精灵表**，不需要立绘；另交 normal / happy / thinking 三张 80×80 小头像。

| id | 名字 | 身份 · 在哪 | 彩蛋 / 闲聊 | 外观要点 |
|---|---|---|---|---|
| `pigeon-uncle` | 老周 | 广场喂鸽子 | 讲镇上旧事：“钟楼没停之前，镇上没人看表。” | 70 岁，浅灰中山装，布鞋，塑料袋里装面包屑，脚边一群鸽子 |
| `oncall` | 阿康 | 遛狗的程序员 · 住宅区 | 手机每三分钟响一次，他看一眼就按掉（告警疲劳：“这条我已经看了四百次”） | 30 岁，连帽衫+睡裤，牵着柴犬，一只手举着手机 |
| `paperboy` | 小石头 | 报童 · 全镇跑 | 头版每天都是同一张照片（缓存/更新：“我也觉得奇怪”） | 12 岁，报童帽，斜挎报袋，裤脚短一截 |
| `lighthouse-keeper` | 老陈 | 灯塔守 · 南岸 | 白天不亮灯，他坚持每天擦一遍（“万一今晚要用”） | 50 多岁，旧雨衣，手里提一盏煤油灯，皮肤晒得发红 |
| `apprentice` | 小铃 | 修表学徒 · 北区 | 跟玩家较真“误差 0.5 秒算不算准”（精度、可接受误差） | 16 岁女生，工装背带裤，头发扎成两条小辫，手腕上套着好几个旧表带 |
| `cobbler` | 老宋 | 鞋匠 · 手艺街 | 看鞋底就能说出人常走哪条路（轨迹数据、隐私直觉：“你这双，走的是近路”） | 60 岁，皮围裙，膝盖上垫着鞋楦，嘴里咬着一枚鞋钉 |

---

## 3. 出图提示词（可直接喂模型）

统一前缀：

```
warm cozy pixel-art RPG character, 16x32 base sprite, big head small body,
clean square pixels, no anti-aliasing, ~12 color palette, dark pixel outline,
transparent background, three-quarter top-down view, standing pose facing front
```

每个角色在后面接一句：

| id | 追加提示 |
|---|---|
| `baker` | mid-30s woman, chestnut short curly hair, white apron with flour handprints, holding a small order notebook, warm bakery palette |
| `watchmaker` | 60s bald man, loupe over right eye, grey-blue work overalls, surrounded by tiny gears, brass and steel palette |
| `student` | 13-year-old schoolgirl, big backpack, short ponytail, bandage on knee, worn workbook under her arm, navy and cream palette |
| `disk-vendor` | 20s young man, backwards cap, vest with USB sticks hanging, box of hard drives at his feet, teal and orange palette |
| `barista` | early-20s woman, light brown bun, plaid apron full of colorful sticky notes, holding a latte, cream and rose palette |
| `parcel` | 30s sturdy man, buzz cut, work vest, scanner on his belt, stack of cardboard boxes, grey and yellow palette |
| `pigeon-uncle` | 70s man, light grey tunic, cloth shoes, bag of breadcrumbs, pigeons around his feet, dusty beige palette |
| `oncall` | 30s tired man, hoodie and pajama pants, leash in one hand, phone in the other, small shiba inu, muted blue palette |
| `paperboy` | 12-year-old boy, newsboy cap, shoulder news bag, too-short trousers, bright red and cream palette |
| `lighthouse-keeper` | 50s weathered man, old raincoat, carrying an oil lamp, sun-reddened skin, sea-green and rust palette |
| `apprentice` | 16-year-old girl, overalls, two small braids, several old watch straps on her wrist, silver and denim palette |
| `cobbler` | 60s man, leather apron, shoe last on his knee, nail between his teeth, brown and bone palette |

立绘（A 类）只为第 1 节的 6 位做，提示词在追加句后面接：

```
full-body anime portrait, upper body framed, clean line art, soft cel shading,
warm interior lighting, same outfit and palette, transparent background
```

---

## 4. 与玩法的挂钩

| NPC | 挂在哪个系统 | 数据位置 |
|---|---|---|
| `baker` `watchmaker` `student` `disk-vendor` `barista` `parcel` | 小支线（`prologue-quests.js` 的 `tier: "side"`，`discover: "npc:xxx"`） | `public/prologue-quests.js` |
| `pigeon-uncle` `oncall` `paperboy` `lighthouse-keeper` `apprentice` `cobbler` | 彩蛋 / 闲聊（`easter-eggs.js` 的 `npc` 类） | `public/easter-eggs.js` |

## 5. 验收

- [x] 12 张精灵表，透明背景，动作行序按 J 类（待机 2 / 下 6 / 上 6 / 侧 6 / 说话 2）；走路帧脚底对齐
- [x] 第 1 节 6 位：立绘 4 表情 + 80×80 小头像
- [x] 第 2 节 6 位：立绘不做，80×80 小头像 3 表情
- [x] 文件名全小写、短横线；精灵表、立绘 `.png` 与小头像 `.webp` 对得上角色 ID
- [ ] 小人站进新 2560×1440 游戏空间地图和 320×180 的室内都不出戏（人物像素尺寸、门口与路宽协调）

2026-10-18：12 位的六帧精灵表与 JSON 已交候选；P0 六位的四表情立绘和头像、P1 六位的三表情头像也已放入运行目录。总览见 `docs/art/review/npc-sprites-contact.png`、`npc-walk-down-contact.png`、`npc-portraits-contact.png`、`npc-p0-faces-contact.png`、`npc-small-faces-contact.png`。文件规格已核对；场景比例与游戏内表情映射仍待验收。
