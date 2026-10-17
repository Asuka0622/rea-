// 进阶副本 (docs/progression.md): the story cases are the easy pass — anyone can finish them. Each
// skill a case teaches also opens a ladder of drills on the same knowledge point, one step harder
// each time. A drill reuses the case's room and puzzle, and turns up the difficulty through a few
// plain switches: fewer hints, fewer attempts, decoys in the notebook, a clock.
//
// Data only, no DOM: the skill tree renders this, case-session reads `harder`, and the tests keep the
// ladder honest.

export const TIERS = ["熟练", "精通", "专家"];

/** Words a drill slips into the notebook that the sample code never uses: searching them wastes a turn. */
const DECOYS = [{ zh: "键盘记录", code: "keyLogger" }, { zh: "后台服务", code: "daemonWorker" }];

/** One ladder per skill: `harder` is what the case does differently, `why` says it to the player. */
export const SKILL_DRILLS = {
  privacy: [
    { id: "privacy-1", tier: 1, title: "三条可疑的承诺", why: "关掉推理提示：这次自己判断哪一条和代码对不上。", harder: { hints: false } },
    { id: "privacy-2", tier: 2, title: "两种说法都像真的", why: "小词典混进两个干扰词，找错词就查不到东西。", harder: { hints: false, decoys: DECOYS } },
    { id: "privacy-3", tier: 3, title: "小林在催你", why: "限时，而且对质只允许错一次。", harder: { hints: false, decoys: DECOYS, mistakes: 1, timer: 240 } },
  ],
  secrets: [
    { id: "secrets-1", tier: 1, title: "不是每一把都能用", why: "关掉推理提示，四把钥匙里混着示例值。", harder: { hints: false } },
    { id: "secrets-2", tier: 2, title: "名字很像的假钥匙", why: "小词典加两个干扰词，专挑长得像的那些。", harder: { hints: false, decoys: DECOYS } },
    { id: "secrets-3", tier: 3, title: "发布前十分钟", why: "限时，对质只错一次；漏掉一把就算没查完。", harder: { hints: false, decoys: DECOYS, mistakes: 1, timer: 240 } },
  ],
  permissions: [
    { id: "permissions-1", tier: 1, title: "灯得亮，数据不能走", why: "关掉推理提示，自己分清必需权限和多余权限。", harder: { hints: false } },
    { id: "permissions-2", tier: 2, title: "它说是为了你好", why: "小词典混进两个干扰词；每条多余权限都有借口。", harder: { hints: false, decoys: DECOYS } },
    { id: "permissions-3", tier: 3, title: "自启动会偷偷补回来", why: "限时，对质只错一次。", harder: { hints: false, decoys: DECOYS, mistakes: 1, timer: 240 } },
  ],
  backdoor: [
    { id: "backdoor-1", tier: 1, title: "最后两个键", why: "关掉推理提示，练习册缺了最后两个键。", harder: { hints: false } },
    { id: "backdoor-2", tier: 2, title: "被人改过的练习册", why: "小词典加两个干扰词，提示本身也可能是错的。", harder: { hints: false, decoys: DECOYS } },
    { id: "backdoor-3", tier: 3, title: "彩蛋还是后门", why: "限时，对质只错一次：结论说错就白查。", harder: { hints: false, decoys: DECOYS, mistakes: 1, timer: 240 } },
  ],
  format: [
    { id: "format-1", tier: 1, title: "自己算校验和", why: "关掉推理提示，公式得自己从两份存档里看出来。", harder: { hints: false } },
    { id: "format-2", tier: 2, title: "改两处不能打架", why: "小词典混进两个干扰词，还有一处冗余字段会拖后腿。", harder: { hints: false, decoys: DECOYS } },
    { id: "format-3", tier: 3, title: "只允许挖一次副本", why: "限时，对质只错一次：改坏了没有第二次。", harder: { hints: false, decoys: DECOYS, mistakes: 1, timer: 240 } },
  ],
  versions: [
    { id: "versions-1", tier: 1, title: "四十处无关改动", why: "关掉推理提示，重命名和缩进都会来搅局。", harder: { hints: false } },
    { id: "versions-2", tier: 2, title: "更新说明没说全", why: "小词典加两个干扰词，挑错一处就冤枉了开发。", harder: { hints: false, decoys: DECOYS } },
    { id: "versions-3", tier: 3, title: "今晚就要答复周姐", why: "限时，对质只错一次。", harder: { hints: false, decoys: DECOYS, mistakes: 1, timer: 240 } },
  ],
};

/** Which case teaches each skill: a drill replays that case's room and puzzle. */
export const CASE_OF_SKILL = {
  privacy: "privacy-ledger",
  secrets: "weather-keys",
  permissions: "flashlight-apk",
  backdoor: "calculator-eggs",
  format: "farm-save",
  versions: "notes-versions",
};

export const caseFor = (skillId) => CASE_OF_SKILL[skillId] || null;

const bySkill = new Map(Object.entries(SKILL_DRILLS));

/** The drills a skill offers, in tier order. */
export const drillsFor = (skillId) => [...(bySkill.get(skillId) || [])].sort((a, b) => a.tier - b.tier);

/** How many stars a finished drill is worth: 3 clean, 2 with a slip, 1 for scraping through. */
export function starsFor({ mistakes = 0, hintsUsed = 0 } = {}) {
  if (mistakes > 1 || hintsUsed > 1) return 1;
  if (mistakes === 1 || hintsUsed === 1) return 2;
  return 3;
}

/** Best result wins; a worse replay never lowers the record. */
export function recordStars(stars, id, earned) {
  const next = { ...stars };
  next[id] = Math.max(next[id] || 0, Math.max(0, Math.min(3, earned)));
  return next;
}

/**
 * The ladder as the tree draws it: tier 1 opens once the skill is lit (the story case is done), tier 2
 * needs 2 stars on tier 1, tier 3 needs 3 stars on tier 2. A cleared drill stays replayable.
 */
export function ladderFor(skillId, { lit = false, stars = {} } = {}) {
  const drills = drillsFor(skillId);
  return drills.map((drill, index) => {
    const got = stars[drill.id] || 0;
    const prev = drills[index - 1];
    const need = index === 0 ? null : { drill: prev, stars: index === 1 ? 2 : 3 };
    const met = Boolean(lit) && (!need || (stars[need.drill.id] || 0) >= need.stars);
    return {
      ...drill,
      stars: got,
      state: !lit ? "closed" : got ? "cleared" : met ? "open" : "locked",
      needs: met || !need ? "" : `先拿到「${need.drill.title}」的 ${need.stars} 星`,
    };
  });
}

/** A skill's drill progress, for the node badge and the branch totals. */
export function skillMastery(skillId, { lit = false, stars = {} } = {}) {
  const ladder = ladderFor(skillId, { lit, stars });
  const cleared = ladder.filter((drill) => drill.stars > 0).length;
  const total = ladder.length;
  return {
    cleared,
    total,
    stars: ladder.reduce((sum, drill) => sum + drill.stars, 0),
    max: total * 3,
    next: ladder.find((drill) => drill.state === "open" || drill.state === "locked") || null,
    permed: total > 0 && cleared === total && ladder.every((drill) => drill.stars === 3),
  };
}

/** Every skill that has drills, for the tree's summary line. */
export const drillSkills = () => [...bySkill.keys()];
