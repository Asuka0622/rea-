# NPC动作、表情与天气生活素材交付单
2026-10-18 · 美术组认领稿；配套 `docs/world/npc-life-design-2026-10-18.md` 与256句对白JSON。**本单是待制作/复验要求，不是动作已完成或已接入的证明。**

## 1. 这次交什么

地图生活演出沿当前像素小人；剧情特写沿美术总单第13节的头像立绘风格连续插画。两条线分开认领，人物身份一致，不拿缩小立绘代替地图动作，不让美术用整段视频代替独立剧情帧。

本次覆盖16位当前可交谈NPC，加路米和小克。先做阿桃/小鹿/老周/阿康四人晴阴雨样板与路米必要互动，再扩其余人。星博士、秋实、伦敦角色本次不批量加生活动作。

## 2. 已有素材先认领，基础表情不重复画

以下为2026-10-18本地文件名与动画JSON登记快照；**只证明文件存在/登记了动作，未证明画面正确、运行引用完整或走路已升级**。完整源文件/候选仍以美术分支最新交付核对。若角色id和文件前缀不同，程序要做映射，不能让美术重复画同一张脸。

|角色/运行id|头像文件前缀|已存在表情|已登记小人动作来源|
|---|---|---|---|
|阿桃 / baker|baker|happy / normal / surprised / thinking|sprite-baker.json：idle, walk-down, walk-up, walk-side, talk|
|老魏 / watchmaker|watchmaker|happy / normal / surprised / thinking|sprite-watchmaker.json：idle, walk-down, walk-up, walk-side, talk|
|小满 / student|student|happy / normal / surprised / thinking|sprite-student.json：idle, walk-down, walk-up, walk-side, talk|
|阿飞 / disk-vendor|disk-vendor|happy / normal / surprised / thinking|sprite-disk-vendor.json：idle, walk-down, walk-up, walk-side, talk|
|小鹿 / barista|barista|happy / normal / surprised / thinking|sprite-barista.json：idle, walk-down, walk-up, walk-side, talk|
|大壮 / parcel|parcel|happy / normal / surprised / thinking|sprite-parcel.json：idle, walk-down, walk-up, walk-side, talk|
|老周 / pigeon-uncle|pigeon-uncle|happy / normal / thinking|sprite-pigeon-uncle.json：idle, walk-down, walk-up, walk-side, talk|
|阿康 / oncall|oncall|happy / normal / thinking|sprite-oncall.json：idle, walk-down, walk-up, walk-side, talk|
|小石头 / paperboy|paperboy|happy / normal / thinking|sprite-paperboy.json：idle, walk-down, walk-up, walk-side, talk|
|老陈 / lighthouse-keeper|lighthouse-keeper|happy / normal / thinking|sprite-lighthouse-keeper.json：idle, walk-down, walk-up, walk-side, talk|
|小铃 / apprentice|apprentice|happy / normal / thinking|sprite-apprentice.json：idle, walk-down, walk-up, walk-side, talk|
|老宋 / cobbler|cobbler|happy / normal / thinking|sprite-cobbler.json：idle, walk-down, walk-up, walk-side, talk|
|朵朵 / duoduo|duoduo|happy / normal / surprised / thinking|anim-duoduo.json：idle, hug-cushion|
|王奶奶 / wang-nainai|grandma|happy / normal / surprised / thinking|anim-grandma.json：idle, check-phone|
|老秦 / lao-qin|archivist|happy / normal / surprised / thinking|按现有命名匹配未找到；先认领候选，不直接判定所有素材缺失|
|铁叔 / smith-release|smith|happy / normal / surprised / thinking|anim-smith.json：idle, walk-down, walk-up, walk-side, talk|
|路米 / lumi|lumi|happy / normal / point / surprised / thinking|anim-lumi.json：idle, walk-down, walk-up, walk-side, talk|
|小克 / xiaoke|xiaoke|happy / normal / sorry / surprised / thinking / unsure|anim-xiaoke.json：talk, idle, shrink-watch, move, glitch|

当前共找到69张相关头像WebP。16位NPC基础normal/happy/thinking均有文件；惊讶表情不是所有人都必须新增。80×80常驻头像与旧主角320×320用途不同，保留各自原稿并统一显示裁切，不硬拉伸。

## 3. 通用动作要求

- 原有待机/说话与四向行走先复验。最新人类步态要求为上/下/左/右各8帧、左右独立，与并行走路工作线交付合并核对；运行中仍可能是旧6帧或4帧，不能把文件存在或候选8帧记为接入完成，也不能被旧总单6列5行说明带回退。
- 新生活动作**另交文件**，不改原基础行列，不覆盖并行走路成果。地图常驻逻辑帧仍以16×32为基准，实际倍率逐件登记；旧主角/剧情NPC沿现有比例先校准。长工具/伞需要更大画布时固定脚底锚点和显示尺度，不能为塞入格子把整个人缩小。
- 手部有接触的动作画清“准备→接触→完成→恢复”，循环工作动作建议4–6帧、起落/开合2–4帧；这里是建议，按动作可读性定。不能把一张图平移几次凑帧。
- 起身/坐下有首尾过渡，坐稳才播放坐姿；停步和转向可复用现有行走/待机，不无故要求全员另画“转头大套装”。
- 手持物写明哪只手、握点、放下点与遮挡层次；前后方向不能穿手穿胸。环境物件被拿起时原图隐藏，放下时恢复，程序按动作事件配合。
- 避雨的移动使用已有行走；缺专用动作时站入门廊待机即可，不要求“避雨”各画一套走路。工作动作被天气中断要有收物/回待机帧，不能手里东西突然消失。

