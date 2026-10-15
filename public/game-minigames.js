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

const GAMES = { binary, parts, drawers };

export const MINIGAME_IDS = Object.keys(GAMES);

export function createMinigame(id, options) {
  const game = GAMES[id];
  if (!game) throw new Error(`unknown mini-game: ${id}`);
  return game(options);
}
