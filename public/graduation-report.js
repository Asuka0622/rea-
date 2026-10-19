import { cleanGameRecord, gameRecordLines, renderGameRecord } from './graduation-game-record.js';
import { validPhoto, loadDetectivePhoto, photoLabel, renderDetectivePhoto } from './detective-id.js';
import { cleanHabits, habitNotes } from './detective-habits.js';
// Local, evidence-based end-of-demo report. No model call or external telemetry.
export const GRADUATION_KEY = 'rea-demo-graduation-v1';
export const OBSERVATIONS_KEY = 'rea-case-observations-v1';
const number = value => Number.isFinite(value) ? Math.max(0, Math.min(10000, Math.floor(value))) : 0;
const unique = value => [...new Set(value instanceof Set ? [...value] : Array.isArray(value) ? value : [])];
function read(storage, key) { try { return JSON.parse(storage?.getItem(key) || 'null'); } catch { return null; } }
function write(storage, key, value) { try { storage?.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }

export function caseObservation(item, state, stars = 0) {
  const items = item.game?.puzzle?.scene?.items || [];
  const seen = new Set(unique(state.seen));
  const clues = items.filter(item => item.clue);
  const extras = items.filter(item => !item.clue);
  return {
    id: item.id, title: item.game?.client?.name || item.title,
    clues: clues.filter(item => seen.has(item.id)).length, clueTotal: clues.length,
    extras: extras.filter(item => seen.has(item.id)).length, extraTotal: extras.length,
    evidence: unique(unique(state.evidence).map(item => typeof item === 'string' ? item : item?.id).filter(id => typeof id === 'string')).length,
    words: unique(state.words).length, hints: number(state.hints), mistakes: number(state.mistakes),
    retries: number(state.fails), spent: number(state.spent), stars: Math.min(3, number(stars)),
    verified: state.phase === 'done' && (item.game?.puzzle?.board?.length || 0) > 0 && unique(state.solved).length === item.game.puzzle.board.length,
  };
}

// Capture at completion, so later text/art revisions do not erase the player's behavior history.
export function recordCaseObservation(item, state, stars, storage = globalThis.localStorage) {
  const old = read(storage, OBSERVATIONS_KEY);
  const records = old?.version === 1 && old.cases && typeof old.cases === 'object' ? old.cases : {};
  return write(storage, OBSERVATIONS_KEY, { version: 1, cases: { ...records, [item.id]: caseObservation(item, state, stars) } });
}

function sanitizeObservation(raw, item) {
  const result = caseObservation(item, {}, raw.stars);
  for (const key of ['evidence','words','hints','mistakes','retries','spent']) result[key] = number(raw[key]);
  result.clues = Math.min(result.clueTotal, number(raw.clues));
  result.extras = Math.min(result.extraTotal, number(raw.extras));
  result.verified = raw.verified === true;
  return result;
}

export function collectGraduationRecords(items, storage = globalThis.localStorage) {
  const archive = read(storage, OBSERVATIONS_KEY);
  const stars = read(storage, 'rea-workbench-case-stars') || {};
  return items.map(item => {
    const archived = archive?.version === 1 ? archive.cases?.[item.id] : null;
    if (archived && typeof archived === 'object') return sanitizeObservation(archived, item);
    // Older players can still receive a report; never reinterpret absent records as poor play.
    const checkpoint = read(storage, `rea-case-checkpoint-v1:${item.id}`);
    if (checkpoint?.version === 1 && checkpoint.phase === 'done') return caseObservation(item, checkpoint, stars[item.id]);
    return null;
  }).filter(Boolean);
}

export function buildGraduationReport({ records = [], caseCount = 3, talked = [], eggs = [], habits = {}, photo = null, gameRecord = {}, now = new Date().toISOString(), sample = false } = {}) {
  const seen = new Set();
  const cases = records.filter(record => record && typeof record.id === 'string' && !seen.has(record.id) && seen.add(record.id));
  const total = key => cases.reduce((sum, record) => sum + number(record[key]), 0);
  const facts = { recorded: cases.length, caseCount, clues: total('clues'), clueTotal: total('clueTotal'), extras: total('extras'), extraTotal: total('extraTotal'), evidence: total('evidence'), hints: total('hints'), mistakes: total('mistakes'), retries: total('retries'), verified: cases.filter(record => record.verified).length, talked: unique(talked).length, eggs: unique(eggs).length };
  const coverage = facts.clueTotal ? facts.clues / facts.clueTotal : 0;
  let style = '会让证据开口的侦探';
  if (facts.recorded === 0) style = '留了一点神秘感的侦探';
  else if (facts.retries > 0 || facts.mistakes >= 4) style = '把弯路也查成线索的侦探';
  else if (coverage >= .8 && facts.extras > 0) style = '连窗台也不放过的侦探';
  else if (facts.hints >= 3) style = '懂得借一盏灯的侦探';
  else if (coverage < .6 && facts.evidence >= 6) style = '从代码缝里追真相的侦探';
  else if (facts.mistakes === 0 && facts.verified > 0) style = '下结论前先跑一遍的侦探';
  const notes = [];
  if (facts.recorded) {
    notes.push({ title: '你从哪里找线索', text: coverage >= .8
      ? `档案里 ${facts.clueTotal} 条现场线索，你看过 ${facts.clues} 条。别人急着开电脑的时候，你还愿意回头看看房间。${facts.extras ? `连 ${facts.extras} 处委托之外的小物件也没放过。你的好奇心，有时候比委托书还厚。` : '事务所很需要这种肯多看一眼的人。'}`
      : `你调查了 ${facts.clues}/${facts.clueTotal} 条现场线索，收下 ${facts.evidence} 件证据。${facts.evidence >= 6 ? '你常常直接追进代码里，让源码交代事情经过。电脑还没凉，案子就有了方向。' : '你的调查有自己的取舍。没看过的角落，我没有替你填成“已经检查”。'}${facts.extraTotal && !facts.extras ? '下次不妨也看看那些与案子无关的小东西，小镇不只藏着答案。' : ''}` });
    notes.push({ title: '你怎样拿主意', text: facts.hints === 0
      ? '这几份记录里，你没有使用过提示。你愿意自己试着把线索连起来。不过别把独立办案误会成必须一个人扛着，事务所的灯也给你留着。'
      : `你使用了 ${facts.hints} 次提示。${facts.hints >= 3 ? '你知道什么时候该借一盏灯，再把路走完。会提问也是办案本领，提示不是扣在资格证上的污点。' : '你大多数时候自己找方向，卡住时也愿意听一句提醒。这样的搭档，小克愿意继续同行。'}` });
    notes.push({ title: '证据没有点头的时候', text: facts.retries || facts.mistakes
      ? `记录留下 ${facts.mistakes} 次错误${facts.retries ? `，其中对质重试 ${facts.retries} 次` : ''}。你最后还是把委托办完了。${facts.retries ? '被驳回后还能回来补证据，比第一次就说得响亮更值得记一笔。' : '有的反证没对上，有的操作走了弯路；幸好，真正的破案允许人改口。'}`
      : '留下记录的委托中，没有出现判错或对质重试。今天证据和你的判断站在了同一边。下次换一个陌生样本，依然要让它们重新对一遍。' });
    notes.push({ title: '从“我猜”到“我试过”', text: facts.verified
      ? `${facts.verified} 份委托留下了完成推理和验证的记录。你不只把故事讲圆，还让样本亲自演了一遍。事务所要颁给你的，正是这种把结论放回证据里检查的习惯。`
      : '旧记录不足以确认每一段实验的过程，所以这一栏先留白。能结案是一回事，能重现证据是另一回事；下次请把那次亲手验证也记下来。' });
  } else notes.push({ title: '一页诚实的留白', text: '你已经完成预告版，不过这份旧存档没有留下足够的过程记录。事务所确认你的见习侦探资格，却不能编出你有没有细看房间、问过几次提示。记录空白，不等于你办案马虎。' });
  const townNote = facts.talked || facts.eggs
    ? `镇上记得你和 ${facts.talked} 位居民聊过天${facts.eggs ? `，还发现了 ${facts.eggs} 处彩蛋` : ''}。这些是本机累计的镇上足迹，不计入这些委托的成绩。`
    : '居民交谈与彩蛋没有可用记录，这一栏不替你猜。';
  const next = !facts.recorded ? '下次办案时，把调查和验证的过程也留在手账里。'
    : facts.mistakes || facts.retries ? '下一次出示证据前，先用一句话说清：这条记录究竟能证明什么，又不能证明什么。'
    : facts.hints >= 3 ? '挑一条已经看过提示的线索，合上提示，在另一份样本里自己找一次。'
    : coverage < .8 ? '下次开电脑之前，先选一件容易忽略的物品调查。先听现场说话，再听代码说话。'
    : '换一份没见过的样本，再独立走一遍“观察、推理、验证”。把今天的熟练变成明天也能用的本领。';
  return { version: 1, copyVersion: 4, gameRecord: cleanGameRecord(gameRecord), subject: '路米', photo: validPhoto(photo), sample, issuedAt: now, rank: '见习侦探', style, facts, notes, townNote, next, cases, habits: cleanHabits(habits), funNotes: habitNotes(habits),
    closing: '准予结业。你不必马上知道所有答案，但要知道：下一条结论，应该去哪里找证据。',
    scope: `评语依据 ${facts.recorded}/${caseCount} 份可用委托过程记录，仅描述游戏里的办案习惯。${facts.recorded < caseCount ? '缺失的记录不作负面评价。' : ''}` };
}

export function loadGraduationReport(storage = globalThis.localStorage) {
  const report = read(storage, GRADUATION_KEY);
  const textFields = ['style','rank','issuedAt','scope','next','closing','townNote'];
  const valid = report?.version === 1 && report.sample === false && textFields.every(key => typeof report[key] === 'string') && Array.isArray(report.notes) && report.notes.every(note => note && typeof note.title === 'string' && typeof note.text === 'string') && Array.isArray(report.cases) && report.cases.every(item => item && typeof item.title === 'string') && (report.funNotes === undefined || (Array.isArray(report.funNotes) && report.funNotes.every(note => note && ['title','text','basis'].every(key => typeof note[key] === 'string')))) && report.facts && typeof report.facts === 'object';
  if (!valid) return null;
  if (report.copyVersion === 4 && report.subject === '路米') return report;
  const updated = buildGraduationReport({ records: report.cases, caseCount: report.facts.caseCount, habits: report.habits, gameRecord: report.gameRecord, photo: validPhoto(report.photo) || loadDetectivePhoto(storage), now: report.issuedAt });
  updated.townNote = report.townNote;
  updated.facts.talked = report.facts.talked;
  updated.facts.eggs = report.facts.eggs;
  write(storage, GRADUATION_KEY, updated);
  return updated;
}
export function saveGraduationReport(report, storage = globalThis.localStorage) { return write(storage, GRADUATION_KEY, report); }

export function graduationText(report) {
  const gameRecord = cleanGameRecord(report.gameRecord);
  return [report.sample ? '示例档案 · 非真实游戏记录' : '比特镇侦探事务所 · 结业报告', '受评人：路米', `证件照表情：${photoLabel(report.photo)}`, `结业资格：${report.rank}`, `办案印象：${report.style}`, '', '这一程，留下了什么', ...gameRecordLines(report.gameRecord).map(([label,text])=>`${label}：${text}`), '已解锁成就：'+(gameRecord.achievements.map(item=>item.title).join('、')||'未记录'), '学会的知识：'+(gameRecord.skills.join('、')||'未记录'), ...report.notes.flatMap(note => ['', note.title, note.text]), '', '小镇里的你', ...(report.funNotes || []).flatMap(note => [note.title, note.text, `记录依据：${note.basis}`]), '', report.townNote, '', '下一份委托前', report.next, '', report.closing, '签发：比特镇侦探事务所 · 档案室', '档案旁注：小克', '', report.scope, `签发时间：${report.issuedAt}`].join('\n');
}

export function downloadGraduationReport(report) {
  const url = URL.createObjectURL(new Blob(['\ufeff', graduationText(report)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = report.sample ? '见习侦探结业报告-示例.txt' : '见习侦探结业报告.txt';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderGraduationReport(h, report) {
  const date = Number.isFinite(Date.parse(report.issuedAt)) ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(report.issuedAt)) : '签发日期未记录';
  return h('article', { class: 'graduation-report', 'aria-label': '见习侦探结业报告' },
    ...(report.sample ? [h('p', { class: 'graduation-sample' }, '示例档案 · 下面是虚构试玩记录，不是你的成绩')] : []),
    h('header', { class: 'graduation-heading' }, h('span', { class: 'graduation-office' }, '比特镇侦探事务所'), h('time', { datetime: report.issuedAt }, date)),
    h('div', { class: 'graduation-title' }, h('div', {}, h('h2', {}, '见习侦探结业报告'), h('p', {}, '致路米，今天查明真相的你'), h('span', { class: 'graduation-qualified' }, '准予结业 · 见习侦探')), renderDetectivePhoto(h, report.photo)),
    renderGameRecord(h, report.gameRecord),
    h('p', { class: 'graduation-address' }, '根据路米的手账与委托记录，留下这样的办案印象——'),
    h('h3', { class: 'graduation-style' }, report.style),
    ...report.notes.map(note => h('section', { class: 'graduation-note' }, h('h4', {}, note.title), h('p', {}, note.text))),
    h('section', { class: 'graduation-fun' }, h('h4', {}, '小镇里的路米 · 小克的生活旁注'),
      ...((report.funNotes || []).length ? report.funNotes.map(note => h('div', { class: 'graduation-note' }, h('h4', {}, note.title), h('p', {}, note.text), h('details', {}, h('summary', {}, '这条旁注怎么来的'), h('p', {}, note.basis)))) : [h('p', {}, '这次还没有积累出足够的小镇生活记录。小克把旁注留给下一次同行，不急着替你贴标签。')])),
    h('p', { class: 'graduation-town' }, report.townNote),
    h('section', { class: 'graduation-next' }, h('h4', {}, '下一份委托前'), h('p', {}, report.next)),
    h('p', { class: 'graduation-closing' }, report.closing),
    h('footer', { class: 'graduation-signature' }, h('div', {}, '受评人', h('b', {}, '路米'), h('span', {}, '签发：事务所档案室')), h('p', {}, '小克：我只替记录作证。没有记下来的事，我就不猜了。')),
    h('details', { class: 'graduation-evidence' }, h('summary', {}, '这份评语根据什么写成？'), h('p', {}, report.scope), ...report.cases.map(item => h('p', {}, `${item.title}：现场线索 ${item.clues}/${item.clueTotal}，证据 ${item.evidence} 件，提示 ${item.hints} 次，错误 ${item.mistakes} 次，对质重试 ${item.retries} 次。`))),
    h('button', { class: 'btn graduation-save', type: 'button', onclick: () => downloadGraduationReport(report) }, report.sample ? '保存这份示例文本' : '保存我的结业报告'));
}
