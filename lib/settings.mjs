import fs from "node:fs";
import path from "node:path";
import { workbenchHome } from "./paths.mjs";

const DEFAULTS = {
  // engine id -> configured value (a path or URL)
  engines: {},
  // Ask clients to load REA's compact tool schemas; helps smaller models and non-Claude clients.
  compactSchemas: true,
  // Which REA tools AI clients see through mcp-proxy.mjs: "essential" or "full".
  toolProfile: "essential",
  // client id -> { configPath, backupPath, at } for clients the workbench wrote itself
  managedClients: {},
};

function file() {
  return path.join(workbenchHome(), "settings.json");
}

export function loadSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), "utf8"));
    return { ...DEFAULTS, ...raw, engines: { ...raw.engines }, managedClients: { ...raw.managedClients } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(settings) {
  const target = file();
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
  fs.renameSync(tmp, target);
}

export function updateSettings(mutate) {
  const settings = loadSettings();
  mutate(settings);
  saveSettings(settings);
  return settings;
}
