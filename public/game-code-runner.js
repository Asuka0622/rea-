// 代码运行器: the player's own program, in the language they choose, run in the browser like an online
// judge — the program reads the test's input and prints its answer, and the output is compared.
// Every language runs in a worker (it cannot touch the page; an endless loop is stopped by a time limit):
//   Python      Pyodide (CPython compiled to WebAssembly), downloaded once (~10 MB) and then cached
//   C / C++     JSCPP, an interpreter for a large part of C and C++
//   JavaScript  the browser itself; input() reads a line, console.log prints
// Python and C need the internet the first time; offline, the game offers the instruction cards instead.

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
const JSCPP = "https://esm.sh/JSCPP@2.0.9";

export const LANGUAGES = {
  python: { label: "Python", note: "最适合入门", comment: "#" },
  c: { label: "C", note: "最接近硬件", comment: "//" },
  cpp: { label: "C++", note: "C 的加强版", comment: "//" },
  javascript: { label: "JavaScript", note: "网页用的语言", comment: "//" },
};

const WORKERS = {
  python: {
    module: false,
    source: `importScripts(${JSON.stringify(PYODIDE)});
const ready = loadPyodide().then((py) => { self.py = py; self.postMessage({ ready: true }); }, (e) => self.postMessage({ failed: String(e && e.message || e) }));
self.onmessage = async (e) => {
  await ready;
  let out = "";
  const lines = e.data.input.split("\\n");
  let i = 0;
  self.py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });
  self.py.setStdout({ batched: (s) => { out += s + "\\n"; } });
  self.py.setStderr({ batched: () => {} });
  try {
    await self.py.runPythonAsync(e.data.code);
    self.postMessage({ ok: true, out });
  } catch (err) {
    const message = String(err && err.message || err).trim().split("\\n");
    self.postMessage({ ok: false, out, error: message[message.length - 1] });
  }
};`,
  },
  c: {
    module: true,
    source: `import JSCPP from ${JSON.stringify(JSCPP)};
self.postMessage({ ready: true });
self.onmessage = (e) => {
  let out = "";
  try {
    JSCPP.run(e.data.code, e.data.input, { stdio: { write: (s) => { out += s; } } });
    self.postMessage({ ok: true, out });
  } catch (err) {
    // JSCPP says where on its second line ("line 1 (column 27): …").
    self.postMessage({ ok: false, out, error: String(err && err.message || err).split("\\n").slice(0, 2).join(" ").replace(/^ERROR:\\s*/, "") });
  }
};`,
  },
  javascript: {
    module: false,
    source: `self.postMessage({ ready: true });
self.onmessage = (e) => {
  let out = "";
  const lines = e.data.input.split("\\n");
  let i = 0;
  const input = () => (i < lines.length ? lines[i++] : "");
  const console = { log: (...parts) => { out += parts.join(" ") + "\\n"; } };
  try {
    new Function("input", "console", e.data.code)(input, console);
    self.postMessage({ ok: true, out });
  } catch (err) {
    self.postMessage({ ok: false, out, error: String(err && err.message || err) });
  }
};`,
  },
};
WORKERS.cpp = WORKERS.c;

/**
 * A runner for one language. ready resolves once the language is loaded (Python takes a while the first
 * time); run(code, input) resolves with { ok, out, error } or { timeout: true }.
 */
export function createRunner(language, { onStatus = () => {} } = {}) {
  const spec = WORKERS[language];
  let worker = null;
  let ready = null;
  function start() {
    worker?.terminate();
    worker = new Worker(URL.createObjectURL(new Blob([spec.source], { type: "text/javascript" })), spec.module ? { type: "module" } : undefined);
    ready = new Promise((resolve, reject) => {
      const waiting = setTimeout(() => reject(new Error("timeout")), 90000);
      worker.onmessage = (event) => {
        if (event.data.ready) {
          clearTimeout(waiting);
          resolve();
        } else if (event.data.failed) {
          clearTimeout(waiting);
          reject(new Error(event.data.failed));
        }
      };
      worker.onerror = (event) => {
        clearTimeout(waiting);
        event.preventDefault?.();
        reject(new Error(event.message || "load failed"));
      };
    });
    onStatus("loading");
    ready.then(() => onStatus("ready"), () => onStatus("offline"));
    return ready;
  }
  start();
  return {
    get ready() {
      return ready;
    },
    async run(code, input, limit = 2000) {
      await ready;
      return new Promise((resolve) => {
        const stop = setTimeout(() => {
          // An endless loop: throw the worker away and load a fresh one for the next run.
          start().catch(() => {});
          resolve({ timeout: true });
        }, limit);
        worker.onmessage = (event) => {
          clearTimeout(stop);
          resolve(event.data);
        };
        worker.onerror = (event) => {
          clearTimeout(stop);
          event.preventDefault?.();
          resolve({ ok: false, out: "", error: event.message });
        };
        worker.postMessage({ code, input });
      });
    },
    stop() {
      worker?.terminate();
    },
  };
}

/** Outputs match when they print the same words (spaces and line breaks don't matter). */
export const sameOutput = (a, b) => String(a).trim().split(/\s+/).join(" ") === String(b).trim().split(/\s+/).join(" ");
