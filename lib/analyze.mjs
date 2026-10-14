import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {inspectUnityBundle} from './unity.mjs';
import {inspectModelMod} from "./model-mods.mjs";
import {inspectGameSource} from "./game-cases.mjs";
import { inspectModProject } from "./game-mods.mjs";
import {fileURLToPath} from "node:url";
import { inspectRustProject } from "./rust.mjs";
import { detectTarget } from "./detect.mjs";
import { runRea } from "./rea.mjs";
import { summarize, explainError, FOLLOW_UPS } from "./summarize.mjs";
import { engineStatus } from "./engines.mjs";
import { workbenchDir } from "./paths.mjs";

const LABELS = {
  "inspect-unity-bundle": "真实读取 Unity 资源并导出贴图与网格",
  "inspect-model-mod": "检查人物模型 Mod 文件与资源",
  "inspect-game-source": "分析真实游戏与 Mod 源码",
  "inspect-game-mod": "分析游戏 Mod 与数值结构",
  "inspect-rust-project": "分析 Rust 源码结构",
  "inspect-artifact": "盘点文件内容",
  "analyze-javascript-application": "分析 JavaScript 代码结构",
  "inspect-managed-artifact": "识别是否 .NET 程序",
  "inspect-web-network-capture": "解析网络抓包",
  ...Object.fromEntries(Object.values(FOLLOW_UPS).map((f) => [f.command, f.label])),
};

/** Commands whose CLI needs more than the target path. */
const EXTRA_ARGS = {
  "inspect-web-network-capture": ["har"],
};

/** Every command the workbench may run on a user's target; nothing else is accepted from the browser. */
export const ALLOWED_COMMANDS = new Set([...Object.keys(LABELS)]);

/** For the professional-mode command picker. */
export function commandCatalog() {
  return [...ALLOWED_COMMANDS].map((command) => ({ command, label: LABELS[command], extraArgs: EXTRA_ARGS[command] || [] }));
}

/** The first commands to run for each kind of target. */
async function initialPlan(kind) {
  if (kind === "unity") return ["inspect-unity-bundle"];
  if (kind === "modelmod") return ["inspect-model-mod"];
  if (kind === "gamesource") return ["inspect-game-source"];
  if (kind === "gamemod") return ["inspect-game-mod"];
  if (kind === "rust") return ["inspect-rust-project"];
  const engines = Object.fromEntries((await engineStatus()).map((e) => [e.id, e]));
  switch (kind) {
    case "javascript":
      return ["analyze-javascript-application"];
    case "apk":
      return engines.jadx.ok && (engines.java.ok || engines.java.partial) ? ["inspect-artifact", "inspect-android-package"] : ["inspect-artifact"];
    case "pe":
      return ["inspect-artifact", "inspect-managed-artifact"];
    case "macho":
      return ["inspect-artifact", "inspect-macho"];
    case "har":
      return ["inspect-web-network-capture"];
    default:
      return ["inspect-artifact"];
  }
}

function saveRaw(data) {
  const id = crypto.randomBytes(8).toString("hex");
  const resultDir = ["rea-workbench/inert-mod-scan","rea-workbench/inert-game-source-scan","rea-workbench/inert-model-mod-scan"].includes(data?.scanner) ? modResultsDir() : workbenchDir("results");
  fs.mkdirSync(resultDir,{recursive:true});
  fs.writeFileSync(path.join(resultDir, `${id}.json`), JSON.stringify(data));
  return id;
}

const modResultsDir = () => process.env.REA_WORKBENCH_SANDBOX ? path.join(process.env.REA_WORKBENCH_SANDBOX,"game-mods","results") : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/game-mods/results");

export function rawPath(id) {
  if (!/^[0-9a-f]{16}$/.test(id)) return null;
  const localFile = path.join(modResultsDir(), `${id}.json`);
  if (fs.existsSync(localFile)) return localFile;
  const file = path.join(workbenchDir("results"), `${id}.json`);
  return fs.existsSync(file) ? file : null;
}

