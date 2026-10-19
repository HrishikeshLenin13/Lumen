import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { makeDefaultData, normalizeData } from "../js/data-core.mjs";
import { createSystemFiles, resolveVirtualFile } from "../js/system-files.mjs";
import { runScript, display } from "../js/lumen-script.mjs";
const setup = (initial = makeDefaultData()) => { const sync = createSystemFiles(normalizeData); sync(initial); return { data: initial, sync, file: (name) => resolveVirtualFile(initial.files, "System/" + name).file }; };
test("System installs eight live config files, documentation, and status without duplicating them", () => {
  const { data, sync, file } = setup();
  assert.equal(data.files.length, 11);
  assert.ok(file("README.txt").content.includes("writefile"));
  assert.match(file("status.txt").content, /All system files valid/);
  assert.equal(JSON.parse(file("display.json").content).theme, data.theme);
  const snapshot = JSON.stringify(data.files); sync(data);
  assert.equal(JSON.stringify(data.files), snapshot);
});
test("app changes mirror into files without stale configuration undoing them", () => {
  const { data, sync, file } = setup();
  data.volume = 37; data.rockName = "Pebble"; data.recentChars = "★→♥";
  assert.deepEqual(sync(data).changed, []);
  assert.equal(JSON.parse(file("sound.json").content).volume, 37);
  assert.equal(JSON.parse(file("rock.json").content).rockName, "Pebble");
  assert.equal(file("recent-characters.txt").content, "★→♥");
  sync(data); assert.equal(data.volume, 37);
});
test("valid partial JSON and text edits change real state and canonicalize the file", () => {
  const { data, sync, file } = setup();
  file("sound.json").content = '{"volume":23,"sounds":false}';
  file("display.json").content = '{"theme":"olive","clock24":true}';
  file("recent-characters.txt").content = "𝄞𝄞ABCDEF\n";
  const result = sync(data);
  assert.deepEqual(new Set(result.changed), new Set(["volume", "sounds", "theme", "clock24", "recentChars"]));
  assert.equal(data.volume, 23); assert.equal(data.sounds, false); assert.equal(data.theme, "olive"); assert.equal(data.clock24, true);
  assert.equal(data.recentChars, "𝄞ABCD"); assert.equal(file("recent-characters.txt").content, "𝄞ABCD");
  assert.ok("wallpaper" in JSON.parse(file("display.json").content));
});
test("invalid drafts survive saves and reloads without replacing working settings", () => {
  const { data, sync, file } = setup(); const original = data.theme;
  file("display.json").content = '{"theme":';
  assert.equal(sync(data).errors.length, 1);
  data.volume = 35; sync(data);
  assert.equal(data.theme, original); assert.equal(file("display.json").content, '{"theme":');
  assert.match(file("status.txt").content, /Invalid JSON/);
  const restored = normalizeData(JSON.parse(JSON.stringify(data)));
  const result = createSystemFiles(normalizeData)(restored);
  assert.equal(result.errors.length, 1); assert.equal(restored.theme, original);
  file("display.json").content = '{"theme":"zune"}'; assert.equal(sync(data).errors.length, 0);
  assert.equal(data.theme, "zune"); assert.match(file("status.txt").content, /All system files valid/);
});
test("validation is atomic, rejects unknown settings, and never executes configuration", () => {
  const { data, sync, file } = setup(); const theme = data.theme;
  for (const content of ['{"theme":"olive","brightness":999}', '{"theme":"no-such-theme"}', '{"files":[]}', '[]', 'null', '{"__proto__":{"polluted":true}}', 'alert("hello")']) {
    file("display.json").content = content;
    assert.equal(sync(data).errors.length, 1, content);
    assert.equal(data.theme, theme); assert.equal(data.brightness, 100);
    assert.equal(file("display.json").content, content);
  }
  assert.equal({}.polluted, undefined);
});
test("every configuration family can be edited through its real schema", () => {
  const { data, sync, file } = setup();
  for (const [name, patch] of [["screensaver.json", { screensaver: false, saverWait: 5 }], ["focus.json", { focusMin: 31, focusLabel: "Build something" }], ["rock.json", { rockName: "Stonehenge Jr", rockPets: 99, rockDialogue: null }], ["history.json", { runHistory: ["charmap"], showTips: false }], ["desktop.json", { startPins: ["petrock"], quickLaunch: ["charmap"], iconGrid: false }]]) {
    file(name).content = JSON.stringify(patch); assert.deepEqual(sync(data).errors, []);
    for (const [key, value] of Object.entries(patch)) assert.deepEqual(data[key], value);
  }
});
test("managed files recover after deletion without touching ordinary user documents", () => {
  const initial = makeDefaultData(); initial.files.push({ id: "user", name: "my.txt", kind: "text", parent: null, content: "Keep this" });
  const { data, sync, file } = setup(initial); const removed = file("sound.json").id;
  data.files = data.files.filter((entry) => entry.id !== removed); sync(data);
  assert.ok(file("sound.json")); assert.equal(data.files.find((entry) => entry.id === "user").content, "Keep this");
  const folder = data.files.find((entry) => entry.id === "lumen-system"); data.files = data.files.filter((entry) => entry.id !== folder.id && entry.parent !== folder.id); sync(data);
  assert.equal(data.files.length, 12); assert.ok(file("rock.json"));
});
test("reserved ID collisions and an existing System folder do not overwrite user files", () => {
  const data = makeDefaultData(), original = [{ id: "lumen-system", name: "Precious.txt", kind: "text", parent: null, content: "Keep" }, { id: "mine", name: "System", kind: "folder", parent: null, content: "" }];
  data.files.push(...structuredClone(original)); const result = createSystemFiles(normalizeData)(data);
  assert.equal(result.folder.name, "Lumen System"); assert.notEqual(result.folder.id, "lumen-system");
  assert.deepEqual(data.files.slice(0, 2), original);
});
test("a full pre-existing file collection retains its documents and managed files after reload", () => {
  const data = makeDefaultData(); data.files = Array.from({ length: 500 }, (_, i) => ({ id: "user-" + i, name: i + ".txt", kind: "text", parent: null, content: "Keep" }));
  createSystemFiles(normalizeData)(data);
  const restored = normalizeData(JSON.parse(JSON.stringify(data)));
  assert.equal(restored.files.length, 511); assert.ok(resolveVirtualFile(restored.files, "System/README.txt").file);
});
test("virtual paths resolve root and nested names without breaking legacy basename lookups", () => {
  const { data } = setup();
  const target = resolveVirtualFile(data.files, "System/rock.json").file;
  for (const path of ["system/ROCK.JSON", "/System/rock.json", "C:\\System\\rock.json", "System/./rock.json", "rock.json"]) assert.equal(resolveVirtualFile(data.files, path).file, target);
  assert.equal(resolveVirtualFile(data.files, "System/custom.txt").parent, target.parent);
  assert.equal(resolveVirtualFile(data.files, "missing.txt").file, undefined);
  for (const path of ["", "System/../rock.json", "NoFolder/rock.json", "System/"]) assert.throws(() => resolveVirtualFile(data.files, path));
});
test("the actual script file host runs all README examples and reports invalid writes", async () => {
  const { data, sync, file } = setup(); const errors = [];
  const source = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  const chunk = source.slice(source.indexOf("  const fileByName ="), source.indexOf("  const commands = {", source.indexOf("  const fileByName =")));
  const api = vm.runInNewContext(chunk + "\n({ saveFile, fileByName })", { data, display, resolveVirtualFile, makeId: () => "script-test", persistData: () => { errors.splice(0, errors.length, ...sync(data).errors); return true; }, systemFileErrors: errors, document: { dispatchEvent() {} }, Event });
  const lines = file("README.txt").content.split("\n").filter((line) => /^eval /.test(line)).map((line) => line.slice(5));
  const output = [];
  await runScript(lines.join("\n"), { output: (value) => output.push(value), host: { commands: { writefile: (name, value) => api.saveFile(name, value, false) }, functions: { readfile: (name) => api.fileByName(name)?.content || "" } } });
  assert.ok(output.length); assert.equal(data.recentChars, "★→♥✓♫"); assert.equal(data.rockName, "Pebbletron");
  assert.throws(() => api.saveFile("System/sound.json", '{"volume":999}', false), /Invalid value/);
  api.saveFile("System/custom.txt", "Local", false); assert.equal(resolveVirtualFile(data.files, "System/custom.txt").file.content, "Local");
});
test("the live configuration module is cached for offline startup", () => assert.match(readFileSync(new URL("../sw.js", import.meta.url), "utf8"), /\.\/js\/system-files\.mjs\?v=/));
