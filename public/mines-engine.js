// 排雷 · 权限扫描（版本侦探的动手环节）。
//
// 借的是扫雷：格子里不是地雷，是「一个新版本悄悄加上去的条目」——权限、第三方 SDK、后台服务、
// 开放端口。数字是周围八格里有几个真正危险的项。玩家要做的事和真实的安全排查一模一样：
// 先标记可疑的，再排除安全的；翻开一个危险项就等于放行了它。
//
// 规则在这个文件里（Node 里能跑，test/mines-engine.test.mjs 用它验），画面见 mine-game.js。
//
// 数据（samples/cases/<id>/workbench-case.json 的 game.lab.mines）：
//   { size, brief, safe: [{id,label,note}], risks: [{id,label,why}] }
// 不提供就用 defaultMines()：一个「只更新了一句修复若干问题」的新版清单。

export const MINES_LIVES = 3;

/** 32 位确定性随机：同一个种子布出来的雷区一样，测试和调试都能复现。 */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 默认盘面：一版「只写了修复若干问题」的更新，悄悄多出来的东西。 */
export function defaultMines() {
  return {
    size: 6,
    brief: "更新说明只写了一句「修复若干问题」。这份是新版的权限与依赖清单——多出来的东西混在里面。",
    safe: [
      { id: "read-storage", label: "读本机文件", note: "它要把算过的历史存下来。" },
      { id: "vibrate", label: "振动", note: "按键反馈，一直都有。" },
      { id: "keep-screen", label: "保持屏幕常亮", note: "算长式子时不黑屏。" },
      { id: "theme", label: "换主题色", note: "新加的，但只改自己的界面。" },
      { id: "clipboard-paste", label: "粘贴", note: "把算式粘进来，得你按了才读。" },
      { id: "history-export", label: "导出历史", note: "存成 txt，只存它自己算的。" },
      { id: "dark-mode", label: "深色模式", note: "新功能，跟数据无关。" },
      { id: "widget", label: "桌面小组件", note: "显示上次的结果，只读自己的。" },
    ],
    risks: [
      { id: "read-contacts", label: "读通讯录", why: "一个计算器读通讯录，没有任何算法用得上它——它拿到的是你的关系网。" },
      { id: "read-sms", label: "读短信", why: "短信里有验证码。这一条加上，任何账号都能被它接管。" },
      { id: "location-bg", label: "后台定位", why: "关掉 App 还在记你去过哪。计算器不需要知道你人在哪。" },
      { id: "sdk-ad", label: "广告 SDK · 3 家", why: "三家广告 SDK 共用一份设备号，你的使用习惯被拼成了一张画像。" },
      { id: "sdk-analytics", label: "统计 SDK（含设备指纹）", why: "设备指纹不用登录也能认出你，换账号也没用。" },
      { id: "boot-start", label: "开机自启", why: "开机就起，你根本没打开它，它也在后台跑。" },
      { id: "remote-config", label: "远程配置下发", why: "今天它只算数，明天服务端一句话就能让它干别的——你审的这版不算数。" },
      { id: "upload-crash", label: "崩溃日志上传（含屏幕内容）", why: "崩溃时连你屏幕上算了什么都一起传走。" },
    ],
  };
}

/**
 * 布一个盘面。风险项随机落在格子里，其余是安全项；每个安全项取一条 note。
 * 返回的 board 是可变的（UI 直接改 cell.state），但所有判定都在本文件里。
 */
