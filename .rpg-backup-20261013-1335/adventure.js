import { createWorldMap } from './maps.js';
// The quest reflects real analysis state; game presentation never invents results.
const $ = (selector) => document.querySelector(selector);
const TITLES = ['选择目标', '准备装备', '探索分析', '开启宝箱'];
const MESSAGES = [
  '欢迎来到营地。选一个软件，我们就能开始探索。',
  '目标已放进背包。确认一下装备，然后进入遗迹。',
  '探索进行中。向导会整理文件里的线索，请稍候。',
  '探索完成！宝箱已经解锁，打开它领取你的发现。',
];

function chestSvg() {
  return `<svg class="pixel-chest" viewBox="0 0 120 100" role="presentation" shape-rendering="crispEdges">
    <g class="chest-treasure"><path fill="#ead995" d="M58 0h5v13h-5zM19 14h5v10h-5zM93 10h5v12h-5zM8 40h12v4H8zM101 34h13v4h-13z"/><path fill="#fff4c7" d="M46 21h26v28H46zM36 31h47v18H36z"/></g>
    <path fill="#181e25" d="M15 63h90v31H15zM22 94h78v5H22z"/><path fill="#71442c" d="M19 65h82v25H19z"/><path fill="#a66934" d="M23 69h74v17H23z"/><path fill="#bd8d3e" d="M25 65h8v25h-8zM87 65h8v25h-8zM19 86h82v4H19z"/><path fill="#4e322b" d="M35 75h19v4H35zM68 75h17v4H68z"/>
    <g class="chest-lid"><path fill="#181e25" d="M15 51h5v-8h5v-7h70v7h5v8h5v15H15z"/><path fill="#85512f" d="M20 51h5v-7h7v-4h56v4h7v7h5v11H20z"/><path fill="#c88c3e" d="M25 47h70v7H25z"/><path fill="#efcf75" d="M31 40h8v22h-8zM81 40h8v22h-8zM20 57h80v5H20z"/><path fill="#e8bf54" d="M52 53h16v18H52z"/><path fill="#fff1a2" d="M56 56h8v6h-8z"/><path fill="#473829" d="M58 62h4v5h-4z"/></g>
  </svg>`;
}

