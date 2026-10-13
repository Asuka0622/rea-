import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appDataDir, homeDir, isMac, isWindows, reaScript } from "./paths.mjs";
import { TOOL_PROFILES } from "./toolsets.mjs";
import { loadSettings, updateSettings } from "./settings.mjs";
import { engineEnvironment } from "./engines.mjs";
import { reaEnvironment, runRea } from "./rea.mjs";

/** VS Code-family extension storage (Cline, Roo Code, Kilo Code live here). */
function vscodeGlobalStorage(extension) {
  return path.join(appDataDir(), "Code", "User", "globalStorage", extension);
}

/**
 * Clients REA's own `setup` does not know about. All of them read a JSON file with an
 * `mcpServers` object, so the workbench can add and remove exactly one `rea` entry.
 * `marker` is a directory that exists only when the client is installed.
 */
const EXTRA_CLIENTS = [
  {
    id: "trae",
    name: "Trae（国际版）",
    vendor: "字节跳动",
    marker: () => path.join(appDataDir(), "Trae"),
    configPath: () => path.join(appDataDir(), "Trae", "User", "mcp.json"),
  },
  {
    id: "trae_cn",
    name: "Trae CN（国内版）",
    vendor: "字节跳动",
    marker: () => path.join(appDataDir(), "Trae CN"),
    configPath: () => path.join(appDataDir(), "Trae CN", "User", "mcp.json"),
  },
  {
    id: "cline",
    name: "Cline（VS Code 插件）",
    vendor: "Cline",
    marker: () => vscodeGlobalStorage("saoudrizwan.claude-dev"),
    configPath: () => path.join(vscodeGlobalStorage("saoudrizwan.claude-dev"), "settings", "cline_mcp_settings.json"),
  },
  {
    id: "roo",
    name: "Roo Code（VS Code 插件）",
    vendor: "Roo",
    marker: () => vscodeGlobalStorage("rooveterinaryinc.roo-cline"),
    configPath: () => path.join(vscodeGlobalStorage("rooveterinaryinc.roo-cline"), "settings", "mcp_settings.json"),
  },
  {
    id: "kilo",
    name: "Kilo Code（VS Code 插件）",
    vendor: "Kilo",
    marker: () => vscodeGlobalStorage("kilocode.kilo-code"),
    configPath: () => path.join(vscodeGlobalStorage("kilocode.kilo-code"), "settings", "mcp_settings.json"),
  },
  {
    id: "kiro",
    name: "Kiro",
    vendor: "Amazon",
    marker: () => path.join(homeDir(), ".kiro"),
    configPath: () => path.join(homeDir(), ".kiro", "settings", "mcp.json"),
  },
  {
    id: "lmstudio",
    name: "LM Studio（本地模型）",
    vendor: "LM Studio",
    marker: () => path.join(homeDir(), ".lmstudio"),
    configPath: () => path.join(homeDir(), ".lmstudio", "mcp.json"),
  },
];

/** Clients whose MCP settings live inside the app UI or an internal database: copy-and-paste with steps. */
const MANUAL_CLIENTS = [
  {
    id: "lingma",
    name: "通义灵码",
    vendor: "阿里云",
    steps: ["打开通义灵码对话面板，点右上角头像 → 个人设置 → MCP 服务", "点「添加」→ 选「通过配置文件添加」或手动填写", "粘贴下面的配置并保存，看到状态变绿即可"],
  },
  {
    id: "codebuddy",
    name: "CodeBuddy",
    vendor: "腾讯云",
    steps: ["打开 CodeBuddy 设置 → MCP", "点「添加 MCP」，在打开的 JSON 文件里粘贴下面的配置", "保存后回到 MCP 列表，确认 rea 已连接"],
  },
  {
    id: "cherry",
    name: "Cherry Studio",
    vendor: "Cherry",
    steps: ["设置 → MCP 服务器 → 右上角「添加」→「从 JSON 导入」", "粘贴下面的配置并确定", "在对话框下方的 MCP 图标里勾选 rea"],
  },
  {
    id: "qoder",
    name: "Qoder",
    vendor: "阿里巴巴",
    steps: ["右上角头像 → Qoder 设置 → MCP", "点「添加」，在打开的 JSON 文件里粘贴下面的配置", "保存后确认 rea 状态为已连接"],
  },
  {
    id: "jetbrains",
    name: "JetBrains AI Assistant",
    vendor: "JetBrains",
    steps: ["Settings → Tools → AI Assistant → Model Context Protocol (MCP)", "点「+」→「As JSON」，粘贴下面的配置", "Apply 后重启 AI Assistant 对话"],
  },
  {
    id: "other",
    name: "其他支持 MCP 的工具",
    vendor: "通用",
    steps: ["在工具的设置里找到 MCP / 工具 / 插件 / Context Server", "选择「本地命令（stdio）」类型，或用 JSON 方式添加", "粘贴下面的配置；如果只能分开填写，命令填 command，参数填 args"],
  },
];

const PROXY = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "mcp-proxy.mjs");

/**
 * The one MCP server entry the workbench writes: run the bundled REA with Node, no npx or network.
 * With a limited tool profile the client talks to mcp-proxy.mjs, which filters REA's tool list.
 */
export function serverEntry(settings = loadSettings()) {
  const env = { ...engineEnvironment(settings) };
  if (settings.compactSchemas) env.REA_MCP_INPUT_SCHEMA_PROFILE = "compact";
  const args = settings.toolProfile === "full" ? [reaScript(), "mcp"] : [PROXY, "--profile", settings.toolProfile];
  return { command: process.execPath, args, env };
}

export function snippet(settings = loadSettings()) {
  return JSON.stringify({ mcpServers: { rea: serverEntry(settings) } }, null, 2);
}

