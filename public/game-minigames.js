// 小游戏: the hands-on part of each lesson (docs/story.md 第 4 节「动手」). The way a game is played is
// the idea it teaches: lighting lamps is binary, sorting parts is input / processing / storage / output.
// Each game builds its own panel: createMinigame(id, { h, difficulty, onWin, sound }) returns { title, el };
// onWin({ mistakes }) is called when it is won.
// Difficulty (轻松 / 标准 / 硬核, game-quests.js) changes the puzzles themselves, not only the help:
//   easy    small numbers, choices instead of typing, running totals, 看答案; no limit on mistakes
//   normal  bigger numbers, typed answers, a hint button; 5 lives
//   hard    no numbers under the lamps, no hints, extra rounds (binary addition, matching parts); 3 lives
// Running out of lives starts the game over. Pictures come later (docs/art/prompts.md); CSS for now.

const shuffle = (items) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const LIVES = { easy: Infinity, normal: 5, hard: 3 };

/**
 * Shared frame: progress and lives, a teaching note, the play area, a feedback line and the buttons.
 * miss() takes a life and returns true when they are all gone (the game then starts over itself).
 */
function frame(h, { note, sound, difficulty = "normal" }) {
  // A note can differ by difficulty: { easy, normal, hard } (轻松 plain words, 硬核 real terms and numbers).
  if (typeof note === "object") note = note[difficulty] || note.normal;
  const feedback = h("p", { class: "mg-feedback", role: "status" });
  const area = h("div", { class: "mg-area" });
  const buttons = h("div", { class: "mg-buttons" });
  const step = h("span", {});
  const hearts = h("span", { class: "mg-hearts", "aria-live": "polite" });
  const progress = h("p", { class: "mg-progress" }, step, hearts);
  const el = h("div", { class: "mg" }, progress, h("p", { class: "mg-note" }, note), area, feedback, buttons);
  const max = LIVES[difficulty] ?? 5;
  let lives = max;
  const paintHearts = () => {
    hearts.textContent = Number.isFinite(max) ? `${"♥".repeat(lives)}${"♡".repeat(max - lives)}` : "";
    hearts.title = Number.isFinite(max) ? `还能错 ${lives} 次` : "";
  };
  paintHearts();
  const tell = (text, mood = "") => {
    feedback.textContent = text;
    feedback.dataset.mood = mood;
    if (mood === "good") sound?.right();
    else if (mood === "bad") sound?.wrong();
  };
  return {
    el,
    area,
    buttons,
    tell,
    setProgress: (text) => {
      step.textContent = text;
    },
    miss() {
      if (!Number.isFinite(max)) return false;
      lives -= 1;
      paintHearts();
      return lives <= 0;
    },
    refill() {
      lives = max;
      paintHearts();
    },
  };
}

/** A number box and a 确定 button; Enter also answers. */
function numberAnswer(h, onAnswer) {
  const input = h("input", { class: "mg-input", type: "number", inputmode: "numeric", min: "0", "aria-label": "填一个数" });
  const go = () => {
    if (input.value.trim() === "") return;
    onAnswer(Number(input.value));
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      go();
    }
  });
  queueMicrotask(() => input.focus({ preventScroll: true }));
  return [input, h("button", { class: "btn primary", type: "button", onclick: go }, "确定")];
}