export function createAdventure({ execute, reset, workshop, checkEngines, notice }) {
  let stage = 1;
  let state = 'idle';
  let pending = null;
  let opened = false;
  let total = 0;
  let rewardTimer;
  let generation = 0;
  const world = createWorldMap();
  const art = $('#treasure-art');
  art.innerHTML = chestSvg(); // Authored static geometry only; no user data enters markup.
  const particles = document.createElement('div');
  particles.className = 'loot-particles';
  for (let i = 0; i < 12; i++) {
    const spark = document.createElement('span');
    spark.style.setProperty('--x', `${((i * 37) % 170) - 85}px`);
    spark.style.setProperty('--y', `${-40 - ((i * 19) % 110)}px`);
    spark.style.setProperty('--delay', `${i * 28}ms`);
    particles.append(spark);
  }
  art.append(particles);

  function refresh() {
    document.body.dataset.questStage = String(stage);
    document.body.dataset.questState = state;
    const traveler = $('.traveler');
    traveler.dataset.stage = String(stage);
    world.setStage(stage);
    for (const item of document.querySelectorAll('[data-stage-item]')) {
      const index = Number(item.dataset.stageItem);
      item.classList.toggle('active', index === stage);
      item.classList.toggle('complete', index < stage || (index === 4 && opened));
      if (index === stage) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
    for (const button of document.querySelectorAll('.map-stage')) {
      const index = Number(button.dataset.stage);
      button.classList.toggle('active', index === stage);
      button.classList.toggle('complete', index < stage || (index === 4 && opened));
      button.disabled = index === 1 ? state === 'exploring' : index === 2 ? !pending || state === 'exploring' : index === 3 ? state !== 'exploring' : stage !== 4;
      button.title = button.disabled ? `${TITLES[index - 1]}：完成前一个阶段后解锁` : TITLES[index - 1];
      if (index === stage) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    $('#hero-sample').disabled = state === 'exploring';
    $('#choose-own').disabled = state === 'exploring';
    $('#journey-save').textContent = state === 'idle' ? '新旅程 · 等待选择目标' : state === 'error' ? '探索暂停 · 可以重试' : opened ? '旅程完成 · 报告已收进背包' : `当前阶段 ${stage} / 4 · ${TITLES[stage - 1]}`;
  }
  function say(message, speaker = '向导 · 路米') {
    $('#quest-message').textContent = message;
    $('#quest-speaker').textContent = speaker;
  }
  function select(next, message) {
    stage = next;
    say(message || MESSAGES[next - 1]);
    refresh();
  }
  function clearReward() {
    clearTimeout(rewardTimer);
    $('#treasure-gate').hidden = true;
    $('#treasure-gate').classList.remove('opening', 'opened');
    $('#open-treasure').disabled = false;
    $('#open-treasure').textContent = '开启宝箱，领取报告';
    $('#open-treasure').hidden = false;
    opened = false;
  }
  function resetQuest() {
    generation++;
    pending = null;
    state = 'idle';
    total = 0;
    clearReward();
    $('#quest-prepare').hidden = true;
    $('#quest-progress').hidden = true;
    $('#home-start').hidden = true;
    $('#reports').hidden = false;
    select(1);
  }
  function chooseOwn() {
    if (state === 'exploring') return notice('先停止当前探索，再选择新的目标');
    reset();
    $('#home-start').hidden = false;
    $('#path-details').open = true;
    $('#selection-title').focus({ preventScroll: true });
    $('#home-start').scrollIntoView({ behavior: 'smooth', block: 'start' });
    say('你可以选择文件、文件夹，或直接粘贴本机路径。');
  }
  async function prepare(target, commands) {
    if (state === 'exploring') return notice('探索进行中，请先停止当前探索');
    reset();
    pending = { target, commands };
    const ticket = ++generation;
    state = 'preparing';
    $('#home-start').hidden = true;
    $('#run').hidden = true;
    $('#quest-prepare').hidden = false;
    $('#prepare-target').textContent = target;
    $('#prepare-command').textContent = commands?.length ? commands.join('、') : '自动识别文件，选择合适的分析命令';
    $('#prepare-engines').textContent = 'REA 基础工具已就绪；正在检查可选引擎…';
    select(2);
    $('#prepare-title').focus({ preventScroll: true });
    $('#quest-prepare').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const engines = await checkEngines();
      if (ticket !== generation) return;
      const ready = engines.filter((engine) => engine.ok).map((engine) => engine.name);
      $('#prepare-engines').textContent = ready.length ? `REA 基础工具 + ${ready.join('、')}` : 'REA 基础工具 · 足够开始这次探索';
    } catch {
      if (ticket === generation) $('#prepare-engines').textContent = 'REA 基础工具 · 可选装备暂时未能检查，可以继续';
    }
  }
  function begin(followUp) {
    state = 'exploring';
    clearReward();
    $('#quest-prepare').hidden = true;
    $('#quest-progress').hidden = false;
    $('#reports').hidden = !followUp;
    $('#seabed') && ($('#seabed').hidden = true);
    $('#progress-title').textContent = followUp ? '继续探索新的线索…' : '正在探索遗迹…';
    $('#progress-message').textContent = '正在读取目标文件，准备整理线索。';
    select(3);
  }
  function progress(message) {
    $('#progress-message').textContent = message;
    say(message, '探索记录 · 实时更新');
  }
  function finish({ completed, cancelled, added, total: reportTotal, failed, followUp }) {
    $('#quest-progress').hidden = true;
    total = reportTotal;
    if (completed && !cancelled && added > 0) {
      state = 'reward';
      select(4, failed ? '部分线索暂未找到，但已有真实发现。打开宝箱查看报告与提示。' : MESSAGES[3]);
      $('#reports').hidden = !followUp;
      $('#seabed') && ($('#seabed').hidden = true);
      $('#treasure-gate').hidden = false;
      $('#treasure-title').textContent = followUp ? '又发现了新的报告！' : '发现了一个报告宝箱！';
      $('#treasure-description').textContent = `本次获得 ${added} 份分析报告${failed ? '，部分步骤未成功' : ''}。开启宝箱，查看软件里的线索。`;
      $('#treasure-gate').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $('#open-treasure').focus({ preventScroll: true });
    } else {
      state = 'error';
      $('#reports').hidden = false;
      $('#seabed') && ($('#seabed').hidden = reportTotal === 0);
      select(3, cancelled ? '探索已停止。已找到的线索保留了，你可以重新选择目标再试一次。' : '这次没有获得新报告。查看下方错误提示，补充装备或重新选择目标。');
      if (cancelled) $('#run-kind-label').textContent = '探索已停止';
      $('#progress-title').textContent = cancelled ? '探索已停止' : '探索遇到了阻碍';
      $('#progress-message').textContent = cancelled ? '已找到的线索保留在下方。可以重新选目标开始。' : '查看下方错误提示，补充装备或重新选目标后重试。';
      $('#quest-progress').hidden = false;
    }
  }
  function openReward() {
    if (state !== 'reward' || opened) return;
    const gate = $('#treasure-gate');
    gate.classList.add('opening');
    $('#open-treasure').disabled = true;
    $('#open-treasure').textContent = '宝箱开启中…';
    say('宝箱正在开启，你的发现马上揭晓。');
    const ticket = generation;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rewardTimer = setTimeout(() => {
      if (ticket !== generation || state !== 'reward') return;
      opened = true;
      state = 'complete';
      gate.classList.add('opened');
      gate.classList.remove('opening');
      $('#treasure-title').textContent = '探索完成 · 报告已收入背包';
      $('#treasure-description').textContent = `共 ${total} 份报告。阅读下方发现，或交给 AI 伙伴继续解读。`;
      $('#open-treasure').hidden = true;
      $('#reports').hidden = false;
      $('#explain-ai').disabled = total === 0;
      $('#copy-md').disabled = total === 0;
      $('#seabed') && ($('#seabed').hidden = false);
      say('宝箱已开启！报告就在下方。还可以继续探索，或找 AI 伙伴解读。');
      refresh();
      const heading = $('#reports h3');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }, reduced ? 0 : 1050);
  }
  $('#choose-own').addEventListener('click', chooseOwn);
  $('#prepare-back').addEventListener('click', chooseOwn);
  $('#prepare-workshop').addEventListener('click', workshop);
  $('#begin-expedition').addEventListener('click', () => {
    if (!pending || state === 'exploring') return;
    const { target, commands } = pending;
    execute(target, commands);
  });
  $('#open-treasure').addEventListener('click', openReward);
  for (const button of document.querySelectorAll('.map-stage')) button.addEventListener('click', () => {
    const next = Number(button.dataset.stage);
    if (next === 1) chooseOwn();
    else if (next === 2 && pending) {
      $('#quest-prepare').hidden = false;
      $('#quest-prepare').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (next === 3) $('#quest-progress').scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (next === 4) $('#treasure-gate').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  resetQuest();
  return { prepare, begin, progress, finish, reset: resetQuest, refresh, get busy() { return state === 'exploring'; } };
}
