// 卡牌 · 当面对质 的规则（没有界面，Node 测试直接跑）。
// 剧情位置：小账本一案。小林去问了小账本的客服，客服发来一份《隐私说明》。玩家拿沙盒里抓到的记录
// 一句句核对——这就是安全研究员的日常：把「它说它做了什么」和「它实际做了什么」放在一起比。
// 借逆转裁判的交叉询问：每句话可以「追问」（对方会多说一点，有时说漏嘴换一种说法）、
// 「出示」一件证据驳倒它，或者判它「属实」。说说明里有真话：冤枉一句真话和放过一句假话一样扣信任。

// 证据卡只写原始记录，不写结论：看懂它说明什么，是玩家的事。
export const LEDGER_EVIDENCE = [
  { id: "boot-report", label: "监视器 · 启动那一刻", record: "00:00 打开小账本，什么都没点 → POST collect.quiet-stats.example/v2/report" },
  { id: "report-body", label: "那条上报的内容", record: '{ device: { host: "XIAOLIN-PC", user: "xiaolin", platform: "win32", memory: 17179869184 }, clipboard: "BAIT-7Q2K" }' },
  { id: "clip-timer", label: "监视器 · 剪贴板", record: "00:30 clipboard.readText()　01:00 clipboard.readText()　01:30 clipboard.readText() …" },
  { id: "sync-click", label: "监视器 · 点了「同步」", record: "02:10 点「同步」→ POST api.ledger-sync.example/v1/sync　内容：[{ 金额: 25, 备注: \"午饭\" }]" },
  { id: "two-hosts", label: "代码 main.js 开头", record: 'SYNC_URL = "https://api.ledger-sync.example/v1/sync"\nSTATS_URL = "https://collect.quiet-stats.example/v2/report"' },
  { id: "store", label: "代码 main.js · 记一笔", record: 'store.set("entries", entries)　// electron-store：存在本机的文件里' },
];

// 每句话：truth 是它真不真；refute 是能驳倒它的证据；press 是追问时对方多说的话，
// 有 then 的追问会让对方换一种说法（旧的那句收回，新的一句接着对质）。
export const LEDGER_STATEMENTS = [
  { id: "online", text: "小账本只在你点「同步」的时候才联网。", truth: false, refute: ["boot-report"],
    press: "联网就是为了同步。你不点，它就安安静静的。",
    why: "启动那一刻，什么都没点，它就向 quiet-stats 发了一条。" },
  { id: "sync", text: "同步时只上传你的账目，用来在别的设备上恢复。", truth: true,
    press: "同步到 api.ledger-sync.example，内容就是你记的那些账。",
    why: "对：点「同步」时发出去的就是账目，地址也是同步服务器。" },
  { id: "unrelated", text: "我们从不读取和记账无关的东西。", truth: false, refute: ["clip-timer"],
    press: "呃……剪贴板吗？那是方便你把金额粘贴进来。",
    then: { id: "paste", text: "读剪贴板只是方便你粘贴金额，读完就丢，不会存也不会发。", truth: false, refute: ["report-body"],
      press: "我们对天发誓，剪贴板的内容从来没离开过你的电脑。",
      why: "上报里带着 clipboard——你复制的诱饵 BAIT-7Q2K 原样被发走了。" },
    why: "没人点粘贴，它每 30 秒自己读一次剪贴板。" },
  { id: "anon", text: "启动时的统计是匿名的，只有设备型号这类信息。", truth: false, refute: ["report-body"],
    press: "匿名的意思是：我们不知道你是谁。",
    why: "上报里有电脑名 XIAOLIN-PC 和用户名 xiaolin，这叫认得出你是谁。" },
  { id: "local", text: "你记的账保存在你自己的电脑上。", truth: true,
    press: "不点同步，账目就只在本机。",
    why: "对：记一笔是写进本机的 electron-store 文件。" },
  { id: "third", text: "我们只和自己的同步服务器通信，不把数据交给别人。", truth: false, refute: ["two-hosts", "boot-report"],
    press: "我们的服务器只有一个，就是 ledger-sync。",
    why: "代码里写着两个地址：除了 ledger-sync，还有一个说明里从没提过的 quiet-stats。" },
];

export function createCrossExam(spec = {}) {
  const evidence = spec.evidence || LEDGER_EVIDENCE;
  const trustMax = spec.trust ?? 5;
  const state = { statements: (spec.statements || LEDGER_STATEMENTS).map((s) => ({ ...s, status: "open", pressed: false })), trust: trustMax, trustMax, mistakes: 0, status: "playing" };
  const find = (id) => state.statements.find((s) => s.id === id);
  const card = (id) => evidence.find((e) => e.id === id);

  function lose() {
    state.trust -= 1;
    state.mistakes += 1;
    if (state.trust <= 0) state.status = "lost";
  }
  function settle() {
    if (state.status === "playing" && state.statements.every((s) => s.status !== "open")) state.status = "won";
  }

  /** 追问：对方多说一句。有 then 的，旧说法收回，换成新的一句。 */
  function press(id) {
    const s = find(id);
    if (!s || s.status !== "open" || state.status !== "playing") return null;
    s.pressed = true;
    if (s.then) {
      s.status = "withdrawn";
      const next = { ...s.then, status: "open", pressed: false, from: s.id };
      state.statements.splice(state.statements.indexOf(s) + 1, 0, next);
      return { line: s.press, replaced: next };
    }
    return { line: s.press };
  }

  /** 出示证据：对得上就驳倒；拿证据去指控一句真话，或者证据说明不了这句，都扣信任。 */
  function present(id, cardId) {
    const s = find(id);
    const e = card(cardId);
    if (!s || !e || s.status !== "open" || state.status !== "playing") return null;
    if (!s.truth && s.refute?.includes(cardId)) {
      s.status = "refuted";
      s.by = cardId;
      settle();
      return { ok: true, why: s.why };
    }
    lose();
    return { ok: false, why: s.truth ? "这句是真话：拿证据硬指控，只会让人觉得你在找茬。" : `「${e.label}」说明不了这一句。`, record: e.record };
  }

  /** 判「属实」：真话就对；把假话放过去扣信任。 */
  function affirm(id) {
    const s = find(id);
    if (!s || s.status !== "open" || state.status !== "playing") return null;
    if (s.truth) {
      s.status = "true";
      settle();
      return { ok: true, why: s.why };
    }
    lose();
    return { ok: false, why: "这句其实对不上记录。放过一句假话，小林就会被它骗过去。" };
  }

  const open = () => state.statements.filter((s) => s.status === "open");
  /** 给小林的体检报告：每句话的结论和依据。 */
  const report = () => state.statements.filter((s) => s.status === "refuted" || s.status === "true")
    .map((s) => ({ text: s.text, verdict: s.status === "true" ? "属实" : "不实", by: s.by ? card(s.by)?.label : null }));

  return { state, evidence, press, present, affirm, open, report, find };
}
