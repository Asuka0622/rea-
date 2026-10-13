import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homeDir, isMac, isWindows, workbenchDir } from "./paths.mjs";
import { loadSettings, updateSettings } from "./settings.mjs";
import { downloadFile, extractArchive, fetchJson, githubAsset, soleChild } from "./download.mjs";

const execFileAsync = promisify(execFile);
const exe = (name) => (isWindows ? `${name}.exe` : name);
const exists = (p) => {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch {
    return false;
  }
};
const firstExisting = (candidates) => candidates.find(exists) || null;

/** The audited JADX release REA pins (src/android/JadxRelease.ts in REA 6.4.0). */
const JADX = {
  url: "https://github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1/jadx-headless-mcp-0.7.1-all.jar",
  sha256: "6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75",
  file: "jadx-headless-mcp-0.7.1-all.jar",
  size: 42619858,
};
const GHIDRA_VERSION = "12.1.4";

async function javaMajor(javaHome) {
  const java = path.join(javaHome, "bin", exe("java"));
  if (!exists(java)) return { ok: false, detail: `没有找到 ${java}` };
  try {
    const { stderr, stdout } = await execFileAsync(java, ["-version"], { timeout: 20_000, windowsHide: true });
    const text = `${stderr}${stdout}`;
    const match = text.match(/version "(\d+)(?:\.(\d+))?/);
    const major = match ? (match[1] === "1" ? Number(match[2]) : Number(match[1])) : NaN;
    const hasCompiler = exists(path.join(javaHome, "bin", exe("javac")));
    return { ok: true, major, hasCompiler, detail: text.split(/\r?\n/)[0] };
  } catch (error) {
    return { ok: false, detail: `无法运行 Java：${error.message}` };
  }
}

function javaHomeFromPath() {
  const dirs = (process.env.PATH || "").split(path.delimiter);
  for (const dir of dirs) {
    if (exists(path.join(dir, exe("java"))) && exists(path.join(dir, exe("javac")))) return path.dirname(dir);
  }
  return null;
}

/**
 * Every engine the workbench can wire into REA. `env` is the variable REA reads.
 * `install` exists only for free engines with an official, stable download.
 */
export const ENGINES = [
  {
    id: "java",
    name: "Java 运行环境（JDK 21+）",
    purpose: "很多分析工具（Ghidra、JADX、Apktool）是用 Java 写的，需要它才能运行。",
    unlocks: ["安卓 APK 深度分析", "Ghidra 原生程序分析"],
    env: "JAVA_HOME",
    kind: "dir",
    free: true,
    homepage: "https://adoptium.net/",
    detect() {
      const tools = path.join(workbenchDir("tools"), "jdk-21");
      const studio = isWindows
        ? ["C:\\Program Files\\Android\\Android Studio\\jbr", path.join(process.env.LOCALAPPDATA || "", "Programs", "Android Studio", "jbr")]
        : isMac
          ? ["/Applications/Android Studio.app/Contents/jbr/Contents/Home"]
          : [];
      return firstExisting([exists(tools) ? soleChild(tools) : null, process.env.JAVA_HOME, ...studio]) || javaHomeFromPath();
    },
    async check(value) {
      const info = await javaMajor(value);
      if (!info.ok) return info;
      if (!info.hasCompiler) return { ok: false, detail: `${info.detail}；缺少 javac（需要完整 JDK，不是 JRE）` };
      if (info.major < 21) return { ok: false, partial: true, detail: `Java ${info.major}：能跑 JADX，但 Ghidra 12 需要 Java 21 或更新` };
      return { ok: true, detail: info.detail };
    },
    async install({ onProgress, signal }) {
      const os = isWindows ? "windows" : isMac ? "mac" : "linux";
      const arch = process.arch === "arm64" ? "aarch64" : "x64";
      const ext = isWindows ? "zip" : "tar.gz";
      const api = `https://api.adoptium.net/v3/assets/latest/21/hotspot?os=${os}&architecture=${arch}&image_type=jdk&vendor=eclipse`;
      let latest;
      try {
        [latest] = await fetchJson(api, { signal });
      } catch (error) {
        throw new Error(`无法读取 Adoptium 发布信息：${error.message}`);
      }
      const pkg = latest?.binary?.package;
      if (!pkg) throw new Error("Adoptium 没有返回适合本机的 JDK 21");
      const archive = path.join(workbenchDir("downloads"), `jdk-21.${ext}`);
      await downloadFile(pkg.link, archive, { sha256: pkg.checksum, expectedSize: pkg.size, onProgress, signal });
      const dest = path.join(workbenchDir("tools"), "jdk-21");
      fs.rmSync(dest, { recursive: true, force: true });
      onProgress?.({ phase: "解压中…" });
      await extractArchive(archive, dest);
      fs.rmSync(archive, { force: true });
      const home = soleChild(dest);
      return isMac && exists(path.join(home, "Contents", "Home")) ? path.join(home, "Contents", "Home") : home;
    },
  },
  {
    id: "ghidra",
    name: "Ghidra（免费反编译器）",
    purpose: "美国 NSA 开源的反编译器。装上后，REA 能把 exe、dll、so 等原生程序翻译成近似 C 语言的伪代码。",
    unlocks: ["原生程序伪代码", "函数列表与调用关系", "字符串搜索"],
    env: "GHIDRA_INSTALL_DIR",
    kind: "dir",
    free: true,
    requires: ["java"],
    homepage: "https://github.com/NationalSecurityAgency/ghidra",
    sizeHint: "约 450 MB",
    detect() {
      const tools = path.join(workbenchDir("tools"), "ghidra");
      return firstExisting([exists(tools) ? soleChild(tools) : null, process.env.GHIDRA_INSTALL_DIR]);
    },
    async check(value) {
      const props = path.join(value, "Ghidra", "application.properties");
      if (!exists(props)) return { ok: false, detail: "这个目录不是 Ghidra 安装目录（找不到 Ghidra/application.properties）" };
      const version = fs.readFileSync(props, "utf8").match(/application\.version=(.+)/)?.[1]?.trim();
      if (!version?.startsWith("12.1.")) return { ok: false, detail: `Ghidra ${version}：REA 需要 12.1.x` };
      return { ok: true, detail: `Ghidra ${version}` };
    },
    async install({ onProgress, signal }) {
      const asset = await githubAsset("NationalSecurityAgency/ghidra", {
        tag: `Ghidra_${GHIDRA_VERSION}_build`,
        match: new RegExp(`^ghidra_${GHIDRA_VERSION.replaceAll(".", "\\.")}_PUBLIC_\\d+\\.zip$`),
      });
      const archive = path.join(workbenchDir("downloads"), asset.name);
      await downloadFile(asset.url, archive, { sha256: asset.sha256, expectedSize: asset.size, onProgress, signal });
      const dest = path.join(workbenchDir("tools"), "ghidra");
      fs.rmSync(dest, { recursive: true, force: true });
      onProgress?.({ phase: "解压中（文件很多，需要一两分钟）…" });
      await extractArchive(archive, dest);
      fs.rmSync(archive, { force: true });
      return soleChild(dest);
    },
  },
  {
    id: "jadx",
    name: "JADX（安卓反编译器）",
    purpose: "把安卓 APK 里的代码还原成可读的 Java 代码，查看清单、权限、类和方法。",
    unlocks: ["APK 清单与权限", "安卓类与方法反编译", "安卓引用追踪"],
    env: "REA_JADX_MCP_JAR",
    kind: "file",
    free: true,
    requires: ["java"],
    homepage: "https://github.com/1013503897/jadx-headless-mcp",
    sizeHint: "约 40 MB",
    detect() {
      return firstExisting([path.join(workbenchDir("tools"), "jadx", JADX.file)]);
    },
    async check(value) {
      if (!value.endsWith(".jar")) return { ok: false, detail: "需要选择 jadx-headless-mcp 的 .jar 文件" };
      return { ok: true, detail: path.basename(value) };
    },
    async install({ onProgress, signal }) {
      const dest = path.join(workbenchDir("tools", "jadx"), JADX.file);
      await downloadFile(JADX.url, dest, { sha256: JADX.sha256, expectedSize: JADX.size, onProgress, signal });
      return dest;
    },
  },
  {
    id: "adb",
    name: "ADB（安卓调试桥）",
    purpose: "连接安卓手机或模拟器：查看已装应用、导出 APK、看日志、截屏。",
    unlocks: ["连接手机/模拟器", "导出已安装应用", "读取日志与截屏"],
    env: "REA_ADB_PATH",
    kind: "file",
    free: true,
    homepage: "https://developer.android.com/tools/releases/platform-tools",
    sizeHint: "约 15 MB",
    detect() {
      const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      return firstExisting([
        path.join(workbenchDir("tools"), "platform-tools", exe("adb")),
        sdk && path.join(sdk, "platform-tools", exe("adb")),
        isWindows && path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk", "platform-tools", "adb.exe"),
        isMac && path.join(homeDir(), "Library", "Android", "sdk", "platform-tools", "adb"),
      ]);
    },
    async check(value) {
      try {
        const { stdout } = await execFileAsync(value, ["version"], { timeout: 20_000, windowsHide: true });
        return { ok: true, detail: stdout.split(/\r?\n/)[0] };
      } catch (error) {
        return { ok: false, detail: `无法运行 adb：${error.message}` };
      }
    },
    async install({ onProgress, signal }) {
      const os = isWindows ? "windows" : isMac ? "darwin" : "linux";
      const archive = path.join(workbenchDir("downloads"), "platform-tools.zip");
      await downloadFile(`https://dl.google.com/android/repository/platform-tools-latest-${os}.zip`, archive, { onProgress, signal });
      const tools = workbenchDir("tools");
      fs.rmSync(path.join(tools, "platform-tools"), { recursive: true, force: true });
      await extractArchive(archive, tools);
      fs.rmSync(archive, { force: true });
      return path.join(tools, "platform-tools", exe("adb"));
    },
  },
  {
    id: "apktool",
    name: "Apktool（安卓资源解码）",
    purpose: "解码 APK 里的资源：真实的清单文件、文字资源、支持的语言和版本信息。",
    unlocks: ["APK 资源与多语言文字", "解码后的 AndroidManifest"],
    env: "REA_APKTOOL_COMMAND",
    kind: "file",
    free: true,
    requires: ["java"],
    homepage: "https://apktool.org/",
    sizeHint: "约 25 MB",
    detect() {
      return firstExisting([path.join(workbenchDir("tools"), "apktool", isWindows ? "apktool.bat" : "apktool")]);
    },
    async check(value) {
      return exists(value) ? { ok: true, detail: path.basename(value) } : { ok: false, detail: "找不到启动脚本" };
    },
    async install({ onProgress, signal }) {
      const asset = await githubAsset("iBotPeaches/Apktool", { match: /^apktool_[\d.]+\.jar$/ });
      const dir = workbenchDir("tools", "apktool");
      const jar = path.join(dir, "apktool.jar");
      await downloadFile(asset.url, jar, { sha256: asset.sha256, expectedSize: asset.size, onProgress, signal });
      const javaHome = effectiveValue(ENGINES.find((engine) => engine.id === "java"), loadSettings()).value;
      const java = javaHome ? path.join(javaHome, "bin", exe("java")) : "java";
      if (isWindows) {
        const launcher = path.join(dir, "apktool.bat");
        fs.writeFileSync(launcher, `@echo off\r\n"${java}" -jar "${jar}" %*\r\n`);
        return launcher;
      }
      const launcher = path.join(dir, "apktool");
      fs.writeFileSync(launcher, `#!/bin/sh\nexec "${java}" -jar "${jar}" "$@"\n`, { mode: 0o755 });
      return launcher;
    },
  },
  {
    id: "browser",
    name: "Chrome / Edge 浏览器",
    purpose: "分析网站时，REA 会用你电脑上的浏览器打开页面，观察脚本和网络请求。",
    unlocks: ["网站结构与脚本分析", "网页截图", "网络请求观察"],
    env: "REA_BROWSER_EXECUTABLE",
    kind: "file",
    free: true,
    homepage: "https://www.google.com/chrome/",
    detect() {
      const programFiles = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean);
      const candidates = isWindows
        ? programFiles.flatMap((root) => [
            path.join(root, "Google", "Chrome", "Application", "chrome.exe"),
            path.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
          ])
        : isMac
          ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
          : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
      return firstExisting(candidates);
    },
    async check(value) {
      return exists(value) ? { ok: true, detail: path.basename(value) } : { ok: false, detail: "找不到浏览器程序" };
    },
  },
  {
    id: "hopper",
    name: "Hopper（付费，macOS/Linux）",
    purpose: "商业反汇编器，REA 对它支持最完整。需要你自己购买安装，然后在这里填写启动程序路径。",
    unlocks: ["原生程序伪代码（Hopper 引擎）"],
    env: "HOPPER_LAUNCHER_PATH",
    kind: "file",
    free: false,
    homepage: "https://www.hopperapp.com/",
    detect() {
      return isMac ? firstExisting(["/Applications/Hopper Disassembler v4.app/Contents/MacOS/hopper"]) : null;
    },
    async check(value) {
      return exists(value) ? { ok: true, detail: path.basename(value) } : { ok: false, detail: "找不到 Hopper 启动程序" };
    },
  },
  {
    id: "ida",
    name: "IDA Pro（付费）",
    purpose: "业界标杆的商业反汇编器。需要你自己的 IDA 和它的 MCP 插件，这里填写插件的注册 JSON 文件。",
    unlocks: ["原生程序伪代码（IDA 引擎）"],
    env: "REA_IDA_MCP_CONFIG",
    kind: "file",
    free: false,
    homepage: "https://hex-rays.com/ida-pro",
    detect: () => null,
    async check(value) {
      return exists(value) ? { ok: true, detail: path.basename(value) } : { ok: false, detail: "找不到 IDA MCP 注册文件" };
    },
  },
  {
    id: "jeb",
    name: "JEB（付费，安卓）",
    purpose: "商业安卓反编译器。在 JEB 里开启它的 MCP 服务后，把地址（如 http://127.0.0.1:端口）填在这里。",
    unlocks: ["JEB 工程与伪代码"],
    env: "REA_JEB_MCP_URL",
    kind: "url",
    free: false,
    homepage: "https://www.pnfsoftware.com/",
    detect: () => null,
    async check(value) {
      return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//.test(value.endsWith("/") ? value : `${value}/`)
        ? { ok: true, detail: value }
        : { ok: false, detail: "只支持本机地址，例如 http://127.0.0.1:8080" };
    },
  },
];

