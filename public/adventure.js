import { createWorldMap } from './maps.js';
import { icon } from './icons.js';

// One task panel, one thing to do at a time. The map shows where you are; the panel says
// what to do now. Every stage follows real analysis state: failures never produce a chest.
const $ = (selector) => document.querySelector(selector);

/** Map stops. Stops 2 and 3 run by themselves; the user acts at stops 1 and 4. */
const STOPS = [
  { title: '选一个软件', auto: false },
  { title: '认出它是什么', auto: true },
  { title: '查看它的内部', auto: true },
  { title: '打开宝箱', auto: false },
];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function chestSvg() {
  return `<svg class="pixel-chest" viewBox="0 0 120 100" role="presentation" shape-rendering="crispEdges">
    <g class="chest-treasure"><path fill="#ead995" d="M58 0h5v13h-5zM19 14h5v10h-5zM93 10h5v12h-5zM8 40h12v4H8zM101 34h13v4h-13z"/><path fill="#fff4c7" d="M46 21h26v28H46zM36 31h47v18H36z"/></g>
    <path fill="#181e25" d="M15 63h90v31H15zM22 94h78v5H22z"/><path fill="#71442c" d="M19 65h82v25H19z"/><path fill="#a66934" d="M23 69h74v17H23z"/><path fill="#bd8d3e" d="M25 65h8v25h-8zM87 65h8v25h-8zM19 86h82v4H19z"/><path fill="#4e322b" d="M35 75h19v4H35zM68 75h17v4H68z"/>
    <g class="chest-lid"><path fill="#181e25" d="M15 51h5v-8h5v-7h70v7h5v8h5v15H15z"/><path fill="#85512f" d="M20 51h5v-7h7v-4h56v4h7v7h5v11H20z"/><path fill="#c88c3e" d="M25 47h70v7H25z"/><path fill="#efcf75" d="M31 40h8v22h-8zM81 40h8v22h-8zM20 57h80v5H20z"/><path fill="#e8bf54" d="M52 53h16v18H52z"/><path fill="#fff1a2" d="M56 56h8v6h-8z"/><path fill="#473829" d="M58 62h4v5h-4z"/></g>
  </svg>`;
}

/**
 * actions: sample, pickFile, pickFolder, analyzePath(path), listApps(), upload(file), stop(),
 * explain(), learn(), engines(), restart(), revealed(), isPro(), notice(message)
 */
