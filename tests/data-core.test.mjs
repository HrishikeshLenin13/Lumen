import { test } from "node:test";
import assert from "node:assert/strict";
import { cursorSurfaceMatrix, smudgePixels } from "../js/data-core.mjs";
test("smudge blends color and alpha in place without changing uniform regions", () => { const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 0]); assert.equal(smudgePixels(pixels), pixels); assert.deepEqual([...pixels], [213, 0, 43, 213, 43, 0, 213, 43]); const uniform = new Uint8ClampedArray([40, 80, 120, 255, 40, 80, 120, 255]); assert.deepEqual([...smudgePixels(uniform)], [40, 80, 120, 255, 40, 80, 120, 255]); assert.equal(smudgePixels(new Uint8ClampedArray()).length, 0); });
test("cursor surface cancels the local CRT distortion at opposite corners", () => { for (const [x, y] of [[0, 0], [1200, 0], [0, 800], [1200, 800]]) { const [a, b, c, d] = cursorSurfaceMatrix(x, y, 1200, 800, 0.028); const cross = (x ? 1 : -1) * (y ? 1 : -1) * 0.028; assert.ok(Math.abs(1.056 * a + cross * 1.5 * b - 1) < 1e-12); assert.ok(Math.abs(cross / 1.5 * a + 1.056 * b) < 1e-12); assert.ok(Math.abs(1.056 * c + cross * 1.5 * d) < 1e-12); assert.ok(Math.abs(cross / 1.5 * c + 1.056 * d - 1) < 1e-12); } });
test("cursor surface stays flat without curvature and at the screen center", () => { assert.deepEqual(cursorSurfaceMatrix(0, 0, 1200, 800), [1, 0, 0, 1]); assert.deepEqual(cursorSurfaceMatrix(600, 400, 1200, 800, 0.028).map((n) => n || 0), [1, 0, 0, 1]); });
import { makeDefaultData, normalizeData, normalizeTags, extractNoteHeadings, noteStats, appendNoteRevision, restoreNoteRevision, validateLogEntry, filterLogs, restoreTimerState, appendCompletedSession, logsToCsv, calculateExpression, createMinefield, neighbors, revealArea, floodFill, linePoints, shapePoints, monthGrid } from "../js/data-core.mjs";

test("notes outline extracts Markdown headings with line and selection offsets", () => {
  assert.deepEqual(extractNoteHeadings("Opening\n## Plan ##\ntext\n   # Indented\n### Done\n\n```md\n# Example inside code\n```not-a-close\n## Still code\n```\n~~~~\n## Also code\n~~~~\n  # Final"), [
    { level: 2, title: "Plan", line: 2, start: 8, end: 18, contentStart: 11 },
    { level: 1, title: "Indented", line: 4, start: 24, end: 37, contentStart: 29 },
    { level: 3, title: "Done", line: 5, start: 38, end: 46, contentStart: 42 },
    { level: 1, title: "Final", line: 15, start: 132, end: 141, contentStart: 136 },
  ]);
  assert.deepEqual(extractNoteHeadings("## \n####### not a heading\n# Works"), [
    { level: 1, title: "Works", line: 3, start: 26, end: 33, contentStart: 28 },
  ]);
});

test("notes statistics count Unicode characters and human-readable words", () => {
  assert.deepEqual(noteStats("Hello  world\n🚀 launch"), { words: 4, characters: 21, lines: 2 });
  assert.deepEqual(noteStats(""), { words: 0, characters: 0, lines: 0 });
});
test("calculator evaluates constrained arithmetic", () => {
  assert.deepEqual(calculateExpression("(12 + 3) * 2 / 5"), { ok: true, value: 6 });
  assert.equal(calculateExpression("2 / 0").ok, false);
  assert.equal(calculateExpression("alert(1)").ok, false);
  assert.equal(calculateExpression("2 +").ok, false);
});

test("notes version history skips blanks and duplicates and keeps twenty snapshots", () => {
  assert.deepEqual(appendNoteRevision([], "   ", "now", "blank"), []);
  const first = appendNoteRevision([], "# Plan\nShip it", "2026-01-01", "one");
  assert.deepEqual(first[0], { id: "one", text: "# Plan\nShip it", at: "2026-01-01", words: 4, characters: 14, lines: 2 });
  assert.deepEqual(appendNoteRevision(first, "# Plan\nShip it", "later", "duplicate"), first);
  let history = first;
  for (let index = 0; index < 25; index += 1) history = appendNoteRevision(history, `Revision ${index}`, `time-${index}`, `id-${index}`);
  assert.equal(history.length, 20);
  assert.equal(history[0].id, "id-24");
  assert.equal(history.at(-1).id, "id-5");
  assert.deepEqual(appendNoteRevision(history, "x".repeat(100_001), "huge", "huge"), history);
});

