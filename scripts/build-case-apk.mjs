#!/usr/bin/env node
// Builds the 案例馆 teaching APK (samples/cases/flashlight-apk/xiaoguang-flashlight.apk) without the
// Android SDK: it encodes AndroidManifest.xml in Android's binary XML format and zips it. The APK
// carries only a manifest (no code, unsigned, cannot be installed); it exists to be inspected.
// Usage: node scripts/build-case-apk.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ANDROID_NS = "http://schemas.android.com/apk/res/android";
// Framework attribute resource ids, so tools can resolve android:* attributes.
const ATTR_IDS = {
  label: 0x01010001,
  name: 0x01010003,
  exported: 0x01010010,
  value: 0x01010024,
  minSdkVersion: 0x0101020c,
  versionCode: 0x0101021b,
  versionName: 0x0101021c,
  targetSdkVersion: 0x01010270,
};

const el = (tag, attrs = {}, ...children) => ({ tag, attrs, children });
const PKG = "com.xiaoguang.flashlight";
const permission = (name) => el("uses-permission", { "android:name": `android.permission.${name}` });
const intent = (action, category) => el("intent-filter", {}, el("action", { "android:name": action }), ...(category ? [el("category", { "android:name": category })] : []));

export const MANIFEST = el(
  "manifest",
  { package: PKG, "android:versionCode": 3, "android:versionName": "1.2" },
  el("uses-sdk", { "android:minSdkVersion": 21, "android:targetSdkVersion": 34 }),
  permission("CAMERA"),
  permission("FLASHLIGHT"),
  permission("READ_CONTACTS"),
  permission("ACCESS_FINE_LOCATION"),
  permission("READ_PHONE_STATE"),
  permission("INTERNET"),
  permission("RECEIVE_BOOT_COMPLETED"),
  el(
    "application",
    { "android:label": "小光手电筒" },
    el("activity", { "android:name": `${PKG}.MainActivity`, "android:exported": true }, intent("android.intent.action.MAIN", "android.intent.category.LAUNCHER")),
    el("receiver", { "android:name": `${PKG}.BootReceiver`, "android:exported": true }, intent("android.intent.action.BOOT_COMPLETED")),
    el("service", { "android:name": `${PKG}.ContactSyncService` }),
    el("activity", { "android:name": "com.quickads.sdk.AdActivity" }),
    el("service", { "android:name": "com.quickads.sdk.TrackService" }),
    el("meta-data", { "android:name": "com.quickads.sdk.APP_ID", "android:value": "qa-demo-0001" }),
    // 序章主线（docs/story-prologue.md 第 4 节⑥）：这个广告组件是悄悄统计做的，数据最后报给钟楼。
    el("meta-data", { "android:name": "com.quickads.sdk.VENDOR", "android:value": "quiet-stats.example" }),
    el("meta-data", { "android:name": "com.quickads.sdk.REPORT_TO", "android:value": "https://tower.bit-town.example/collect" }),
  ),
);

