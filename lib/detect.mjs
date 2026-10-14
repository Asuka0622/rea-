import fs from "node:fs";
import path from "node:path";

import {looksLikeModelMod} from "./model-mods.mjs";

const KINDS = {
  compare: { label: "两个版本对比" },
  unity: { label: "Unity 资源包" },
  modelmod: { label: "人物模型 Mod / 3DMigoto 资源" },
  gamesource: { label: "开源游戏 / Mod 真实源码" },
  gamemod: { label: "游戏 Mod / Demo 教学项目" },
  rust: { label: "Rust / Cargo 源码项目" },
  javascript: { label: "JavaScript / Electron 应用" },
  apk: { label: "安卓应用（APK）" },
  pe: { label: "Windows 程序或库（exe / dll）" },
  elf: { label: "Linux / 安卓原生库（ELF / so）" },
  macho: { label: "苹果原生程序（Mach-O）" },
  apple: { label: "苹果应用包（ipa / app）" },
  har: { label: "网络抓包记录（HAR）" },
  archive: { label: "压缩包 / 安装包" },
  unknown: { label: "其他文件" },
};

function magic(file) {
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

/** The first bytes of a file as hex, plus their printable ASCII reading (MZ, ELF, PK…). */
function signatureOf(head) {
  const bytes = [...head.subarray(0, 4)];
  const ascii = bytes.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "")).join("");
  return { hex: bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" "), ascii: ascii.length >= 2 ? ascii : null };
}

function looksLikeJavaScriptDir(dir) {
  if (fs.existsSync(path.join(dir, "package.json"))) return true;
  if (fs.existsSync(path.join(dir, "resources", "app.asar")) || fs.existsSync(path.join(dir, "resources", "app"))) return true;
  try {
    return fs.readdirSync(dir).some((name) => /\.(m?js|cjs|asar)$/i.test(name));
  } catch {
    return false;
  }
}

/** Classify a local target by extension and magic bytes. */
export function detectTarget(target) {
  const stat = fs.statSync(target);
  const ext = path.extname(target).toLowerCase();
  let kind = "unknown";
  if (stat.isDirectory()) {
    if (ext === ".app") kind = "apple";
    else if (fs.existsSync(path.join(target, "workbench-compare.json"))) kind = "compare";
    else if (fs.existsSync(path.join(target, "workbench-source.json"))) kind = "gamesource";
    else if (fs.existsSync(path.join(target, "workbench-mod.json"))) kind = "gamemod";
    else if (fs.existsSync(path.join(target, "Cargo.toml"))) kind = "rust";
    else if (looksLikeJavaScriptDir(target)) kind = "javascript";
    else kind = looksLikeModelMod(target) ? "modelmod" : "archive";
  } else {
    const head = magic(target);
    const hex = head.toString("hex");
    if (/^Unity(?:FS|Raw|Web)/.test(head.toString("ascii"))) kind = "unity";
    else if (ext === ".apk") kind = "apk";
    else if (ext === ".asar") kind = "javascript";
    else if (ext === ".ipa") kind = "apple";
    else if (ext === ".har") kind = "har";
    else if (head[0] === 0x4d && head[1] === 0x5a) kind = "pe";
    else if (hex.startsWith("7f454c46")) kind = "elf";
    else if (["feedface", "feedfacf", "cefaedfe", "cffaedfe", "cafebabe"].some((m) => hex.startsWith(m)) && ext !== ".class") kind = "macho";
    else if (hex.startsWith("504b0304")) kind = "archive";
  }
  const signature = stat.isDirectory() ? null : signatureOf(magic(target));
  return { kind, ...KINDS[kind], isDirectory: stat.isDirectory(), size: stat.isDirectory() ? null : stat.size, name: path.basename(target), signature };
}