/* ----- 二进制灯: eight lamps worth 128 … 1; lit lamps add up to the number ----- */
function binary({ h, difficulty, onWin, sound }) {
  const VALUES = [128, 64, 32, 16, 8, 4, 2, 1];
  const easy = difficulty === "easy";
  const hard = difficulty === "hard";
  const ROUNDS = {
    easy: [
      { kind: "read", bits: "00000110", ask: "门边的灯现在亮成这样。它表示几？", options: [6, 110, 3, 12] },
      { kind: "write", target: 10, ask: "铁叔说：先练练手，点亮几盏灯，拼出 10。" },
      { kind: "write", target: 25, ask: "再来一个：拼出 25。" },
      { kind: "copy", bits: "01001101", ask: "门上刻着 01001101。把灯点成一模一样，再说出它是几。", options: [77, 1001101, 78, 45] },
    ],
    normal: [
      { kind: "read", bits: "00101101", ask: "门边的灯现在亮成这样。它表示几？" },
      { kind: "write", target: 100, ask: "铁叔说：点亮几盏灯，拼出 100。" },
      { kind: "count", ask: "8 盏灯，每盏可以亮也可以灭。一共能拼出多少种不同的亮法？", answer: 256, hint: "先想：1 盏灯有几种亮法？2 盏呢？3 盏呢？", why: "每多一盏灯，亮法就翻一倍：2 × 2 × … × 2（8 个 2）= 256。所以一个字节能表示 0 到 255。" },
      { kind: "copy", bits: "01001101", ask: "门上刻着 01001101。把灯点成一模一样，再填出它是几。" },
    ],
    hard: [
      { kind: "read", bits: "10110110", ask: "门边的灯亮成这样。它表示几？" },
      { kind: "write", target: 200, ask: "拼出 200。" },
      { kind: "add", a: "01011010", b: "00110111", ask: "门锁里藏着一个加法器。把下面两行二进制数相加，用灯点出结果。" },
      { kind: "count", ask: "如果门边有 9 盏灯，最大能表示多少？", answer: 511, why: "9 位全亮是 111111111 = 2⁹ − 1 = 511。" },
      { kind: "write", target: 173, ask: "门上刻的不是 0 和 1，而是一个十进制数：173。把它点成二进制，门就开了。" },
    ],
  };
  const rounds = ROUNDS[difficulty] || ROUNDS.normal;
  const ui = frame(h, {
    sound,
    difficulty,
    note: {
      easy: "钟楼里只认两种样子：灯亮和灯灭。每盏灯代表一个数，从右往左是 1、2、4、8……每次翻一倍。把亮着的灯下面的数加起来，就是答案。",
      normal: "电脑里的东西都只有两种状态：开和关，记成 1 和 0。一盏灯就是一「位」，8 盏灯是一个「字节」。每盏灯代表一个数，从右往左是 1、2、4、8……每次翻一倍；亮着的灯加起来，就是这一串 0 和 1 表示的数。",
      hard: "电脑用二进制表示一切：每一位（bit）只有 0 和 1，从右数第 n 位（从 0 数起）的权重是 2 的 n 次方。8 位是一个字节（byte），共 2⁸ = 256 种组合，能表示 0 到 255。十进制换成二进制：从最高位开始，放得下这一位的权重就记 1 并减掉，放不下记 0。二进制加法逢二进一。这一关灯下不标权重，自己算。",
    },
  });
  let index = 0;
  let lamps = [];
  let mistakes = 0;
  const total = () => lamps.reduce((sum, on, i) => sum + (on ? VALUES[i] : 0), 0);
  const bitsNow = () => lamps.map((on) => (on ? "1" : "0")).join("");
  const toBits = (n) => n.toString(2).padStart(8, "0");

  function draw() {
    const round = rounds[index];
    ui.setProgress(`第 ${index + 1} / ${rounds.length} 题`);
    lamps = round.kind === "read" ? [...round.bits].map((b) => b === "1") : Array(8).fill(false);
    const totalEl = h("b", { class: "mg-total" });
    const row = h("div", { class: "mg-lamps", role: "group", "aria-label": "8 盏灯" });
    const paint = () => {
      row.querySelectorAll(".mg-lamp").forEach((el, i) => {
        el.classList.toggle("on", lamps[i]);
        el.setAttribute("aria-pressed", String(lamps[i]));
      });
      // Easy shows the running total; the others only see the pattern they made.
      totalEl.textContent = easy && round.kind !== "read" && round.kind !== "copy" ? `亮着的灯加起来 = ${total()}` : round.kind === "read" ? "" : bitsNow();
    };
    VALUES.forEach((value, i) => {
      row.append(
        h("button", {
          class: "mg-lamp",
          type: "button",
          disabled: round.kind === "read" || round.kind === "count",
          "aria-label": hard ? `第 ${i + 1} 盏灯` : `代表 ${value} 的灯`,
          onclick: () => {
            lamps[i] = !lamps[i];
            paint();
            ui.tell("");
          },
        }, h("span", { class: "mg-lamp-glass" }), h("small", {}, hard ? "?" : String(value))),
      );
    });
    const sums = round.kind === "add" ? h("div", { class: "mg-sum" }, h("span", {}, round.a), h("span", {}, `+ ${round.b}`), h("span", { class: "mg-sum-line" }, "")) : null;
    ui.area.replaceChildren(...[h("p", { class: "mg-ask" }, round.ask), round.kind === "copy" ? h("p", { class: "mg-pattern" }, round.bits) : null, sums, round.kind === "count" ? null : row, round.kind === "count" ? null : totalEl].filter(Boolean));
    paint();

    const buttons = [];
    const wrongRead = hard ? "不对。" : "不对。把亮着的灯代表的数，一个一个加起来。";
    if (round.kind === "read") {
      if (round.options) buttons.push(...shuffle(round.options).map((n) => h("button", { class: "btn", type: "button", onclick: () => answer(n === parseInt(round.bits, 2), wrongRead) }, String(n))));
      else buttons.push(...numberAnswer(h, (n) => answer(n === parseInt(round.bits, 2), wrongRead)));
    } else if (round.kind === "write") {
      buttons.push(h("button", { class: "btn primary", type: "button", onclick: () => answer(total() === round.target, hard ? "不对。" : `现在拼出的是 ${total()}，不是 ${round.target}。从最大的灯开始想：放得下 128 吗？64 呢？`) }, "检查"));
    } else if (round.kind === "add") {
      const want = toBits(parseInt(round.a, 2) + parseInt(round.b, 2));
      buttons.push(h("button", { class: "btn primary", type: "button", onclick: () => answer(bitsNow() === want, "不对。从最右边一位开始加：0 + 0 = 0，1 + 0 = 1，1 + 1 = 10（写 0，向左进 1）。") }, "检查"));
    } else if (round.kind === "count") {
      buttons.push(...numberAnswer(h, (n) => answer(n === round.answer, hard ? "不对。" : round.hint, round.why)));
    } else {
      const check = (n) => {
        if (bitsNow() !== round.bits) return ui.tell("先把灯点得和门上刻的一模一样。");
        answer(n === parseInt(round.bits, 2), hard ? "不对。" : "灯点对了。现在把亮着的灯代表的数加起来。");
      };
      if (round.options) buttons.push(...shuffle(round.options).map((n) => h("button", { class: "btn", type: "button", onclick: () => check(n) }, String(n))));
      else buttons.push(...numberAnswer(h, check));
    }
    if (easy) buttons.push(h("button", { class: "link-btn", type: "button", onclick: () => showAnswer(round) }, "看答案"));
    else if (!hard) buttons.push(h("button", { class: "link-btn", type: "button", onclick: () => ui.tell(hint(round)) }, "提示"));
    ui.buttons.replaceChildren(...buttons);
  }
  const hint = (round) =>
    round.kind === "write"
      ? `从最大的灯往下试：${round.target} 里放得下 128 吗？放得下就点亮、减掉，再看下一盏。`
      : round.kind === "count"
        ? round.hint
        : "把每盏亮着的灯下面的数加起来。";
  function showAnswer(round) {
    const bits = round.bits || toBits(round.target);
    lamps = [...bits].map((b) => b === "1");
    ui.area.querySelectorAll(".mg-lamp").forEach((el, i) => el.classList.toggle("on", lamps[i]));
    ui.tell(`答案：${bits} = ${parseInt(bits, 2)}（${VALUES.filter((v, i) => bits[i] === "1").join(" + ")}）`);
  }
  function answer(right, why, after = "") {
    if (!right) {
      mistakes += 1;
      if (ui.miss()) {
        ui.tell("机会用完了。门锁咔哒一声复位……从第一题重新来。", "bad");
        index = 0;
        setTimeout(() => {
          ui.refill();
          draw();
        }, 1600);
        return;
      }
      return ui.tell(why, "bad");
    }
    index += 1;
    if (index >= rounds.length) {
      ui.tell(`${after ? `${after} ` : ""}咔哒一声，门开了！`, "good");
      ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: () => onWin({ mistakes }) }, "进入钟楼"));
      return;
    }
    ui.tell(after ? `对了！${after}` : "对了！", "good");
    setTimeout(draw, after ? 2200 : 700);
  }
  draw();
  return { title: "钟楼的门 · 二进制灯", el: ui.el };
}