## 4. 逐人生活动作认领表

下表“本轮认领”先核已有源稿/候选；确实缺少才补。帧数均针对独立动作，不包含行走整套。
|角色|批次|本轮认领|可选/后续|道具与验收要点|
|---|---|---|---|---|
|阿桃（baker）|P0|knead：揉面4–6帧；tray-transfer：端筐/托盘收进檐下4–6帧|收摊2–4帧；看炉可用待机＋转向|订单本、面团、托盘/筐；动作切换时明确放下或持有，不重复生成两套物件|
|小鹿（barista）|P0|wipe-cup：擦杯4–6帧；stow-chair：收一把外摆椅4–6帧|核订单2–4帧；递杯待交接站位确认|杯、抹布、椅；椅子独立摆放，搬起后原椅隐藏|
|老周（pigeon-uncle）|P0|sit-down/stand-up：坐下/起身各3–4帧；watch-birds：观察2–3帧|扶帽2–3帧；不强制画喂食|长椅座面和脚底双锚；坐姿不要悬在椅边|
|阿康（oncall）|P0|check-phone：看消息/收手机各2–4帧；hold-leash：持绳待机2帧|持绳行走待狗/绳接入确认后补齐四向，不能只画待机就标可遛狗|手机、狗、狗绳分层；狗先验待机/行走与跟随，缺狗时回退门廊看手机，不播放遛狗对白|
|老魏（watchmaker）|P1|inspect-watch：听表/检修4–6帧；cover-parts：盖零件盘3–4帧|整理零件2–4帧|表、放大镜、零件盘；戴镜位置按现有角色锁定|
|小满（student）|P1|read-book：读书/翻页3–4帧；pack-book：把本子收回包3–4帧|写笔记3–4帧|练习册/书包；开合先后合理，未成年人不新增成熟化外观|
|阿飞（disk-vendor）|P1|label-box：贴标签3–4帧；close-box：关箱/移至棚内4–6帧|整理盘壳3–4帧|封闭硬盘箱和空白标签，不显示上一任主人的资料|
|大壮（parcel）|P1|sort-box：分拣4–6帧；carry-box：搬箱起落各3–4帧|扫码/交接3–4帧|箱、柜、扫描器；地址和取件码由程序处理，搬箱行走要配持续持物姿势|
|小石头（paperboy）|P1|bind-papers：分报/绑报4–6帧；cover-bag：套报袋3–4帧|递报3–4帧|报纸/袋；可读日期与头版由程序叠，不永久画成昨天|
|老陈（lighthouse-keeper）|P1|wipe-lamp：擦灯罩4–6帧；write-log：记巡检3–4帧|扶门/收巡检本3–4帧|灯罩、布、巡检本；室外巡查可先复用有效四向行走|
|小铃（apprentice）|P1|measure：核读数4–6帧；cover-tools：盖工具盘3–4帧|夹图纸2–3帧；暖手为寒冷扩展|尺、镊子、笔记；工具与手相连，不能漂在身边|
|老宋（cobbler）|P1|repair-shoe：补鞋/敲钉4–6帧；stow-shoes：收待取鞋3–4帧|扫皮屑3–4帧|鞋楦、鞋、锤；锤头与鞋面接触点清楚|
|朵朵（duoduo）|P1|check-handheld：查看/收起掌机各3–4帧；water-pot：浇花4–6帧|移花盆4–6帧；抱枕动作已有先复验|掌机、花盆、水壶；现有hug-cushion不冒充查看掌机|
|王奶奶（wang-nainai）|P1|collect-laundry：收晾晒物4–6帧；close-window：关窗3–4帧|整理花盆3–4帧|衣物/窗/花盆；已有check-phone可复用看设备，不充当收衣动作|
|老秦（lao-qin）|P1|sort-archive：登记/归档4–6帧；move-paperbox：搬纸箱起落各3–4帧|合旧册/补封套3–4帧|封套、纸箱、目录；当前匹配未找到小人JSON，先认领现有候选再决定补基础动作|
|铁叔（smith-release）|P1|repair-tool：工具台修理4–6帧；stow-plan：收/夹图纸3–4帧|暖手2–3帧；地图开锁仅剧情实际需要时补，不与插画镜头重复排产|尺、图纸、工具；铁叔以深棕短发短胡须现有头像为准|

## 5. 路米、小克与天气共用件

