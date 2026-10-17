import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDefaultData, normalizeData, normalizeTags, extractNoteHeadings, noteStats, appendNoteRevision, restoreNoteRevision, validateLogEntry, filterLogs, restoreTimerState, appendCompletedSession, logsToCsv, calculateExpression } from "../js/data-core.mjs";

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
  const now = Date.parse("2026-01-31T12:00:00Z");
  const logs = [
    { at: "2026-01-30T10:00:00Z", h: 1, project: "Lumen", tags: ["ui"], text: "Filter panel" },
    { at: "2026-01-02T10:00:00Z", h: 2, project: "Lumen", tags: ["ui"], text: "Old filter" },
    { at: "invalid", h: 1, project: "Other", tags: [], text: "Filter panel" },
  ];
  assert.deepEqual(filterLogs(logs, { query: "  UI ", days: 7, now }), [logs[0]]);
  assert.deepEqual(filterLogs(logs, { query: "Lumen", now }), [logs[0], logs[1]]);
});

test("fresh installs start with clean workspace data", () => {
  assert.equal(makeDefaultData().notes, "");
  assert.deepEqual(makeDefaultData().sessions, []);
  assert.equal(makeDefaultData().timerState, null);
  assert.deepEqual(makeDefaultData().noteHistory, []);
  assert.equal(normalizeData({ rockPets: -4 }).rockPets, 0);
});