export function effectiveValue(engine, settings) {
  const configured = settings.engines[engine.id];
  if (configured) return { value: configured, source: "settings" };
  const detected = engine.detect();
  return detected ? { value: detected, source: "detected" } : { value: null, source: null };
}

/** Environment variables for every configured or auto-detected engine. */
export function engineEnvironment(settings = loadSettings()) {
  const env = {};
  for (const engine of ENGINES) {
    const { value } = effectiveValue(engine, settings);
    if (value) env[engine.env] = value;
  }
  return env;
}

export async function engineStatus() {
  const settings = loadSettings();
  return Promise.all(
    ENGINES.map(async (engine) => {
      const { value, source } = effectiveValue(engine, settings);
      const result = value ? await engine.check(value).catch((error) => ({ ok: false, detail: error.message })) : { ok: false, detail: "未安装" };
      return {
        id: engine.id,
        name: engine.name,
        purpose: engine.purpose,
        unlocks: engine.unlocks,
        env: engine.env,
        kind: engine.kind,
        free: engine.free,
        homepage: engine.homepage,
        sizeHint: engine.sizeHint || null,
        requires: engine.requires || [],
        installable: typeof engine.install === "function",
        value,
        source,
        ok: Boolean(result.ok),
        partial: Boolean(result.partial),
        detail: result.detail,
      };
    }),
  );
}

export async function setEngineValue(id, value) {
  const engine = ENGINES.find((candidate) => candidate.id === id);
  if (!engine) throw new Error(`未知引擎：${id}`);
  const trimmed = (value || "").trim().replace(/^"(.*)"$/, "$1");
  if (trimmed) {
    const result = await engine.check(trimmed);
    if (!result.ok && !result.partial) throw new Error(result.detail);
  }
  updateSettings((settings) => {
    if (trimmed) settings.engines[id] = trimmed;
    else delete settings.engines[id];
  });
}

export async function installEngine(id, { onProgress, signal }) {
  const engine = ENGINES.find((candidate) => candidate.id === id);
  if (!engine?.install) throw new Error("这个引擎不能自动安装");
  const value = await engine.install({ onProgress, signal });
  updateSettings((settings) => {
    settings.engines[id] = value;
  });
  const result = await engine.check(value);
  return { value, ...result };
}