export function createMines(spec = defaultMines(), seed = Date.now() % 100000) {
  const size = Math.max(4, Math.min(12, Number(spec.size) || 6));
  const risks = (spec.risks || []).map((r) => ({ ...r }));
  const safe = (spec.safe || []).map((s) => ({ ...s }));
  const total = size * size;
  const cells = Array.from({ length: total }, (_, i) => ({
    i,
    x: i % size,
    y: Math.floor(i / size),
    risk: null,
    state: "hidden", // hidden | open | flag
  }));
  // 随机挑位置放风险项（Fisher-Yates，种子固定）。
  const rand = seeded(seed);
  const order = cells.map((c) => c.i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const riskCount = Math.min(risks.length, total - 4);
  for (let k = 0; k < riskCount; k += 1) {
    const cell = cells[order[k]];
    cell.risk = risks[k];
    cell.risk.label = risks[k].label;
    cell.risk.why = risks[k].why;
  }
  // 安全项按顺序填到剩下的格子。
  let s = 0;
  for (const cell of cells) {
    if (cell.risk) continue;
    const item = safe[s % Math.max(1, safe.length)] || { id: `safe-${s}`, label: "常规项", note: "" };
    cell.safe = { ...item };
    s += 1;
  }
  const board = {
    size,
    cells,
    brief: spec.brief || "",
    lives: MINES_LIVES,
    status: "playing", // playing | won | lost
    opened: 0,
    flagged: 0,
    mistakes: 0,
    riskCount,
    notes: [],
  };
  paintNumbers(board);
  return board;
}

/** 每个格子的数字：周围八格里有几个风险项。 */
export function paintNumbers(board) {
  for (const cell of board.cells) {
    cell.around = around(board, cell.x, cell.y).filter((n) => n.risk).length;
  }
  return board;
}

export function around(board, x, y) {
  const out = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= board.size || ny >= board.size) continue;
      out.push(board.cells[ny * board.size + nx]);
    }
  }
  return out;
}

export const cellAt = (board, x, y) =>
  x < 0 || y < 0 || x >= board.size || y >= board.size ? null : board.cells[y * board.size + x];

/**
 * 翻开一格。翻到风险项：扣一条命、记一条「你放行了谁」，格子标成 open（显示 why）。
 * 翻到安全的空格（周围 0 个风险）：连片展开——真实排查里，一片干净的地方可以一次看完。
 */
export function reveal(board, x, y) {
  const cell = cellAt(board, x, y);
  if (!cell || board.status !== "playing") return { board, cell: null, hit: null, opened: [] };
  if (cell.state !== "hidden") return { board, cell, hit: null, opened: [] };
  const opened = [];
  if (cell.risk) {
    cell.state = "open";
    board.lives -= 1;
    board.mistakes += 1;
    board.opened += 1;
    board.notes.push({ kind: "hit", text: cell.risk.why, label: cell.risk.label });
    if (board.lives <= 0) board.status = "lost";
    return { board, cell, hit: cell.risk, opened: [cell] };
  }
  // 安全格：翻开；如果周围没有风险，按四邻连片展开（不用八邻，展开得克制一点）。
  const queue = [cell];
  const seen = new Set();
  while (queue.length) {
    const c = queue.shift();
    if (seen.has(c.i)) continue;
    seen.add(c.i);
    if (c.state !== "hidden") continue;
    c.state = "open";
    opened.push(c);
    board.opened += 1;
    if (c.risk) continue;
    if (c.around === 0) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = cellAt(board, c.x + dx, c.y + dy);
        if (n && n.state === "hidden" && !n.risk) queue.push(n);
      }
    }
  }
  checkWin(board);
  return { board, cell, hit: null, opened };
}

/** 插旗 / 取消插旗。旗子只能插在没翻开的格子上。 */
export function toggleFlag(board, x, y) {
  const cell = cellAt(board, x, y);
  if (!cell || board.status !== "playing" || cell.state === "open") return { board, cell };
  cell.state = cell.state === "flag" ? "hidden" : "flag";
  board.flagged = board.cells.filter((c) => c.state === "flag").length;
  // 旗子插对了（标的是风险项）算一次正确判断，记一笔给结算用。
  checkWin(board);
  return { board, cell };
}

/** 标出全部风险项、且没有踩满三次，就算通过。 */
export function checkWin(board) {
  if (board.status !== "playing") return board.status;
  const risks = board.cells.filter((c) => c.risk);
  const flaggedRisks = risks.filter((c) => c.state === "flag").length;
  if (flaggedRisks === risks.length) board.status = "won";
  return board.status;
}

/** 结算：找到几个、误标几个、踩了几个。 */
export function minesSummary(board) {
  const risks = board.cells.filter((c) => c.risk);
  return {
    status: board.status,
    riskCount: risks.length,
    found: risks.filter((c) => c.state === "flag").length,
    missed: risks.filter((c) => c.state === "flag" ? false : c.state !== "open").length,
    stepped: board.mistakes,
    lives: board.lives,
    safeOpened: board.cells.filter((c) => !c.risk && c.state === "open").length,
    safeTotal: board.cells.filter((c) => !c.risk).length,
    flaggedSafe: board.cells.filter((c) => !c.risk && c.state === "flag").length,
  };
}

/** 当前还活着？UI 用它决定能不能继续点。 */
export const minesPlaying = (board) => board.status === "playing";
