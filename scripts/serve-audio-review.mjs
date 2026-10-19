// 起一个本地小服务，用来在浏览器里审听 docs/audio/review/ 里的待审音频。
//
// 用法：node scripts/serve-audio-review.mjs [--port 8123]
//
// 必须支持 Range，否则浏览器里没法拖动进度条、也跳不到尾接缝。
// 页面里点「复制裁决」把 JSON 交回部署方，再按审核结果正式入库。

import { createServer } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const DIR = join(ROOT, "docs", "audio", "review");

const args = process.argv.slice(2);
const flagValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const port = Number(flagValue("--port", "8123"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = normalize(url === "/" ? "/review.html" : url).replace(/^([/\\])+/, "");
  const file = join(DIR, rel);
  if (!file.startsWith(DIR) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404");
    return;
  }

  const size = statSync(file).size;
  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;

  if (range) {
    const [rawStart, rawEnd] = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(rawStart, 10);
    const end = rawEnd ? Number.parseInt(rawEnd, 10) : size - 1;
    if (Number.isNaN(start) || start >= size || end >= size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": type,
    });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Accept-Ranges": "bytes",
    "Content-Length": size,
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  createReadStream(file).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`音频审听台：http://127.0.0.1:${port}/review.html`);
  console.log(`目录：${DIR}`);
  console.log("Ctrl+C 结束。");
});
