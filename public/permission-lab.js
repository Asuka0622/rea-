// 开灯用得上吗 的规则（没有界面，Node 测试直接跑）。
// 剧情位置：王奶奶的手电筒一案。王奶奶最后要的是一句话：「拒绝它，灯还亮不亮？」——所以这里不靠猜，
// 靠实验：在 REA 沙盒里把几项权限拿掉，按一下开灯，看灯亮不亮、监视器记下了什么。
// 每条判断都要有一次实验撑腰：拿掉它灯还亮 → 开灯用不上；灯不亮、而且拿掉的里面只剩它说不清 → 开灯要用。
// 一次拿掉好几项能省实验，可灯一旦不亮，就得自己拆开排查是哪一项（控制变量）。

// 每项权限在沙盒里的表现：允许时它干了什么，拒绝时发生了什么。lab.permissions 里同名字段可以覆盖。
export const PERM_BEHAVIOR = {
  flashlight: { denied: "开灯失败：没有闪光灯权限。", use: "开灯本身。" },
  camera: { denied: "开灯失败：这台手机要先有相机权限，才能控制闪光灯。", use: "这台手机控制闪光灯要经过相机。" },
  internet: { allowed: "广告条加载出来；TrackService 把收集到的东西发往 quickads。", denied: "广告位空白，所有上传都失败了。", use: "给广告和 TrackService 往外发数据。" },
  contacts: { allowed: "TrackService 读取了通讯录，23 条。", denied: "TrackService 想读通讯录，被拒绝。", use: "TrackService 读通讯录（王奶奶儿女的电话）。" },
  location: { allowed: "TrackService 取到了精确位置。", denied: "TrackService 想取位置，被拒绝。", use: "TrackService 记下王奶奶在哪儿。" },
  "phone-state": { allowed: "quickads 读到了设备识别码。", denied: "quickads 想读设备识别码，被拒绝。", use: "quickads 用设备识别码认出这台手机。" },
  boot: { reboot: true, allowed: "开机 → BootReceiver 自己醒了，ContactSyncService 开始跑。", denied: "开机以后它一动不动，直到王奶奶自己点开。", use: "开机就自己启动，在后台常驻。" },
};

export function createPermissionLab(rows) {
  const perms = rows.map((row) => ({ ...PERM_BEHAVIOR[row.id], ...row }));
  const state = { denied: new Set(), runs: [], verdicts: new Map(), seenUse: new Set(), mistakes: 0, done: false };
  const find = (id) => perms.find((p) => p.id === id);

  function toggle(id) {
    if (state.denied.has(id)) state.denied.delete(id);
    else state.denied.add(id);
    return state.denied.has(id);
  }

  /** 做一次实验：tap = 打开手电筒按一下；reboot = 重启手机。 */
  function run(kind = "tap") {
    const denied = new Set(state.denied);
    const lines = [];
    let lit = null;
    if (kind === "tap") {
      const blockers = perms.filter((p) => p.need && denied.has(p.id));
      lit = blockers.length === 0;
      lines.push(lit ? "按一下：灯亮了。" : blockers[0].denied || "开灯失败。");
      for (const p of perms) {
        if (p.reboot || p.need) continue;
        const text = denied.has(p.id) ? p.denied : p.allowed;
        if (text) lines.push(text);
        if (!denied.has(p.id) && p.allowed) state.seenUse.add(p.id);
      }
      for (const p of perms) if (p.need && !denied.has(p.id) && lit) state.seenUse.add(p.id);
    } else {
      for (const p of perms.filter((x) => x.reboot)) {
        lines.push(denied.has(p.id) ? p.denied : p.allowed);
        if (!denied.has(p.id)) state.seenUse.add(p.id);
      }
      if (lines.length === 0) lines.push("重启了一次，什么都没发生。");
    }
    const entry = { n: state.runs.length + 1, kind, denied: [...denied], lit, lines };
    state.runs.push(entry);
    return entry;
  }

  /** 哪次实验能撑起「它开灯要用 / 用不上」这句话；没有就是 null。 */
  function evidenceFor(id, need) {
    const known = (x) => state.verdicts.get(x) === false;
    for (const r of state.runs) {
      if (r.kind !== "tap" || !r.denied.includes(id)) continue;
      if (!need && r.lit) return r;
      // 灯不亮：拿掉的里面，除了它，别的都已经证明开灯用不上，才能怪到它头上。
      if (need && r.lit === false && r.denied.every((x) => x === id || known(x) || lit(x))) return r;
    }
    return null;
  }
  // 某项在任何一次亮灯的实验里被拿掉过，就说明它开灯用不上（哪怕还没判）。
  const lit = (id) => state.runs.some((r) => r.kind === "tap" && r.lit && r.denied.includes(id));

  /** 判一项：要有实验撑腰；和实验矛盾的判断算一次失误。 */
  function judge(id, need) {
    const p = find(id);
    if (!p || state.verdicts.has(id)) return null;
    if (Boolean(p.need) !== need) {
      const against = evidenceFor(id, !need);
      state.mistakes += 1;
      return { ok: false, why: against ? `实验 #${against.n} 正好相反：${need ? "拿掉它，灯照样亮。" : "拿掉它，灯就不亮了。"}` : `${p.label}：${p.why || "再想想。"}先做个实验看看。` };
    }
    const proof = evidenceFor(id, need);
    if (!proof) return { ok: false, noProof: true, why: need ? "还没有实验能说明是它让灯不亮：只拿掉它（或者把别的都排除掉）再试一次。" : "还没有实验能说明拿掉它灯照样亮：把它拿掉，按一下试试。" };
    state.verdicts.set(id, need);
    state.done = state.verdicts.size === perms.length;
    return { ok: true, proof, why: p.why };
  }

  const tapRuns = () => state.runs.filter((r) => r.kind === "tap").length;
  return { perms, state, toggle, run, judge, evidenceFor, find, tapRuns };
}
