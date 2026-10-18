// 小游戏模块 (docs/minigame-genres.md): the case's sandbox step can be one of these instead of a plain lab.
// Each keeps the lab contract so case-session needs no changes: take { h, icon, lab, onMistake, onHint,
// onDone } and call onDone() when finished. Every mapping is chosen so the action in the game is the
// action in the job — see the genre doc for what each one stands for.
//
// 塔防 borrows from 保卫萝卜 / 明日方舟: one path, deployment slots along it, a deployment budget that
// regenerates, units you place and upgrade, waves of data collectors walking toward what you protect.
// The budget is the point: every control costs something, and the lamp still has to work.
//
// 节奏 borrows from 音游 (Cytus / Muse Dash / 太鼓): requests ride one lane toward a judgment line and
// all look alike; the beat gives the beacon away (an upload that comes like a metronome), until it
// learns to jitter and the player has to read where it goes instead.
//
// 经营 borrows from Game Dev Story / Papers, Please: one proposal card per release, a ledger, a store
// review every few versions. The player builds 王奶奶 a clean flashlight; every permission in the
// manifest has to point at a feature the user can see, or the install dialog and the review punish it.
//
// 卡牌 borrows from 逆转裁判's cross-examination: the app's privacy statement, line by line. Press a
// line and it may slip into a new claim; present a raw record that breaks it, or rule it true — some
// lines ARE true, and accusing a true line costs trust just like letting a false one pass.

// 每个小游戏都拆成了自己的文件（规则 *-engine.js / pipe-campaign.js，画面 *-game.js），这里只负责转出；
// 有图用图、没图用代码画的那套助手在 mini-art.js。

/**
 * 塔防 · 权限 (王奶奶)：规则在 tower-engine.js，画面和操作在 tower-game.js。
 */
export { mountTower } from './tower-game.js';

/**
 * 节奏 · 定时上报 (小林)
 * 信标检测：一条轨道、请求长得都一样，靠节奏分出程序自动上传（F 拦截）和你点的同步（D 放行）。
 * 谱面默认用 rhythm-engine.js 的 makeBeaconChart；lab.rhythm.notes 有内容时用旧格式 makeChart。
 */
export { mountRhythm } from './rhythm-game.js';

/**
 * 管道 · 数据流向 (阿哲): route the secret into the server, not into the package you are about to ship.
 */
export { mountPipes } from './pipe-game.js';

/**
 * 经营 · 权限的代价 (王奶奶)：王奶奶一案的复刻练习——亲手做一个「奶奶牌手电筒」，从 1.0 发到 1.8，
 * 每版一张提案，每项权限都要对得上用户看得见的功能。规则在 manage-engine.js，画面在 manage-game.js。
 */
export { mountManage } from './manage-game.js';

/**
 * 卡牌 · 当面对质 (小林)：拿沙盒里抓到的记录，一句句核对小账本客服发来的《隐私说明》。
 * 逆转裁判式交叉询问：追问、出示证据、或判属实。规则在 cards-engine.js，画面在 cards-game.js。
 */
export { mountCards } from './cards-game.js';
// 排雷 · 权限扫描：格子是「新版悄悄加上去的条目」，插旗标记 + 数字推理就是安全排查。
// 规则在 mines-engine.js，画面在 mine-game.js。
export { mountMines } from './mine-game.js';
