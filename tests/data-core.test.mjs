import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDefaultData, normalizeData, normalizeTags, extractNoteHeadings, validateLogEntry, filterLogs, restoreTimerState, appendCompletedSession, logsToCsv } from "../js/data-core.mjs";

test("notes outline extracts Markdown headings with line and selection offsets", () => {
  assert.deepEqual(extractNoteHeadings("Opening\n## Plan ##\ntext\n   # Indented\n### Done\n\n```md\n# Example inside code\n```\n~~~~\n## Also code\n~~~~\n  # Final"), [
    { level: 2, title: "Plan", line: 2, start: 8, end: 18, contentStart: 11 },
    { level: 1, title: "Indented", line: 4, start: 24, end: 37, contentStart: 29 },
    { level: 3, title: "Done", line: 5, start: 38, end: 46, contentStart: 42 },
    { level: 1, title: "Final", line: 13, start: 103, end: 112, contentStart: 107 },
  ]);
  assert.deepEqual(extractNoteHeadings("## \n####### not a heading\n# Works"), [
    { level: 1, title: "Works", line: 3, start: 26, end: 33, contentStart: 28 },
  ]);
});

test("migration preserves existing logs and supplies empty project metadata", () => {
  const migrated = normalizeData({ logs: [{ id: "old", h: 1.5, text: "Fixed the header", at: "2026-01-02T03:04:00.000Z" }] });
  assert.equal(migrated.logs.length, 1);
  assert.deepEqual(migrated.logs[0], { id: "old", h: 1.5, text: "Fixed the header", at: "2026-01-02T03:04:00.000Z", project: "", tags: [] });
  assert.deepEqual(migrated.sessions, []);
  assert.equal(migrated.timerState, null);
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

test("fresh installs include both feature stores", () => {
  assert.deepEqual(makeDefaultData().sessions, []);
  assert.equal(makeDefaultData().timerState, null);
});
