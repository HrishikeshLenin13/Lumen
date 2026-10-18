export function makeDefaultData() {
  return {
    notes: "",
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
    rockPets: 0,
    sounds: true,
    mineBest: 0,
    mineBests: { intermediate: 0, expert: 0 },
    mineLevel: "beginner",
    paintImage: "",
    events: [],
    screensaver: true,
    saverStyle: "logo",
    saverWait: 3,
    wallpaperFit: "stretch",
    deskColor: "#3a6ea5",
    fontSize: "normal",
    iconSize: "normal",
    showClock: true,
    showQuickLaunch: true,
    brightness: 100,
    contrast: 100,
    clock24: false,
    windows: [],
    recycle: [],
    files: [],
    iconOrder: [],
    iconPositions: {},
    iconGrid: true,
    launches: {},
    notesWrap: true,
    notesFont: "sans",
    notesSize: 12,
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
export function cursorSurfaceMatrix(x, y, width, height, strength = 0) { if (!strength || width <= 0 || height <= 0) return [1, 0, 0, 1]; const nx = x / width * 2 - 1; const ny = y / height * 2 - 1; const a = 1 + strength * (3 * nx * nx + ny * ny) / 2; const b = strength * nx * ny * height / width; const c = strength * nx * ny * width / height; const d = 1 + strength * (nx * nx + 3 * ny * ny) / 2; const determinant = a * d - b * c; return [d / determinant, -b / determinant, -c / determinant, a / determinant]; }

export function calculateExpression(value) {
  const expression = String(value ?? "").trim();
  if (!expression || expression.length > 120 || !/^[\d\s()+\-*/%.]+$/.test(expression)) return { ok: false, error: "Use numbers and + - * / % ( )." };
  try {
    const result = Function('"use strict"; return (' + expression + ")")();
    if (typeof result !== "number" || !Number.isFinite(result)) return { ok: false, error: "That calculation has no finite result." };
    return { ok: true, value: Math.round((result + Number.EPSILON) * 1e12) / 1e12 };
  } catch {
    return { ok: false, error: "Check the expression and try again." };
  }
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
  if (!needle && !cutoff) return logs.slice();
  return logs.filter((entry) => {
    const timestamp = new Date(entry.at).getTime();
    if (cutoff && (!Number.isFinite(timestamp) || timestamp < cutoff)) return false;
    if (!needle) return true;
    const searchable = [entry.text, entry.h, entry.project || "", ...normalizeTags(entry.tags), entry.at].join(" ").toLocaleLowerCase();
    if (searchable.includes(needle)) return true;
    return (searchable + " " + (Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : entry.at).toLocaleLowerCase()).includes(needle);
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

export function neighbors(index, width, height) {
  const x = index % width;
  const y = Math.floor(index / width);
  const list = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if ((dx || dy) && x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) list.push((y + dy) * width + x + dx);
    }
  }
  return list;
}
export function createMinefield(width, height, mines, safeIndex, random = Math.random) {
  const blocked = new Set([safeIndex, ...neighbors(safeIndex, width, height)]);
  const candidates = Array.from({ length: width * height }, (_, index) => index).filter((index) => !blocked.has(index));
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }
  const mineSet = new Set(candidates.slice(0, Math.min(mines, candidates.length)));
  return Array.from({ length: width * height }, (_, index) => ({ mine: mineSet.has(index), count: neighbors(index, width, height).filter((next) => mineSet.has(next)).length }));
}
export function revealArea(field, width, height, start, revealed = new Set(), flags = new Set()) {
  const next = new Set(revealed);
  const queue = [start];
  while (queue.length) {
    const index = queue.pop();
    if (next.has(index) || flags.has(index)) continue;
    next.add(index);
    if (!field[index].mine && field[index].count === 0) queue.push(...neighbors(index, width, height));
  }
  return next;
}
export function floodFill(pixels, width, height, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0;
  const start = (y * width + x) * 4;
  const target = Array.from(pixels.slice(start, start + 4));
  if (target.every((value, index) => value === color[index])) return 0;
  const stack = [y * width + x];
  let painted = 0;
  while (stack.length) {
    const index = stack.pop();
    const offset = index * 4;
    if (pixels[offset] !== target[0] || pixels[offset + 1] !== target[1] || pixels[offset + 2] !== target[2] || pixels[offset + 3] !== target[3]) continue;
    pixels.set(color, offset);
    painted += 1;
    const column = index % width;
    if (column > 0) stack.push(index - 1);
    if (column < width - 1) stack.push(index + 1);
    if (index >= width) stack.push(index - width);
    if (index < width * (height - 1)) stack.push(index + width);
  }
  return painted;
}
export function smudgePixels(pixels) { const totals = [0, 0, 0, 0]; for (let offset = 0; offset < pixels.length; offset += 4) for (let channel = 0; channel < 4; channel += 1) totals[channel] += pixels[offset + channel]; const count = pixels.length / 4; for (let offset = 0; offset < pixels.length; offset += 4) for (let channel = 0; channel < 4; channel += 1) pixels[offset + channel] = Math.round((pixels[offset + channel] * 2 + totals[channel] / count) / 3); return pixels; }
export function linePoints(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    points.push([x, y]);
    if (x === x1 && y === y1) return points;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      y += stepY;
    }
  }
}
export function monthGrid(year, month) {
  const anchor = new Date(Date.UTC(year, month, 1));
  const start = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1 - anchor.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start + index * 86400000);
    return { date: day.toISOString().slice(0, 10), day: day.getUTCDate(), inMonth: day.getUTCMonth() === anchor.getUTCMonth() };
  });
}
function safeFileParent(item, filesById) { if (!item.parent || filesById.get(item.parent)?.kind !== "folder" || item.parent === item.id) return null; const visited = new Set([item.id]); let parent = item.parent; while (parent) { if (visited.has(parent)) return null; visited.add(parent); parent = filesById.get(parent)?.parent || null; } return item.parent; }
function cleanFiles(list, makeId) { return Array.isArray(list) ? list.filter((item) => item && (item.kind === "folder" || item.kind === "text") && typeof item.name === "string" && item.name.trim()).slice(0, 500).map((item) => ({ id: typeof item.id === "string" && item.id ? item.id.slice(0, 80) : makeId(), kind: item.kind, name: item.name.trim().replace(/[\\/]/g, "-").slice(0, 80), parent: typeof item.parent === "string" ? item.parent.slice(0, 80) : null, content: item.kind === "text" && typeof item.content === "string" ? item.content.slice(0, 200000) : "" })) : []; }
export function normalizeData(value, makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  const files = cleanFiles(value?.files, makeId);
  const defaults = makeDefaultData();
  const filesById = new Map(files.map((item) => [item.id, item]));
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
    theme: ["dark", "olive", "light", "royale", "classic"].includes(source.theme) ? source.theme : "dark",
    effects: ["full", "subtle", "grid", "off"].includes(source.effects) ? source.effects : defaults.effects,
    wallpaper: ["classic", "midnight", "aurora", "graphite", "none"].includes(source.wallpaper) ? source.wallpaper : defaults.wallpaper,
    rockPets: clampNumber(source.rockPets, 0, 1000000000, defaults.rockPets),
    sounds: source.sounds !== false,
    mineBest: clampNumber(source.mineBest, 0, 999, defaults.mineBest),
    mineBests: { intermediate: clampNumber(source.mineBests?.intermediate, 0, 999, 0), expert: clampNumber(source.mineBests?.expert, 0, 999, 0) },
    mineLevel: ["beginner", "intermediate", "expert"].includes(source.mineLevel) ? source.mineLevel : defaults.mineLevel,
    paintImage: typeof source.paintImage === "string" && source.paintImage.startsWith("data:image/png;base64,") && source.paintImage.length < 300000 ? source.paintImage : defaults.paintImage,
    events: Array.isArray(source.events) ? source.events.filter((event) => event && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeof event.text === "string" && event.text.trim()).map((event) => ({ id: typeof event.id === "string" && event.id ? event.id : makeId(), date: event.date, text: event.text.trim().slice(0, 160) })).slice(0, 500) : [],
    screensaver: source.screensaver !== false,
    saverStyle: ["logo", "starfield", "blank"].includes(source.saverStyle) ? source.saverStyle : defaults.saverStyle,
    saverWait: [1, 3, 5, 10, 15].includes(Number(source.saverWait)) ? Number(source.saverWait) : defaults.saverWait,
    wallpaperFit: ["stretch", "center", "tile"].includes(source.wallpaperFit) ? source.wallpaperFit : defaults.wallpaperFit,
    deskColor: /^#[0-9a-f]{6}$/i.test(source.deskColor) ? source.deskColor.toLowerCase() : defaults.deskColor,
    fontSize: source.fontSize === "large" ? "large" : "normal",
    iconSize: source.iconSize === "large" ? "large" : "normal",
    showClock: source.showClock !== false,
    showQuickLaunch: source.showQuickLaunch !== false,
    brightness: clampNumber(source.brightness, 70, 130, defaults.brightness),
    contrast: clampNumber(source.contrast, 70, 140, defaults.contrast),
    clock24: source.clock24 === true,
    windows: Array.isArray(source.windows) ? source.windows.filter((item) => item && typeof item.id === "string" && item.id).slice(0, 20).map((item) => ({ id: item.id.slice(0, 40), left: clampNumber(item.left, 0, 10000, 0), top: clampNumber(item.top, 0, 10000, 0), width: clampNumber(item.width, 120, 10000, 420), height: clampNumber(item.height, 100, 10000, 320), minimized: Boolean(item.minimized), maximized: Boolean(item.maximized) })) : [],
    files: files.map((item) => ({ ...item, parent: safeFileParent(item, filesById) })),
    recycle: Array.isArray(source.recycle) ? source.recycle.filter((entry) => entry && typeof entry === "object").map((entry) => ({ id: typeof entry.id === "string" && entry.id ? entry.id.slice(0, 80) : makeId(), deletedAt: typeof entry.deletedAt === "string" ? entry.deletedAt.slice(0, 40) : "", items: cleanFiles(entry.items, makeId) })).filter((entry) => entry.items.length).slice(0, 50) : [],
    iconPositions: source.iconPositions && typeof source.iconPositions === "object" && !Array.isArray(source.iconPositions) ? Object.fromEntries(Object.entries(source.iconPositions).filter(([id, spot]) => id && spot && typeof spot === "object").slice(0, 100).map(([id, spot]) => [id.slice(0, 40), { x: clampNumber(spot.x, 0, 10000, 0), y: clampNumber(spot.y, 0, 10000, 0) }])) : {},
    iconGrid: source.iconGrid !== false,
    notesWrap: source.notesWrap !== false,
    notesFont: ["sans", "mono", "serif"].includes(source.notesFont) ? source.notesFont : defaults.notesFont,
    notesSize: [11, 12, 14, 16, 20].includes(Number(source.notesSize)) ? Number(source.notesSize) : defaults.notesSize,
    launches: source.launches && typeof source.launches === "object" && !Array.isArray(source.launches) ? Object.fromEntries(Object.entries(source.launches).slice(0, 100).map(([id, count]) => [id.slice(0, 40), clampNumber(count, 0, 1000000, 0)]).filter(([, count]) => count > 0)) : {},
    iconOrder: Array.isArray(source.iconOrder) ? [...new Set(source.iconOrder.filter((id) => typeof id === "string" && id).map((id) => id.slice(0, 40)))].slice(0, 100) : [],
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
