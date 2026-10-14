// 存档读写：进度写在 saves/slot1.sav 里。
// 为了防止玩家随手改金币，存档先算一个校验码，再整体做 Base64 编码。
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SAVE_SALT = "farm-2024-salt";
const NEW_GAME = { player: "新农夫", day: 1, gold: 50, crops: {}, tools: ["锄头"] };

function checksum(body) {
  return crypto.createHash("sha256").update(SAVE_SALT + body).digest("hex").slice(0, 16);
}

function encodeSave(state) {
  const body = JSON.stringify(state);
  const packed = JSON.stringify({ v: 1, body, sum: checksum(body) });
  return Buffer.from(packed, "utf8").toString("base64");
}

function decodeSave(text) {
  const { body, sum } = JSON.parse(Buffer.from(text, "base64").toString("utf8"));
  if (checksum(body) !== sum) return { ...NEW_GAME, warning: "存档被修改过，已重新开始" };
  return JSON.parse(body);
}

function savePath(dir) {
  return path.join(dir, "saves", "slot1.sav");
}

function saveGame(dir, state) {
  fs.writeFileSync(savePath(dir), encodeSave(state));
}

function loadGame(dir) {
  if (!fs.existsSync(savePath(dir))) return NEW_GAME;
  return decodeSave(fs.readFileSync(savePath(dir), "utf8"));
}

module.exports = { saveGame, loadGame, encodeSave, decodeSave };