test("restoring a note version preserves the current editor text as a new snapshot", () => {
  const history = appendNoteRevision([], "Old note", "old-time", "old");
  const restored = restoreNoteRevision(history, "Current draft", "old", "restore-time", "current");
  assert.equal(restored.ok, true);
  assert.equal(restored.reason, null);
  assert.equal(restored.text, "Old note");
  assert.equal(restored.history[0].id, "current");
  assert.equal(restored.history[0].text, "Current draft");
  assert.deepEqual(restoreNoteRevision(history, "Current draft", "missing", "now", "new"), {
    ok: false,
    reason: "missing",
    text: "Current draft",
    history,
  });
  const oversized = "x".repeat(100_001);
  const rejected = restoreNoteRevision(history, oversized, "old", "now", "large");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "current-too-large");
  assert.equal(rejected.text, oversized);
});

test("migration preserves existing logs and supplies empty project metadata", () => {
  const migrated = normalizeData({ logs: [{ id: "old", h: 1.5, text: "Fixed the header", at: "2026-01-02T03:04:00.000Z" }] });
  assert.equal(migrated.logs.length, 1);
  assert.deepEqual(migrated.logs[0], { id: "old", h: 1.5, text: "Fixed the header", at: "2026-01-02T03:04:00.000Z", project: "", tags: [] });
  assert.deepEqual(migrated.sessions, []);
  assert.deepEqual(migrated.tasks, []);
  assert.equal(migrated.timerState, null);
  assert.deepEqual(migrated.noteHistory, []);
});

test("migration repairs note version metadata and rejects invalid versions", () => {
  assert.deepEqual(normalizeData({ tasks: [{ id: "task", text: "  Ship update  ", done: 1, createdAt: "now" }, { text: "  " }] }).tasks, [{ id: "task", text: "Ship update", done: true, createdAt: "now" }]);
  assert.deepEqual(normalizeData({ tasks: [{ id: "t", text: "Due", due: "2026-10-20", createdAt: "x" }, { id: "u", text: "Bad", due: "soon", createdAt: "x" }] }).tasks, [{ id: "t", text: "Due", done: false, createdAt: "x", due: "2026-10-20" }, { id: "u", text: "Bad", done: false, createdAt: "x" }]);
  const migrated = normalizeData({ noteHistory: [
    { id: "old", text: "One two", at: "2026-01-02", words: 900 },
    { text: "" },
    null,
  ] }, () => "generated");
  assert.deepEqual(migrated.noteHistory, [{ id: "old", text: "One two", at: "2026-01-02", words: 2, characters: 7, lines: 1 }]);
});

test("migration deduplicates adjacent note versions and caps stored text", () => {
  const versions = [
    { id: "one", text: "same", at: "one" },
    { id: "two", text: "same", at: "two" },
    { id: "huge", text: "x".repeat(100_001), at: "three" },
    { id: "three", text: "different", at: "four" },
  ];
  assert.deepEqual(normalizeData({ noteHistory: versions }).noteHistory.map((revision) => revision.id), ["one", "three"]);
  const largeVersions = Array.from({ length: 6 }, (_, index) => ({ id: `large-${index}`, text: String(index).repeat(100_000), at: "now" }));
  assert.equal(normalizeData({ noteHistory: largeVersions }).noteHistory.length, 5);
});

test("timer state survives normalization for resume and clamps corrupted values", () => {
  const data = normalizeData({ timerState: { mode: "focus", secondsLeft: 91, running: true, endAt: 5000 } });
  assert.deepEqual(data.timerState, { mode: "focus", secondsLeft: 91, running: true, finished: false, endAt: 5000 });
  const paused = normalizeData({ timerState: { mode: "break", secondsLeft: 50, running: true, endAt: null } });
  assert.equal(paused.timerState.running, false);
  assert.equal(paused.timerState.endAt, null);
  const contradictory = normalizeData({ timerState: { mode: "focus", secondsLeft: 0, running: true, finished: true, endAt: 5000 } });
  assert.equal(contradictory.timerState.running, false);
  assert.equal(contradictory.timerState.endAt, null);
});