/* ----- 零件归类: input, processing, storage, output — the clock tower, a real computer, and (hard) matching them ----- */
function parts({ h, difficulty, onWin, sound }) {
  const easy = difficulty === "easy";
  const hard = difficulty === "hard";
  const FOUR = {
    input: { label: "输入", note: "把外面的消息告诉机器" },
    process: { label: "处理", note: "按指令干活、做计算" },
    storage: { label: "存储", note: "把东西记下来" },
    output: { label: "输出", note: "把结果给人看、给人听" },
  };
  const computer = [
    { name: "键盘", bin: "input", hint: "你打的字从这里进去。" },
    { name: "鼠标", bin: "input", hint: "你点哪里，电脑就知道。" },
    { name: "CPU（处理器）", bin: "process", hint: "电脑的「齿轮和发条」，每秒算几十亿次。" },
    { name: "硬盘", bin: "storage", hint: "照片、文档都放在这里。" },
    { name: "显示器", bin: "output", hint: "把画面给你看。" },
    { name: "音箱", bin: "output", hint: "把声音放给你听。" },
  ];
  if (!easy) {
    computer.push(
      { name: "摄像头", bin: "input", hint: "把画面送进电脑，和显示器方向正好相反。" },
      { name: "U 盘", bin: "storage", hint: "拔下来带走，文件还在里面。" },
      { name: "打印机", bin: "output", hint: "把电脑里的东西印到纸上。" },
    );
  }
  if (hard) {
    computer.push(
      { name: "内存", bin: "storage", hint: "正在用的东西临时放这里。" },
      { name: "麦克风", bin: "input", hint: "把你的声音送进去。" },
      { name: "显卡（GPU）", bin: "process", hint: "专门算画面的处理器。" },
      { name: "固态硬盘", bin: "storage", hint: "没有转盘的硬盘。" },
    );
  }
  const rounds = [
    {
      title: "钟楼的零件",
      bins: FOUR,
      items: [
        { name: "拉绳和按钮", bin: "input", hint: "有人拉一下绳，钟楼就知道「该敲钟了」。" },
        { name: "齿轮和发条", bin: "process", hint: "一直在转，按规矩带动别的零件。" },
        { name: "软木记事板", bin: "storage", hint: "上面钉着每天几点敲钟的时间表。" },
        { name: "大钟面", bin: "output", hint: "让镇上的人看到现在几点。" },
        { name: "铜铃", bin: "output", hint: "让镇上的人听到钟声。" },
      ],
    },
    { title: "你用的电脑", bins: FOUR, items: computer },
    ...(hard
      ? [
          {
            title: "钟楼和电脑配对：哪个零件干的是同一份活？",
            bins: { keyboard: { label: "键盘" }, cpu: { label: "CPU" }, disk: { label: "硬盘" }, screen: { label: "显示器" }, speaker: { label: "音箱" } },
            items: [
              { name: "拉绳和按钮", bin: "keyboard", hint: "" },
              { name: "齿轮和发条", bin: "cpu", hint: "" },
              { name: "软木记事板", bin: "disk", hint: "" },
              { name: "大钟面", bin: "screen", hint: "" },
              { name: "铜铃", bin: "speaker", hint: "" },
            ],
          },
        ]
      : []),
  ];
  const ui = frame(h, {
    sound,
    difficulty,
    note: {
      easy: "钟楼的零件分四种活：有的听消息，有的干活，有的记东西，有的告诉大家结果。先点一个零件，再点它该去的格子。",
      normal: "不管是钟楼还是电脑，零件都只有四种活：输入（接收消息）、处理（按指令计算）、存储（记住东西）、输出（把结果交出去）。先点一个零件，再点它该去的格子。",
      hard: "今天的电脑大多是「冯·诺依曼结构」：输入设备、处理器（运算器和控制器）、存储器、输出设备；程序和数据都放在存储器里，处理器一条条取出指令执行。把零件分进这四类，注意显卡、内存这类容易混的；最后把钟楼和电脑里干同一份活的零件配成对。",
    },
  });
  let index = 0;
  let picked = null;
  let mistakes = 0;
  function draw() {
    const round = rounds[index];
    ui.setProgress(`第 ${index + 1} / ${rounds.length} 组：${round.title}`);
    picked = null;
    const left = new Set(round.items.map((item) => item.name));
    const tray = h("div", { class: "mg-tray" });
    const bins = h("div", { class: "mg-bins", style: `grid-template-columns:repeat(${Math.min(5, Object.keys(round.bins).length)},1fr)` });
    const binEls = {};
    for (const [key, bin] of Object.entries(round.bins)) {
      binEls[key] = h("div", { class: "mg-bin-items" });
      bins.append(h("button", { class: "mg-bin", type: "button", onclick: () => drop(key) }, h("b", {}, bin.label), !hard && bin.note ? h("small", {}, bin.note) : null, binEls[key]));
    }
    tray.append(...shuffle(round.items).map((item) => h("button", { class: "mg-chip", type: "button", onclick: (event) => pick(item, event.currentTarget) }, item.name, easy && item.hint ? h("small", {}, item.hint) : null)));
    ui.area.replaceChildren(tray, bins);
    ui.buttons.replaceChildren(difficulty === "normal" ? h("button", { class: "link-btn", type: "button", onclick: () => ui.tell(picked ? picked.item.hint : "先点一个零件，再点提示。") }, "提示") : "");
    function pick(item, el) {
      tray.querySelectorAll(".mg-chip").forEach((chip) => chip.classList.remove("picked"));
      picked = { item, el };
      el.classList.add("picked");
      ui.tell(`「${item.name}」放到哪一格？`);
    }
    function drop(key) {
      if (!picked) return ui.tell("先点一个零件。");
      const { item, el } = picked;
      if (item.bin !== key) {
        mistakes += 1;
        if (ui.miss()) {
          ui.tell("机会用完了，零件散了一地……从头再分一遍。", "bad");
          index = 0;
          setTimeout(() => {
            ui.refill();
            draw();
          }, 1600);
          return;
        }
        return ui.tell(`「${item.name}」不是${round.bins[key].label}。${hard ? "" : item.hint}`, "bad");
      }
      el.remove();
      binEls[key].append(h("span", {}, item.name));
      left.delete(item.name);
      picked = null;
      ui.tell("对了！", "good");
      if (!left.size) next();
    }
  }
  function next() {
    index += 1;
    if (index < rounds.length) {
      ui.tell(index === 1 ? "钟楼的零件全对！再看看你用的电脑——是不是也是这四样？" : "分好了！最后一关：钟楼和电脑配对。", "good");
      setTimeout(draw, 1200);
      return;
    }
    ui.tell(mistakes ? `全部完成（错了 ${mistakes} 次）。` : "一次都没错，厉害！", "good");
    ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: () => onWin({ mistakes }) }, "继续"));
  }
  draw();
  return { title: "钟楼内部 · 零件归类", el: ui.el };
}