/**
 * Analyse a target, emitting events as it goes:
 * detected → (step-start → progress* → step-done)* → done.
 */
export async function analyzeTarget(target, { commands, emit, signal }) {
  if (!path.isAbsolute(target) || !fs.existsSync(target)) throw new Error("找不到这个文件或文件夹，请检查路径");
  const detected = detectTarget(target);
  emit({ type: "detected", target, ...detected });
  const plan = commands?.length ? commands.filter((c) => ALLOWED_COMMANDS.has(c)) : await initialPlan(detected.kind);
  if (detected.kind === "apk" && !commands?.length && !plan.includes("inspect-android-package")) {
    emit({ type: "hint", engine: "jadx", message: "安装 JADX 后，还能看到 APK 的包名、权限和代码类。" });
  }
  for (const command of plan) {
    if (signal?.aborted) break;
    emit({ type: "step-start", command, label: LABELS[command] || command });
    if (command === "inspect-unity-bundle") {
      try {
        if(detected.kind!=="unity")throw new Error("请选择单个 UnityFS / UnityRaw / UnityWeb 资源包");
        const {raw,report}=await inspectUnityBundle(target,{signal});
        if(signal?.aborted)break;
        emit({type:"step-done",command,ok:true,report,rawId:saveRaw(raw),fingerprint:raw.source.sha256});
      }catch(error){
        if(signal?.aborted)break;
        emit({type:"step-done",command,ok:false,error:{title:"Unity 资源读取未完成",plain:error.message}});
      }
      continue;
    }
    if (command === "inspect-model-mod") {
      try {
        if(!detected.isDirectory) throw new Error("请选择已解压的模型 Mod 文件夹");
        const {raw,report}=inspectModelMod(target);
        if(signal?.aborted) break;
        emit({type:"step-done",command,ok:true,report,rawId:saveRaw(raw),fingerprint:null});
      }catch(error){emit({type:"step-done",command,ok:false,error:{title:"模型 Mod 检查未完成",plain:error.message}});}
      continue;
    }
    if (command === "inspect-game-source") {
      try {
        if(detected.kind!=="gamesource") throw new Error("请选择工作台的真实游戏源码目录");
        const {raw,report}=inspectGameSource(target);
        if(signal?.aborted) break;
        emit({type:"step-done",command,ok:true,report,rawId:saveRaw(raw),fingerprint:null});
      }catch(error){emit({type:"step-done",command,ok:false,error:{title:"游戏源码扫描未完成",plain:error.message}});}
      continue;
    }
    if (command === "inspect-game-mod") {
      try {
        if(detected.kind!=="gamemod") throw new Error("请选择工作台教学 Mod 或 Demo 目录");
        const {raw,report}=inspectModProject(target);
        if(signal?.aborted) break;
        emit({type:"step-done",command,ok:true,report,rawId:saveRaw(raw),fingerprint:null});
      } catch(error) {emit({type:"step-done",command,ok:false,error:{title:"Mod 扫描未完成",plain:error.message}});}
      continue;
    }
    if (command === "inspect-rust-project") {
      try {
        if (detected.kind !== "rust") throw new Error("请选择含有 Cargo.toml 的 Rust 源码目录");
        const {raw, report} = inspectRustProject(target);
        if (signal?.aborted) break;
        emit({type:"step-done",command,ok:true,report,rawId:saveRaw(raw),fingerprint:null});
      } catch(error) {
        emit({type:"step-done",command,ok:false,error:{title:"源码扫描未完成",plain:error.message}});
      }
      continue;
    }
    const result = await runRea([command, target, ...(EXTRA_ARGS[command] || [])], {
      signal,
      onProgress: (progress) => emit({ type: "progress", command, message: progress.message }),
    });
    if (result.ok) {
      const rawId = saveRaw(result.data);
      const fingerprint = result.data?.subject?.digest?.sha256 || null;
      emit({ type: "step-done", command, ok: true, report: summarize(command, result.data), rawId, fingerprint });
    } else {
      emit({ type: "step-done", command, ok: false, error: explainError(result.error) });
    }
  }
  emit({ type: "done" });
}
