// 延时实验（周姐的随手便签）的规则（没有界面，Node 测试直接跑）。
// 沙盒里装一个版本（1.0 或 1.1），时钟从早上 9:00 开始，玩家自己决定快进多久；行为监视器把它做的事一条条记下来。
// 照着样本 samples/cases/notes-versions/v1.1/main.js：每 10 分钟截一张屏（先攒在内存里），
// 每分钟看一眼钟，到 23:58 就把攒下的截图一起送去 collect.quiet-stats.example。1.0 什么都不发，能导出文本。
// 和行为监视器一样，玩家要挑一条记录钉给「要证明的事」。

export const TIMELAPSE_HOST = "collect.quiet-stats.example";
export const DAY_START = 9 * 60; // 09:00
export const DAY_END = 24 * 60; // 24:00

export const TIMELAPSE_CLAIMS = [
  { id: "capture", text: "1.1 会自己截屏", hint: "装 1.1，什么都不点，快进 10 分钟看看监视器。" },
  { id: "batch", text: "截图是攒着、半夜一起送走的", hint: "截图不是马上发的。一直快进到快半夜，盯着 23:58 那一分钟。" },
  { id: "export", text: "1.1 删掉了「导出为文本」", hint: "在 1.1 里点一下「导出为文本」。再在 1.0 里点一下对照。" },
  { id: "control", text: "对照：1.0 一整天什么都不发", hint: "装 1.0，一直快进过 23:58，看它一整天到底发没发东西。" },
];

export const clockText = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function createTimelapse() {
  const state = { version: null, now: DAY_START, pending: 0, log: [], captures: 0, sent: 0 };
  const record = (row) => {
    const entry = { ...row, id: state.log.length, version: state.version, at: clockText(state.now) };
    state.log.push(entry);
    return entry;
  };

  /** 装一个版本：重新开机，时钟回到 9:00，攒着的截图清空。 */
  function install(version) {
    state.version = version;
    state.now = DAY_START;
    state.pending = 0;
    state.captures = 0;
    state.sent = 0;
    return record({ kind: "boot", text: `装上随手便签 ${version}，打开它。` });
  }

  /** 快进若干分钟：一分钟一分钟地走，这期间它自己做的事都记下来。 */
  function advance(minutes) {
    if (!state.version) return [];
    const rows = [];
    const until = Math.min(DAY_END, state.now + Math.max(0, minutes | 0));
    while (state.now < until) {
      state.now += 1;
      const running = state.now - DAY_START;
      if (state.version === "1.1" && running % 10 === 0) {
        state.pending += 1;
        state.captures += 1;
        // 连着的截图合成一行，免得刷屏
        const last = state.log.at(-1);
        if (last?.kind === "capture" && last.version === "1.1") {
          last.count += 1;
          last.to = clockText(state.now);
          last.pending = state.pending;
        } else rows.push(record({ kind: "capture", count: 1, pending: state.pending, text: "desktopCapturer.getSources（截取屏幕）" }));
      }
      if (state.version === "1.1" && state.now % (24 * 60) === 23 * 60 + 58 && state.pending) {
        rows.push(record({ kind: "net", host: TIMELAPSE_HOST, images: state.pending, text: `POST ${TIMELAPSE_HOST}/v2/insight（${state.pending} 张截图）` }));
        state.sent += state.pending;
        state.pending = 0;
      }
      if (state.version === "1.0" && state.now === 23 * 60 + 59) {
        rows.push(record({ kind: "quiet", text: "1.0 从 9:00 跑到 23:59：截屏 0 次，联网 0 次。" }));
      }
    }
    return rows;
  }

  /** 玩家在便签里的操作。 */
  function act(what) {
    if (!state.version) return null;
    if (what === "note") return record({ kind: "note", text: "写了一张便签：只存在本机。" });
    if (what === "export") {
      return state.version === "1.0"
        ? record({ kind: "export", ok: true, text: "导出为文本：notes:export-txt → 便签.txt" })
        : record({ kind: "export", ok: false, text: "导出为文本：找不到这个功能（notes:export-txt 没有了）" });
    }
    return null;
  }

  return { state, install, advance, act };
}

/** 这一条记录能不能证明这件事。返回 { ok, why }。 */
export function timelapseProves(claimId, row) {
  if (!row) return { ok: false, why: "先在监视器里挑一条记录。" };
  if (claimId === "capture") {
    if (row.kind === "capture") return { ok: true, why: "你什么都没点，它自己调用了截屏。" };
    return { ok: false, why: "这条不是截屏的记录。" };
  }
  if (claimId === "batch") {
    if (row.kind === "net" && row.images > 1 && row.at === "23:58") return { ok: true, why: `23:58 那一分钟，攒了一天的 ${row.images} 张截图被一起送去了 ${row.host}。` };
    if (row.kind === "capture") return { ok: false, why: "这条说明它会截屏，可截下来以后呢？要找它把截图送走的那一条。" };
    return { ok: false, why: "要找的是 23:58 那条把截图一起送走的记录。" };
  }
  if (claimId === "export") {
    if (row.kind === "export" && !row.ok && row.version === "1.1") return { ok: true, why: "1.1 里点「导出为文本」，这个功能已经没了。" };
    if (row.kind === "export" && row.ok) return { ok: false, why: "这是 1.0 导出成功的记录：它能当对照，证明不了 1.1 删了导出。" };
    return { ok: false, why: "要找一条在 1.1 里点「导出」的记录。" };
  }
  if (claimId === "control") {
    if (row.kind === "quiet" && row.version === "1.0") return { ok: true, why: "同样跑一整天，旧版本一张都没截、一次都没发。" };
    return { ok: false, why: "要找 1.0 跑完一整天的那条总结。" };
  }
  return { ok: false, why: "这件事不在单子上。" };
}