test("restored running timer accounts for time spent away from the page", () => {
  const now = 10_000;
  assert.deepEqual(restoreTimerState({ mode: "focus", running: true, endAt: 70_000, secondsLeft: 60 }, 25, now), {
    mode: "focus", secondsLeft: 60, running: true, finished: false, endAt: 70_000,
  });
  assert.deepEqual(restoreTimerState({ mode: "break", running: true, endAt: 5_000, secondsLeft: 10 }, 25, now), {
    mode: "break", secondsLeft: 0, running: true, finished: false, endAt: 5_000,
  });
  assert.equal(restoreTimerState(null, 25).secondsLeft, 1500);
});

test("session history accepts only focus/break records and keeps the newest fifty", () => {
  const sessions = Array.from({ length: 53 }, (_, index) => ({ mode: "focus", minutes: index + 1, at: "2026-01-01" }));
  sessions.push({ mode: "invalid", minutes: 20 });
  const normalized = normalizeData({ sessions }).sessions;
  assert.equal(normalized.length, 50);
  assert.equal(normalized[0].minutes, 1);
  assert.equal(normalized.at(-1).minutes, 50);
});

test("only completed focus timers add a newest-first session record", () => {
  const older = [{ mode: "focus", minutes: 25, at: "older" }];
  assert.deepEqual(appendCompletedSession(older, "break", 5, "break-end"), older);
  assert.deepEqual(appendCompletedSession(older, "focus", 25, "focus-end"), [
    { mode: "focus", minutes: 25, at: "focus-end" },
    ...older,
  ]);
});

test("Ship Log validates hours and descriptions, then trims project tags", () => {
  assert.equal(validateLogEntry({ hours: 0.2, description: "Too small" }).ok, false);
  assert.equal(validateLogEntry({ hours: 0.3, description: "Not a quarter hour" }).ok, false);
  assert.equal(validateLogEntry({ hours: 24.25, description: "Too large" }).ok, false);
  assert.equal(validateLogEntry({ hours: 0, description: "Zero" }).ok, false);
  assert.equal(validateLogEntry({ hours: 0.1, existingHours: 0.1, description: "Legacy entry" }).ok, true);
  assert.equal(validateLogEntry({ hours: 0, existingHours: 0, description: "Zero legacy" }).ok, false);
  assert.equal(validateLogEntry({ hours: 2, description: "  Ship filter  ", project: "  Lumen  ", tags: "ui, polish, ui" }).value.project, "Lumen");
  assert.deepEqual(normalizeTags("ui, polish, ui"), ["ui", "polish"]);
  assert.equal(normalizeTags(["x".repeat(40)])[0].length, 24);
  assert.equal(normalizeTags(["a", "b", "c", "d", "e", "f", "g", "h", "i"]).length, 8);
});

test("CSV quotes cells, keeps filters export-ready, and neutralizes spreadsheet formulas", () => {
  const csv = logsToCsv([{ at: "2026-01-01", h: 1, project: "Lumen, UI", tags: ["release"], text: '=HYPERLINK("https://bad")' }]);
  assert.match(csv, /^"Date","Hours","Project","Tags","Description"\r\n/);
  assert.match(csv, /"Lumen, UI"/);
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"https://bad\"\")\""));
  assert.ok(logsToCsv([{ at: "2026-01-01", h: 1, text: "Line one\nLine two" }]).includes('"Line one\nLine two"'));
  assert.ok(logsToCsv([{ at: "2026-01-01", h: 1, text: "\t=SUM(A1:A2)" }]).includes("'\t=SUM"));
});

