#!/usr/bin/env node
// A thin stdio MCP proxy in front of `rea mcp` that only exposes one tool profile.
// AI clients launch this instead of REA directly: node mcp-proxy.mjs --profile essential
import { spawn } from "node:child_process";
import readline from "node:readline";
import { reaScript } from "./lib/paths.mjs";
import { profileAllows, TOOL_PROFILES } from "./lib/toolsets.mjs";

const argv = process.argv.slice(2);
const profile = argv[argv.indexOf("--profile") + 1] || "essential";
if (!TOOL_PROFILES[profile]) {
  console.error(`未知的工具配置：${profile}`);
  process.exit(2);
}

const rea = spawn(process.execPath, [reaScript(), "mcp"], { stdio: ["pipe", "pipe", "inherit"], env: process.env });
const listRequests = new Set();
const write = (stream, message) => stream.write(`${JSON.stringify(message)}\n`);

// client -> REA
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    rea.stdin.write(`${line}\n`);
    return;
  }
  if (message.method === "tools/list" && message.id !== undefined) listRequests.add(message.id);
  if (message.method === "tools/call" && !profileAllows(profile, message.params?.name)) {
    write(process.stdout, {
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32602, message: `Tool ${message.params?.name} is not enabled in the "${profile}" profile of REA Workbench.` },
    });
    return;
  }
  rea.stdin.write(`${line}\n`);
});
process.stdin.on("end", () => rea.stdin.end());

// REA -> client
readline.createInterface({ input: rea.stdout }).on("line", (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    process.stdout.write(`${line}\n`);
    return;
  }
  if (message.id !== undefined && listRequests.delete(message.id) && Array.isArray(message.result?.tools)) {
    message.result.tools = message.result.tools.filter((tool) => profileAllows(profile, tool.name));
  }
  write(process.stdout, message);
});

rea.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => rea.kill(signal));