/* ----- 两个抽屉: what is lost when the power goes (memory) and what stays (storage) ----- */
function drawers({ h, difficulty, onWin, sound }) {
  const easy = difficulty === "easy";
  const hard = difficulty === "hard";
  const pc = [
    { name: "已经保存的照片", keep: true, why: "存进硬盘的文件，关机也不会丢。" },
    { name: "还没点「保存」的作文", keep: false, why: "还在内存里！突然断电就没了，所以要常按保存。" },
    { name: "装好的游戏", keep: true, why: "装在硬盘上，下次开机还在。" },
    { name: "正在看的网页", keep: false, why: "打开的网页在内存里，关机就关掉了。" },
  ];
  if (!easy) {
    pc.push(
      { name: "游戏里还没存档的进度", keep: false, why: "存档以前，进度只在内存里。所以游戏会提醒你「别关机，正在保存」。" },
      { name: "设置里调好的音量", keep: true, why: "设置会写进硬盘，下次开机还是这个音量。" },
      { name: "复制了还没粘贴的一段文字", keep: false, why: "剪贴板在内存里，关机就清空了。" },
    );
  }
  if (hard) {
    pc.push(
      { name: "网站记住的登录状态（Cookie）", keep: true, why: "浏览器把 Cookie 写在硬盘上，所以关机后再开，很多网站还是登录着的。" },
      { name: "正在运行的程序算到一半的结果", keep: false, why: "运行中的程序和数据都在内存里。" },
      { name: "游戏的存档文件", keep: true, why: "写进硬盘的存档文件（朵朵的案子里拆过它）。" },
    );
  }
  const rounds = [
    {
      title: "钟楼记着的东西",
      items: [
        { name: "现在是几点几分", keep: false, why: "这是钟楼「正在想」的事，停电就没了，所以它忘了时间。" },
        { name: "每天几点敲钟", keep: true, why: "写在记事板上的规矩，停电也还在。" },
        { name: "齿轮现在转到了哪一格", keep: false, why: "转动中的状态，一停就丢了。" },
        { name: "庆典那天要放的曲子", keep: true, why: "早就存好的曲谱，一直都在。" },
        { name: "刚才有人拉了几下绳", keep: false, why: "刚刚发生的事，只临时记了一下。" },
      ],
    },
    { title: "你的电脑", items: pc },
  ];
  const ui = frame(h, {
    sound,
    difficulty,
    note: {
      easy: "电脑有两个抽屉：一个一断电就忘光，一个一直记得。每样东西放进对的抽屉。",
      normal: "电脑有两种「记性」：内存像一块小黑板，又快又方便，可一断电就全擦掉；硬盘像上锁的铁皮抽屉，慢一点，但东西一直都在。每样东西放进对的抽屉。",
      hard: "内存（RAM）断电就丢数据，但读写极快，以纳秒计；硬盘和固态硬盘断电也能保存，但慢得多，以微秒到毫秒计。程序运行时先从硬盘读进内存，「保存」就是把内存里的内容写回硬盘。判断每样东西在断电后还在不在。",
    },
  });
  let index = 0;
  let mistakes = 0;
  function draw() {
    const round = rounds[index];
    ui.setProgress(`第 ${index + 1} / ${rounds.length} 组：${round.title}`);
    const queue = shuffle(round.items);
    const forget = h("div", { class: "mg-bin-items" });
    const keep = h("div", { class: "mg-bin-items" });
    const card = h("p", { class: "mg-card" });
    const show = () => {
      if (!queue.length) return next();
      card.textContent = queue[0].name;
    };
    const put = (asKeep) => {
      const item = queue[0];
      if (!item) return;
      if (item.keep !== asKeep) {
        mistakes += 1;
        if (ui.miss()) {
          ui.tell("机会用完了，抽屉全倒出来了……从头再放一遍。", "bad");
          index = 0;
          setTimeout(() => {
            ui.refill();
            draw();
          }, 1600);
          return;
        }
        return ui.tell(hard ? "放错了。" : `放错了。${item.why}`, "bad");
      }
      (asKeep ? keep : forget).append(h("span", {}, item.name));
      ui.tell(hard ? "对了！" : `对了！${item.why}`, "good");
      queue.shift();
      show();
    };
    ui.area.replaceChildren(
      h("p", { class: "mg-ask" }, "这样东西，放进哪个抽屉？"),
      card,
      h("div", { class: "mg-bins two" },
        h("button", { class: "mg-bin drawer-forget", type: "button", onclick: () => put(false) }, h("b", {}, "断电就忘"), h("small", {}, hard ? "" : "内存：小黑板"), forget),
        h("button", { class: "mg-bin drawer-keep", type: "button", onclick: () => put(true) }, h("b", {}, "一直记得"), h("small", {}, hard ? "" : "硬盘：铁皮抽屉"), keep)),
    );
    ui.buttons.replaceChildren(difficulty === "normal" ? h("button", { class: "link-btn", type: "button", onclick: () => ui.tell(queue[0] ? `想一想：突然停电，「${queue[0].name}」还会在吗？` : "") }, "提示") : "");
    show();
  }
  function next() {
    index += 1;
    if (index < rounds.length) {
      setTimeout(draw, 1200);
      return;
    }
    ui.tell(`都放好了${mistakes ? `（错了 ${mistakes} 次）` : ""}！钟楼忘了时间，是因为「现在几点」放在断电就忘的那一格。`, "good");
    ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: () => onWin({ mistakes }) }, "把时间重新拨好"));
  }
  draw();
  return { title: "记事板下的两个抽屉", el: ui.el };
}