|对象|需要认领/补件|边界|
|---|---|---|
|路米地图动作|观察物件/抬手看表3–4帧；坐下/起身各3–4帧；首个持伞站立与行走样板|动作必须由实际交互触发；持伞真要边走边用则四向行走都要支持，不只交一张站姿|
|小克|先复验已登记idle/talk/shrink-watch/move/glitch的完整帧；怀表交互用已有有效帧优先|glitch不是下雨必播；地图动作不替代非像素剧情定格镜头；不新增真实公司标志|
|雨伞|先一套样板，开/收各3–4帧、四方向附件、握点与人物前后遮挡；角色专用握持不兼容则另补|非全员必做；没有伞/持伞帧的NPC走门廊，不播放撑伞表现|
|水花/雨滴|共用短水花3–4帧，透明底；雨滴贴片先认已有|是否踩到水、密度、风向和室内禁雨由程序决定，不画进每位NPC身体|
|寒冷/雪后续|一位样板暖手3–4帧/拢领2–3帧，必要时一套围巾或冬装兼容动作|先季节样板后排；不要求全员四季换装，不把冬装站姿当全套动作完成|
|日夜受光|沿第10节固有色、真实alpha、脚底锚点|不用画每人的白天/夜晚/雨天全套换色版，程序统一光照|

## 6. 表情使用与真正需要补的表情

基本池：normal日常、happy轻松/感谢、thinking专注/犹豫；剧情需要意外反应才用surprised。不因为晴雨春夏秋冬就额外画16种天气脸；疲惫/担忧可先用现有thinking，寒冷通过动作和对白表达。

- P0四人：阿桃/小鹿已有四基础表情，老周/阿康已有三基础表情。先验裁切、眼线、身份与显示映射；本轮不强制补老周/阿康surprised。
- 朵朵/王奶奶/老秦/铁叔：已有四基础表情，任务台词出现unsure但无同名前缀文件时，先由程序映射到合适thinking/normal；**映射能成立不要求美术重复出图**。如果单独镜头确实需要更明显担忧，再认领worried候选并明确调用位置。
- 路米已有point；小克已有sorry/unsure。先核现有表情是否被调用，不能因未配置别名误报缺图。
- 非像素剧情帧中的“专注→疑惑→惊讶”等表情变化由连续画面画出来，不把80×80头像贴在身体上当动画。
- 真正可选的新表情：小克下调期待/释然、铁叔看到电脑的惊讶幅度调整，仅在四关键帧评审指出当前图无法表达后补；不预先扩全员表情包。
- 半身立绘与对话裁切分别交付；不要在脸上画雨滴、雪花和夜色，环境由场景层/程序处理，UI头像保持清楚。

## 7. 文件、元数据与认领状态

建议文件：`public/art/pixel/life/anim-<id>-<action>-v1.png`＋同名JSON，源稿/联系表放 `docs/art/review/life/<id>/<action>/`。此为新生活动作建议，不移动已有基础精灵表；认领前核是否已有同用途文件。像素尺寸以当前基准与倍率填写，不假定所有角色整图尺寸相同。

每件填写：asset_id、characterId、action、source_file、candidate_file、target_file、logicalFrame、frameSize、columns、rows、有效帧、逐帧ms、footAnchor、handAnchor、facing、道具前后层、start/contact/end事件帧、loop、可中断/收尾帧、回退动作、status。contact等帧为从0开始还是1开始必须写明，统一建议0开始。不适用为空，不能含糊填“动画”。

状态用“已有待认领 / 已认领制作中 / 候选待复验 / 已验收待接入 / 已接入实机通过”；发布前核角色、背景透明、脚底、手部、首尾过渡、动作不换人。像素道具与插画源稿分目录，不覆盖历史版本。

程序负责：随机对白选择、任务前置/优先级、天气日程、寻路、避雨容量、动作事件与物件显隐、对话头像别名、声音字幕、缺图回退。美术负责：姿势/道具/表情/帧连续性/锚点。256句对白不需要256张图片。

## 8. 验收镜头

1. 阿桃放下订单本→收露天筐→沿路进檐下→恢复工作；小鹿收椅后原椅不留分身。
2. 老周坐起脚底不跳→沿路避雨→坐姿对齐；阿康手机放回、狗绳连接一致，资源不全先不显示遛狗。
3. 任务对话暂停动作，结束后从合法收尾帧恢复；夜间/雨停换状态不每帧抽搐。
4. 下雪/夜雨/屋檐内外的素材复用正确，不出现夜间发光矩形底；UI脸清楚。
5. 对照头像原稿和四向行走，新动作不改变角色年龄、衣服、发型、道具持有手。左右不靠错误翻转导致铅笔/工具换边。
6. 在游戏比例看桌面与手机横屏，不能只验大图；脚、椅、桌、握点与碰撞站位对应。
7. 图片存在与动作名登记只是库存，最终运行引用和逐帧实机通过才标完成。

交接关联：行为/对白设计 `docs/world/npc-life-design-2026-10-18.md`；定格剧情演出按总单第13节。本清单不表示NPC生活系统和全部新动作已实现。
