import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { characterSets, characterGroups, rememberCharacter } from "../js/character-map.mjs";
import { normalizeData } from "../js/data-core.mjs";
test("Character Map has 35 distinct labeled sets with visible, unique characters", () => {
  assert.equal(Object.keys(characterSets).length, 35);
  assert.equal(new Set(Object.values(characterSets).map((set) => set.label)).size, 35);
  assert.ok(Object.values(characterSets).reduce((count, set) => count + [...set.characters].length, 0) > 3000);
  for (const set of Object.values(characterSets)) {
    assert.ok(characterGroups.includes(set.group));
    assert.ok(set.characters.length > 0);
    assert.equal(new Set([...set.characters]).size, [...set.characters].length, set.label);
    assert.doesNotMatch(set.characters, /[\p{C}\p{Z}\p{M}]/u, set.label);
  }
  for (const id of ["symbols", "arrows", "math", "currency", "box", "accents", "greek"]) assert.ok(characterSets[id]);
});
test("expanded scripts and supplementary musical notation are present", () => {
  for (const [id, char] of [["cyrillic", "Я"], ["armenian", "Ա"], ["georgian", "ა"], ["hebrew", "ש"], ["arabic", "ش"], ["devanagari", "क"], ["bengali", "ক"], ["tamil", "க"], ["thai", "ก"], ["hiragana", "あ"], ["katakana", "ア"], ["hangul", "ㄱ"], ["bopomofo", "ㄅ"], ["han", "人"], ["music", "𝄞"], ["braille", "⣿"], ["fullwidth", "Ａ"]]) assert.ok(characterSets[id].characters.includes(char), id);
});
test("recent characters retain only five unique Unicode characters in most-recent order", () => {
  let recent = "";
  for (const char of "ABCDEF") recent = rememberCharacter(recent, char);
  assert.equal(recent, "FEDCB");
  assert.equal(rememberCharacter(recent, "D"), "DFECB");
  assert.equal(rememberCharacter(recent, "F"), recent);
  assert.equal(rememberCharacter("𝄞ABC𝄞DE", "あ"), "あ𝄞ABC");
  assert.equal(normalizeData({ recentChars: "𝄞𝄞ABCDEF" }).recentChars, "𝄞ABCD");
  assert.equal(normalizeData({ recentChars: null }).recentChars, "");
});
const source = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const start = source.indexOf('    id: "charmap",');
const application = (data, persistData = () => {}) => vm.runInNewContext("({" + source.slice(start, source.indexOf("\n  },", start)) + "})", { characterSets, characterGroups, rememberCharacter, data, persistData, sprite: () => "", escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") });
test("the app lists every set in native optgroups and escapes selectable punctuation", () => {
  const html = application({}).html();
  assert.equal([...html.matchAll(/<option /g)].length, 35);
  assert.equal([...html.matchAll(/<optgroup /g)].length, characterGroups.length);
  assert.ok(html.includes('dir="auto"'));
});
test("grid and recent picks both update the five-character history and supplementary preview", () => {
  const nodes = new Map(), data = { recentChars: "ABCDE" }; let saves = 0;
  const node = (selector) => { if (!nodes.has(selector)) nodes.set(selector, { value: selector === "[data-charmap-set]" ? "symbols" : "", textContent: "", innerHTML: "", listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; } }); return nodes.get(selector); };
  application(data, () => saves++).bind({ querySelector: node });
  const event = (char) => ({ target: { closest: () => ({ dataset: { char } }) } });
  node("[data-charmap-grid]").listeners.click(event("𝄞"));
  assert.equal(data.recentChars, "𝄞ABCD");
  assert.equal(node("[data-charmap-code]").textContent, "U+1D11E");
  node("[data-charmap-recent]").listeners.click(event("C"));
  assert.equal(data.recentChars, "C𝄞ABD");
  assert.equal(node("[data-charmap-text]").value, "𝄞C");
  assert.equal(saves, 2);
  for (const [id, set] of Object.entries(characterSets)) {
    node("[data-charmap-set]").value = id; node("[data-charmap-set]").listeners.change();
    assert.equal([...node("[data-charmap-grid]").innerHTML.matchAll(/data-char=/g)].length, [...set.characters].length);
    assert.equal(node("[data-charmap-zoom]").textContent, [...set.characters][0]);
  }
  assert.match(node("[data-charmap-recent]").innerHTML, /Recent/);
});
test("the character catalog is included in the offline app shell", () => assert.match(readFileSync(new URL("../sw.js", import.meta.url), "utf8"), /\.\/js\/character-map\.mjs\?v=/));