/* ----- 茶铺算账: rod numerals (算筹). Customers queue with their bills; lay the rods on the counting board.
   Units stand upright (纵), tens lie flat (横), hundreds upright, thousands flat: 「一纵十横，百立千僵」.
   A digit up to 5 is that many rods; 6–9 is one crossing rod for five plus the rest. An empty column is 0. ----- */
function rodDigit(h, digit, upright) {
  // Upright: 1–5 vertical rods, 6–9 a flat rod on top (five) and vertical rods below. Flat is the opposite.
  const el = h("span", { class: `rod-digit ${upright ? "up" : "flat"}`, "aria-hidden": "true" });
  if (!digit) return el;
  const five = digit > 5;
  const ones = five ? digit - 5 : digit;
  if (five) el.append(h("i", { class: "rod five" }));
  const group = h("span", { class: "rod-ones" });
  for (let i = 0; i < ones; i += 1) group.append(h("i", { class: "rod" }));
  el.append(group);
  return el;
}

function rods({ h, difficulty, onWin, sound }) {
  const easy = difficulty === "easy";
  const hard = difficulty === "hard";
  const PLACES = ["个", "十", "百", "千"];
  const TASKS = {
    easy: [
      { kind: "place", n: 23, who: "挑担的货郎", order: "两碗茶、三块糕" },
      { kind: "place", n: 48, who: "赶考的书生", order: "一壶好茶、四碟点心" },
      { kind: "place", n: 70, who: "船家", order: "七碗大碗茶" },
    ],
    normal: [
      { kind: "place", n: 105, who: "赶考的书生", order: "一壶龙团茶" },
      { kind: "place", n: 230, who: "绸缎庄的伙计", order: "包下二楼雅座" },
      { kind: "add", a: 47, b: 58, who: "两位船家", order: "合在一起结账" },
      { kind: "read", n: 406, who: "老主顾", order: "「上回的账是多少来着？」" },
    ],
    hard: [
      { kind: "place", n: 1088, who: "太史局的小吏", order: "记下今年的年份" },
      { kind: "add", a: 378, b: 645, who: "两家商号", order: "合账" },
      { kind: "read", n: 2307, who: "钱庄掌柜", order: "「这笔账你给念念？」" },
      { kind: "add", a: 999, b: 1, who: "小孩儿", order: "「再加一文，是多少？」" },
    ],
  };
  const tasks = TASKS[difficulty] || TASKS.normal;
  const columns = hard ? 4 : easy ? 2 : 3;
  const patience = hard ? 30 : easy ? Infinity : 45; // seconds before a customer gives up
  const ui = frame(h, {
    sound,
    difficulty,
    note: {
      easy: "算筹就是小竹棍。最右边一格是个位，竹棍竖着摆；往左一格是十位，竹棍横着摆。1 到 5 就摆几根；6 到 9 先放一根横过来的当作「5」，再补上剩下的。点格子下面的 ＋ 和 －。",
      normal: "算筹记数用的是「位值制」：同样几根竹棍，放在不同的位置，大小就不同，往左一位大十倍。个位竖摆、十位横摆、百位又竖摆，纵横交替才不会看混；空着的位就是 0。6 到 9 用一根横筹当作 5，再加上竖筹。",
      hard: "《孙子算经》：「凡算之法，先识其位，一纵十横，百立千僵，千十相望，万百相当。」个、百位纵摆，十、千位横摆；空位为 0。这一关不标位名，不给图示；加法要自己进位。",
    },
  });
  let index = 0;
  let mistakes = 0;
  let digits = [];
  let timer = null;
  const value = () => digits.reduce((sum, d, i) => sum + d * 10 ** i, 0);
  const upright = (i) => i % 2 === 0; // 个、百 upright; 十、千 flat
  function board(values, editable) {
    const row = h("div", { class: "rod-board" });
    for (let i = columns - 1; i >= 0; i -= 1) {
      const col = h("div", { class: "rod-col" },
        h("div", { class: "rod-cell" }, rodDigit(h, values[i] || 0, upright(i))),
        !hard ? h("small", {}, easy ? `${PLACES[i]}位 · ${upright(i) ? "竖摆" : "横摆"}` : `${PLACES[i]}位`) : null,
        editable ? h("div", { class: "rod-buttons" },
          h("button", { class: "btn small", type: "button", "aria-label": `${PLACES[i]}位加一根`, onclick: () => change(i, 1) }, "＋"),
          h("button", { class: "btn small", type: "button", "aria-label": `${PLACES[i]}位拿掉一根`, onclick: () => change(i, -1) }, "－")) : null);
      row.append(col);
    }
    return row;
  }
  const split = (n) => Array.from({ length: columns }, (_, i) => Math.floor(n / 10 ** i) % 10);
  function change(i, by) {
    digits[i] = Math.max(0, Math.min(9, (digits[i] || 0) + by));
    sound?.blip?.(500 + digits[i] * 40);
    draw(true);
  }
  function startPatience() {
    clearInterval(timer);
    if (!Number.isFinite(patience)) return;
    let left = patience;
    timer = setInterval(() => {
      left -= 1;
      const bar = ui.area.querySelector(".rod-patience i");
      if (bar) bar.style.width = `${(left / patience) * 100}%`;
      if (left <= 0) {
        clearInterval(timer);
        miss("客人等不及，摇着头走了……", true);
      }
    }, 1000);
  }
  function draw(keep = false) {
    const task = tasks[index];
    ui.setProgress(`第 ${index + 1} / ${tasks.length} 位客人`);
    if (!keep) digits = Array(columns).fill(0);
    const ask =
      task.kind === "place" ? `${task.who}：${task.order}，一共 ${task.n} 文。把 ${task.n} 摆在算板上。`
        : task.kind === "add" ? `${task.who}${task.order}：一笔 ${hard ? "（看算筹）" : task.a} 文，一笔 ${hard ? "（看算筹）" : task.b} 文。在算板上摆出合计。`
          : `${task.who}${task.order} 算板上摆着上回的账，念出它是多少文。`;
    const parts = [h("p", { class: "mg-ask" }, ask)];
    if (Number.isFinite(patience)) parts.push(h("div", { class: "rod-patience", title: "客人的耐心" }, h("i", { style: `width:${keep ? ui.area.querySelector(".rod-patience i")?.style.width || "100%" : "100%"}` })));
    if (task.kind === "add") parts.push(h("div", { class: "rod-bills" }, board(split(task.a), false), h("b", {}, "＋"), board(split(task.b), false)), h("p", { class: "rod-equals" }, "＝"));
    if (task.kind === "read") parts.push(board(split(task.n), false));
    else parts.push(board(digits, true));
    if (easy && task.kind !== "read") parts.push(h("p", { class: "mg-total" }, `算板上现在是 ${value()}`));
    ui.area.replaceChildren(...parts);
    const buttons = task.kind === "read" ? numberAnswer(h, (n) => answer(n === task.n)) : [h("button", { class: "btn primary", type: "button", onclick: () => answer(value() === (task.kind === "add" ? task.a + task.b : task.n)) }, "收钱")];
    if (easy) buttons.push(h("button", { class: "link-btn", type: "button", onclick: () => { digits = split(task.kind === "add" ? task.a + task.b : task.n); draw(true); ui.tell("照着摆好了，点「收钱」。"); } }, "看答案"));
    else if (!hard) buttons.push(h("button", { class: "link-btn", type: "button", onclick: () => ui.tell(task.kind === "add" ? "从个位加起：个位满十，就往十位进一根。" : "从最高位开始，一位一位地摆；中间是 0 的位就空着。") }, "提示"));
    ui.buttons.replaceChildren(...buttons);
    if (!keep) startPatience();
  }
  function miss(why, leave = false) {
    mistakes += 1;
    if (ui.miss()) {
      clearInterval(timer);
      ui.tell("客人都被吓跑了……柳娘子叹了口气：「重新来吧。」", "bad");
      index = 0;
      setTimeout(() => {
        ui.refill();
        draw();
      }, 1800);
      return;
    }
    ui.tell(why, "bad");
    if (leave) {
      index += 1;
      if (index >= tasks.length) return finish();
      setTimeout(() => draw(), 1400);
    }
  }
  function answer(right) {
    const task = tasks[index];
    if (!right) return miss(hard ? "不对。" : task.kind === "add" ? "合计不对。个位加起来满十了吗？满了要进一位。" : task.kind === "read" ? "不对。先认出每一位：竖摆的是个位和百位，横摆的是十位和千位。" : `摆出来的是 ${value()} 文，不是 ${task.n} 文。`);
    clearInterval(timer);
    sound?.right?.();
    index += 1;
    if (index >= tasks.length) return finish();
    ui.tell("「多谢！」客人放下铜钱走了。", "good");
    setTimeout(() => draw(), 900);
  }
  function finish() {
    clearInterval(timer);
    ui.tell(mistakes ? `今天的账都算完了（错了 ${mistakes} 次）。` : "一笔都没算错！柳娘子竖起了大拇指。", "good");
    ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: () => onWin({ mistakes }) }, "打烊"));
  }
  draw();
  return { title: "柳娘子的茶铺 · 摆算筹", el: ui.el };
}

