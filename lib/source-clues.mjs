import fs from "node:fs";
import path from "node:path";

// Workbench supplementary scan of readable source text. REA's JavaScript graph covers structure and
// data flow; this adds three teaching clues it does not report: secrets left in code, hidden entries
// (shortcuts, passcodes, debug switches) and how local data such as game saves is written.
// The rules are textual, so they can miss things or flag harmless text; reports say so.

const TEXT_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json", ".html", ".htm", ".env", ".yml", ".yaml", ".xml", ".ini", ".toml", ".properties", ".py", ".txt"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".svn", "__pycache__"]);
const LIMITS = { files: 3000, bytes: 512 * 1024, depth: 12, findings: 40 };

function listFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [{ file: target, rel: path.basename(target) }];
  const out = [];
  const walk = (dir, depth) => {
    if (depth > LIMITS.depth || out.length >= LIMITS.files) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= LIMITS.files) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full, depth + 1);
      } else if (entry.isFile() && !/^workbench-[\w-]+\.json$/.test(entry.name) && (TEXT_EXT.has(path.extname(entry.name).toLowerCase()) || /^\.env/.test(entry.name))) {
        // workbench-*.json describe the teaching case itself, not the software being examined.
        out.push({ file: full, rel: path.relative(target, full).replace(/\\/g, "/") });
      }
    }
  };
  walk(target, 0);
  return out;
}

function readText(file) {
  try {
    if (fs.statSync(file).size > LIMITS.bytes) return null;
    const text = fs.readFileSync(file, "utf8");
    return text.includes("\u0000") ? null : text;
  } catch {
    return null;
  }
}

/** Show enough of a secret to recognise it, never the whole value. */
export function mask(value) {
  const credentials = /^([a-z][a-z0-9+.-]*:\/\/[^:@/\s]+:)([^@/\s]+)(@.*)$/i.exec(value);
  if (credentials) return `${credentials[1]}${"•".repeat(6)}${credentials[3]}`;
  if (value.length <= 6) return `${value[0]}${"•".repeat(5)}`;
  return `${value.slice(0, 4)}${"•".repeat(6)}（共 ${value.length} 位）`;
}

const SECRET_NAME = /(api[_-]?key|apikey|secret|token|passw(or)?d|pwd|private[_-]?key|access[_-]?key|credential|salt)/i;
const PLACEHOLDER = /^(your|xxx|todo|changeme|example|placeholder|<|\$\{|process\.env)/i;
const SECRET_PATTERNS = [
  { re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}/g, kind: "支付平台密钥" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, kind: "云服务访问密钥" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g, kind: "代码托管平台令牌" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, kind: "地图 / 云接口密钥" },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, kind: "聊天机器人令牌" },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, kind: "私钥文件内容" },
  { re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}/g, kind: "登录令牌（JWT）" },
  { re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/"'`]+:[^\s@/"'`]+@[^\s"'`]+/gi, kind: "带密码的连接地址" },
];
const NAMED_STRING = /["']?([A-Za-z_$][\w$-]*)["']?\s*[:=]\s*["'`]([^"'`\n]{6,})["'`]/g;

function kindOfName(name) {
  if (/salt/i.test(name)) return "加盐用的固定字符串";
  if (/passw(or)?d|pwd/i.test(name)) return "密码";
  if (/token/i.test(name)) return "访问令牌";
  if (/private/i.test(name)) return "私钥";
  return "接口密钥";
}

function secretsIn(text, rel, push) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const seen = new Set();
    for (const { re, kind } of SECRET_PATTERNS) {
      for (const match of line.matchAll(re)) {
        seen.add(match[0]);
        const name = /([A-Za-z_$][\w$]*)\s*[:=]\s*["'`]?$/.exec(line.slice(0, match.index))?.[1];
        push({ name: name || kind, kind, value: mask(match[0]), where: `${rel} 第 ${index + 1} 行` });
      }
    }
    for (const match of line.matchAll(NAMED_STRING)) {
      const [, name, value] = match;
      if (!SECRET_NAME.test(name) || PLACEHOLDER.test(value) || [...seen].some((s) => s.includes(value) || value.includes(s))) continue;
      push({ name, kind: kindOfName(name), value: mask(value), where: `${rel} 第 ${index + 1} 行` });
    }
  });
}