/** Android binary XML (AXML) for an element tree. */
export function encodeAxml(root) {
  // Attribute names with resource ids must come first in the string pool, in resource-map order.
  const attrNames = [];
  const strings = [];
  const index = (s) => {
    let i = strings.indexOf(s);
    if (i < 0) i = strings.push(s) - 1;
    return i;
  };
  const walk = (node, fn) => (fn(node), node.children.forEach((child) => walk(child, fn)));
  walk(root, (node) => Object.keys(node.attrs).forEach((key) => key.startsWith("android:") && !attrNames.includes(key.slice(8)) && attrNames.push(key.slice(8))));
  attrNames.forEach(index);
  index("android");
  index(ANDROID_NS);
  walk(root, (node) => {
    index(node.tag);
    for (const [key, value] of Object.entries(node.attrs)) {
      index(key.replace(/^android:/, ""));
      if (typeof value === "string") index(value);
    }
  });

  const chunk = (type, headerSize, header, body = Buffer.alloc(0)) => {
    const head = Buffer.alloc(8);
    head.writeUInt16LE(type, 0);
    head.writeUInt16LE(headerSize, 2);
    head.writeUInt32LE(8 + header.length + body.length, 4);
    return Buffer.concat([head, header, body]);
  };
  const u32 = (...values) => {
    const b = Buffer.alloc(values.length * 4);
    values.forEach((v, i) => b.writeInt32LE(v | 0, i * 4));
    return b;
  };

  // String pool, UTF-8.
  const encoded = strings.map((s) => {
    const bytes = Buffer.from(s, "utf8");
    const len = (n) => (n > 0x7f ? Buffer.from([0x80 | (n >> 8), n & 0xff]) : Buffer.from([n]));
    return Buffer.concat([len([...s].length), len(bytes.length), bytes, Buffer.from([0])]);
  });
  let offset = 0;
  const offsets = encoded.map((b) => ((offset += b.length), offset - b.length));
  let data = Buffer.concat(encoded);
  if (data.length % 4) data = Buffer.concat([data, Buffer.alloc(4 - (data.length % 4))]);
  const poolHeader = u32(strings.length, 0, 1 << 8, 28 + strings.length * 4, 0);
  const pool = chunk(0x0001, 28, poolHeader, Buffer.concat([u32(...offsets), data]));
  const resourceMap = chunk(0x0180, 8, Buffer.alloc(0), u32(...attrNames.map((name) => ATTR_IDS[name] ?? 0)));

  const nodes = [];
  let line = 1;
  const nsPrefix = strings.indexOf("android");
  const nsUri = strings.indexOf(ANDROID_NS);
  nodes.push(chunk(0x0100, 16, u32(line, -1, nsPrefix, nsUri)));
  const element = (node) => {
    line += 1;
    const attrs = Object.entries(node.attrs).map(([key, value]) => {
      const android = key.startsWith("android:");
      const name = strings.indexOf(android ? key.slice(8) : key);
      let raw = -1;
      let type;
      let dataValue;
      if (typeof value === "string") [raw, type, dataValue] = [strings.indexOf(value), 0x03, strings.indexOf(value)];
      else if (typeof value === "boolean") [type, dataValue] = [0x12, value ? -1 : 0];
      else [type, dataValue] = [0x10, value];
      const typed = Buffer.alloc(8);
      typed.writeUInt16LE(8, 0);
      typed.writeUInt8(0, 2);
      typed.writeUInt8(type, 3);
      typed.writeInt32LE(dataValue, 4);
      return { android, name, buffer: Buffer.concat([u32(android ? nsUri : -1, name, raw), typed]) };
    });
    // Attributes are sorted by resource id; framework attributes (low string indexes) first.
    attrs.sort((a, b) => (a.android === b.android ? (ATTR_IDS[strings[a.name]] ?? 0) - (ATTR_IDS[strings[b.name]] ?? 0) : a.android ? 1 : -1));
    const ext = Buffer.alloc(20);
    ext.writeInt32LE(-1, 0);
    ext.writeInt32LE(strings.indexOf(node.tag), 4);
    ext.writeUInt16LE(20, 8);
    ext.writeUInt16LE(20, 10);
    ext.writeUInt16LE(attrs.length, 12);
    nodes.push(chunk(0x0102, 16, u32(line, -1), Buffer.concat([ext, ...attrs.map((a) => a.buffer)])));
    node.children.forEach(element);
    nodes.push(chunk(0x0103, 16, u32(line, -1), u32(-1, strings.indexOf(node.tag))));
  };
  element(root);
  nodes.push(chunk(0x0101, 16, u32(line, -1, nsPrefix, nsUri)));
  return chunk(0x0003, 8, Buffer.alloc(0), Buffer.concat([pool, resourceMap, ...nodes]));
}

/** A zip archive with the given { name: Buffer } entries (deflated). */
export function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const time = 0x0000;
  const date = (2026 - 1980) << 9 | 10 << 5 | 14;
  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, "utf8");
    const compressed = zlib.deflateRawSync(content);
    const crc = zlib.crc32(content);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "samples", "cases", "flashlight-apk", "xiaoguang-flashlight.apk");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, zip({ "AndroidManifest.xml": encodeAxml(MANIFEST) }));
  console.log(`${out} (${fs.statSync(out).size} bytes)`);
}