/* ----- 调天衡: the escapement of the water-driven clock tower. Water runs into a scoop on the big wheel;
   when it is heavy enough to beat the counterweight, the balance lets the wheel turn one step. The time
   between steps is weight / flow; too light a weight makes the balance shake (uneven steps), too heavy
   and the scoop overflows (uneven too). Tune it until eight steps in a row keep the beat. ----- */
function escapement({ h, difficulty, onWin, sound }) {
  const easy = difficulty === "easy";
  const hard = difficulty === "hard";
  const beat = hard ? 0.75 : 1; // seconds between steps wanted
  const stable = hard ? [5, 7] : [4, 7]; // counterweights that let the balance work cleanly
  const ui = frame(h, {
    sound,
    difficulty,
    note: {
      easy: "水一滴滴流进枢轮上的小水斗。水斗装满、比秤杆另一头的配重还重时，秤杆就放行，枢轮转一格。把水流调到刚好：每一下「咔」都踩在鼓点上。",
      normal: "天衡像一杆秤：一头是配重，一头是正在接水的水斗。水流越快，水斗越早压过配重，枢轮就越早走一格；配重越重，就要等更多的水。两格之间的时间 ≈ 配重 ÷ 水流。配重太轻秤杆会抖，太重水斗会溢出，节拍都会乱。让枢轮连续 8 格都踩在鼓点上。",
      hard: "这是一套靠反馈自己控制节奏的机构：水斗的重量决定什么时候放行。两格间隔 ≈ 配重 ÷ 水流；配重只有在 5 到 7 之间秤杆才稳。这一回韩公廉要的节拍是 0.75 秒一格，只能用整数刻度，自己算出搭配。只看曲线，不显示数字。",
    },
  });
  let weight = easy ? 5 : 3;
  let flow = easy ? 2 : 6;
  let fill = 0;
  let last = performance.now();
  let lastStep = null;
  let gaps = [];
  let angle = 0;
  let streak = 0;
  let mistakesNoted = 0;
  let done = false;
  const wheel = h("div", { class: "esc-wheel", "aria-hidden": "true" }, ...Array.from({ length: 12 }, (_, i) => h("i", { style: `rotate:${i * 30}deg` })));
  const scoop = h("div", { class: "esc-scoop", "aria-hidden": "true" }, h("i", {}));
  const track = h("div", { class: "esc-track", "aria-label": "节拍记录" });
  const readout = h("p", { class: "esc-readout" });
  const slider = (label, get, set, min, max) => {
    const input = h("input", { type: "range", min: String(min), max: String(max), step: "1", value: String(get()), "aria-label": label });
    const shown = h("b", {}, hard ? "" : String(get()));
    input.addEventListener("input", () => {
      set(Number(input.value));
      shown.textContent = hard ? "" : input.value;
      gaps = [];
      streak = 0;
      paintTrack();
    });
    return h("label", { class: "esc-slider" }, h("span", {}, label), input, shown);
  };
  const controls = h("div", { class: "esc-controls" },
    !easy ? slider("配重", () => weight, (v) => (weight = v), 1, 10) : null,
    slider("水流", () => flow, (v) => (flow = v), 1, 10));
  ui.area.replaceChildren(h("div", { class: "esc-machine" }, h("div", { class: "esc-left" }, wheel, scoop), h("div", { class: "esc-right" }, h("p", { class: "mg-ask" }, `让枢轮每 ${beat} 秒走一格，连续 8 格都踩在鼓点上。`), track, readout)), controls);
  ui.setProgress("连续 0 / 8 格");
  ui.buttons.replaceChildren(!hard ? h("button", { class: "link-btn", type: "button", onclick: () => ui.tell(easy ? "鼓点是 1 秒一下。配重是 5，那水流调到多少，水斗刚好 1 秒装满？" : `间隔 ≈ 配重 ÷ 水流。想要 ${beat} 秒一格，配重和水流要差不多大；配重还得在 ${stable[0]} 到 ${stable[1]} 之间。`) }, "提示") : "");

  function paintTrack() {
    track.replaceChildren(...gaps.slice(-8).map((gap) => {
      const off = Math.max(-1, Math.min(1, (gap - beat) / beat));
      return h("i", { class: Math.abs(gap - beat) / beat <= 0.06 ? "ok" : "off", style: `--off:${off}` });
    }));
    if (!hard) {
      const mean = gaps.length ? gaps.slice(-4).reduce((a, b) => a + b, 0) / Math.min(4, gaps.length) : 0;
      readout.textContent = gaps.length ? `最近的间隔约 ${mean.toFixed(2)} 秒（目标 ${beat} 秒）` : "等枢轮走起来……";
    }
  }
  let shown = false; // the panel is put on the page a moment after it is built (the camera moves first)
  function step(now) {
    if (done) return;
    if (!ui.el.isConnected) {
      if (shown) return; // closed: stop
      last = now;
      return requestAnimationFrame(step);
    }
    shown = true;
    requestAnimationFrame(step);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    fill += flow * dt;
    scoop.firstChild.style.height = `${Math.min(100, (fill / Math.max(weight, 0.1)) * 100)}%`;
    // Too heavy: the scoop overflows while the balance hesitates; too light: the balance trembles.
    const wobble = weight < stable[0] ? 0.35 * (stable[0] - weight) : weight > stable[1] ? 0.3 * (weight - stable[1]) : 0;
    const need = weight * (1 + (wobble ? (Math.random() - 0.5) * wobble : 0));
    if (fill >= need) {
      fill = 0;
      angle += 30;
      wheel.style.rotate = `${angle}deg`;
      sound?.step?.();
      if (lastStep !== null) {
        const gap = (now - lastStep) / 1000;
        gaps.push(gap);
        const good = Math.abs(gap - beat) / beat <= 0.06;
        streak = good ? streak + 1 : 0;
        if (!good && gaps.length > 3 && gaps.length % 6 === 0) mistakesNoted += 1;
        ui.setProgress(`连续 ${streak} / 8 格`);
        paintTrack();
        if (streak >= 8) return win();
        if (!good && gaps.length % 4 === 0 && !hard) ui.tell(wobble ? (weight < stable[0] ? "秤杆在抖，间隔忽长忽短：配重太轻了。" : "水斗溢出来了，节拍乱了：配重太重了。") : gap > beat ? "走得太慢了。" : "走得太快了。");
      }
      lastStep = now;
    }
  }
  requestAnimationFrame((now) => {
    last = now;
    step(now);
  });
  function win() {
    done = true;
    sound?.unlock?.();
    ui.tell("枢轮一格一格，稳稳地踩在鼓点上！", "good");
    controls.querySelectorAll("input").forEach((input) => (input.disabled = true));
    ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: () => onWin({ mistakes: mistakesNoted }) }, "让报时木人敲钟"));
  }
  return { title: "水运仪象台 · 调天衡", el: ui.el };
}