const KEY_NAMES = { arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→", escape: "Esc", " ": "空格" };
const keyName = (key) => KEY_NAMES[key.toLowerCase()] || (key.length === 1 ? key.toUpperCase() : key);
const DEBUG_NAME = /(debug|devmode|developer|cheat|godmode|unlock|easter|secret|hidden)/i;

function hiddenIn(text, rel, report) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    let found = false;
    const push = (item) => ((found = true), report(item));
    const where = `${rel} 第 ${index + 1} 行`;
    const code = line.trim().slice(0, 120);
    for (const match of line.matchAll(/(?:globalShortcut\.register|accelerator\s*:)\s*\(?\s*["'`]([^"'`]+)["'`]/g)) {
      push({ clue: `快捷键 ${match[1].replace(/CommandOrControl|CmdOrCtrl/g, "Ctrl")}`, kind: "按下特定组合键才会触发", where, code });
    }
    const key = /\.(?:key|code)\s*===?\s*["'`]([^"'`]+)["'`]/.exec(line);
    if (key && /(ctrlKey|shiftKey|altKey|metaKey)/.test(line)) {
      const mods = ["ctrl", "shift", "alt", "meta"].filter((m) => line.includes(`${m}Key`)).map((m) => m[0].toUpperCase() + m.slice(1));
      push({ clue: `快捷键 ${[...mods, keyName(key[1].replace(/^Key/, ""))].join("+")}`, kind: "按下特定组合键才会触发", where, code });
    }
    const sequence = /\[\s*((?:["'`](?:Arrow\w+|[A-Za-z])["'`]\s*,\s*){5,}["'`](?:Arrow\w+|[A-Za-z])["'`])\s*\]/.exec(line);
    if (sequence) {
      const keys = [...sequence[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => keyName(m[1]));
      push({ clue: `按键序列 ${keys.join("")}`, kind: "依次按下这些键才会触发", where, code });
    }
    for (const match of line.matchAll(/([A-Za-z_$][\w$.]*)\s*===?\s*["'`]([^"'`\s]{3,24})["'`]/g)) {
      const [, left, literal] = match;
      if (/(input|code|typed|buffer|cheat|pass|answer|display|expr|value)/i.test(left) && !/\.(?:key|code|type)$/.test(left) && !/^(function|object|string|number|undefined|boolean)$/.test(literal)) {
        push({ clue: `暗号 ${literal}`, kind: "输入这串内容才会触发", where, code });
      }
    }
    for (const match of line.matchAll(/["'`](#\/[\w/-]*|[?&][\w-]+=[\w-]+)["'`]/g)) {
      if (/(__|debug|dev|secret|hidden|admin|cheat)/i.test(match[1])) push({ clue: `隐藏页面 ${match[1]}`, kind: "直接访问这个地址才能看到", where, code });
    }
    const declared = /(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/.exec(line);
    if (declared && DEBUG_NAME.test(declared[1]) && !found) push({ clue: `开关 ${declared[1]}`, kind: "名字像调试或隐藏功能", where, code });
  });
}

/** The first call argument starting at `start` (just after the opening parenthesis), quotes removed. */
function firstArgument(line, start) {
  let depth = 0;
  let end = start;
  for (; end < line.length; end += 1) {
    const char = line[end];
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) {
      if (depth === 0) break;
      depth -= 1;
    } else if (char === "," && depth === 0) break;
  }
  return line.slice(start, end).trim().replace(/^["'`]|["'`]$/g, "").slice(0, 60);
}

function saveIoIn(text, rel, push) {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const where = `${rel} 第 ${index + 1} 行`;
    const code = line.trim().slice(0, 120);
    const write = /(?:writeFile(?:Sync)?|localStorage\.setItem)\s*\(/.exec(line);
    if (write) push({ clue: `写入 ${firstArgument(line, write.index + write[0].length)}`, kind: "把数据保存到电脑上", where, code });
    const read = /(?:readFile(?:Sync)?|localStorage\.getItem)\s*\(/.exec(line);
    if (read) push({ clue: `读取 ${firstArgument(line, read.index + read[0].length)}`, kind: "从电脑上读回数据", where, code });
    const file = /["'`]([\w.-]+\.(?:sav|save|dat|db|sqlite|profile))["'`]/i.exec(line);
    if (file) push({ clue: `存档文件 ${file[1]}`, kind: "文件名像存档或数据库", where, code });
    if (/toString\(\s*["'`]base64["'`]\s*\)|\bbtoa\(/.test(line)) push({ clue: "Base64 编码", kind: "把内容换成字母数字，不是加密，谁都能还原", where, code });
    if (/from\(\s*[^,]+,\s*["'`]base64["'`]\s*\)|\batob\(/.test(line)) push({ clue: "Base64 解码", kind: "读取时把字母数字还原成原来的内容", where, code });
    const hash = /createHash\(\s*["'`](\w+)["'`]/.exec(line);
    if (hash) push({ clue: `校验码 ${hash[1].toUpperCase()}`, kind: "内容一变，校验码就对不上，用来发现存档被改", where, code });
    if (/create(?:Cipher|Decipher)iv/.test(line)) push({ clue: "加密", kind: "没有钥匙就读不懂内容", where, code });
    if (/\b(?:gzip|deflate|inflate|gunzip)(?:Sync)?\(/.test(line)) push({ clue: "压缩", kind: "把内容压小，需要先解压才能看", where, code });
  });
}

/** { secrets, hidden, saves, scanned, truncated } for a file or folder. */
export function scanSourceClues(target) {
  const files = listFiles(target);
  const result = { secrets: [], hidden: [], saves: [], scanned: 0, truncated: files.length >= LIMITS.files };
  const adder = (list, key) => (item) => {
    if (list.length >= LIMITS.findings || list.some((x) => x[key] === item[key] && x.where === item.where)) return;
    list.push(item);
  };
  for (const { file, rel } of files) {
    const text = readText(file);
    if (text == null) continue;
    result.scanned += 1;
    secretsIn(text, rel, adder(result.secrets, "name"));
    if (/\.(m?js|cjs|jsx|ts|tsx|html?)$/i.test(rel)) {
      hiddenIn(text, rel, adder(result.hidden, "clue"));
      saveIoIn(text, rel, adder(result.saves, "clue"));
    }
  }
  return result;
}

const NOTE = "工作台补充扫描：按文字规则查找，可能漏掉写法特殊的，也可能把无害文字当成线索，需要回到代码确认。";

/** Report sections for the clues, ready to append to a JavaScript report. */
export function clueSections(clues) {
  const sections = [];
  if (clues.secrets.length) {
    sections.push({
      title: "疑似密钥",
      explain: `代码里写死的密码、令牌和密钥。装了这个软件的人都能拆开看到，值已遮挡。${NOTE}`,
      table: { columns: ["名字", "像是什么", "遮挡后的值", "位置"], rows: clues.secrets.map((s) => [s.name, s.kind, s.value, s.where]) },
    });
  }
  if (clues.hidden.length) {
    sections.push({
      title: "快捷键与隐藏入口",
      explain: `需要特定按键、暗号或地址才会出现的功能。Ctrl+S 保存这类常见快捷键很正常；界面和说明里从没提过的，才值得留意。${NOTE}`,
      table: { columns: ["线索", "怎么触发", "位置", "代码里的写法"], rows: clues.hidden.map((h) => [h.clue, h.kind, h.where, h.code]) },
    });
  }
  if (clues.saves.length) {
    sections.push({
      title: "存档与本地数据",
      explain: `软件把数据存在哪里、存之前做了哪些处理。${NOTE}`,
      table: { columns: ["线索", "意思", "位置", "代码里的写法"], rows: clues.saves.map((s) => [s.clue, s.kind, s.where, s.code]) },
    });
  }
  return sections;
}

const LEADING = ["主进程提供的功能（IPC 通道）", "暴露给界面的接口", "联网请求（发往哪里）", "敏感能力线索", "定时执行的代码"];

/** Add the supplementary clue sections to a JavaScript report, right after its behaviour sections. */
export function withSourceClues(report, target) {
  let clues;
  try {
    clues = scanSourceClues(target);
  } catch {
    return report;
  }
  const extra = clueSections(clues);
  if (!extra.length) return report;
  const sections = [...report.sections];
  const after = sections.reduce((last, section, index) => (LEADING.includes(section.title) ? index : last), -1);
  sections.splice(after + 1, 0, ...extra);
  const counts = [
    clues.secrets.length && `${clues.secrets.length} 处疑似密钥`,
    clues.hidden.length && `${clues.hidden.length} 条快捷键与隐藏入口线索`,
    clues.saves.length && `${clues.saves.length} 条存档线索`,
  ].filter(Boolean);
  return { ...report, sections, headline: `${report.headline.replace(/。$/, "")}；补充扫描发现 ${counts.join("、")}。` };
}
