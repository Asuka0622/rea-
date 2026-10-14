import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 案例馆: self-written teaching samples, each with a story, investigation questions and a conclusion.
// A case is a folder under samples/cases containing workbench-case.json next to the sample itself.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "samples", "cases");

export function caseCatalog() {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(root, entry.name);
      const file = path.join(dir, "workbench-case.json");
      if (!fs.existsSync(file)) return null;
      try {
        const data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
        if (data.format !== "rea-workbench-case-v1") return null;
        return { ...data, path: dir };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