/* ----- 用代码拆数 (硬核): the same idea as the rods, in real JavaScript, run in a worker with a time limit. ----- */
function codeDigits({ h, onWin, sound }) {
  const ui = frame(h, {
    sound,
    difficulty: "hard",
    note: "柳娘子的算筹是一位一位摆的。用 JavaScript 写一个函数 digits(n)，把一个整数拆成每一位，从高位到低位放进数组。n % 10 得到个位，Math.floor(n / 10) 去掉个位。",
  });
  const starter = `function digits(n) {
  const result = [];
  // 在这里写：一位一位地取出来

  return result;
}`;
  const editor = h("textarea", { class: "code-editor", spellcheck: "false", rows: "10", "aria-label": "代码" });
  editor.value = starter;
  editor.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Tab") {
      event.preventDefault();
      const at = editor.selectionStart;
      editor.value = `${editor.value.slice(0, at)}  ${editor.value.slice(editor.selectionEnd)}`;
      editor.selectionStart = editor.selectionEnd = at + 2;
    }
  });
  const results = h("ul", { class: "code-results" });
  ui.area.replaceChildren(editor, results);
  ui.setProgress("用真正的代码");
  const TESTS = [[1088, [1, 0, 8, 8]], [7, [7]], [205, [2, 0, 5]], [0, [0]], [9999, [9, 9, 9, 9]]];
  let mistakes = 0;
  function run() {
    // The player's own code runs in a worker: it cannot touch the page, and a loop that never ends is stopped.
    const source = `${editor.value}\nself.onmessage = () => { const out = ${JSON.stringify(TESTS)}.map(([n]) => { try { return { ok: true, value: digits(n) }; } catch (e) { return { ok: false, value: String(e && e.message || e) }; } }); self.postMessage(out); };`;
    let worker;
    try {
      worker = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
    } catch (error) {
      return ui.tell(`代码有错：${error.message}`, "bad");
    }
    const stop = setTimeout(() => {
      worker.terminate();
      mistakes += 1;
      ui.tell("代码跑了一秒还没停，是不是写了停不下来的循环？", "bad");
    }, 1000);
    worker.onerror = (event) => {
      clearTimeout(stop);
      worker.terminate();
      mistakes += 1;
      ui.tell(`代码有错：${event.message}`, "bad");
      event.preventDefault();
    };
    worker.onmessage = ({ data }) => {
      clearTimeout(stop);
      worker.terminate();
      let passed = 0;
      results.replaceChildren(...TESTS.map(([n, want], i) => {
        const got = data[i];
        const ok = got.ok && JSON.stringify(got.value) === JSON.stringify(want);
        if (ok) passed += 1;
        return h("li", { class: ok ? "ok" : "bad" }, `digits(${n}) → ${got.ok ? JSON.stringify(got.value) : `出错：${got.value}`}　${ok ? "✓" : `应该是 ${JSON.stringify(want)}`}`);
      }));
      if (passed === TESTS.length) {
        ui.tell("全部通过！", "good");
        ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: () => onWin({ mistakes }) }, "给铁叔看"));
      } else {
        mistakes += 1;
        ui.tell(`通过 ${passed} / ${TESTS.length} 个。${data[3]?.value?.length === 0 ? "注意 0 也是一位。" : ""}`, "bad");
      }
    };
    worker.postMessage(null);
  }
  ui.buttons.replaceChildren(h("button", { class: "btn primary", type: "button", onclick: run }, "运行"), h("button", { class: "link-btn", type: "button", onclick: () => { editor.value = starter; results.replaceChildren(); } }, "重来"));
  return { title: "铁叔的工作台 · 用代码拆数", el: ui.el };
}

const GAMES = { binary, parts, drawers, rods, escapement, "code-digits": codeDigits };

export const MINIGAME_IDS = Object.keys(GAMES);

export function createMinigame(id, options) {
  const game = GAMES[id];
  if (!game) throw new Error(`unknown mini-game: ${id}`);
  return game(options);
}
