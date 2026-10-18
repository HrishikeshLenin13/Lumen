import test from "node:test";
import assert from "node:assert/strict";
import { runScript } from "../js/lumen-script.mjs";
import { scriptSamples } from "../js/script-samples.mjs";
import { PixelScreen } from "../js/lumen-screen.mjs";
export async function exercise(name, { frames = 3, onFrame = () => {}, files = new Map(), render = false } = {}) {
  const sample = scriptSamples.find((item) => item.name === name);
  assert.ok(sample, name);
  const controller = new AbortController();
  const widgets = new Map();
  const input = { hits: new Set(), clicks: new Set(), keys: new Set(), changes: new Set(), x: 120, y: 100, down: false, mouse: false };
  const screen = new PixelScreen(160, 120);
  const texts = new Map();
  const captures = new Map();
  const sounds = [];
  let frame = 0;
  const take = (set, key) => set.has(key) && (set.delete(key), true);
  const host = { commands: {}, functions: {} };
  const state = { host, input, widgets, files, screen, sounds, texts, get frame() { return frame; } };
  const commands = Object.fromEntries("window present shader noshader label icon windowsize maximize closewindow".split(" ").map((name) => [name, () => {}]));
  Object.assign(commands, {
    screen: (w, h) => { if (typeof w === "number") screen.resize(w, h); },
    cls: (color) => { texts.clear(); if (render) screen.clear(color); },
    text: (x, y, words, color, size, align, font) => texts.set(x + ":" + y + ":" + align, { x, y, words, color, size, align, font }),
    button: (name) => widgets.set(name, 0),
    checkbox: (name, label, value) => widgets.set(name, value),
    slider: (name, label, lo, hi, value) => widgets.set(name, value),
    textbox: (name, label, value) => widgets.set(name, value),
    setvalue: (name, value) => widgets.set(name, value),
    caption: (title) => { state.title = title; },
    tone: (...args) => sounds.push(args),
    sound: (name) => sounds.push(name),
    capture: (name, ...args) => { if (render) captures.set(name, screen.capture(...args)); },
    stamp: (name, ...args) => { if (render) screen.blit(captures.get(name), ...args); },
    drawicon: () => {},
    writefile: (name, content) => files.set(name, String(content)),
    appendfile: (name, content) => files.set(name, (files.get(name) || "") + content),
    frame: () => { frame += 1; onFrame(state); if (frame >= frames) controller.abort(); },
  });
  for (const name of ["pixel", "rect", "box", "line", "circle", "triangle", "scroll"]) {
    commands[name] = (...args) => {
      assert.ok(args.every((value) => typeof value !== "number" || Number.isFinite(value)), sample.name + " produced non-finite drawing coordinates");
      if (render) screen[name](...args);
    };
  }
  Object.assign(host, { commands, functions: {
    width: () => screen.width, height: () => screen.height, winwidth: () => 480, winheight: () => 360,
    delta: () => 1 / 60, fps: () => 60, key: (name) => input.keys.has(name), keyhit: (name) => take(input.hits, name),
    clicked: (name) => take(input.clicks, name), changed: (name) => take(input.changes, name), value: (name) => widgets.get(name) ?? 0,
    mousex: () => input.x, mousey: () => input.y, mousedown: () => input.down, mousehit: () => { const hit = input.mouse; input.mouse = false; return hit; },
    wheel: () => 0, resized: () => false, lastkey: () => "", textwidth: (text, size = 8) => String(text).length * size * 0.6,
    hasfile: (name) => files.has(name), readfile: (name) => files.get(name) || "", files: () => [...files.keys()], getpixel: (x, y) => screen.getPixel(x, y),
  } });
  await runScript(sample.content, { host, signal: controller.signal, output: () => {} }).catch((error) => { if (error.name !== "AbortError") throw error; });
  return state;
}
test("all graphical samples render finite coordinates with real widget defaults", async () => {
  for (const sample of scriptSamples.filter((item) => /^window /m.test(item.content))) {
    await exercise(sample.name, { render: true });
  }
});
test("all sorting algorithms agree for shuffled, reversed, and nearly sorted inputs", async () => {
  for (const pattern of ["shuffle", "reverse", "nearly"]) {
    const state = await exercise("sorting.lsc", { frames: 100, onFrame: ({ frame, widgets, input }) => {
      widgets.set("rate", 32);
      if (frame === 1) input.clicks.add(pattern);
    } });
    const get = (name) => state.host.globals.get(name);
    const expected = Array.from({ length: 56 }, (_, i) => i + 1);
    for (const name of ["bubble", "insertion", "selection"]) assert.deepEqual(get(name), expected, pattern + ": " + name);
    assert.deepEqual(get("done"), [1, 1, 1]);
    assert.equal(get("comparisons")[2], 1540);
  }
});
test("orbital simulation conserves linear momentum and stays finite", async () => {
  const state = await exercise("orbits.lsc", { frames: 180 });
  const get = (name) => state.host.globals.get(name);
  for (const axis of ["vx", "vy"]) {
    let momentum = 0;
    for (let i = 0; i < get("count"); i += 1) momentum += get("mass")[i] * get(axis)[i];
    assert.ok(Math.abs(momentum) < 0.000001, axis + " momentum " + momentum);
  }
  assert.equal(get("count"), 7);
  assert.ok(get("elapsed") > 2.9);
});
test("orbital drag creates a body and the binary preset replaces it", async () => {
  const state = await exercise("orbits.lsc", { frames: 5, onFrame: ({ frame, input, host }) => {
    if (frame === 1) { input.x = 190; input.y = 70; input.mouse = true; input.down = true; }
    if (frame === 2) { input.x = 160; input.down = false; }
    if (frame === 3) { assert.equal(host.globals.get("count"), 8); input.clicks.add("binary"); }
  } });
  assert.equal(state.host.globals.get("count"), 12);
});
test("Breakout handles brick hits, stage completion, and pause", async () => {
  const state = await exercise("breakout.lsc", { frames: 5, onFrame: ({ frame, host, widgets, input }) => {
    const vars = host.globals;
    if (frame === 1) { vars.set("mode", 1); vars.set("bx", 20); vars.set("by", 30); vars.set("vx", 0); vars.set("vy", 90); }
    if (frame === 2) { assert.equal(vars.get("score"), 60); vars.set("remaining", 1); vars.get("bricks").fill(0); vars.get("bricks")[1] = 1; vars.set("bx", 40); vars.set("by", 30); vars.set("vy", 90); }
    if (frame === 3) { assert.equal(vars.get("mode"), 3); input.hits.add("space"); }
    if (frame === 4) { assert.equal(vars.get("level"), 2); widgets.set("pause", true); }
  } });
  assert.equal(state.host.globals.get("level"), 2);
  assert.equal(state.files.get("breakout-best.txt"), "120");
});
test("Snake completes a full board instead of searching forever for food", async () => {
  const state = await exercise("snake.lsc", { frames: 3, onFrame: ({ frame, host }) => {
    const v = host.globals;
    if (frame === 1) {
      v.set("length", v.get("cols") * v.get("rows") - 1);
      v.set("mode", 1); v.set("acc", 1); v.set("fx", 6); v.set("fy", 7);
      v.get("sx").fill(0); v.get("sy").fill(0); v.get("sx")[0] = 5; v.get("sy")[0] = 7;
    }
  } });
  assert.equal(state.host.globals.get("mode"), 3);
  assert.equal(state.host.globals.get("best"), 251);
});
test("Synth loads, saves, and stops a tune without clearing playback each frame", async () => {
  const files = new Map([["synth-tune.txt", "0,4,7\n0,0.3,0.6"]]);
  const state = await exercise("synth.lsc", { frames: 6, files, onFrame: ({ frame, input, host }) => {
    if (frame === 1) input.clicks.add("load");
    if (frame === 2) { assert.deepEqual(host.globals.get("song"), [0, 4, 7]); input.clicks.add("play"); }
    if (frame === 3) { assert.equal(host.globals.get("qn").length, 3); input.clicks.add("save"); }
    if (frame === 4) { assert.equal(host.globals.get("qn").length, 3); input.clicks.add("stop"); }
  } });
  assert.deepEqual(state.host.globals.get("qn"), []);
  assert.equal(files.get("synth-tune.txt"), "0,4,7\n0,0.3,0.6");
});
