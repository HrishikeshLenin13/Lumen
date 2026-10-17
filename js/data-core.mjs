export function makeDefaultData() {
  return {
    notes: "Project notes...\nWhat are you building today?",
    noteHistory: [],
    logs: [],
    sessions: [],
    tasks: [],
    timerState: null,
    focusMin: 25,
    breakMin: 5,
    theme: "dark",
    effects: "full",
    wallpaper: "classic",
  };
}

export function noteStats(value) {
  const text = String(value ?? "");
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  return { words, characters: [...text].length, lines: text ? text.split("\n").length : 0 };
}

const MAX_NOTE_REVISIONS = 20;
const MAX_NOTE_REVISION_CHARACTERS = 100_000;
const MAX_NOTE_HISTORY_CHARACTERS = 500_000;

function limitNoteHistory(revisions) {
  const limited = [];
  let characters = 0;
  for (const revision of revisions) {
    if (limited.length === MAX_NOTE_REVISIONS) break;
    if (!revision || typeof revision.text !== "string") continue;
    if (revision.text.length > MAX_NOTE_REVISION_CHARACTERS) continue;
    if (limited[limited.length - 1]?.text === revision.text) continue;
    if (characters + revision.text.length > MAX_NOTE_HISTORY_CHARACTERS) continue;
    limited.push(revision);
    characters += revision.text.length;
  }
  return limited;
}

export function appendNoteRevision(history, text, at = new Date().toISOString(), id = `${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  const previous = Array.isArray(history) ? history : [];
  const content = String(text ?? "");
  if (!content.trim() || content.length > MAX_NOTE_REVISION_CHARACTERS || previous[0]?.text === content) return limitNoteHistory(previous);
  const revision = { id, text: content, at, ...noteStats(content) };
  return limitNoteHistory([revision, ...previous]);
}

export function restoreNoteRevision(history, currentText, revisionId, at = new Date().toISOString(), id = `${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  const previous = Array.isArray(history) ? history : [];
  const revision = previous.find((candidate) => candidate?.id === revisionId && typeof candidate.text === "string");
  const current = String(currentText ?? "");
  if (!revision) return { ok: false, reason: "missing", text: current, history: limitNoteHistory(previous) };
  const nextHistory = appendNoteRevision(previous, current, at, id);
  const needsSnapshot = current.trim() && current !== revision.text;
  if (needsSnapshot && nextHistory[0]?.text !== current) {
    return { ok: false, reason: "current-too-large", text: current, history: limitNoteHistory(previous) };
  }
  return { ok: true, reason: null, text: revision.text, history: nextHistory };
}

export function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

export function normalizeTags(value) {
  const input = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const unique = new Set();
  for (const tag of input) {
    const clean = String(tag).trim().replace(/\s+/g, " ").slice(0, 24);
    if (clean) unique.add(clean);
    if (unique.size === 8) break;
  }
  return [...unique];
}

export function extractNoteHeadings(value) {
  const lines = String(value ?? "").split("\n");
  const headings = [];
  let offset = 0;
  let codeFence = null;
  lines.forEach((line, index) => {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const marker = fence[1][0];
      if (!codeFence) codeFence = { marker, length: fence[1].length };
      else if (marker === codeFence.marker && fence[1].length >= codeFence.length && !fence[2].trim()) codeFence = null;
      offset += line.length + 1;
      return;
    }
    const match = codeFence ? null : line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*$/);
    if (match) {
      const title = match[2].replace(/\s+#+\s*$/, "").trim();
      if (title) {
        const contentStart = line.indexOf(match[2], match[1].length);
        headings.push({ level: match[1].length, title, line: index + 1, start: offset, end: offset + line.length, contentStart: offset + contentStart });
      }
    }
    offset += line.length + 1;
  });
  return headings;
}

export function validateLogEntry({ hours, description, project = "", tags = "", existingHours = null }) {
  const numericHours = Number(hours);
  const cleanDescription = String(description || "").trim();
  const cleanProject = String(project || "").trim().slice(0, 48);
  const cleanTags = normalizeTags(tags);
  const quarterHourSteps = numericHours * 4;
  const hasExistingHours = existingHours !== null && existingHours !== undefined && existingHours !== "";
  const previousHours = Number(existingHours);
  const retainingLegacyHours = hasExistingHours && Number.isFinite(previousHours) && previousHours > 0 && numericHours === previousHours;
  if (!Number.isFinite(numericHours) || ((numericHours < 0.25 || numericHours > 24 || Math.abs(quarterHourSteps - Math.round(quarterHourSteps)) > 1e-8) && !retainingLegacyHours)) {
    return { ok: false, error: "Hours must be from 0.25 to 24 in 0.25-hour steps." };
  }
  if (!cleanDescription || cleanDescription.length > 240) {
    return { ok: false, error: "Add a description of up to 240 characters." };
  }
  return { ok: true, value: { h: numericHours, text: cleanDescription, project: cleanProject, tags: cleanTags } };
}

