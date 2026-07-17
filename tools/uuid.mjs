#!/usr/bin/env node
// Cocos Creator uuid compression, ported from the engine's own
// cocos/core/utils/decode-uuid.ts (found in the installed 3.8.8 bundle).
// Scene files reference user scripts by their script uuid's compressed form.
//
// Usage: node tools/uuid.mjs compress <full-uuid>
//        node tools/uuid.mjs decode <compressed>
//        node tools/uuid.mjs selftest

const BASE64_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_VALUES = new Array(123);
for (let i = 0; i < 123; i++) BASE64_VALUES[i] = 64;
for (let i = 0; i < 64; i++) BASE64_VALUES[BASE64_KEYS.charCodeAt(i)] = i;

const HexChars = "0123456789abcdef";
const _t = ["", "", "", ""];
const UuidTemplate = _t.concat(_t, "-", _t, "-", _t, "-", _t, "-", _t, _t, _t);
const Indices = UuidTemplate.map((x, i) => (x === "-" ? NaN : i)).filter(Number.isFinite);

export function decodeUuid(base64) {
  const uuid = base64.split("@")[0];
  if (uuid.length !== 22) return base64;
  UuidTemplate[0] = base64[0];
  UuidTemplate[1] = base64[1];
  for (let i = 2, j = 2; i < 22; i += 2) {
    const lhs = BASE64_VALUES[base64.charCodeAt(i)];
    const rhs = BASE64_VALUES[base64.charCodeAt(i + 1)];
    UuidTemplate[Indices[j++]] = HexChars[lhs >> 2];
    UuidTemplate[Indices[j++]] = HexChars[((lhs & 3) << 2) | (rhs >> 4)];
    UuidTemplate[Indices[j++]] = HexChars[rhs & 0xf];
  }
  return base64.replace(uuid, UuidTemplate.join(""));
}

export function compressUuid(uuid) {
  const hex = uuid.split("@")[0].replaceAll("-", "");
  if (hex.length !== 32) throw new Error(`not a 32-hex uuid: ${uuid}`);
  let out = hex[0] + hex[1];
  for (let i = 2; i < 32; i += 3) {
    const h1 = parseInt(hex[i], 16);
    const h2 = parseInt(hex[i + 1], 16);
    const h3 = parseInt(hex[i + 2], 16);
    out += BASE64_KEYS[(h1 << 2) | (h2 >> 2)] + BASE64_KEYS[((h2 & 3) << 4) | h3];
  }
  return uuid.includes("@") ? out + "@" + uuid.split("@")[1] : out;
}

// The editor's variant for SCRIPT references in .scene/.prefab files:
// first 5 hex chars verbatim, remaining 27 packed to 18 base64 chars (23
// total). Verified against the taxi template bundled with Creator 3.8.8 —
// all 11 script components in its scenes match their .ts.meta uuids.
export function compressEditorUuid(uuid) {
  const hex = uuid.replaceAll("-", "");
  if (hex.length !== 32) throw new Error(`not a 32-hex uuid: ${uuid}`);
  let out = hex.slice(0, 5);
  for (let i = 5; i < 32; i += 3) {
    const h1 = parseInt(hex[i], 16);
    const h2 = parseInt(hex[i + 1], 16);
    const h3 = parseInt(hex[i + 2], 16);
    out += BASE64_KEYS[(h1 << 2) | (h2 >> 2)] + BASE64_KEYS[((h2 & 3) << 4) | h3];
  }
  return out;
}

// --- CLI / selftest ---
const [, , cmd, arg] = process.argv;
if (cmd === "compress") console.log(compressUuid(arg));
else if (cmd === "compress-editor") console.log(compressEditorUuid(arg));
else if (cmd === "decode") console.log(decodeUuid(arg));
else if (cmd === "selftest") {
  // Vectors from the engine's own tests/asset-manager/decode-uuid.test.ts
  const cases = [
    ["fcmR3XADNLgJ1ByKhqcC5Z", "fc991dd7-0033-4b80-9d41-c8a86a702e59"],
    ["2fkGWtA3tNPY4mxAw5aggP", "2f9065ad-037b-4d3d-8e26-c40c396a080f"],
    ["f9PAVgqAJCBI9mVlX974oI", "f93c0560-a802-4204-8f66-5655fdef8a08"],
  ];
  let ok = true;
  for (const [compressed, full] of cases) {
    const d = decodeUuid(compressed) === full;
    const c = compressUuid(full) === compressed;
    if (!d || !c) ok = false;
    console.log(`${compressed}  decode:${d ? "ok" : "FAIL"}  compress:${c ? "ok" : "FAIL"}`);
  }
  process.exit(ok ? 0 : 1);
}
