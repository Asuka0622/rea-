import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 案例馆: self-written teaching samples, each with a story, investigation questions and a conclusion.
// A case is a folder under samples/cases containing workbench-case.json next to the sample itself.
// `target` names the file to analyse when it is not the folder itself; a "stories" case has no sample.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "samples", "cases");

/** A path inside the case folder, or null if it would leave it or does not exist. */
function inside(dir, relative) {
  const full = path.resolve(dir, String(relative));
  const rel = path.relative(dir, full);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) && fs.existsSync(full) ? full : null;
}

function loadCase(dir) {
  const file = path.join(dir, "workbench-case.json");
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
  if (data.format !== "rea-workbench-case-v1") return null;
  if (data.type === "stories") return { ...data, path: null, questions: [] };
  const target = data.target ? inside(dir, data.target) : dir;
  if (!target) return null;
  const item = { ...data, path: target };
  if (data.lab?.file) {
    const labFile = inside(dir, data.lab.file);
    if (!labFile || fs.statSync(labFile).size > 64 * 1024) return null;
    item.lab = { ...data.lab, content: fs.readFileSync(labFile, "utf8").trim() };
  }
  return item;
}

export function caseCatalog() {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      try {
        return loadCase(path.join(root, entry.name));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

const portraitDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "art", "faces");

/** Names ("lumi-happy") of the dialogue portraits that exist (art/faces/*.webp), so the page only asks for real files. */
export function portraitList() {
  if (!fs.existsSync(portraitDir)) return [];
  return fs.readdirSync(portraitDir).filter((name) => /^[a-z0-9-]+\.webp$/.test(name)).map((name) => name.slice(0, -5)).sort();
}

const pixelDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "art", "pixel");

/** Names of the pixel scenes, case pictures and icons that exist (public/art/pixel/*.png). */
export function pixelArtList() {
  if (!fs.existsSync(pixelDir)) return [];
  const pictures = (dir, prefix = "") => fs.readdirSync(dir).filter((name) => /^[a-z0-9-]+\.png$/.test(name)).map((name) => prefix + name.slice(0, -4));
  const regions = path.join(pixelDir, "regions");
  return [...pictures(pixelDir), ...(fs.existsSync(regions) ? pictures(regions, "regions/") : [])].sort();
}