function readJsonStrict(file) {
  if (!fs.existsSync(file)) return {};
  let text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  if (!text.trim()) return {};
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("顶层不是 JSON 对象");
    return value;
  } catch (error) {
    throw new Error(`配置文件 ${file} 不是标准 JSON（${error.message}），为避免弄坏它，已停止。请先修复该文件或改用「复制配置」手动添加。`);
  }
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.rea-workbench.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/** REA-native client list from `rea setup --dry-run`, which also reports detection and configuration. */
async function nativeClientStates() {
  const result = await runRea(["setup", "--client", "cursor", "--dry-run"], { env: reaEnvironment(), timeoutMs: 120_000 });
  if (!result.ok) return [];
  return (result.data.clientStates || [])
    .filter((state) => state.client.name !== "grok_bot")
    .map((state) => ({
      id: state.client.name,
      name: state.client.displayName,
      mode: "native",
      installed: Boolean(state.detected),
      configured: Boolean(state.configured),
      status: state.status,
      configPath: state.client.configPath,
    }));
}

export async function listClients() {
  const settings = loadSettings();
  const extra = EXTRA_CLIENTS.map((client) => {
    const configPath = client.configPath();
    let configured = false;
    try {
      configured = Boolean(readJsonStrict(configPath).mcpServers?.rea);
    } catch {
      configured = false;
    }
    return {
      id: client.id,
      name: client.name,
      vendor: client.vendor,
      mode: "workbench",
      installed: fs.existsSync(client.marker()),
      configured,
      configPath,
      backupPath: settings.managedClients[client.id]?.backupPath || null,
    };
  });
  const manual = MANUAL_CLIENTS.map((client) => ({ ...client, mode: "manual", installed: null, configured: null }));
  const profiles = Object.entries(TOOL_PROFILES).map(([id, p]) => ({ id, label: p.label, description: p.description }));
  return { native: await nativeClientStates(), extra, manual, snippet: snippet(settings), compactSchemas: settings.compactSchemas, toolProfile: settings.toolProfile, profiles, platform: { isWindows, isMac } };
}

/** What connecting a client would change, shown to the user before anything is written. */
export async function previewClient(id) {
  const extra = EXTRA_CLIENTS.find((client) => client.id === id);
  if (extra) {
    const configPath = extra.configPath();
    const current = readJsonStrict(configPath);
    return {
      actions: [
        {
          label: `${fs.existsSync(configPath) ? "修改" : "新建"}配置文件，只添加/更新其中名为 rea 的一项，其他内容保持不变`,
          target: configPath,
        },
        ...(fs.existsSync(configPath) ? [{ label: "修改前先备份原文件", target: `${configPath}.rea-workbench-<时间>.bak` }] : []),
      ],
      replacing: Boolean(current.mcpServers?.rea),
      entry: serverEntry(),
    };
  }
  const result = await runRea(["setup", "--client", id, "--dry-run"], { env: reaEnvironment(), timeoutMs: 120_000 });
  if (!result.ok) throw new Error(result.error.message || "无法生成预览");
  return {
    actions: result.data.plannedActions.map((action) => ({
      label: action.kind === "install_skill" ? "安装 REA 的逆向分析技能说明（让 AI 知道怎么用这些工具）" : `添加 REA 到 ${action.label}，保留其他配置`,
      target: action.target,
    })),
    replacing: false,
  };
}

export async function connectClient(id) {
  const extra = EXTRA_CLIENTS.find((client) => client.id === id);
  if (extra) {
    const configPath = extra.configPath();
    const current = readJsonStrict(configPath);
    let backupPath = null;
    if (fs.existsSync(configPath)) {
      backupPath = `${configPath}.rea-workbench-${stamp()}.bak`;
      fs.copyFileSync(configPath, backupPath);
    }
    const next = { ...current, mcpServers: { ...(current.mcpServers || {}), rea: serverEntry() } };
    writeJsonAtomic(configPath, next);
    updateSettings((settings) => {
      settings.managedClients[id] = { configPath, backupPath, at: new Date().toISOString() };
    });
    return { configPath, backupPath };
  }
  // REA-native clients: let REA's own setup write its format (JSON, TOML, …) and skill, with engines in the environment.
  const env = reaEnvironment();
  if (loadSettings().compactSchemas) env.REA_MCP_INPUT_SCHEMA_PROFILE = "compact";
  const result = await runRea(["setup", "--client", id, "--yes"], { env, timeoutMs: 300_000 });
  if (!result.ok) throw new Error(result.error.message || "REA setup 失败");
  return { applied: result.data.appliedActions?.map((action) => action.target) || [] };
}

export function disconnectClient(id) {
  const extra = EXTRA_CLIENTS.find((client) => client.id === id);
  if (!extra) throw new Error("这个客户端由 REA 自己管理；如需全部移除，请在体检页使用「移除所有 REA 接入」");
  const configPath = extra.configPath();
  const current = readJsonStrict(configPath);
  if (!current.mcpServers?.rea) return { configPath, removed: false };
  const backupPath = `${configPath}.rea-workbench-${stamp()}.bak`;
  fs.copyFileSync(configPath, backupPath);
  delete current.mcpServers.rea;
  writeJsonAtomic(configPath, current);
  updateSettings((settings) => {
    delete settings.managedClients[id];
  });
  return { configPath, removed: true, backupPath };
}

export function setCompact(enabled) {
  updateSettings((settings) => {
    settings.compactSchemas = Boolean(enabled);
  });
}

export function setToolProfile(profile) {
  if (!TOOL_PROFILES[profile]) throw new Error(`未知的工具配置：${profile}`);
  updateSettings((settings) => {
    settings.toolProfile = profile;
  });
}