test("Ship Log search and date ranges compose before export", () => {
  const unfiltered = [{ at: "invalid", text: "Draft", h: 1 }]; assert.deepEqual(filterLogs(unfiltered), unfiltered); assert.notEqual(filterLogs(unfiltered), unfiltered); assert.deepEqual(filterLogs(unfiltered, { days: 7 }), []);
  const now = Date.parse("2026-01-31T12:00:00Z");
  const logs = [
    { at: "2026-01-30T10:00:00Z", h: 1, project: "Lumen", tags: ["ui"], text: "Filter panel" },
    { at: "2026-01-02T10:00:00Z", h: 2, project: "Lumen", tags: ["ui"], text: "Old filter" },
    { at: "invalid", h: 1, project: "Other", tags: [], text: "Filter panel" },
  ];
  assert.deepEqual(filterLogs(logs, { query: "  UI ", days: 7, now }), [logs[0]]);
  assert.deepEqual(filterLogs(logs, { query: "Lumen", now }), [logs[0], logs[1]]);
  assert.deepEqual(filterLogs(logs, { query: new Date(logs[0].at).toLocaleString(), now }), [logs[0]]);
});

test("fresh installs start with clean workspace data", () => {
  assert.equal(makeDefaultData().notes, "");
  assert.deepEqual(makeDefaultData().sessions, []);
  assert.equal(makeDefaultData().timerState, null);
  assert.deepEqual(makeDefaultData().noteHistory, []);
  assert.equal(normalizeData({ rockPets: -4 }).rockPets, 0);
  assert.deepEqual([normalizeData({ longBreakMin: 500 }).longBreakMin, normalizeData({}).longBreakMin], [90, 15]);
  assert.equal(normalizeData({ rockName: "  Sir Pebble the Magnificent and Wise  " }).rockName, "Sir Pebble the Magnifice");
  assert.equal(normalizeData({ sounds: false }).sounds, false);
  assert.equal(normalizeData({ screensaver: false }).screensaver, false);
  assert.deepEqual(["olive", "royale", "zune", "classic", "neon"].map((theme) => normalizeData({ theme }).theme), ["olive", "royale", "zune", "classic", "dark"]);
  assert.deepEqual([normalizeData({ brightness: 999, contrast: 10, clock24: true })].map((d) => [d.brightness, d.contrast, d.clock24])[0], [130, 70, true]);
  assert.deepEqual(normalizeData({ windows: [{ id: "notes", left: -5, width: 50, minimized: 1 }, { nope: 1 }] }).windows, [{ id: "notes", left: 0, top: 0, width: 120, height: 320, minimized: true, maximized: false }]);
  assert.deepEqual(normalizeData({ iconPositions: { notes: { x: -4, y: 30 }, bad: null }, iconGrid: false }).iconPositions, { notes: { x: 0, y: 30 } });
  assert.equal(normalizeData({}).iconGrid, true);
  assert.deepEqual([normalizeData({ volume: 140 }).volume, normalizeData({}).volume], [100, 50]);
  assert.deepEqual(normalizeData({ recentFiles: ["a", "a", 3, "b"] }).recentFiles, ["a", "b"]);
  assert.equal(normalizeData({ recentChars: "→→©★" }).recentChars, "→©★");
  assert.deepEqual([normalizeData({ dragContents: false, transitions: false })].map((d) => [d.dragContents, d.transitions])[0], [false, false]);
  assert.deepEqual([normalizeData({ notesWrap: false, notesFont: "mono", notesSize: "16" })].map((d) => [d.notesWrap, d.notesFont, d.notesSize])[0], [false, "mono", 16]);
  assert.deepEqual([normalizeData({ notesFont: "comic", notesSize: 99 })].map((d) => [d.notesFont, d.notesSize])[0], ["sans", 12]);
  assert.deepEqual(normalizeData({ launches: { paint: 3, notes: -1, calc: "x" } }).launches, { paint: 3 });
  assert.deepEqual([normalizeData({ mineLevel: "expert", mineBests: { expert: 2000, intermediate: 55 } })].map((d) => [d.mineLevel, d.mineBests])[0], ["expert", { intermediate: 55, expert: 999 }]);
  assert.deepEqual([normalizeData({ saverStyle: "starfield", saverWait: "10", wallpaperFit: "tile", deskColor: "#ABCDEF", fontSize: "large", iconSize: "large", showClock: false, showQuickLaunch: false })].map((d) => [d.saverStyle, d.saverWait, d.wallpaperFit, d.deskColor, d.fontSize, d.iconSize, d.showClock, d.showQuickLaunch])[0], ["starfield", 10, "tile", "#abcdef", "large", "large", false, false]);
  assert.deepEqual([normalizeData({ saverStyle: "x", saverWait: 7, deskColor: "red" })].map((d) => [d.saverStyle, d.saverWait, d.deskColor])[0], ["logo", 3, "#3a6ea5"]);
  assert.deepEqual(makeDefaultData().files, []);
  assert.deepEqual(normalizeData({ recycle: [{ id: "r", deletedAt: "2026-10-17", items: [{ id: "f", kind: "text", name: "a/b", content: "x" }] }, { items: [] }] }).recycle, [{ id: "r", deletedAt: "2026-10-17", items: [{ id: "f", kind: "text", name: "a-b", parent: null, content: "x" }] }]);
  assert.deepEqual(makeDefaultData().iconOrder, []);
});
test("minefields keep the first click and its neighbors safe and count nearby mines", () => {
  const field = createMinefield(9, 9, 10, 40, () => 0.5);
  assert.equal(field.filter((cell) => cell.mine).length, 10);
  assert.equal(field[40].mine, false);
  assert.ok(neighbors(40, 9, 9).every((index) => !field[index].mine));
  field.forEach((cell, index) => assert.equal(cell.count, neighbors(index, 9, 9).filter((next) => field[next].mine).length));
});
test("revealing an empty square floods to numbered edges and skips flags", () => {
  const field = Array.from({ length: 9 }, () => ({ mine: false, count: 0 }));
  field[8] = { mine: true, count: 0 };
  field[4].count = 1;
  field[5].count = 1;
  field[7].count = 1;
  const revealed = revealArea(field, 3, 3, 0, new Set(), new Set([2]));
  assert.deepEqual([...revealed].sort(), [0, 1, 3, 4, 5, 6, 7]);
});
test("flood fill paints only the connected region of the clicked color", () => {
  const pixels = new Uint8ClampedArray(3 * 3 * 4).fill(255);
  [1, 4, 7].forEach((index) => pixels.set([0, 0, 0, 255], index * 4));
  assert.equal(floodFill(pixels, 3, 3, 0, 0, [255, 0, 0, 255]), 3);
  assert.deepEqual(Array.from(pixels.slice(0, 4)), [255, 0, 0, 255]);
  assert.deepEqual(Array.from(pixels.slice(8, 12)), [255, 255, 255, 255]);
  assert.equal(floodFill(pixels, 3, 3, 0, 0, [255, 0, 0, 255]), 0);
});
test("line points connect fast strokes without gaps", () => {
  assert.deepEqual(linePoints(0, 0, 3, 1), [[0, 0], [1, 0], [2, 1], [3, 1]]);
  assert.deepEqual(linePoints(2, 2, 2, 2), [[2, 2]]);
  assert.deepEqual(new Set(shapePoints("rect", 0, 0, 2, 2).map(String)), new Set(["0,0", "1,0", "2,0", "2,1", "2,2", "1,2", "0,2", "0,1"]));
  const ring = shapePoints("ellipse", 0, 0, 10, 6).map(String);
  assert.ok(ring.includes("10,3") && ring.includes("0,3") && ring.includes("5,0") && ring.includes("5,6"));
});
test("month grids start on Sunday and mark days outside the month", () => {
  const grid = monthGrid(2026, 9);
  assert.equal(grid.length, 42);
  assert.deepEqual(grid[0], { date: "2026-09-27", day: 27, inMonth: false });
  assert.deepEqual(grid[4], { date: "2026-10-01", day: 1, inMonth: true });
  assert.equal(monthGrid(2026, 12)[5].date, "2027-01-01");
});
test("calendar events keep only dated text entries", () => {
  const events = normalizeData({ events: [{ date: "2026-10-17", text: "  Ship  " }, { date: "soon", text: "x" }, { date: "2026-10-18", text: " " }] }, () => "id").events;
  assert.deepEqual(events, [{ id: "id", date: "2026-10-17", text: "Ship" }]);
  assert.deepEqual(normalizeData({ events: [{ id: "a", date: "2026-10-17", text: "Call", time: "09:30", reminded: true }, { id: "b", date: "2026-10-17", text: "Bad", time: "25:00" }] }).events, [{ id: "a", date: "2026-10-17", text: "Call", time: "09:30", reminded: true }, { id: "b", date: "2026-10-17", text: "Bad" }]);
});
test("virtual files keep safe folders and text documents", () => assert.deepEqual(normalizeData({ files: [{ id: "docs", kind: "folder", name: " Docs " }, { id: "note", kind: "text", name: "ideas/txt", parent: "docs", content: "hello" }, { id: "bad", kind: "image", name: "no" }] }).files, [{ id: "docs", kind: "folder", name: "Docs", parent: null, content: "" }, { id: "note", kind: "text", name: "ideas-txt", parent: "docs", content: "hello" }]));
test("virtual folders repair cyclic parent relationships", () => assert.deepEqual(normalizeData({ files: [{ id: "a", kind: "folder", name: "A", parent: "b" }, { id: "b", kind: "folder", name: "B", parent: "a" }] }).files.map((item) => item.parent), [null, null]));
test("desktop icon order removes duplicates and invalid values", () => assert.deepEqual(normalizeData({ iconOrder: ["paint", "files", "paint", 4, ""] }).iconOrder, ["paint", "files"]));
test("copied files get XP style names and folders copy their contents", async () => { const { copyName, cloneFiles } = await import("../js/data-core.mjs"); assert.equal(copyName("a.txt", ["b.txt"]), "a.txt"); assert.equal(copyName("a.txt", ["a.txt"]), "Copy of a.txt"); assert.equal(copyName("a.txt", ["a.txt", "Copy of a.txt"]), "Copy (2) of a.txt"); let next = 0; const files = [{ id: "f", kind: "folder", name: "Docs", parent: null }, { id: "t", kind: "text", name: "x.txt", parent: "f", content: "hi" }]; const copies = cloneFiles(files, "f", null, () => "n" + next++); assert.deepEqual(copies.map((item) => [item.name, item.parent]), [["Copy of Docs", null], ["x.txt", "n0"]]); assert.equal(copies[1].content, "hi"); assert.deepEqual(cloneFiles(files, "f", "f", () => "m").map((item) => item.name), ["Docs", "x.txt"]); });
test("repeating events land on the right days and keep their repeat setting", async () => { const { eventOn, nextOccurrence } = await import("../js/data-core.mjs"); const weekly = { date: "2026-10-05", repeat: "weekly" }; assert.ok(eventOn(weekly, "2026-10-19")); assert.ok(!eventOn(weekly, "2026-10-20")); assert.ok(!eventOn(weekly, "2026-09-28")); assert.ok(eventOn({ date: "2026-01-31", repeat: "monthly" }, "2026-03-31")); assert.ok(eventOn({ date: "2020-02-14", repeat: "yearly" }, "2027-02-14")); assert.equal(nextOccurrence(weekly, "2026-10-05"), "2026-10-12"); assert.equal(nextOccurrence({ date: "2026-01-31", repeat: "monthly" }, "2026-01-31"), "2026-03-31"); assert.equal(nextOccurrence({ date: "2026-12-01" }, "2026-10-01"), "2026-12-01"); assert.equal(nextOccurrence({ date: "2026-01-01" }, "2026-10-01"), null); const data = normalizeData({ events: [{ date: "2026-10-05", text: "standup", repeat: "weekly", time: "09:00", reminded: "2026-10-12" }, { date: "2026-10-05", text: "x", repeat: "hourly" }] }); assert.equal(data.events[0].repeat, "weekly"); assert.equal(data.events[0].reminded, "2026-10-12"); assert.equal(data.events[1].repeat, undefined); });
test("start menu pins default to notes and checklist and drop junk", () => { assert.deepEqual(normalizeData({}).startPins, ["notes", "checklist"]); assert.deepEqual(normalizeData({ startPins: ["paint", "paint", 4, "", "files"] }).startPins, ["paint", "files"]); assert.deepEqual(normalizeData({ startPins: [] }).startPins, []); });
test("desktop icons show and the taskbar stays put unless turned off", () => { const fresh = normalizeData({}); assert.equal(fresh.showIcons, true); assert.equal(fresh.autoHideTaskbar, false); const changed = normalizeData({ showIcons: false, autoHideTaskbar: true }); assert.equal(changed.showIcons, false); assert.equal(changed.autoHideTaskbar, true); assert.equal(normalizeData({ autoHideTaskbar: "yes" }).autoHideTaskbar, false); });
test("renamed desktop shortcuts keep trimmed names and drop blanks", () => { assert.deepEqual(normalizeData({}).iconNames, {}); assert.deepEqual(normalizeData({ iconNames: { notes: "  My Notes  ", paint: "   ", calc: 4 } }).iconNames, { notes: "My Notes" }); assert.deepEqual(normalizeData({ iconNames: ["x"] }).iconNames, {}); });