export function createAdventure(actions) {
  let stage = 1;
  let state = 'idle'; // idle | exploring | reward | complete | error
  let target = '';
  let opened = false;
  let added = 0;
  let total = 0;
  let followUp = false;
  let problem = null; // { cancelled, title, plain, engine }
  let hint = null; // { message, engine }
  let live = '';
  let rewardTimer;
  let generation = 0;
  let apps = null; // installed apps, loaded once
  const world = createWorldMap();
  const simple = () => actions.isSimple?.() || false;

  const gate = $('#treasure-gate');
  const art = $('#treasure-art');
  art.innerHTML = chestSvg(); // Authored static geometry only; no user data enters markup.
  const particles = el('div', { class: 'loot-particles' });
  for (let i = 0; i < 12; i++) {
    const spark = el('span');
    spark.style.setProperty('--x', `${((i * 37) % 170) - 85}px`);
    spark.style.setProperty('--y', `${-40 - ((i * 19) % 110)}px`);
    spark.style.setProperty('--delay', `${i * 28}ms`);
    particles.append(spark);
  }
  art.append(particles);

  const nameOf = (path) => path.split(/[\\/]/).filter(Boolean).pop() || path;
  const say = (text) => ($('#task-say').textContent = text);
  const body = (...children) => $('#task-body').replaceChildren(...children.flat().filter(Boolean));
  const button = (label, onclick, { primary, iconName, small, id, type = 'button' } = {}) =>
    el('button', { class: `btn ${primary ? 'primary' : ''} ${small ? 'small' : ''}`, type, id, onclick }, iconName && icon(iconName, { size: 17 }), label);

  function stepLabel() {
    if (state === 'complete') return simple() ? '分析完成' : '完成 · 报告已领取';
    if (state === 'error') return problem?.cancelled ? '已停止' : '遇到问题';
    if (simple()) return `第 ${stage} 步 / 共 4 步 · ${['选择文件','识别类型','分析内容','查看报告'][stage-1]}`;
    const stop = STOPS[stage - 1];
    return `第 ${stage} 步 / 共 4 步 · ${stop.title}${stop.auto ? '（自动）' : ''}`;
  }

  /* ----- what the task panel shows in each state ----- */

  function renderIdle() {
    say('你好，我是向导路米。先选一个想看看的软件吧。第一次用，推荐从示例开始。');
    const appList = el('div', { class: 'task-apps' }, el('span', { class: 'task-muted' }, '正在找你电脑上的软件…'));
    const pathForm = el(
      'form',
      {
        class: 'task-path',
        onsubmit: (event) => {
          event.preventDefault();
          const value = event.target.elements.path.value.trim().replace(/^"(.*)"$/, '$1');
          if (value) actions.analyzePath(value);
        },
      },
      el('input', { name: 'path', id: 'task-path-input', placeholder: '例如 D:\\apps\\MyApp', autocomplete: 'off', spellcheck: 'false', 'aria-label': '文件或文件夹路径' }),
      button(simple()?'分析':'出发', null, { small: true, type: 'submit' }),
    );
    if(simple()) {
      say('选择文件或文件夹，查看中文分析报告。');
      body(el('h2',{},'分析文件'),
        el('div',{class:'simple-actions'},button('选择文件',actions.pickFile,{primary:true}),button('选择文件夹',actions.pickFolder),button('试用示例',actions.sample)),
        el('label',{class:'simple-label',for:'task-path-input'},'或直接输入路径'),pathForm,
        el('details',{class:'simple-samples'},el('summary',{},'查看开源案例与制作指南'),el('div',{class:'simple-actions'},button('ArtCraft 软件案例',actions.demos),button('游戏与 Mod 案例',actions.gameMods),button('人物模型 Mod',actions.modelMods))),
        el('p',{class:'simple-note'},'也可拖入文件。只读取文件，不运行软件，不上传。'));
      return;
    }
    body(
      button('用示例软件试一次', actions.sample, { primary: true, iconName: 'play', id: 'hero-sample' }),
      el('p', { class: 'task-caption' }, '示例是一个小小的笔记软件，大约 10 秒出结果。'),
      button('探索 ArtCraft 开源演示', actions.demos, { iconName: 'learn', small: true }),
      button('探索游戏与 Mod 真实案例', actions.gameMods, { iconName: 'wrench', small: true }),
      button('人物模型 Mod · 工具与 MCP', actions.modelMods, { iconName: 'wrench', small: true }),
      el('div', { class: 'task-divider' }, el('span', {}, '或者看看你自己的软件')),
      el('p', { class: 'task-label' }, '你电脑上能直接分析的软件'),
      appList,
      el('div', { class: 'task-row' }, button('选择文件', actions.pickFile, { iconName: 'file', small: true }), button('选择文件夹', actions.pickFolder, { iconName: 'folder', small: true })),
      el('details', { class: 'task-more' }, el('summary', {}, '我知道文件路径，直接粘贴'), pathForm),
      el('p', { class: 'task-drop-hint' }, icon('scan', { size: 15 }), '也可以把文件直接拖到这个面板上'),
      el(
        'div',
        { class: 'task-foot' },
        el('button', { class: 'journal-help', type: 'button', onclick: actions.learn }, icon('learn', { size: 15 }), '第一次来？看新手教程'),
        el('p', {}, icon('shield', { size: 14 }), '只读取文件，不运行软件，不上传'),
      ),
    );
    fillApps(appList);
  }

  async function fillApps(list) {
    try {
      apps ??= (await actions.listApps()).apps || [];
    } catch {
      apps = [];
    }
    if (!list.isConnected) return;
    if (!apps.length) {
      list.replaceChildren(el('span', { class: 'task-muted' }, '没有自动找到。可以用下面的按钮选择文件。'));
      return;
    }
    list.replaceChildren(...apps.slice(0, 6).map((app) => el('button', { class: 'chip', type: 'button', title: app.path, onclick: () => actions.analyzePath(app.path) }, icon('monitor', { size: 14 }), app.name)));
  }

  function renderExploring() {
    const name = nameOf(target);
    say(simple() ? (stage===2?`正在识别「${name}」的文件类型。`:`正在分析「${name}」。`) : stage === 2 ? `我正在看「${name}」是什么类型的文件……` : `认出来了！现在正在查看「${name}」的内部……`);
    body(
      el('div', { class: 'task-live' }, el('div', { class: 'quest-loading', 'aria-hidden': 'true' }, el('span')), el('p', { id: 'task-live' }, live || '准备中…')),
      el('p', { class: 'task-caption' }, '这一步会自动完成，一般 10 秒左右，不用做任何操作。'),
      hint && el('div', { class: 'task-hint' }, icon('bulb', { size: 16 }), el('span', {}, hint.message), hint.engine && button('去安装', actions.engines, { small: true })),
      button('停止', actions.stop, { iconName: 'stop', small: true }),
    );
  }

  function renderReward() {
    say(followUp ? '又发现了一个宝箱！打开它看看新的发现。' : '找到宝箱了！点地图上的宝箱打开它，里面就是这次的分析报告。');
    body(button('打开宝箱', openReward, { primary: true, iconName: 'box' }), el('p', { class: 'task-caption' }, `里面有 ${added} 份真实的分析报告。`));
  }

  function renderComplete() {
    say(simple()?`分析完成，共 ${total} 份报告。下方可查看结果或交给 AI 解读。`:`宝箱打开了！${total} 份报告就在地图下面。看不懂的地方，可以让 AI 用大白话讲给你听。`);
    body(
      button('看报告', () => $('#run')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), { primary: true, iconName: 'down' }),
      button('让 AI 用大白话解释', actions.explain, { iconName: 'spark' }),
      button('再看一个软件', actions.restart, { iconName: 'back' }),
      el('p', { class: 'task-caption' }, '报告里有「继续深入」的按钮，可以接着探索更深一层。'),
    );
  }

  function renderError() {
    say(problem?.cancelled ? '探索已经停止了。已经找到的内容还保留着，你可以换一个软件，或者再试一次。' : problem?.plain || '这次没有找到可以领取的报告。');
    body(
      problem && !problem.cancelled && problem.title && el('div', { class: 'task-hint bad' }, icon('alert', { size: 16 }), el('span', {}, problem.title)),
      problem?.engine && button('去安装需要的引擎', actions.engines, { primary: true, iconName: 'download' }),
      button('再试一次', () => actions.analyzePath(target), { primary: !problem?.engine, iconName: 'play' }),
      button('换一个软件', actions.restart, { iconName: 'back' }),
    );
  }

  function render() {
    document.body.dataset.questStage = String(stage);
    document.body.dataset.questState = state;
    $('.traveler').dataset.stage = String(stage);
    world.setStage(stage);
    for (const marker of document.querySelectorAll('.map-stage')) {
      const index = Number(marker.dataset.stage);
      const done = index < stage || (index === 4 && opened);
      marker.classList.toggle('active', index === stage && !done);
      marker.classList.toggle('complete', done);
      marker.classList.toggle('blocked', state === 'error' && index === stage);
    }
    $('#task-step').textContent = stepLabel();
    if (state === 'idle') renderIdle();
    else if (state === 'exploring') renderExploring();
    else if (state === 'reward') renderReward();
    else if (state === 'complete') renderComplete();
    else renderError();
  }

  /* ----- transitions, called by the app as real analysis events arrive ----- */

  function clearReward() {
    clearTimeout(rewardTimer);
    gate.hidden = true;
    gate.classList.remove('opening', 'opened');
    $('#open-treasure').hidden = false;
    $('#open-treasure').disabled = false;
    opened = false;
  }

  function reset() {
    generation++;
    state = 'idle';
    stage = 1;
    target = '';
    added = total = 0;
    problem = hint = null;
    live = '';
    clearReward();
    render();
  }

  function begin(path, isFollowUp) {
    generation++;
    target = path;
    followUp = isFollowUp;
    state = 'exploring';
    stage = isFollowUp ? 3 : 2;
    problem = hint = null;
    live = isFollowUp ? '继续深入…' : '正在读取文件…';
    clearReward();
    render();
    if (!actions.isPro()) $('.adventure-shell')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** The file type is known: the traveler walks on to stop 3. */
  function detected() {
    if (state !== 'exploring' || stage !== 2) return;
    stage = 3;
    render();
  }

  function progress(message) {
    live = message;
    const node = $('#task-live');
    if (node) node.textContent = message;
  }

  function addHint(message, engine) {
    hint = { message, engine };
    if (state === 'exploring') render();
  }

  function finish({ completed, cancelled, added: newReports, total: allReports, error }) {
    added = newReports;
    total = allReports;
    if (completed && !cancelled && newReports > 0) {
      stage = 4;
      if (actions.isPro() || simple()) {
        // Professional mode goes straight to the report.
        state = 'complete';
        opened = true;
        $('#run').hidden = false;
      } else {
        state = 'reward';
        $('#treasure-title').textContent = followUp ? '又发现了一个宝箱！' : '发现了一个宝箱！';
        $('#treasure-description').textContent = `里面有 ${newReports} 份分析报告`;
        gate.hidden = false;
        $('.world-map')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        $('#open-treasure').focus({ preventScroll: true });
      }
    } else {
      state = 'error';
      problem = { cancelled, ...(error || {}) };
      $('#run').hidden = allReports === 0 && !error;
    }
    render();
  }

  function openReward() {
    if (state !== 'reward' || opened) return;
    gate.classList.add('opening');
    $('#open-treasure').disabled = true;
    say('宝箱正在打开……');
    const ticket = generation;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rewardTimer = setTimeout(() => {
      if (ticket !== generation || state !== 'reward') return;
      opened = true;
      state = 'complete';
      gate.classList.remove('opening');
      gate.classList.add('opened');
      $('#treasure-title').textContent = `获得 ${added} 份报告！`;
      $('#treasure-description').textContent = '已经放在地图下面';
      $('#open-treasure').hidden = true;
      $('#run').hidden = false;
      actions.revealed?.();
      render();
      // Let the reward moment register, then bring the report into view.
      rewardTimer = setTimeout(() => {
        if (ticket !== generation) return;
        gate.hidden = true;
        $('#run').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        const heading = $('#reports h3');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus({ preventScroll: true });
      }, reduced ? 0 : 1400);
    }, reduced ? 0 : 1050);
  }

  $('#open-treasure').addEventListener('click', openReward);
  art.addEventListener('click', openReward);

  // Files can be dropped on the task panel whenever a new target can be chosen.
  const card = $('#task-card');
  card.addEventListener('dragover', (event) => {
    if (state === 'exploring') return;
    event.preventDefault();
    card.classList.add('drop-over');
  });
  card.addEventListener('dragleave', () => card.classList.remove('drop-over'));
  card.addEventListener('drop', (event) => {
    event.preventDefault();
    card.classList.remove('drop-over');
    if (state === 'exploring') return actions.notice('正在探索中，请先停止');
    const entry = event.dataTransfer.items?.[0]?.webkitGetAsEntry?.();
    if (entry?.isDirectory) return actions.notice('文件夹不能拖进来，请点「选择文件夹」');
    const file = event.dataTransfer.files[0];
    if (file) actions.upload(file);
  });

  reset();
  return {
    begin,
    detected,
    progress,
    hint: addHint,
    finish,
    reset,
    refresh: () => {
      if(simple() && state==='reward') {
        clearTimeout(rewardTimer);
        opened=true;state='complete';gate.hidden=true;
        gate.classList.remove('opening');
        $('#run').hidden=false;
        actions.revealed?.();
      }
      render();
    },
    get busy() {
      return state === 'exploring';
    },
  };
}