export function filterLogs(logs, { query = "", days = 0, now = Date.now() } = {}) {
  const needle = String(query).trim().toLocaleLowerCase();
  const cutoff = Number(days) > 0 ? now - Number(days) * 24 * 60 * 60 * 1000 : 0;
  return logs.filter((entry) => {
    const timestamp = new Date(entry.at).getTime();
    if (cutoff && (!Number.isFinite(timestamp) || timestamp < cutoff)) return false;
    const dateText = Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : entry.at;
    const haystack = [entry.text, entry.h, entry.project || "", ...normalizeTags(entry.tags), entry.at, dateText].join(" ").toLocaleLowerCase();
    return haystack.includes(needle);
  });
}

export function restoreTimerState(savedTimer, focusMinutes, now = Date.now()) {
  const hasEndAt = savedTimer?.endAt !== null && savedTimer?.endAt !== undefined && Number.isFinite(Number(savedTimer.endAt));
  const running = Boolean(savedTimer?.running && hasEndAt);
  const remaining = running
    ? Math.max(0, Math.ceil((Number(savedTimer.endAt) - now) / 1000))
    : Number(savedTimer?.secondsLeft);
  return {
    mode: savedTimer?.mode || "focus",
    secondsLeft: Number.isFinite(remaining) ? remaining : focusMinutes * 60,
    running,
    finished: Boolean(savedTimer?.finished),
    endAt: running ? Number(savedTimer.endAt) : null,
  };
}

export function appendCompletedSession(sessions, mode, minutes, at = new Date().toISOString()) {
  const previous = Array.isArray(sessions) ? sessions : [];
  if (mode !== "focus") return previous.slice(0, 50);
  const session = { mode: "focus", minutes: Math.max(1, Math.min(180, Math.round(Number(minutes) || 1))), at };
  return [session, ...previous].slice(0, 50);
}

export function normalizeData(value, makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  const defaults = makeDefaultData();
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const logs = Array.isArray(source.logs) ? source.logs.map((entry) => {
    const h = Number(entry?.h);
    const text = typeof entry?.text === "string" ? entry.text.trim() : "";
    if (!Number.isFinite(h) || h <= 0 || !text) return null;
    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : makeId(),
      h,
      text,
      at: typeof entry.at === "string" ? entry.at : new Date().toISOString(),
      project: typeof entry.project === "string" ? entry.project.trim().slice(0, 48) : "",
      tags: normalizeTags(entry.tags),
    };
  }).filter(Boolean) : [];
  const sessions = Array.isArray(source.sessions) ? source.sessions.map((session) => {
    const minutes = Number(session?.minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || !["focus", "break"].includes(session?.mode)) return null;
    return { mode: session.mode, minutes: Math.min(180, Math.round(minutes)), at: typeof session.at === "string" ? session.at : new Date().toISOString() };
  }).filter(Boolean).slice(0, 50) : [];
  const tasks = Array.isArray(source.tasks) ? source.tasks.map((task) => ({ id: typeof task?.id === "string" && task.id ? task.id : makeId(), text: typeof task?.text === "string" ? task.text.trim().slice(0, 160) : "", done: Boolean(task?.done), createdAt: typeof task?.createdAt === "string" ? task.createdAt : new Date().toISOString() })).filter((task) => task.text).slice(0, 200) : [];
  const savedTimer = source.timerState && typeof source.timerState === "object" ? source.timerState : null;
  const noteHistory = Array.isArray(source.noteHistory) ? limitNoteHistory(source.noteHistory.map((revision) => {
    if (!revision || typeof revision.text !== "string" || !revision.text.trim()) return null;
    const stats = noteStats(revision.text);
    return {
      id: typeof revision.id === "string" && revision.id ? revision.id : makeId(),
      text: revision.text,
      at: typeof revision.at === "string" ? revision.at : new Date().toISOString(),
      ...stats,
    };
  }).filter(Boolean)) : [];
  const hasEndAt = savedTimer?.endAt !== null && savedTimer?.endAt !== undefined && Number.isFinite(Number(savedTimer.endAt));
  const finished = Boolean(savedTimer?.finished);
  const running = Boolean(savedTimer?.running && hasEndAt && !finished);
  const timerState = savedTimer && ["focus", "break"].includes(savedTimer.mode) && Number.isFinite(Number(savedTimer.secondsLeft))
    ? {
        mode: savedTimer.mode,
        secondsLeft: Math.max(0, Math.min(180 * 60, Math.floor(Number(savedTimer.secondsLeft)))),
        running,
        finished,
        endAt: running ? Number(savedTimer.endAt) : null,
      }
    : null;
  return {
    notes: typeof source.notes === "string" ? source.notes : defaults.notes,
    noteHistory,
    focusMin: clampNumber(source.focusMin, 1, 180, defaults.focusMin),
    breakMin: clampNumber(source.breakMin, 1, 60, defaults.breakMin),
    theme: source.theme === "light" ? "light" : "dark",
    effects: ["full", "subtle", "off"].includes(source.effects) ? source.effects : defaults.effects,
    wallpaper: ["classic", "midnight", "aurora", "graphite"].includes(source.wallpaper) ? source.wallpaper : defaults.wallpaper,
    logs,
    sessions,
    tasks,
    timerState,
  };
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function logsToCsv(logs) {
  const rows = [["Date", "Hours", "Project", "Tags", "Description"]];
  for (const entry of logs) rows.push([entry.at, entry.h, entry.project || "", normalizeTags(entry.tags).join(", "), entry.text]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
