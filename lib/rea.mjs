import { spawn } from "node:child_process";
import { reaScript } from "./paths.mjs";
import { loadSettings } from "./settings.mjs";
import { ENGINES, engineEnvironment } from "./engines.mjs";

/** Environment REA runs with: the user's own environment plus every engine configured in the workbench. */
export function reaEnvironment(settings = loadSettings()) {
  const env = { ...process.env, ...engineEnvironment(settings), REA_LOG_LEVEL: process.env.REA_LOG_LEVEL || "error" };
  // REA rejects an engine variable that is set but empty, so drop those instead of passing them through.
  for (const engine of ENGINES) if (env[engine.env] === "") delete env[engine.env];
  return env;
}

/**
 * Run one REA CLI command with JSON output.
 * Progress lines (`{"rea_progress":…}`) are forwarded to onProgress; the remaining stdout is the result.
 * Resolves to { ok, data } or { ok: false, error } and never rejects for analysis failures.
 */
export function runRea(args, { onProgress, signal, timeoutMs = 30 * 60_000, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [reaScript(), ...args, "--format", "json"], {
      env: env || reaEnvironment(),
      windowsHide: true,
    });
    let pending = "";
    const resultChunks = [];
    let stderr = "";
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      resolve(value);
    };
    const abort = () => {
      child.kill();
      finish({ ok: false, error: { code: "cancelled", message: "已取消" } });
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, error: { code: "timeout", message: `分析超过 ${Math.round(timeoutMs / 60000)} 分钟仍未完成，已停止` } });
    }, timeoutMs);
    signal?.addEventListener("abort", abort);

    const takeLine = (line) => {
      if (line.startsWith('{"rea_progress"')) {
        try {
          onProgress?.(JSON.parse(line).rea_progress);
          return;
        } catch {
          // Not a progress record after all; keep it as result text.
        }
      }
      resultChunks.push(line);
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      pending += chunk;
      let index;
      while ((index = pending.indexOf("\n")) >= 0) {
        takeLine(pending.slice(0, index).replace(/\r$/, ""));
        pending = pending.slice(index + 1);
      }
    });
    // REA writes progress records to stderr; anything else there is diagnostic text.
    let pendingErr = "";
    const takeErrLine = (line) => {
      if (line.startsWith('{"rea_progress"')) {
        try {
          onProgress?.(JSON.parse(line).rea_progress);
          return;
        } catch {
          // fall through and keep it as diagnostics
        }
      }
      if (stderr.length < 64_000) stderr += `${line}\n`;
    };
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      pendingErr += chunk;
      let index;
      while ((index = pendingErr.indexOf("\n")) >= 0) {
        takeErrLine(pendingErr.slice(0, index).replace(/\r$/, ""));
        pendingErr = pendingErr.slice(index + 1);
      }
    });
    child.on("error", (error) => finish({ ok: false, error: { code: "spawn_failed", message: error.message } }));
    child.on("close", (code) => {
      if (pending) takeLine(pending);
      if (pendingErr) takeErrLine(pendingErr);
      const text = resultChunks.join("\n").trim();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (data && typeof data === "object" && "error" in data && "code" in data && !("normalized_result" in data)) {
        finish({ ok: false, error: data });
      } else if (code === 0 && data !== null) {
        finish({ ok: true, data });
      } else {
        finish({
          ok: false,
          error: data ?? { code: "process_failed", message: (stderr || text || `REA 退出码 ${code}`).slice(0, 4000) },
        });
      }
    });
  });
}
