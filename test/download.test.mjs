import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { downloadFile } from "../lib/download.mjs";

const payload = crypto.randomBytes(300_000);
const digest = crypto.createHash("sha256").update(payload).digest("hex");

async function withServer(fn) {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Length": payload.length });
    res.end(payload);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}/engine.zip`);
  } finally {
    server.close();
  }
}

test("downloads, reports progress and keeps a file whose SHA-256 matches", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wb-dl-"));
  const dest = path.join(dir, "engine.zip");
  let lastProgress;
  const result = await withServer((url) => downloadFile(url, dest, { sha256: digest, onProgress: (p) => (lastProgress = p) }));
  assert.equal(result.sha256, digest);
  assert.deepEqual(fs.readFileSync(dest), payload);
  assert.equal(lastProgress.received, payload.length);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("deletes the download when the SHA-256 does not match", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wb-dl-"));
  const dest = path.join(dir, "engine.zip");
  await assert.rejects(withServer((url) => downloadFile(url, dest, { sha256: "0".repeat(64) })), /校验失败/);
  assert.equal(fs.existsSync(dest), false);
  assert.equal(fs.existsSync(`${dest}.part`), false);
  fs.rmSync(dir, { recursive: true, force: true });
});
