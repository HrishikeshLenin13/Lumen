import { makeDefaultData, clampNumber, normalizeData, normalizeTags, extractNoteHeadings, noteStats, appendNoteRevision, restoreNoteRevision, validateLogEntry, filterLogs, restoreTimerState, appendCompletedSession, logsToCsv, calculateExpression, createMinefield, revealArea, floodFill, linePoints, monthGrid, cursorSurfaceMatrix, smudgePixels } from "./data-core.mjs?v=e350c0aea3";

const KEY = "lumen-desk-v1";
const APP_TITLE = "LUMEN - Builder Desk";
const TIMER_TICK_MS = 1000;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const screenCursor = document.querySelector("[data-screen-cursor]");
let cursorFrame = 0;
let cursorX = -40;
let cursorY = -40;
function angleCursor(x, y) { const [surfaceX, surfaceY] = toScene(x, y); screenCursor.classList.toggle("hidden", surfaceX < 0 || surfaceY < 0 || surfaceX >= innerWidth || surfaceY >= innerHeight); const matrix = cursorSurfaceMatrix(x, y, lens.width, lens.height, document.documentElement.dataset.effects === "full" ? lens.strength : 0); screenCursor.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px,0) matrix(" + matrix.join(",") + ",0,0)"; }
document.addEventListener("pointermove", (event) => { cursorX = event.clientX; cursorY = event.clientY; if (!cursorFrame) cursorFrame = requestAnimationFrame(() => { cursorFrame = 0; angleCursor(cursorX, cursorY); }); }, { passive: true });
document.documentElement.addEventListener("pointerleave", () => screenCursor.classList.add("hidden"));
let lens = { strength: 0, width: 1, height: 1 };
document.documentElement.dataset.curvedCursor = "on";
function toScene(x, y) {
  if (!lens.strength || document.documentElement.dataset.effects !== "full") return [x, y];
  const nx = x / lens.width * 2 - 1;
  const ny = y / lens.height * 2 - 1;
  const pull = lens.strength * (nx * nx + ny * ny) / 2;
  return [Math.round(x + nx * pull * lens.width), Math.round(y + ny * pull * lens.height)];
}
const fullDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });
const monthTitleFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayHeadingFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const logDateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
let clockFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultData = makeDefaultData;

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
let data = normalizeData(loadData(), makeId);
const PAINT_KEY = KEY + "-paint";
function savePaint(image) {
  try {
    if (image) localStorage.setItem(PAINT_KEY, image);
    else localStorage.removeItem(PAINT_KEY);
    return true;
  } catch {
    return false;
  }
}
try {
  const storedPaint = localStorage.getItem(PAINT_KEY);
  data.paintImage = normalizeData({ paintImage: storedPaint || data.paintImage }).paintImage;
  if (storedPaint !== data.paintImage) savePaint(data.paintImage);
} catch {
  data.paintImage = "";
}
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}
function showWindowDialog({ title = "LUMEN", message, value, options, confirmLabel = "OK", danger = false } = {}) {
  return new Promise((resolve) => {
    const host = activeId && open.get(activeId) ? open.get(activeId).el : document.getElementById("desk");
    const previousFocus = document.activeElement;
    if (host.querySelector(".window-dialog")) return resolve(null);
    const overlay = document.createElement("div");
    overlay.className = "window-dialog";
    overlay.setAttribute("role", "presentation");
    const control = Array.isArray(options) ? '<select class="field" data-dialog-value>' + options.map((option) => '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '</option>').join("") + "</select>" : value !== undefined ? '<input class="field" data-dialog-value value="' + escapeHtml(value) + '">' : "";
    overlay.innerHTML = '<form class="window-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="windowDialogTitle"><strong class="window-dialog__title" id="windowDialogTitle">' + escapeHtml(title) + '</strong><div class="window-dialog__content"><span>' + escapeHtml(message) + '</span>' + control + '<div class="window-dialog__actions"><button type="button" class="btn" data-dialog-cancel>Cancel</button><button type="submit" class="btn' + (danger ? " danger" : " primary") + '">' + escapeHtml(confirmLabel) + "</button></div></div></form>";
    const settle = (result) => { overlay.remove(); previousFocus?.focus({ preventScroll: true }); resolve(result); };
    host.append(overlay);
    overlay.querySelector("form").addEventListener("submit", (event) => { event.preventDefault(); settle(overlay.querySelector("[data-dialog-value]")?.value ?? true); });
    overlay.querySelector("[data-dialog-cancel]").addEventListener("click", () => settle(null));
    overlay.addEventListener("keydown", (event) => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); settle(null); } if (event.key === "Tab") { const controls = Array.from(overlay.querySelectorAll("input, select, button")); const index = controls.indexOf(document.activeElement); event.preventDefault(); controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length]?.focus(); } });
    (overlay.querySelector("[data-dialog-value]") || overlay.querySelector("button[type=submit]")).focus();
  });
}
let lastSaved = "";
function persistData() {
  try {
    const serialized = JSON.stringify({ ...data, paintImage: "" });
    if (serialized !== lastSaved) localStorage.setItem(KEY, serialized);
    lastSaved = serialized;
    return true;
  } catch {
    showToast("LUMEN could not save data in this browser.");
    return false;
  }
}
function applyTheme() {
  document.documentElement.dataset.theme = data.theme;
  document.documentElement.dataset.effects = data.effects;
  const tone = "brightness(" + data.brightness / 100 + ") contrast(" + data.contrast / 100 + ")";
  document.documentElement.style.setProperty("--tube", "saturate(1.12) contrast(1.05) " + tone);
  document.documentElement.style.setProperty("--tone", tone === "brightness(1) contrast(1)" ? "none" : tone);
  bendScreen();
  document.documentElement.dataset.wallpaper = data.wallpaper;
  clockFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: data.clock24 ? "h23" : "h12" });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = data.theme === "light" ? "#6f84a9" : "#245edb";
}
persistData();
applyTheme();
const timer = {
  ...restoreTimerState(data.timerState, data.focusMin),
  intervalId: null,
};
function saveTimerState() {
  data.timerState = { mode: timer.mode, secondsLeft: timer.secondsLeft, running: timer.running, finished: timer.finished, endAt: timer.endAt };
  persistData();
}
function recordCompletedSession() {
  if (timer.mode !== "focus") return;
  data.sessions = appendCompletedSession(data.sessions, timer.mode, timerMinutes("focus"));
}
function renderSessionHistory(root = open.get("focus")?.el.querySelector(".body")) {
  const history = root?.querySelector("[data-session-history]");
  if (!history) return;
  const sessions = data.sessions.slice(0, 5);
  history.innerHTML = sessions.length
    ? "<h3>Recent focus sessions</h3><ul>" + sessions.map((session) => "<li>" + escapeHtml(session.minutes) + "m · " + escapeHtml(formatLogDate(session.at)) + "</li>").join("") + "</ul>"
    : "<p class=\"hint\">Completed focus sessions will appear here.</p>";
}
let audioContext = null;
function timerMinutes(mode = timer.mode) {
  return mode === "break" ? data.breakMin : data.focusMin;
}
function timerLabel(mode = timer.mode) {
  return mode === "break" ? "Break" : "Focus";
}
function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return minutes + ":" + seconds;
}
function primeAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
  } catch {
    audioContext = null;
  }
}
const sounds = { open: "sounds/open.mp3", close: "sounds/close.mp3", minimize: "sounds/minimize.mp3", restore: "sounds/restore.mp3", thud: "sounds/thud.mp3", win: "sounds/win.mp3", boom: "sounds/boom.mp3", degauss: "sounds/degauss.mp3", timer: "sounds/timer.mp3", flip: "sounds/flip.mp3" };
const soundBuffers = new Map();
function loadSound(name) {
  if (!audioContext || !sounds[name]) return Promise.resolve(null);
  if (!soundBuffers.has(name)) soundBuffers.set(name, fetch(sounds[name]).then((response) => response.arrayBuffer()).then((bytes) => audioContext.decodeAudioData(bytes)).catch(() => null));
  return soundBuffers.get(name);
}
function playSound(name) {
  if (!data.sounds) return;
  primeAudio();
  loadSound(name).then((buffer) => {
    if (!buffer || !audioContext) return;
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    gain.gain.value = 0.5;
    source.buffer = buffer;
    source.connect(gain).connect(audioContext.destination);
    source.start();
  });
}
function stopTimerInterval() {
  clearInterval(timer.intervalId);
  timer.intervalId = null;
}
function writeText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function writeAttribute(element, name, value) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}
function paintTimer(root = open.get("focus")?.el.querySelector(".body")) {
  if (!root) return;
  const readout = root.querySelector("#timer");
  const status = root.querySelector("[data-timer-status]");
  const start = root.querySelector("[data-focus-start]");
  const pause = root.querySelector("[data-focus-pause]");
  writeText(readout, formatTime(timer.secondsLeft));
  readout.classList.toggle("done", timer.finished);
  root.querySelectorAll("[data-timer-mode]").forEach((button) => {
    const selected = button.dataset.timerMode === timer.mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (timer.finished) writeText(status, timerLabel() + " complete.");
  else if (timer.running) writeText(status, timerLabel() + " timer is running.");
  else if (timer.secondsLeft < timerMinutes() * 60) writeText(status, timerLabel() + " timer is paused.");
  else writeText(status, "Ready for a " + timerMinutes() + " minute " + timerLabel().toLowerCase() + ".");
  if (timer.finished) writeText(start, "Restart " + timerLabel().toLowerCase());
  else if (timer.running) writeText(start, "Running…");
  else if (timer.secondsLeft < timerMinutes() * 60) writeText(start, "Resume");
  else writeText(start, "Start " + timerMinutes() + "m");
  start.disabled = timer.running;
  pause.disabled = !timer.running;
}
function finishTimer() {
  stopTimerInterval();
  timer.running = false;
  timer.finished = true;
  timer.secondsLeft = 0;
  timer.endAt = null;
  recordCompletedSession();
  saveTimerState();
  const message = timerLabel() + " timer finished.";
  document.title = "✓ " + message + " - LUMEN";
  paintTimer();
  renderSessionHistory();
  playSound("timer");
  showToast(message);
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    new Notification(message, {
      body: timer.mode === "focus" ? "Time for a break." : "Ready for another focus session?",
      icon: "icons/l.png?v=33d4468d61",
    });
  }
}
function updateTimer() {
  if (!timer.running || !Number.isFinite(timer.endAt)) return;
  timer.secondsLeft = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
  if (timer.secondsLeft <= 0) {
    finishTimer();
    return;
  }
  paintTimer();
}
function startTimer() {
  if (timer.running) return;
  if (timer.finished || timer.secondsLeft <= 0) timer.secondsLeft = timerMinutes() * 60;
  timer.finished = false;
  timer.running = true;
  timer.endAt = Date.now() + timer.secondsLeft * 1000;
  document.title = APP_TITLE;
  primeAudio();
  stopTimerInterval();
  timer.intervalId = setInterval(updateTimer, TIMER_TICK_MS);
  saveTimerState();
  paintTimer();
}
function pauseTimer() {
  if (!timer.running) return;
  updateTimer();
  if (timer.finished) return;
  stopTimerInterval();
  timer.running = false;
  timer.endAt = null;
  saveTimerState();
  paintTimer();
}
function resetTimer(mode = timer.mode) {
  stopTimerInterval();
  timer.mode = mode;
  timer.secondsLeft = timerMinutes(mode) * 60;
  timer.running = false;
  timer.finished = false;
  timer.endAt = null;
  saveTimerState();
  document.title = APP_TITLE;
  paintTimer();
}
function selectTimerMode(mode) {
  if (mode !== "focus" && mode !== "break") return;
  resetTimer(mode);
}
document.addEventListener("visibilitychange", () => {
  if (timer.running) updateTimer();
});
let shipFilter = "";
let shipDateRange = "all";
let logLimit = 100;
let editingLogId = null;
const selectedLogIds = new Set();
function formatLogDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : logDateFormat.format(date);
}
function formatHours(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
const renderedMarkup = new WeakMap();
function renderNoteOutline(nav, notes) {
  if (!nav) return;
  const headings = extractNoteHeadings(notes);
  const visibleHeadings = headings.slice(0, 200);
  const markup = visibleHeadings.length
    ? '<h3 class="notes-outline__title">In this note</h3><ol>' + visibleHeadings.map((heading, index) => '<li><button type="button" class="btn notes-outline__item" data-note-heading="' + index + '" style="--heading-indent:' + ((heading.level - 1) * 8) + 'px" aria-label="Go to ' + escapeHtml(heading.title) + ', line ' + heading.line + '"><span>' + escapeHtml(heading.title) + '</span><small>' + heading.line + '</small></button></li>').join("") + '</ol>' + (headings.length > visibleHeadings.length ? '<p class="hint notes-outline__limit">Showing the first 200 of ' + headings.length + ' headings.</p>' : '')
    : '<p class="hint">Add Markdown headings like <code># Today</code> to build an outline.</p>';
  if (renderedMarkup.get(nav) === markup) return;
  renderedMarkup.set(nav, markup);
  nav.innerHTML = markup;
}
function noteRevisionLabel(revision) {
  const firstLine = revision.text.split("\n").find((line) => line.trim())?.trim() || "Untitled note";
  return firstLine.length > 36 ? firstLine.slice(0, 35) + "…" : firstLine;
}
function renderNoteHistory(container) {
  if (!container) return;
  const revisions = data.noteHistory;
  container.innerHTML = revisions.length
    ? '<div class="notes-history__header"><h3 class="notes-outline__title">Recent versions (' + revisions.length + ')</h3><button type="button" class="notes-history__clear" data-clear-note-history>Clear</button></div><ol>' + revisions.map((revision) => '<li><button type="button" class="btn notes-history__item" data-note-revision="' + escapeHtml(revision.id) + '"><span>' + escapeHtml(noteRevisionLabel(revision)) + '</span><small>' + escapeHtml(formatLogDate(revision.at)) + ' · ' + revision.words + ' words</small></button></li>').join("") + '</ol>'
    : '<p class="hint">Earlier saved versions will appear here.</p>';
}
function renderNoteStats(element, notes) {
  if (!element) return;
  const stats = noteStats(notes);
  writeText(element, stats.words + " words · " + stats.characters + " characters · " + stats.lines + " lines");
}
function filteredLogs() {
  const days = shipDateRange === "7" || shipDateRange === "30" ? Number(shipDateRange) : 0;
  return filterLogs(data.logs, { query: shipFilter, days });
}
function exportShipLog() {
  const blob = new Blob([logsToCsv(filteredLogs())], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lumen-ship-log-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast("Filtered ship log exported.");
}
function logListHtml(rows = filteredLogs()) {
  const selectedCount = selectedLogIds.size;
  const toolbar = data.logs.length ? '<div class="log-selection-bar"><label class="log-select-all"><input type="checkbox" data-select-visible> Select shown</label><span class="log-selection-count">' + selectedCount + ' selected</span><button type="button" class="btn danger" data-log-action="delete-selected"' + (selectedCount ? "" : " disabled") + '>Delete selected</button><button type="button" class="btn" data-log-action="clear-selection"' + (selectedCount ? "" : " disabled") + '>Clear</button></div>' : "";
  if (!rows.length) {
    const hasActiveFilter = shipFilter.trim() || shipDateRange !== "all";
    return toolbar + '<p class="hint hint--flush">' + (hasActiveFilter ? "No entries match this filter." : "No entries yet.") + "</p>";
  }
  return toolbar + rows.slice(0, logLimit).map((entry) => {
    const checked = selectedLogIds.has(entry.id) ? " checked" : "";
    const selectedClass = selectedLogIds.has(entry.id) ? " selected" : "";
    if (entry.id === editingLogId) {
      return '<article class="log-item' + selectedClass + '" data-log-row="' + escapeHtml(entry.id) + '"><label class="log-select"><input type="checkbox" data-log-select="' + escapeHtml(entry.id) + '"' + checked + '> Select entry</label><label class="form-label">Hours<input class="field" type="number" min="0.25" max="24" step="0.25" value="' + escapeHtml(entry.h) + '" data-edit-hours></label><label class="form-label">What did you ship?<input class="field" type="text" maxlength="240" value="' + escapeHtml(entry.text) + '" data-edit-text></label><label class="form-label">Project<input class="field" type="text" maxlength="48" value="' + escapeHtml(entry.project || "") + '" data-edit-project></label><label class="form-label">Tags<input class="field" type="text" value="' + escapeHtml(normalizeTags(entry.tags).join(", ")) + '" data-edit-tags></label><div class="row row--actions"><button type="button" class="btn primary" data-log-action="save" data-log-id="' + escapeHtml(entry.id) + '">Save changes</button><button type="button" class="btn" data-log-action="cancel" data-log-id="' + escapeHtml(entry.id) + '">Cancel</button></div></article>';
    }
    const metadata = [entry.project, ...normalizeTags(entry.tags).map((tag) => "#" + tag)].filter(Boolean).map(escapeHtml).join(" · ");
    return '<article class="log-item' + selectedClass + '"><div class="log-item__header"><label class="log-select"><input type="checkbox" data-log-select="' + escapeHtml(entry.id) + '"' + checked + '> Select</label><strong>' + escapeHtml(formatHours(entry.h)) + 'h</strong><small>' + escapeHtml(formatLogDate(entry.at)) + '</small></div>' + (metadata ? '<p class="log-meta">' + metadata + '</p>' : '') + '<p>' + escapeHtml(entry.text) + '</p><div class="row row--actions"><button type="button" class="btn" data-log-action="edit" data-log-id="' + escapeHtml(entry.id) + '">Edit</button><button type="button" class="btn danger" data-log-action="delete" data-log-id="' + escapeHtml(entry.id) + '">Delete</button></div></article>';
  }).join("") + (rows.length > logLimit ? '<button type="button" class="btn log-more" data-log-action="more">Show ' + Math.min(100, rows.length - logLimit) + " more of " + (rows.length - logLimit) + " remaining</button>" : "");
}
function totalLoggedHours() {
  return data.logs.reduce((sum, entry) => sum + Number(entry.h || 0), 0).toFixed(1);
}
function exportBackup() {
  const payload = {
    app: "LUMEN",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lumen-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast("Backup exported.");
}
async function importBackup(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const imported = parsed?.app === "LUMEN" && parsed.data ? parsed.data : parsed;
    const valid = imported && typeof imported === "object" && !Array.isArray(imported) && ("notes" in imported || "logs" in imported);
    if (!valid) throw new Error("This file does not contain LUMEN desk data.");
    const confirmed = await showWindowDialog({ title: "Restore backup", message: "Importing this backup will replace the current desk data.", confirmLabel: "Import", danger: true });
    if (!confirmed) return;
    data = normalizeData(imported);
    savePaint(data.paintImage);
    shipFilter = "";
    editingLogId = null;
    selectedLogIds.clear();
    persistData();
    applyTheme();
    resetTimer("focus");
    closeAllWindows();
    openApp("settings");
    showToast("Backup imported.");
  } catch (error) {
    showToast(error.message || "That backup could not be imported.");
  }
}
function filesHtml() { return '<div class="files"><div class="files__toolbar"><button type="button" class="btn" data-files-new-folder>New folder</button><button type="button" class="btn" data-files-new-text>New text file</button><button type="button" class="btn" data-files-rename disabled>Rename</button><button type="button" class="btn" data-files-move disabled>Move...</button><button type="button" class="btn danger" data-files-delete disabled>Delete</button></div><div class="files__address"><button type="button" class="btn" data-files-up disabled>Up</button><span class="files__path" data-files-path>C:\\</span></div><div class="files__main"><ul class="files__list" data-files-list aria-label="Files"></ul><section class="files__editor"><header class="files__editor-head"><strong data-files-editor-name>Select a text file</strong><button type="button" class="btn" data-files-download disabled>Download</button></header><textarea class="field" data-files-content disabled aria-label="Text file contents"></textarea></section></div><span class="hint hint--flush" data-files-status aria-live="polite">Drop text files into this window to import them.</span></div>'; }
function bindFiles(root) {
  const list = root.querySelector("[data-files-list]");
  const content = root.querySelector("[data-files-content]");
  let current = null;
  let selected = null;
  let saveTimer = null;
  const selectedItem = () => data.files.find((item) => item.id === selected);
  const folderPath = () => { const names = []; const visited = new Set(); let id = current; while (id && !visited.has(id)) { visited.add(id); const folder = data.files.find((item) => item.id === id && item.kind === "folder"); if (!folder) break; names.unshift(folder.name); id = folder.parent; } return "C:\\" + names.join("\\"); };
  const render = (refreshList = true) => {
    const items = refreshList ? data.files.filter((item) => item.parent === current).sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1)) : [];
    if (refreshList) list.innerHTML = items.length ? items.map((item) => '<li><button type="button" class="files__item' + (item.id === selected ? " selected" : "") + '" data-file-id="' + escapeHtml(item.id) + '"><span class="files__glyph">' + (item.kind === "folder" ? "DIR" : "TXT") + '</span><span>' + escapeHtml(item.name) + '</span></button></li>').join("") : '<li class="hint">This folder is empty.</li>';
    root.querySelector("[data-files-path]").textContent = folderPath();
    list.querySelectorAll("[data-file-id]").forEach((button) => { button.classList.toggle("selected", button.dataset.fileId === selected); button.setAttribute("aria-pressed", String(button.dataset.fileId === selected)); });
    root.querySelector("[data-files-up]").disabled = current === null;
    root.querySelectorAll("[data-files-rename],[data-files-move],[data-files-delete]").forEach((button) => button.disabled = !selectedItem());
    const item = selectedItem();
    root.querySelector("[data-files-editor-name]").textContent = item?.kind === "text" ? item.name : "Select a text file";
    content.disabled = item?.kind !== "text";
    root.querySelector("[data-files-download]").disabled = item?.kind !== "text";
    content.value = item?.kind === "text" ? item.content : "";
    writeText(root.querySelector("[data-files-status]"), item?.kind === "text" ? item.content.length.toLocaleString() + " characters" : (refreshList ? items.length + (items.length === 1 ? " item" : " items") : "Folder selected"));
  };
  const createItem = async (kind) => { const proposed = await showWindowDialog({ title: kind === "folder" ? "New folder" : "New text file", message: "Enter a name.", value: kind === "folder" ? "New Folder" : "New Text File.txt", confirmLabel: "Create" }); const name = proposed?.trim().replace(/[\\/]/g, "-").slice(0, 80); if (!name) return; const item = { id: makeId(), kind, name, parent: current, content: "" }; data.files.push(item); selected = item.id; persistData(); render(); if (kind === "text") content.focus(); };
  root.querySelector("[data-files-new-folder]").addEventListener("click", () => createItem("folder"));
  root.querySelector("[data-files-new-text]").addEventListener("click", () => createItem("text"));
  list.addEventListener("click", (event) => { const button = event.target.closest("[data-file-id]"); if (!button || selected === button.dataset.fileId) return; selected = button.dataset.fileId; render(false); });
  list.addEventListener("focusin", (event) => { const button = event.target.closest("[data-file-id]"); if (!button || selected === button.dataset.fileId) return; selected = button.dataset.fileId; render(false); });
  list.addEventListener("dblclick", (event) => { const item = data.files.find((candidate) => candidate.id === event.target.closest("[data-file-id]")?.dataset.fileId); if (!item) return; if (item.kind === "folder") { current = item.id; selected = null; render(); } else content.focus(); });
  list.addEventListener("dragover", (event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); });
  list.addEventListener("drop", async (event) => { const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("text/") || /\.txt$/i.test(file.name)); if (!files.length) return; event.preventDefault(); const destination = current; try { const imported = await Promise.all(files.slice(0, Math.min(20, Math.max(0, 500 - data.files.length))).map(async (file) => ({ id: makeId(), kind: "text", name: file.name.replace(/[\\/]/g, "-").slice(0, 80), parent: destination, content: (await file.slice(0, 800000).text()).slice(0, 200000) }))); data.files.push(...imported.slice(0, Math.max(0, 500 - data.files.length))); const saved = persistData(); render(); root.querySelector("[data-files-status]").textContent = saved ? "Imported " + imported.length + (imported.length === 1 ? " text file." : " text files.") : "Import could not be saved. Export your files to keep them."; } catch { showToast("These text files could not be imported."); } });
  root.querySelector("[data-files-up]").addEventListener("click", () => { current = data.files.find((item) => item.id === current)?.parent ?? null; selected = null; render(); });
  content.addEventListener("input", () => { const item = selectedItem(); if (!item || item.kind !== "text") return; item.content = content.value.slice(0, 200000); clearTimeout(saveTimer); saveTimer = setTimeout(() => { root.querySelector("[data-files-status]").textContent = persistData() ? "Saved." : "Save failed. Download this file to keep your edits."; }, 300); });
  root.querySelector("[data-files-download]").addEventListener("click", () => { const item = selectedItem(); if (!item || item.kind !== "text") return; const url = URL.createObjectURL(new Blob([item.content], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = item.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); });
  content.maxLength = 200000;
  content.addEventListener("blur", () => { clearTimeout(saveTimer); root.querySelector("[data-files-status]").textContent = persistData() ? "Saved." : "Save failed. Download this file to keep your edits."; });
  root.querySelector("[data-files-rename]").addEventListener("click", async () => { const item = selectedItem(); if (!item) return; const renamed = await showWindowDialog({ title: "Rename", message: "Enter a new name.", value: item.name, confirmLabel: "Rename" }); const name = renamed?.trim().replace(/[\\/]/g, "-").slice(0, 80); if (!name) return; item.name = name; persistData(); render(); });
  const descendantsOf = (id) => { const descendants = new Set([id]); let changed = true; while (changed) { changed = false; data.files.forEach((item) => { if (item.parent && descendants.has(item.parent) && !descendants.has(item.id)) { descendants.add(item.id); changed = true; } }); } return descendants; };
  root.querySelector("[data-files-move]").addEventListener("click", async () => { const item = selectedItem(); if (!item) return; const blocked = item.kind === "folder" ? descendantsOf(item.id) : new Set(); const folders = data.files.filter((candidate) => candidate.kind === "folder" && !blocked.has(candidate.id)); const choice = await showWindowDialog({ title: "Move " + item.name, message: "Choose a destination.", options: [{ value: "", label: "Desktop" }, ...folders.map((folder) => ({ value: folder.id, label: folder.name }))], confirmLabel: "Move" }); if (choice === null) return; item.parent = choice || null; persistData(); selected = null; render(); });
  root.querySelector("[data-files-delete]").addEventListener("click", async () => { const item = selectedItem(); if (!item || !await showWindowDialog({ title: "Delete " + item.name, message: item.kind === "folder" ? "Delete this folder and everything inside it?" : "Delete this text file?", confirmLabel: "Delete", danger: true })) return; const removing = new Set([item.id]); let changed = true; while (changed) { changed = false; data.files.forEach((candidate) => { if (candidate.parent && removing.has(candidate.parent) && !removing.has(candidate.id)) { removing.add(candidate.id); changed = true; } }); } data.files = data.files.filter((candidate) => !removing.has(candidate.id)); selected = null; persistData(); render(); });
  list.addEventListener("keydown", (event) => { if (event.ctrlKey || event.metaKey || event.altKey) return; const buttons = Array.from(list.querySelectorAll("[data-file-id]")); const index = buttons.findIndex((button) => button.dataset.fileId === selected); if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && buttons.length) { event.preventDefault(); event.stopPropagation(); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))); selected = buttons[next].dataset.fileId; render(false); buttons[next].focus(); } else if (event.key === "Enter" && selectedItem()) { event.preventDefault(); if (selectedItem().kind === "folder") { current = selected; selected = null; render(); list.querySelector("button")?.focus(); } else content.focus(); } else if (event.key === "F2" && selectedItem()) { event.preventDefault(); root.querySelector("[data-files-rename]").click(); } else if (event.key === "Delete" && selectedItem()) { event.preventDefault(); root.querySelector("[data-files-delete]").click(); } else if (event.key === "Backspace" && current) { event.preventDefault(); root.querySelector("[data-files-up]").click(); list.querySelector("button")?.focus(); } });
  render();
  return (flush = true) => { clearTimeout(saveTimer); if (flush) persistData(); };
}
async function clearAllData() {
  const confirmed = await showWindowDialog({ title: "Clear all data", message: "Clear all LUMEN notes, files, settings, and ship log entries?", confirmLabel: "Clear", danger: true });
  if (!confirmed) return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PAINT_KEY);
    lastSaved = "";
  } catch {
    return;
  }
  data = defaultData();
  shipFilter = "";
  editingLogId = null;
  selectedLogIds.clear();
  persistData();
  applyTheme();
  resetTimer("focus");
  closeAllWindows();
  openApp("settings");
  showToast("All LUMEN data was cleared.");
}
const apps = [
  {
    id: "notes",
    name: "Notes",
    icon: "icons/notes.png?v=8c65e95fff",
    html() {
      return '<p class="hint">Saved automatically on this device. Use Markdown headings to navigate longer notes.</p><div class="notes-layout"><textarea id="notesArea" aria-label="Project notes" placeholder="Write a note">' + escapeHtml(data.notes) + '</textarea><aside class="notes-sidebar"><nav class="notes-outline" data-note-outline aria-label="Notes outline"></nav><section class="notes-history" data-note-history aria-label="Notes version history"></section></aside></div><div class="row row--actions notes-status-row"><span class="hint hint--flush" data-notes-status aria-live="polite">All changes saved.</span><span class="notes-status-actions"><span class="hint hint--flush" data-note-stats></span><button type="button" class="btn" data-save-note-version aria-keyshortcuts="Control+Shift+S Meta+Shift+S" title="Save version (Ctrl/Command+Shift+S)">Save version</button><button type="button" class="btn" data-note-trim>Trim lines</button><button type="button" class="btn" data-note-copy>Copy</button></span></div>';
    },
    bind(root) {
      const area = root.querySelector("#notesArea");
      const status = root.querySelector("[data-notes-status]");
      const outline = root.querySelector("[data-note-outline]");
      const history = root.querySelector("[data-note-history]");
      const stats = root.querySelector("[data-note-stats]");
      let saveTimer = null;
      let metadataFrame = null;
      let savedNotes = data.notes;
      const renderEditorMetadata = () => {
        if (metadataFrame !== null) cancelAnimationFrame(metadataFrame);
        metadataFrame = null;
        renderNoteOutline(outline, area.value);
        renderNoteStats(stats, area.value);
      };
      const scheduleEditorMetadata = () => {
        if (metadataFrame !== null) return;
        metadataFrame = requestAnimationFrame(renderEditorMetadata);
      };
      renderEditorMetadata();
      renderNoteHistory(history);
      const stageEditorValue = () => {
        if (area.value === savedNotes) return false;
        data.noteHistory = appendNoteRevision(data.noteHistory, savedNotes, new Date().toISOString(), makeId());
        data.notes = area.value;
        return true;
      };
      const commit = () => {
        clearTimeout(saveTimer);
        if (!stageEditorValue()) {
          status.textContent = "All changes saved.";
          return;
        }
        if (persistData()) {
          savedNotes = area.value;
          status.textContent = "All changes saved.";
          renderNoteHistory(history);
        } else {
          status.textContent = "Save failed. Your edits remain open.";
        }
      };
      area.addEventListener("input", () => {
        data.notes = area.value;
        status.textContent = "Saving…";
        scheduleEditorMetadata();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(commit, 900);
      });
      area.addEventListener("blur", commit);
      const saveVersion = () => {
        clearTimeout(saveTimer);
        stageEditorValue();
        const before = data.noteHistory[0]?.id;
        data.noteHistory = appendNoteRevision(data.noteHistory, area.value, new Date().toISOString(), makeId());
        const saved = persistData();
        if (saved) savedNotes = area.value;
        renderNoteHistory(history);
        status.textContent = saved ? (data.noteHistory[0]?.id === before ? "This version is already saved." : "Version saved.") : "Version could not be saved.";
      };
      root.querySelector("[data-save-note-version]").addEventListener("click", saveVersion);
      root.querySelector("[data-note-trim]").addEventListener("click", () => {
        area.value = area.value.split("\n").map((line) => line.trim()).join("\n").trim();
        area.dispatchEvent(new Event("input"));
      });
      root.querySelector("[data-note-copy]").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(area.value);
          showToast("Note copied.");
        } catch {
          showToast("Copy failed. Select the text and copy it manually.");
        }
      });
      area.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s") {
          event.preventDefault();
          saveVersion();
        }
      });
      outline.addEventListener("click", (event) => {
        const button = event.target.closest("[data-note-heading]");
        if (!button) return;
        const heading = extractNoteHeadings(area.value)[Number(button.dataset.noteHeading)];
        if (!heading) return;
        area.focus();
        area.setSelectionRange(heading.start, heading.end);
      });
      history.addEventListener("click", async (event) => {
        if (event.target.closest("[data-clear-note-history]")) {
          if (!await showWindowDialog({ title: "Clear version history", message: "Clear all saved note versions? Your current note will not change.", confirmLabel: "Clear", danger: true })) return;
          data.noteHistory = [];
          const saved = persistData();
          renderNoteHistory(history);
          status.textContent = saved ? "Version history cleared." : "Version history could not be cleared.";
          return;
        }
        const button = event.target.closest("[data-note-revision]");
        if (!button) return;
        if (!await showWindowDialog({ title: "Restore note version", message: "Restore this saved version? Your current note will remain in version history.", confirmLabel: "Restore" })) return;
        const restored = restoreNoteRevision(data.noteHistory, area.value, button.dataset.noteRevision, new Date().toISOString(), makeId());
        if (!restored.ok) {
          showToast(restored.reason === "current-too-large" ? "This note is too large to preserve as a version." : "That saved version is no longer available.");
          renderNoteHistory(history);
          return;
        }
        data.noteHistory = restored.history;
        area.value = restored.text;
        data.notes = restored.text;
        const saved = persistData();
        if (saved) savedNotes = restored.text;
        renderEditorMetadata();
        renderNoteHistory(history);
        status.textContent = saved ? "Saved version restored." : "Version restored in this window but could not be saved.";
        area.focus();
      });
      return (flush = true) => { clearTimeout(saveTimer); if (metadataFrame !== null) cancelAnimationFrame(metadataFrame); if (flush) commit(); };
    },
  },
  {
    id: "focus",
    name: "Focus",
    icon: "icons/timer.png?v=13bd7c6582",
    html() {
      return '<div class="timer-modes" aria-label="Timer mode"><button type="button" class="btn" data-timer-mode="focus" aria-pressed="false">Focus</button><button type="button" class="btn" data-timer-mode="break" aria-pressed="false">Break</button></div><p class="hint" data-timer-status aria-live="polite"></p><div class="timer" id="timer" role="timer"></div><div class="row"><button type="button" class="btn primary" data-focus-start>Start</button><button type="button" class="btn" data-focus-pause>Pause</button><button type="button" class="btn" data-focus-reset>Reset</button></div><section class="session-history" data-session-history aria-live="polite"></section>';
    },
    bind(root) {
      root.querySelectorAll("[data-timer-mode]").forEach((button) => {
        button.addEventListener("click", () => selectTimerMode(button.dataset.timerMode));
      });
      root.querySelector("[data-focus-start]").addEventListener("click", startTimer);
      root.querySelector("[data-focus-pause]").addEventListener("click", pauseTimer);
      root.querySelector("[data-focus-reset]").addEventListener("click", () => resetTimer());
      paintTimer(root);
      renderSessionHistory(root);
    },
  },
  {
    id: "shiplog",
    name: "Ship Log",
    icon: "icons/logs.png?v=7ce34f25cf",
    html() {
      return '<p class="hint">Total logged: <strong class="stat-strong" data-log-total>' + totalLoggedHours() + 'h</strong></p><div class="log-entry-form"><input class="field" type="number" min="0.25" max="24" step="0.25" value="1" id="logH" aria-label="Hours shipped"><input class="field" type="text" maxlength="240" placeholder="What did you ship?" id="logText" aria-label="Ship description"><input class="field" type="text" maxlength="48" placeholder="Project (optional)" id="logProject" aria-label="Project"><input class="field" type="text" placeholder="Tags, comma separated" id="logTags" aria-label="Tags"><button type="button" class="btn primary" data-add-log>Add entry</button></div><div class="log-tools"><label class="form-label log-filter">Search entries<input class="field" type="search" placeholder="Description, project, tag, hours, or date" value="' + escapeHtml(shipFilter) + '" data-log-filter></label><label class="form-label">Date range<select class="field" data-log-range><option value="all"' + (shipDateRange === "all" ? " selected" : "") + '>All time</option><option value="7"' + (shipDateRange === "7" ? " selected" : "") + '>Last 7 days</option><option value="30"' + (shipDateRange === "30" ? " selected" : "") + '>Last 30 days</option></select></label><button type="button" class="btn" data-export-log>Export filtered CSV</button></div><div class="log-list" data-log-list>' + logListHtml() + '</div>';
    },
    bind(root) {
      const hoursInput = root.querySelector("#logH");
      const textInput = root.querySelector("#logText");
      const projectInput = root.querySelector("#logProject");
      const tagsInput = root.querySelector("#logTags");
      const filterInput = root.querySelector("[data-log-filter]");
      const rangeInput = root.querySelector("[data-log-range]");
      const list = root.querySelector("[data-log-list]");
      const total = root.querySelector("[data-log-total]");
      let filterFrame = 0;
      const render = () => {
        const rows = filteredLogs();
        const validIds = new Set(data.logs.map((entry) => entry.id));
        selectedLogIds.forEach((id) => {
          if (!validIds.has(id)) selectedLogIds.delete(id);
        });
        list.innerHTML = logListHtml(rows);
        total.textContent = totalLoggedHours() + "h";
        const visibleIds = rows.map((entry) => entry.id);
        const visibleSelected = visibleIds.filter((id) => selectedLogIds.has(id)).length;
        const selectVisible = list.querySelector("[data-select-visible]");
        if (selectVisible) {
          selectVisible.checked = visibleIds.length > 0 && visibleSelected === visibleIds.length;
          selectVisible.indeterminate = visibleSelected > 0 && visibleSelected < visibleIds.length;
        }
      };
      const addEntry = () => {
        const validated = validateLogEntry({ hours: hoursInput.value, description: textInput.value, project: projectInput.value, tags: tagsInput.value });
        if (!validated.ok) {
          showToast(validated.error);
          return;
        }
        data.logs.unshift({
          id: makeId(),
          ...validated.value,
          at: new Date().toISOString(),
        });
        editingLogId = null;
        persistData();
        hoursInput.value = "1";
        textInput.value = "";
        projectInput.value = "";
        tagsInput.value = "";
        render();
        textInput.focus();
        showToast("Ship log entry added.");
      };
      root.querySelector("[data-add-log]").addEventListener("click", addEntry);
      textInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addEntry();
        }
      });
      filterInput.addEventListener("input", () => {
        shipFilter = filterInput.value;
        logLimit = 100;
        if (!filterFrame) filterFrame = requestAnimationFrame(() => { filterFrame = 0; if (root.isConnected) render(); });
      });
      rangeInput.addEventListener("change", () => { shipDateRange = rangeInput.value; logLimit = 100; render(); });
      root.querySelector("[data-export-log]").addEventListener("click", exportShipLog);
      list.addEventListener("change", (event) => {
        const entryCheckbox = event.target.closest("[data-log-select]");
        if (entryCheckbox) {
          if (entryCheckbox.checked) selectedLogIds.add(entryCheckbox.dataset.logSelect);
          else selectedLogIds.delete(entryCheckbox.dataset.logSelect);
          render();
          return;
        }
        if (event.target.matches("[data-select-visible]")) {
          filteredLogs().forEach((entry) => {
            if (event.target.checked) selectedLogIds.add(entry.id);
            else selectedLogIds.delete(entry.id);
          });
          render();
        }
      });
      list.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-log-action]");
        if (!button) return;
        const action = button.dataset.logAction;
        const id = button.dataset.logId;
        if (action === "more") {
          logLimit += 100;
          render();
          return;
        }
        if (action === "clear-selection") {
          selectedLogIds.clear();
          render();
          return;
        }
        if (action === "delete-selected") {
          const count = selectedLogIds.size;
          if (!count || !await showWindowDialog({ title: "Delete ship log entries", message: "Delete " + count + " selected ship log " + (count === 1 ? "entry?" : "entries?"), confirmLabel: "Delete", danger: true })) return;
          data.logs = data.logs.filter((item) => !selectedLogIds.has(item.id));
          if (editingLogId && selectedLogIds.has(editingLogId)) editingLogId = null;
          selectedLogIds.clear();
          persistData();
          render();
          showToast(count + " ship log " + (count === 1 ? "entry deleted." : "entries deleted."));
          return;
        }
        const entry = data.logs.find((item) => item.id === id);
        if (action === "cancel") {
          editingLogId = null;
          render();
          return;
        }
        if (!entry) return;
        if (action === "edit") {
          editingLogId = id;
          render();
          list.querySelector("[data-edit-text]")?.focus();
          return;
        }
        if (action === "delete") {
          if (!await showWindowDialog({ title: "Delete ship log entry", message: "Delete this ship log entry?", confirmLabel: "Delete", danger: true })) return;
          data.logs = data.logs.filter((item) => item.id !== id);
          selectedLogIds.delete(id);
          if (editingLogId === id) editingLogId = null;
          persistData();
          render();
          showToast("Ship log entry deleted.");
          return;
        }
        if (action === "save") {
          const row = button.closest("[data-log-row]");
          const validated = validateLogEntry({
            hours: row.querySelector("[data-edit-hours]").value,
            description: row.querySelector("[data-edit-text]").value,
            project: row.querySelector("[data-edit-project]").value,
            tags: row.querySelector("[data-edit-tags]").value,
            existingHours: entry.h,
          });
          if (!validated.ok) {
            showToast(validated.error);
            return;
          }
          Object.assign(entry, validated.value);
          editingLogId = null;
          persistData();
          render();
          showToast("Ship log entry updated.");
        }
      });
    },
  },
  {
    id: "checklist",
    name: "Checklist",
    icon: "icons/checklist.png?v=0e27a20bbd",
    html() {
      return '<form class="checklist-entry" data-task-form><input class="field" type="text" maxlength="160" placeholder="Add a task" aria-label="New task" data-task-input required><button type="submit" class="btn primary">Add task</button></form><div class="checklist-toolbar"><span class="hint hint--flush" data-task-summary></span><button type="button" class="btn" data-clear-completed>Clear completed</button></div><div class="checklist" data-task-list></div>';
    },
    bind(root) {
      const form = root.querySelector("[data-task-form]");
      const input = root.querySelector("[data-task-input]");
      const list = root.querySelector("[data-task-list]");
      const summary = root.querySelector("[data-task-summary]");
      const clearCompleted = root.querySelector("[data-clear-completed]");
      const render = () => {
        list.innerHTML = data.tasks.length ? data.tasks.map((task) => '<div class="checklist-item"><label><input type="checkbox" data-task-toggle="' + escapeHtml(task.id) + '"' + (task.done ? " checked" : "") + '><span>' + escapeHtml(task.text) + '</span></label><button type="button" class="btn" data-task-delete="' + escapeHtml(task.id) + '" aria-label="Delete ' + escapeHtml(task.text) + '">Delete</button></div>').join("") : '<p class="hint">No tasks yet.</p>';
        summary.textContent = data.tasks.filter((task) => !task.done).length + " remaining · " + data.tasks.length + " total";
        clearCompleted.disabled = !data.tasks.some((task) => task.done);
      };
      render();
      clearCompleted.addEventListener("click", () => {
        data.tasks = data.tasks.filter((task) => !task.done);
        persistData();
        render();
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        data.tasks.unshift({ id: makeId(), text: text.slice(0, 160), done: false, createdAt: new Date().toISOString() });
        input.value = "";
        persistData();
        render();
      });
      list.addEventListener("change", (event) => {
        const task = data.tasks.find((item) => item.id === event.target.dataset.taskToggle);
        if (!task) return;
        task.done = event.target.checked;
        persistData();
        render();
      });
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-task-delete]");
        if (!button) return;
        data.tasks = data.tasks.filter((task) => task.id !== button.dataset.taskDelete);
        persistData();
        render();
      });
    },
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "icons/calculator.png?v=528346ef06",
    size: [284, 396],
    html() {
      const keys = [["MC", "mc", "mem"], ["MR", "mr", "mem"], ["M+", "m+", "mem"], ["M−", "m-", "mem"], ["C", "clear", "op"], ["(", "(", "op"], [")", ")", "op"], ["÷", "/", "op"], ["7", "7", "digit"], ["8", "8", "digit"], ["9", "9", "digit"], ["×", "*", "op"], ["4", "4", "digit"], ["5", "5", "digit"], ["6", "6", "digit"], ["−", "-", "op"], ["1", "1", "digit"], ["2", "2", "digit"], ["3", "3", "digit"], ["+", "+", "op"], ["⌫", "back", "op"], ["0", "0", "digit"], [".", ".", "digit"], ["=", "equals", "op"]];
      return '<div class="calc" data-calc data-autofocus tabindex="0" aria-label="Calculator. Type numbers and operators or use the keypad."><div class="calc__screen"><span class="calc__expr" data-calc-expr></span><output class="calc__value" data-calc-value aria-live="polite">0</output></div><div class="calc__keys">' + keys.map(([label, key, kind]) => '<button type="button" class="btn calc__' + kind + '" data-calc-key="' + escapeHtml(key) + '" aria-label="' + escapeHtml(key === "back" ? "Backspace" : key === "clear" ? "Clear" : key === "equals" ? "Equals" : { mc: "Memory clear", mr: "Memory recall", "m+": "Memory add", "m-": "Memory subtract" }[key] || label) + '">' + label + '</button>').join("") + '</div><ol class="calc__tape" data-calc-tape aria-label="Recent results"></ol></div>';
    },
    bind(root) {
      const calc = root.querySelector("[data-calc]");
      const exprView = root.querySelector("[data-calc-expr]");
      const valueView = root.querySelector("[data-calc-value]");
      const tape = root.querySelector("[data-calc-tape]");
      const pretty = (value) => value.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
      let expression = "";
      let evaluated = false;
      const results = [];
      let memory = 0;
      const render = (value, preview) => {
        writeText(exprView, pretty(expression));
        writeText(valueView, value);
        valueView.classList.toggle("preview", preview);
      };
      const press = (key) => {
        if (/^m[cr+-]$/.test(key)) {
          const current = calculateExpression(expression);
          if (key === "mc") memory = 0;
          if ((key === "m+" || key === "m-") && current.ok) memory = Number((memory + (key === "m+" ? current.value : -current.value)).toPrecision(12));
          calc.classList.toggle("has-memory", memory !== 0);
          if (key !== "mr") {
            evaluated = current.ok;
            return render(current.ok ? String(current.value) : expression ? pretty(expression) : "0", false);
          }
          const replace = evaluated || !/[+\-*/(]$/.test(expression);
          expression = replace ? String(memory) : expression + (memory < 0 ? "(" + memory + ")" : memory);
          evaluated = replace;
          const recalled = calculateExpression(expression);
          return render(recalled.ok ? String(recalled.value) : pretty(expression), !replace);
        }
        if (key === "clear") {
          expression = "";
          evaluated = false;
          return render("0", false);
        }
        if (key === "back") {
          expression = evaluated ? "" : expression.slice(0, -1);
          evaluated = false;
        } else if (key === "equals") {
          const calculated = calculateExpression(expression);
          if (!calculated.ok) return render(expression ? calculated.error : "0", false);
          results.unshift([pretty(expression), String(calculated.value)]);
          results.length = Math.min(results.length, 5);
          tape.innerHTML = results.map(([sum, answer]) => '<li><button type="button" data-calc-recall="' + escapeHtml(answer) + '">' + escapeHtml(sum) + " = <strong>" + escapeHtml(answer) + "</strong></button></li>").join("");
          expression = String(calculated.value);
          evaluated = true;
          return render(expression, false);
        } else {
          if (evaluated && /[\d.(]/.test(key)) expression = "";
          evaluated = false;
          expression = (expression + key).slice(0, 120);
        }
        const preview = calculateExpression(expression);
        render(preview.ok ? String(preview.value) : expression ? pretty(expression) : "0", preview.ok && /[^\d.]/.test(expression));
      };
      root.querySelector(".calc__keys").addEventListener("click", (event) => {
        const button = event.target.closest("[data-calc-key]");
        if (button) press(button.dataset.calcKey);
      });
      tape.addEventListener("click", (event) => {
        const button = event.target.closest("[data-calc-recall]");
        if (!button) return;
        expression = button.dataset.calcRecall;
        evaluated = true;
        render(expression, false);
      });
      calc.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = { Enter: "equals", "=": "equals", Backspace: "back", Escape: "clear", Delete: "clear", x: "*", X: "*" }[event.key] || (/^[\d.+\-*/%()]$/.test(event.key) ? event.key : null);
        if (!key) return;
        event.preventDefault();
        event.stopPropagation();
        press(key);
        root.querySelector('[data-calc-key="' + CSS.escape(key) + '"]')?.classList.add("active");
        window.setTimeout(() => root.querySelector(".calc__keys .active")?.classList.remove("active"), 90);
      });
    },
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    icon: "icons/minesweeper.png?v=65c80a1be7",
    size: [236, 334],
    html() {
      return '<div class="mines"><div class="mines__bar"><output class="mines__led" data-mine-count aria-label="Mines left">010</output><button type="button" class="btn mines__reset" data-mine-reset aria-label="New game"><img src="icons/mine-face.png?v=3aaae78e3e" alt="" width="24" height="24"></button><output class="mines__led" data-mine-time aria-label="Seconds elapsed">000</output></div><div class="mines__board" data-mine-board role="grid" aria-label="Minefield"></div><p class="hint hint--flush" data-mine-status aria-live="polite"></p></div>';
    },
    bind(root) {
      const width = 9;
      const height = 9;
      const mines = 10;
      const board = root.querySelector("[data-mine-board]");
      const counter = root.querySelector("[data-mine-count]");
      const clock = root.querySelector("[data-mine-time]");
      const status = root.querySelector("[data-mine-status]");
      board.innerHTML = Array.from({ length: width * height }, (_, index) => '<button type="button" class="mine-cell" data-mine-cell="' + index + '" aria-label="Hidden square"></button>').join("");
      const cells = Array.from(board.children);
      let field = null;
      let revealed = new Set();
      let flags = new Set();
      let over = false;
      let started = 0;
      let ticker = null;
      const led = (value) => String(Math.max(-99, Math.min(999, value))).padStart(3, "0");
      const stopClock = () => {
        clearInterval(ticker);
        ticker = null;
      };
      const paint = () => {
        cells.forEach((cell, index) => {
          const open = revealed.has(index);
          const info = field?.[index];
          cell.classList.toggle("open", open);
          cell.classList.toggle("boom", open && Boolean(info?.mine));
          writeAttribute(cell, "data-count", open && info && !info.mine && info.count ? String(info.count) : "");
          writeText(cell, open ? (info.mine ? "" : info.count ? String(info.count) : "") : flags.has(index) ? "⚑" : "");
          writeAttribute(cell, "aria-label", open ? (info.mine ? "Mine" : info.count ? info.count + " nearby mines" : "Empty") : flags.has(index) ? "Flagged square" : "Hidden square");
        });
        writeText(counter, led(mines - flags.size));
      };
      const reset = () => {
        field = null;
        revealed = new Set();
        flags = new Set();
        over = false;
        stopClock();
        writeText(clock, "000");
        writeText(status, data.mineBest ? "Best time " + data.mineBest + "s. Right click or press F to flag." : "Click a square to start. Right click or press F to flag.");
        paint();
      };
      const finish = (won) => {
        over = true;
        stopClock();
        if (won) {
          const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
          const best = !data.mineBest || seconds < data.mineBest;
          if (best) data.mineBest = seconds;
          persistData();
          writeText(status, "Cleared in " + seconds + "s." + (best ? " New best time." : " Best is " + data.mineBest + "s."));
          playSound("win");
        } else {
          field.forEach((info, index) => {
            if (info.mine) revealed.add(index);
          });
          writeText(status, "Boom. Press the face for a new game.");
          playSound("boom");
        }
        paint();
      };
      const toggleFlag = (index) => {
        if (over || revealed.has(index)) return;
        if (flags.has(index)) flags.delete(index);
        else flags.add(index);
        paint();
      };
      board.addEventListener("click", (event) => {
        const cell = event.target.closest("[data-mine-cell]");
        if (!cell || over) return;
        const index = Number(cell.dataset.mineCell);
        if (flags.has(index) || revealed.has(index)) return;
        if (!field) {
          field = createMinefield(width, height, mines, index);
          started = Date.now();
          ticker = setInterval(() => {
            if (!root.isConnected) return stopClock();
            writeText(clock, led(Math.floor((Date.now() - started) / 1000)));
          }, 1000);
        }
        revealed = revealArea(field, width, height, index, revealed, flags);
        if (field[index].mine) return finish(false);
        if (revealed.size === width * height - mines) return finish(true);
        paint();
      });
      board.addEventListener("contextmenu", (event) => {
        const cell = event.target.closest("[data-mine-cell]");
        if (!cell) return;
        event.preventDefault();
        toggleFlag(Number(cell.dataset.mineCell));
      });
      board.addEventListener("keydown", (event) => {
        const cell = event.target.closest("[data-mine-cell]");
        if (!cell || event.key.toLowerCase() !== "f") return;
        event.preventDefault();
        toggleFlag(Number(cell.dataset.mineCell));
      });
      root.querySelector("[data-mine-reset]").addEventListener("click", reset);
      reset();
      return stopClock;
    },
  },
  {
    id: "paint",
    name: "Paint",
    icon: "icons/paint.png?v=65c80a1be7",
    size: [372, 432],
    html() {
      const colors = ["#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"];
      return '<div class="paint"><div class="paint__tools" role="toolbar" aria-label="Paint tools" data-paint-tools><button type="button" class="btn active" data-paint-tool="pencil" aria-pressed="true">Pencil</button><button type="button" class="btn" data-paint-tool="eraser" aria-pressed="false">Eraser</button><button type="button" class="btn" data-paint-tool="fill" aria-pressed="false">Fill</button><button type="button" class="btn" data-paint-tool="airbrush" aria-pressed="false">Airbrush</button><button type="button" class="btn" data-paint-tool="smudge" aria-pressed="false">Smudge</button><button type="button" class="btn" data-paint-tool="picker" aria-pressed="false">Picker</button><label class="paint__size">Size <select class="field" data-paint-size><option value="1">1</option><option value="2" selected>2</option><option value="4">4</option><option value="8">8</option></select></label></div><canvas class="paint__canvas" data-paint-canvas width="160" height="104" tabindex="0" aria-label="Drawing canvas"></canvas><div class="paint__palette" role="radiogroup" aria-label="Colors" data-paint-palette>' + colors.map((color, index) => '<button type="button" class="paint__swatch" style="--swatch:' + color + '" data-paint-color="' + color + '" role="radio" aria-checked="' + (index === 0) + '" aria-label="Color ' + color + '"></button>').join("") + '</div><div class="row row--actions"><button type="button" class="btn" data-paint-undo disabled>Undo</button><button type="button" class="btn" data-paint-clear>Clear</button><button type="button" class="btn" data-paint-save>Save PNG</button><span class="hint hint--flush" data-paint-status aria-live="polite">Saved on this device.</span></div></div>';
    },
    bind(root) {
      const canvas = root.querySelector("[data-paint-canvas]");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const sizeInput = root.querySelector("[data-paint-size]");
      const status = root.querySelector("[data-paint-status]");
      let tool = "pencil";
      let color = "#000000";
      let last = null;
      let sprayFrame = 0; let lastSpray = 0;
      let saveTimer = null;
      const undo = [];
      const undoButton = root.querySelector("[data-paint-undo]");
      const snapshot = () => { undo.push(context.getImageData(0, 0, canvas.width, canvas.height)); if (undo.length > 20) undo.shift(); undoButton.disabled = false; };
      const store = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          data.paintImage = canvas.toDataURL("image/png");
          writeText(status, savePaint(data.paintImage) ? "Saved on this device." : "This drawing could not be saved.");
          saveTimer = null;
        }, 400);
      };
      const blank = () => {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      };
      blank();
      if (data.paintImage) {
        const image = new Image();
        image.addEventListener("load", () => { if (!undo.length) context.drawImage(image, 0, 0); });
        image.src = data.paintImage;
      }
      const point = (event) => {
        const box = canvas.getBoundingClientRect();
        const [x, y] = toScene(event.clientX, event.clientY);
        return [Math.max(0, Math.min(canvas.width - 1, Math.floor((x - box.left) / box.width * canvas.width))), Math.max(0, Math.min(canvas.height - 1, Math.floor((y - box.top) / box.height * canvas.height)))];
      };
      const stamp = ([x, y]) => {
        const size = Number(sizeInput.value);
        context.fillStyle = tool === "eraser" ? "#ffffff" : color;
        context.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
      };
      const rgba = (value) => [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).concat(255);
      const airbrush = ([x, y]) => { const radius = Number(sizeInput.value) * 2; context.fillStyle = color; for (let dot = 0; dot < radius * 2; dot += 1) { const angle = Math.random() * Math.PI * 2; const distance = Math.sqrt(Math.random()) * radius; context.fillRect(Math.round(x + Math.cos(angle) * distance), Math.round(y + Math.sin(angle) * distance), 1, 1); } };
      const spray = (now) => { if (!last || tool !== "airbrush" || !canvas.isConnected || document.hidden) { sprayFrame = 0; return; } if (now - lastSpray >= 40) { airbrush(last); lastSpray = now; } sprayFrame = requestAnimationFrame(spray); };
      const smudge = ([x, y]) => { const size = Math.max(2, Number(sizeInput.value) * 2); const left = Math.max(0, x - Math.floor(size / 2)); const top = Math.max(0, y - Math.floor(size / 2)); const width = Math.min(size, canvas.width - left); const height = Math.min(size, canvas.height - top); const pixels = context.getImageData(left, top, width, height); smudgePixels(pixels.data); context.putImageData(pixels, left, top); };
      canvas.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        canvas.focus({ preventScroll: true });
        const at = point(event);
        if (tool === "picker") { const pixel = context.getImageData(at[0], at[1], 1, 1).data; color = "#" + [pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, "0")).join(""); root.querySelectorAll("[data-paint-color]").forEach((item) => item.setAttribute("aria-checked", String(item.dataset.paintColor === color))); writeText(status, "Picked " + color.toUpperCase() + "."); return; }
        snapshot();
        if (tool === "fill") {
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          if (floodFill(image.data, canvas.width, canvas.height, at[0], at[1], rgba(color))) context.putImageData(image, 0, 0);
          return store();
        }
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
        last = at;
        (tool === "airbrush" ? airbrush : tool === "smudge" ? smudge : stamp)(at);
        if (tool === "airbrush") { lastSpray = performance.now(); sprayFrame = requestAnimationFrame(spray); }
      });
      canvas.addEventListener("pointermove", (event) => {
        if (!last) return;
        const at = point(event);
        linePoints(last[0], last[1], at[0], at[1]).forEach(tool === "airbrush" ? airbrush : tool === "smudge" ? smudge : stamp);
        last = at;
      });
      const end = () => {
        cancelAnimationFrame(sprayFrame); sprayFrame = 0;
        if (!last) return;
        last = null;
        store();
      };
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", end);
      canvas.addEventListener("lostpointercapture", end);
      root.querySelector("[data-paint-tools]").addEventListener("click", (event) => {
        const button = event.target.closest("[data-paint-tool]");
        if (!button) return;
        tool = button.dataset.paintTool;
        root.querySelectorAll("[data-paint-tool]").forEach((item) => {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-pressed", String(item === button));
        });
      });
      root.querySelector("[data-paint-palette]").addEventListener("click", (event) => {
        const swatch = event.target.closest("[data-paint-color]");
        if (!swatch) return;
        color = swatch.dataset.paintColor;
        root.querySelectorAll("[data-paint-color]").forEach((item) => item.setAttribute("aria-checked", String(item === swatch)));
        if (tool === "eraser") root.querySelector('[data-paint-tool="pencil"]').click();
      });
      undoButton.addEventListener("click", () => { const image = undo.pop(); if (!image) return; context.putImageData(image, 0, 0); undoButton.disabled = undo.length === 0; store(); });
      canvas.addEventListener("keydown", (event) => { if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || undoButton.disabled) return; event.preventDefault(); undoButton.click(); });
      root.querySelector("[data-paint-clear]").addEventListener("click", async () => {
        if (!await showWindowDialog({ title: "Paint", message: "Clear the whole drawing?", confirmLabel: "Clear", danger: true })) return;
        snapshot();
        blank();
        store();
      });
      root.querySelector("[data-paint-save]").addEventListener("click", () => {
        const large = document.createElement("canvas");
        large.width = canvas.width * 4;
        large.height = canvas.height * 4;
        const largeContext = large.getContext("2d");
        largeContext.imageSmoothingEnabled = false;
        largeContext.drawImage(canvas, 0, 0, large.width, large.height);
        large.toBlob((blob) => {
          if (!blob) return showToast("The drawing could not be exported.");
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "lumen-paint-" + new Date().toISOString().slice(0, 10) + ".png";
          document.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        }, "image/png");
      });
      return (flush = true) => { const dirty = last || saveTimer !== null; last = null; cancelAnimationFrame(sprayFrame); clearTimeout(saveTimer); if (flush && dirty) { data.paintImage = canvas.toDataURL("image/png"); savePaint(data.paintImage); } };
    },
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "icons/calendar.png?v=65c80a1be7",
    size: [300, 380],
    html() {
      return '<div class="cal"><div class="cal__head"><button type="button" class="btn cal__step" data-cal-step="-1" aria-label="Previous month">◀</button><strong class="cal__title" data-cal-title aria-live="polite"></strong><button type="button" class="btn cal__step" data-cal-step="1" aria-label="Next month">▶</button><button type="button" class="btn" data-cal-today>Today</button></div><div class="cal__grid" data-cal-grid></div><h3 class="section-title" data-cal-selected></h3><ul class="cal__events" data-cal-events></ul><form class="checklist-entry" data-cal-form><input class="field" type="text" maxlength="160" placeholder="Add an event" aria-label="New event" data-cal-input required><button type="submit" class="btn">Add</button></form></div>';
    },
    bind(root) {
      const localDate = (date) => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
      let today = localDate(new Date());
      let year = new Date().getFullYear();
      let month = new Date().getMonth();
      let selected = today;
      const grid = root.querySelector("[data-cal-grid]");
      const list = root.querySelector("[data-cal-events]");
      const input = root.querySelector("[data-cal-input]");
      const render = () => {
        today = localDate(new Date());
        const busy = new Set(data.events.map((event) => event.date));
        writeText(root.querySelector("[data-cal-title]"), monthTitleFormat.format(new Date(year, month, 1)));
        grid.innerHTML = ["S", "M", "T", "W", "T", "F", "S"].map((day) => '<span class="cal__weekday" aria-hidden="true">' + day + "</span>").join("") + monthGrid(year, month).map((cell) => '<button type="button" class="cal__day' + (cell.inMonth ? "" : " out") + (cell.date === today ? " today" : "") + (cell.date === selected ? " selected" : "") + (busy.has(cell.date) ? " busy" : "") + '" data-cal-date="' + cell.date + '" aria-pressed="' + (cell.date === selected) + '" aria-label="' + escapeHtml(fullDateFormat.format(new Date(cell.date + "T12:00"))) + (busy.has(cell.date) ? ", has events" : "") + '">' + cell.day + "</button>").join("");
        const focusDay = grid.querySelector('[data-cal-date="' + selected + '"]') || grid.querySelector(".cal__day:not(.out)"); grid.querySelectorAll("[data-cal-date]").forEach((day) => { day.tabIndex = day === focusDay ? 0 : -1; if (day.dataset.calDate === today) day.setAttribute("aria-current", "date"); }); writeText(root.querySelector("[data-cal-selected]"), dayHeadingFormat.format(new Date(selected + "T12:00")));
        const events = data.events.filter((event) => event.date === selected);
        list.innerHTML = events.length ? events.map((event) => '<li class="checklist-item"><span>' + escapeHtml(event.text) + '</span><button type="button" class="btn" data-cal-delete="' + escapeHtml(event.id) + '" aria-label="Delete ' + escapeHtml(event.text) + '">Delete</button></li>').join("") : '<li class="hint">Nothing planned.</li>';
      };
      root.querySelectorAll("[data-cal-step]").forEach((button) => button.addEventListener("click", () => {
        month += Number(button.dataset.calStep);
        year += Math.floor(month / 12);
        month = (month + 12) % 12;
        render();
      }));
      root.querySelector("[data-cal-today]").addEventListener("click", () => {
        year = new Date().getFullYear();
        month = new Date().getMonth();
        selected = localDate(new Date());
        render();
      });
      grid.addEventListener("click", (event) => {
        const day = event.target.closest("[data-cal-date]");
        if (!day) return;
        selected = day.dataset.calDate;
        const picked = new Date(selected + "T12:00");
        year = picked.getFullYear();
        month = picked.getMonth();
        render();
        input.focus();
      });
      grid.addEventListener("keydown", (event) => { const day = event.target.closest("[data-cal-date]"); if (!day || event.altKey || event.ctrlKey || event.metaKey) return; const picked = new Date(day.dataset.calDate + "T12:00"); const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -picked.getDay(), End: 6 - picked.getDay() }; if (Object.hasOwn(offsets, event.key)) picked.setDate(picked.getDate() + offsets[event.key]); else if (event.key === "PageUp" || event.key === "PageDown") { const date = picked.getDate(); picked.setDate(1); picked.setMonth(picked.getMonth() + (event.key === "PageUp" ? -1 : 1)); picked.setDate(Math.min(date, new Date(picked.getFullYear(), picked.getMonth() + 1, 0).getDate())); } else return; event.preventDefault(); event.stopPropagation(); selected = localDate(picked); year = picked.getFullYear(); month = picked.getMonth(); render(); grid.querySelector('[data-cal-date="' + selected + '"]')?.focus(); });
      root.querySelector("[data-cal-form]").addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        data.events.push({ id: makeId(), date: selected, text: text.slice(0, 160) });
        data.events.sort((a, b) => a.date.localeCompare(b.date));
        input.value = "";
        persistData();
        render();
      });
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-cal-delete]");
        if (!button) return;
        data.events = data.events.filter((item) => item.id !== button.dataset.calDelete);
        persistData();
        render();
      });
      render();
    },
  },
  {
    id: "terminal",
    name: "Command Prompt",
    icon: "icons/terminal.png?v=65c80a1be7",
    size: [500, 300],
    html() {
      return '<div class="cmd" data-cmd><pre class="cmd__log" data-cmd-log aria-live="polite"></pre><form class="cmd__line" data-cmd-form><label class="cmd__prompt" for="cmdInput">C:\\LUMEN&gt;</label><input id="cmdInput" class="cmd__input" type="text" autocomplete="off" spellcheck="false" data-cmd-input data-autofocus></form></div>';
    },
    bind(root) {
      const log = root.querySelector("[data-cmd-log]");
      const input = root.querySelector("[data-cmd-input]");
      const history = [];
      let cursor = 0;
      const print = (text) => {
        log.textContent += text + "\n";
        log.scrollTop = log.scrollHeight;
      };
      const findApp = (name) => apps.find((app) => app.id === name.toLowerCase() || app.name.toLowerCase() === name.toLowerCase());
      const commands = {
        help: () => "apps            list programs\nopen <app>      start a program\ncalc <sum>      do arithmetic\ntask <text>     add to Checklist\ntasks           show Checklist\nnote <text>     append a line to Notes\ndate            show the date and time\necho <text>     repeat text\ncls             clear the screen\nver             show the version\nexit            close this window",
        apps: () => apps.map((app) => app.id.padEnd(14) + app.name).join("\n"),
        open: (args) => {
          const app = findApp(args);
          if (!app) return "No program named " + args + ". Type apps to list them.";
          openApp(app.id);
          return "Starting " + app.name + "...";
        },
        calc: (args) => {
          const result = calculateExpression(args);
          return result.ok ? String(result.value) : result.error;
        },
        task: (args) => {
          if (!args) return "Usage: task <text>";
          data.tasks.unshift({ id: makeId(), text: args.slice(0, 160), done: false, createdAt: new Date().toISOString() });
          persistData();
          return "Added to Checklist.";
        },
        tasks: () => data.tasks.length ? data.tasks.map((task) => (task.done ? "[x] " : "[ ] ") + task.text).join("\n") : "No tasks.",
        note: (args) => {
          if (!args) return "Usage: note <text>";
          if (open.has("notes")) return "Close Notes first so its open edits are not overwritten.";
          data.notes = (data.notes ? data.notes.replace(/\n*$/, "\n") : "") + args;
          persistData();
          return "Appended to Notes.";
        },
        date: () => new Date().toString(),
        echo: (args) => args,
        ver: () => "LUMEN [Version 1.04]",
        cls: () => {
          log.textContent = "";
          return null;
        },
        exit: () => {
          closeApp("terminal");
          return null;
        },
      };
      root.querySelector("[data-cmd-form]").addEventListener("submit", (event) => {
        event.preventDefault();
        const line = input.value.trim();
        input.value = "";
        print("C:\\LUMEN>" + line);
        if (!line) return;
        history.push(line);
        cursor = history.length;
        const [name, ...rest] = line.split(/\s+/);
        const command = Object.hasOwn(commands, name.toLowerCase()) ? commands[name.toLowerCase()] : null;
        const output = command ? command(rest.join(" ")) : "'" + name + "' is not recognized as a command. Type help.";
        if (output !== null) print(output);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" && cursor > 0) {
          event.preventDefault();
          cursor -= 1;
          input.value = history[cursor];
        } else if (event.key === "ArrowDown" && history.length) {
          event.preventDefault();
          cursor = Math.min(history.length, cursor + 1);
          input.value = history[cursor] || "";
        }
      });
      root.querySelector("[data-cmd]").addEventListener("click", () => {
        if (!window.getSelection()?.toString()) input.focus();
      });
      print("LUMEN [Version 1.04]\nCopyright 1987 Lumen Systems. Type help for commands.\n");
    },
  },
  {
    id: "petrock",
    name: "Pet Rock",
    icon: "icons/pet-rock.png?v=65c80a1be7",
    html() {
      return '<div class="toy"><img class="toy__art" src="icons/pet-rock-art.png?v=e8e02ecb64" alt="Your pet rock" width="96" height="96"><p class="toy__line" data-rock-mood aria-live="polite">Your rock is resting.</p><button type="button" class="btn primary" data-rock-pet>Pet the rock</button><p class="hint hint--flush" data-rock-count></p></div>';
    },
    bind(root) {
      const mood = root.querySelector("[data-rock-mood]");
      const count = root.querySelector("[data-rock-count]");
      const moods = ["The rock remains a rock.", "The rock appreciates you, probably.", "The rock is unmoved.", "The rock has achieved inner peace.", "The rock did not notice.", "The rock is thinking about geology."];
      const render = () => {
        count.textContent = data.rockPets === 1 ? "Petted once." : "Petted " + data.rockPets + " times.";
      };
      root.querySelector("[data-rock-pet]").addEventListener("click", () => {
        data.rockPets += 1;
        persistData();
        mood.textContent = data.rockPets % 100 === 0 ? "The rock has chosen you." : moods[data.rockPets % moods.length];
        render();
      });
      render();
    },
  },
  {
    id: "fortune",
    name: "Fortune",
    icon: "icons/fortune.png?v=65c80a1be7",
    html() {
      return '<div class="toy"><p class="toy__slip" data-fortune aria-live="polite"></p><button type="button" class="btn primary" data-fortune-next>Crack another cookie</button></div>';
    },
    bind(root) {
      const slip = root.querySelector("[data-fortune]");
      const fortunes = ["You will close this window soon.", "A bug you fixed last week has quietly returned.", "Your next commit message will be fix.", "Someone nearby is also pretending to work.", "The cache was the problem all along.", "You will find it in the last place you look.", "Today is a good day to restart something.", "Your rock misses you.", "A meeting will be scheduled to plan a meeting.", "Lucky numbers: 0, 1, and undefined."];
      const next = () => {
        slip.textContent = fortunes[Math.floor(Math.random() * fortunes.length)];
      };
      root.querySelector("[data-fortune-next]").addEventListener("click", next);
      next();
    },
  },
  {
    id: "coinflip",
    name: "Coin Flip",
    icon: "icons/coin.png?v=65c80a1be7",
    html() {
      return '<div class="toy"><div class="coin-stage"><div class="coin" data-coin><img class="coin__face" src="icons/coin-heads.png?v=634e3d3375" alt="" width="64" height="64"><img class="coin__face coin__face--tails" src="icons/coin-tails.png?v=634e3d3375" alt="" width="64" height="64"></div><span class="coin-shadow" data-coin-shadow></span></div><output class="toy__line" data-coin-result aria-live="polite">Ready to flip.</output><button type="button" class="btn primary" data-coin-flip>Flip the coin</button><p class="hint hint--flush" data-coin-tally>No flips yet.</p></div>';
    },
    bind(root) {
      const coin = root.querySelector("[data-coin]");
      const shadow = root.querySelector("[data-coin-shadow]");
      const result = root.querySelector("[data-coin-result]");
      const tally = root.querySelector("[data-coin-tally]");
      const button = root.querySelector("[data-coin-flip]");
      const counts = { Heads: 0, Tails: 0 };
      let angle = 0;
      button.addEventListener("click", () => {
        button.disabled = true;
        const side = Math.random() < 0.5 ? "Heads" : "Tails";
        const start = angle;
        angle = (Math.floor(start / 360) + 5 + Math.floor(Math.random() * 3)) * 360 + (side === "Tails" ? 180 : 0);
        const middle = start + (angle - start) / 2;
        const land = () => {
          coin.style.transform = "rotateX(" + angle + "deg)";
          counts[side] += 1;
          writeText(result, side + "!");
          writeText(tally, counts.Heads + " heads · " + counts.Tails + " tails");
          button.disabled = false;
          playSound("thud");
        };
        writeText(result, "Flipping...");
        playSound("flip");
        if (reducedMotion.matches) return land();
        const timing = { duration: 1150, fill: "forwards" };
        const toss = coin.animate([
          { transform: "translateY(0) rotateX(" + start + "deg)", easing: "cubic-bezier(0.2, 0.6, 0.4, 1)" },
          { transform: "translateY(-104px) rotateX(" + middle + "deg)", offset: 0.45, easing: "cubic-bezier(0.6, 0, 0.8, 0.4)" },
          { transform: "translateY(0) rotateX(" + angle + "deg)", offset: 0.84, easing: "ease-out" },
          { transform: "translateY(-10px) rotateX(" + angle + "deg)", offset: 0.92, easing: "ease-in" },
          { transform: "translateY(0) rotateX(" + angle + "deg)" },
        ], timing);
        shadow.animate([
          { transform: "scaleX(1)", opacity: 0.35 },
          { transform: "scaleX(0.45)", opacity: 0.12, offset: 0.45 },
          { transform: "scaleX(1)", opacity: 0.35, offset: 0.84 },
          { transform: "scaleX(0.85)", opacity: 0.3, offset: 0.92 },
          { transform: "scaleX(1)", opacity: 0.35 },
        ], timing).finished.then((animation) => animation.cancel(), () => {});
        toss.finished.then(() => {
          land();
          toss.cancel();
        }, land);
      });
    },
  },
  {
    id: "busywork",
    name: "Busy Work",
    icon: "icons/busy.png?v=65c80a1be7",
    html() {
      return '<p class="hint" data-busy-task aria-live="polite">Ready to look busy.</p><div class="busy-bar" role="progressbar" aria-label="Busy work progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-busy-bar><span></span></div><div class="row row--actions"><button type="button" class="btn primary" data-busy-start>Look busy</button><button type="button" class="btn" data-busy-stop disabled>Stop</button></div>';
    },
    bind(root) {
      const task = root.querySelector("[data-busy-task]");
      const bar = root.querySelector("[data-busy-bar]");
      const start = root.querySelector("[data-busy-start]");
      const stop = root.querySelector("[data-busy-stop]");
      const jobs = ["Reticulating splines", "Defragmenting the desk", "Polishing pixels", "Counting to infinity", "Reindexing the rock", "Warming up the vacuum tubes", "Aligning the scanlines", "Degaussing the monitor"];
      let progress = 0;
      let job = 0;
      let busy = null;
      const paint = () => {
        bar.firstElementChild.style.width = progress + "%";
        bar.setAttribute("aria-valuenow", String(progress));
        task.textContent = busy ? jobs[job % jobs.length] + "... " + progress + "%" : "Ready to look busy.";
      };
      const halt = () => {
        clearInterval(busy);
        busy = null;
        start.disabled = false;
        stop.disabled = true;
        paint();
      };
      start.addEventListener("click", () => {
        start.disabled = true;
        stop.disabled = false;
        busy = setInterval(() => {
          if (!root.isConnected) return halt();
          progress = progress >= 99 ? 0 : Math.min(99, progress + Math.ceil(Math.random() * 9));
          if (progress === 0) job += 1;
          paint();
        }, 420);
        paint();
      });
      stop.addEventListener("click", halt);
      return () => clearInterval(busy);
    },
  },
  {
    id: "charmap",
    name: "Character Map",
    icon: "icons/charmap.png?v=65c80a1be7",
    size: [430, 312],
    html() {
      return '<div class="charmap"><label class="form-label charmap__set">Character set<select class="field" data-charmap-set><option value="symbols">Symbols</option><option value="arrows">Arrows</option><option value="math">Math</option><option value="currency">Currency</option><option value="box">Box drawing</option><option value="accents">Accents</option><option value="greek">Greek</option></select></label><div class="charmap__body"><div class="charmap__grid" data-charmap-grid aria-label="Characters"></div><div class="charmap__side"><div class="charmap__zoom" data-charmap-zoom aria-live="polite"></div><span class="hint hint--flush" data-charmap-code></span></div></div><div class="row"><input class="field charmap__text" data-charmap-text aria-label="Characters to copy" placeholder="Click characters to collect them"><button type="button" class="btn" data-charmap-clear>Clear</button><button type="button" class="btn primary" data-charmap-copy>Copy</button></div></div>';
    },
    bind(root) {
      const sets = { symbols: "§¶†‡•…‰′″‹›«»©®™°±·¿¡♠♣♥♦♪♫☺☻☼★☆✓✗※", arrows: "←↑→↓↔↕↖↗↘↙⇐⇑⇒⇓⇔↩↪↺↻⇄⇅➔➜▲▼◀▶△▽◁▷", math: "±×÷√∛∞≈≠≡≤≥∑∏∫∂∆∇∈∉∩∪⊂⊃∧∨¬∀∃∅πµ½⅓¼¾²³", currency: "$¢£¤¥€₹₽₩₪₫₱₿ƒ₴₺", box: "─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬░▒▓█▄▀▌▐■□▪▫", accents: "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ", greek: "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω" };
      const pick = root.querySelector("[data-charmap-set]");
      const grid = root.querySelector("[data-charmap-grid]");
      const zoom = root.querySelector("[data-charmap-zoom]");
      const code = root.querySelector("[data-charmap-code]");
      const text = root.querySelector("[data-charmap-text]");
      const show = (char) => { zoom.textContent = char; code.textContent = "U+" + char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"); };
      const render = () => { const chars = [...sets[pick.value]]; grid.innerHTML = chars.map((char) => '<button type="button" class="charmap__cell" data-char="' + escapeHtml(char) + '">' + escapeHtml(char) + "</button>").join(""); show(chars[0]); };
      pick.addEventListener("change", render);
      grid.addEventListener("focusin", (event) => { if (event.target.dataset.char) show(event.target.dataset.char); });
      grid.addEventListener("click", (event) => { const cell = event.target.closest("[data-char]"); if (!cell) return; text.value += cell.dataset.char; show(cell.dataset.char); });
      root.querySelector("[data-charmap-clear]").addEventListener("click", () => { text.value = ""; });
      root.querySelector("[data-charmap-copy]").addEventListener("click", async () => { if (!text.value) return showToast("Pick some characters first."); try { await navigator.clipboard.writeText(text.value); showToast("Copied " + text.value + " to the clipboard."); } catch { text.select(); showToast("Press Ctrl+C to copy the selection."); } });
      render();
    },
  },
  {
    id: "settings",
    name: "Settings",
    icon: "icons/help.png?v=aa753d325e",
    html() {
      const darkSelected = data.theme === "dark" ? " selected" : "";
      const lightSelected = data.theme === "light" ? " selected" : "";
      const fullEffectsSelected = data.effects === "full" ? " selected" : "";
      const subtleEffectsSelected = data.effects === "subtle" ? " selected" : "";
      const offEffectsSelected = data.effects === "off" ? " selected" : "";
      const gridEffectsSelected = data.effects === "grid" ? " selected" : "";
      const classicWallpaperSelected = data.wallpaper === "classic" ? " selected" : "";
      const midnightWallpaperSelected = data.wallpaper === "midnight" ? " selected" : "";
      const auroraWallpaperSelected = data.wallpaper === "aurora" ? " selected" : "";
      const graphiteWallpaperSelected = data.wallpaper === "graphite" ? " selected" : "";
      return '<form data-settings-form><div class="settings-grid"><label class="form-label">Focus length<input class="field" id="focusMinutes" type="number" min="1" max="180" step="1" value="' + data.focusMin + '" required></label><label class="form-label">Break length<input class="field" id="breakMinutes" type="number" min="1" max="60" step="1" value="' + data.breakMin + '" required></label><label class="form-label">Color scheme<select class="field" id="themeChoice"><option value="dark"' + darkSelected + '>Luna Blue</option><option value="light"' + lightSelected + '>Silver</option></select></label><label class="form-label">Screen effects<select class="field" id="effectsChoice"><option value="full"' + fullEffectsSelected + '>Realistic CRT</option><option value="subtle"' + subtleEffectsSelected + '>Subtle scanlines</option><option value="grid"' + gridEffectsSelected + '>Gridlines</option><option value="off"' + offEffectsSelected + '>Off</option></select></label><label class="form-label">System sounds<select class="field" id="soundsChoice"><option value="on"' + (data.sounds ? " selected" : "") + '>On</option><option value="off"' + (data.sounds ? "" : " selected") + '>Off</option></select></label><label class="form-label">Screensaver<select class="field" id="saverChoice"><option value="on"' + (data.screensaver ? " selected" : "") + '>After 3 minutes</option><option value="off"' + (data.screensaver ? "" : " selected") + '>Off</option></select></label><label class="form-label">Desk background<select class="field" id="wallpaperChoice"><option value="classic"' + classicWallpaperSelected + '>Classic LUMEN</option><option value="midnight"' + midnightWallpaperSelected + '>Midnight Grid</option><option value="aurora"' + auroraWallpaperSelected + '>Aurora Dust</option><option value="graphite"' + graphiteWallpaperSelected + '>Graphite Desk</option></select></label><label class="form-label">Taskbar clock<select class="field" id="clockChoice"><option value="12">12-hour</option><option value="24">24-hour</option></select></label><label class="form-label">Brightness<input class="knob" id="brightnessKnob" type="range" min="70" max="130" step="5" value="' + data.brightness + '"></label><label class="form-label">Contrast<input class="knob" id="contrastKnob" type="range" min="70" max="140" step="5" value="' + data.contrast + '"></label></div><div class="row row--actions"><button type="submit" class="btn primary">Apply</button><span class="hint hint--flush" data-settings-status aria-live="polite"></span></div></form><hr class="separator"><h3 class="section-title">Backup and Restore</h3><p class="hint">Export your desk to a JSON file or restore a previous export.</p><div class="row"><button type="button" class="btn" data-export-backup>Export backup...</button><button type="button" class="btn" data-import-backup>Import backup...</button><input class="sr-only" type="file" accept="application/json,.json" data-import-file></div><h3 class="section-title">Install LUMEN</h3><button type="button" class="btn" data-install-app><span data-install-label>Install...</span></button><hr class="separator"><h3 class="section-title">Reset</h3><button type="button" class="btn danger" data-clear-data>Clear all data...</button>';
    },
    bind(root) {
      const form = root.querySelector("[data-settings-form]");
      const status = root.querySelector("[data-settings-status]");
      const fileInput = root.querySelector("[data-import-file]");
      root.querySelector("#clockChoice").value = data.clock24 ? "24" : "12";
      form.addEventListener("input", (event) => { if (!event.target.matches(".knob")) return; data.brightness = clampNumber(root.querySelector("#brightnessKnob").value, 70, 130, 100); data.contrast = clampNumber(root.querySelector("#contrastKnob").value, 70, 140, 100); applyTheme(); persistData(); });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        data.focusMin = clampNumber(root.querySelector("#focusMinutes").value, 1, 180, data.focusMin);
        data.breakMin = clampNumber(root.querySelector("#breakMinutes").value, 1, 60, data.breakMin);
        data.theme = root.querySelector("#themeChoice").value;
        data.effects = root.querySelector("#effectsChoice").value;
        data.wallpaper = root.querySelector("#wallpaperChoice").value;
        data.sounds = root.querySelector("#soundsChoice").value === "on";
        data.screensaver = root.querySelector("#saverChoice").value === "on";
        data.clock24 = root.querySelector("#clockChoice").value === "24";
        persistData();
        applyTheme();
        resetTimer(timer.mode);
        writeText(document.querySelector("[data-clock-time]"), clockFormat.format(new Date()));
        status.textContent = "Settings saved.";
        showToast("Settings saved.");
      });
      root.querySelector("[data-export-backup]").addEventListener("click", exportBackup);
      root.querySelector("[data-import-backup]").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", async () => {
        await importBackup(fileInput.files?.[0]);
        fileInput.value = "";
      });
      root.querySelector("[data-clear-data]").addEventListener("click", clearAllData);
      root.querySelector("[data-install-app]").addEventListener("click", installApp);
      refreshInstallControls();
    },
  },
  {
    id: "files", name: "Files", icon: "icons/files.png", size: [560, 420], html: filesHtml, bind: bindFiles,
  },
  {
    id: "about",
    name: "About",
    icon: "icons/info.png?v=b8b38795ff",
    html() {
      return '<img class="about-art" src="icons/about-art.png?v=d39928dde5" alt="" width="192" height="96"><h2 class="about-title">LUMEN</h2><p>Notes, tasks, calculations, focus sessions, work logs, and a few gloriously pointless toys in one offline desk.</p><p class="hint">Data stays in this browser unless you export it.</p><h3 class="section-title">Shortcuts</h3><ul class="shortcut-list"><li><kbd>Alt</kbd> + <kbd>1</kbd> - Notes</li><li><kbd>Alt</kbd> + <kbd>2</kbd> - Checklist</li><li><kbd>Alt</kbd> + <kbd>3</kbd> - Calculator</li><li><kbd>Alt</kbd> + <kbd>4</kbd> - Focus</li><li><kbd>Alt</kbd> + <kbd>5</kbd> - Ship Log</li><li><kbd>Alt</kbd> + <kbd>6</kbd> - Files</li><li><kbd>Alt</kbd> + <kbd>7</kbd> - Settings</li><li><kbd>Alt</kbd> + <kbd>8</kbd> - About</li><li><kbd>Esc</kbd> - close active window</li><li>Drag across the desktop to select icons, then press <kbd>Enter</kbd> to open them all</li></ul>';
    },
    bind() {},
  },
];

const wins = document.getElementById("wins");
const tasks = document.getElementById("tasks");
const open = new Map();
const iconButtons = new Map();
if (timer.running) {
  if (timer.secondsLeft <= 0) updateTimer();
  else timer.intervalId = setInterval(updateTimer, TIMER_TICK_MS);
}
let activeId = null;
let z = 10;

function visibleWindowsByZ() {
  return Array.from(open.entries())
    .filter(([, entry]) => !entry.el.classList.contains("min"))
    .sort((a, b) => Number(b[1].el.style.zIndex) - Number(a[1].el.style.zIndex));
}

function onOwnAnimationEnd(element, callback) {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    element.removeEventListener("animationend", handleAnimationEnd);
    clearTimeout(fallback);
    callback();
  };
  const handleAnimationEnd = (event) => {
    if (event.target !== element) return;
    finish();
  };
  element.addEventListener("animationend", handleAnimationEnd);
  const fallback = window.setTimeout(finish, 500);
}

function zoomRects(from, to, done) {
  if (reducedMotion.matches) return void done?.();
  const surface = desk.getBoundingClientRect();
  const started = performance.now(); let lastStep = 0;
  const frames = [];
  const at = (start, end, step) => Math.round(start + (end - start) * step / 8);
  const draw = (step) => {
    const frame = frames.length < 3 ? document.createElement("div") : frames.shift();
    frame.className = "zoom-rect";
    frame.style.cssText = "left:" + at(from.left - surface.left, to.left - surface.left, step) + "px;top:" + at(from.top - surface.top, to.top - surface.top, step) + "px;width:" + at(from.width, to.width, step) + "px;height:" + at(from.height, to.height, step) + "px";
    desk.append(frame);
    frames.push(frame);
    frames.forEach((trail, index) => { trail.style.opacity = String((index + 1) / frames.length); });
  };
  const tick = (now) => { if (document.hidden || now - started >= 198) { frames.forEach((frame) => frame.remove()); done?.(); return; } const step = Math.min(8, Math.floor((now - started) / 22) + 1); if (step !== lastStep) { draw(step); lastStep = step; } requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}
function paintWindow(element, phase) {
  if (!element.classList.replace(phase, "painting")) return;
  element.querySelector("[data-autofocus]")?.focus({ preventScroll: true });
  onOwnAnimationEnd(element, () => element.classList.remove("painting"));
}
function launcherRect(id) {
  return (iconButtons.get(id) || startBtn).getBoundingClientRect();
}
function activateTopWindow() {
  const next = visibleWindowsByZ()[0];
  if (next) focusWin(next[0]);
}

function constrainWindow(node) {
  if (node.classList.contains("max")) return;
  const maximumLeft = Math.max(0, wins.clientWidth - node.offsetWidth);
  const maximumTop = Math.max(0, wins.clientHeight - node.offsetHeight);
  const currentLeft = node.offsetLeft;
  const currentTop = node.offsetTop;
  const left = Math.min(maximumLeft, Math.max(0, currentLeft));
  const top = Math.min(maximumTop, Math.max(0, currentTop));
  if (left !== currentLeft) node.style.left = left + "px";
  if (top !== currentTop) node.style.top = top + "px";
}

function toggleMaximize(id) {
  const entry = open.get(id);
  if (!entry) return;
  const from = entry.el.getBoundingClientRect();
  const maximized = entry.el.classList.toggle("max");
  const button = entry.el.querySelector("[data-max]");
  button?.setAttribute("aria-pressed", String(maximized));
  button?.setAttribute("aria-label", maximized ? "restore window" : "maximize window");
  if (!maximized) constrainWindow(entry.el);
  entry.el.classList.add("restoring");
  zoomRects(from, entry.el.getBoundingClientRect(), () => paintWindow(entry.el, "restoring"));
}

function minimizeApp(id) {
  const entry = open.get(id);
  if (!entry || entry.el.classList.contains("minimizing")) return;
  const from = entry.el.getBoundingClientRect();
  entry.el.classList.add("minimizing");
  playSound("minimize");
  zoomRects(from, entry.tab.getBoundingClientRect(), () => entry.el.classList.replace("minimizing", "min"));
  entry.el.classList.remove("focus");
  entry.tab.classList.remove("on");
  entry.tab.setAttribute("aria-selected", "false");
  if (activeId === id) {
    activeId = null;
    activateTopWindow();
  }
}

function restoreApp(id) {
  const entry = open.get(id);
  if (!entry?.el.classList.contains("min")) return false;
  const to = entry.el.getBoundingClientRect();
  entry.el.classList.replace("min", "restoring");
  playSound("restore");
  zoomRects(entry.tab.getBoundingClientRect(), to, () => paintWindow(entry.el, "restoring"));
  focusWin(id);
  if (id === "focus") paintTimer(entry.el.querySelector(".body"));
  return true;
}
function openApp(id, geometry) {
  const app = apps.find((candidate) => candidate.id === id);
  if (!app) return;
  setStartMenu(false);
  if (restoreApp(id)) return;
  if (open.has(id)) {
    const existing = open.get(id);
    existing.el.classList.remove("min");
    focusWin(id);
    if (id === "focus") paintTimer(existing.el.querySelector(".body"));
    return;
  }
  const element = document.createElement("section");
  const offset = (open.size % 8) * 24;
  element.className = "win focus opening";
  element.dataset.appId = id;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "false");
  element.setAttribute("aria-label", app.name);
  element.style.left = (window.innerWidth <= 640 ? 8 : icons.offsetLeft + icons.offsetWidth + 12) + offset + "px";
  element.style.top = (window.innerWidth <= 640 ? icons.offsetTop + icons.offsetHeight + 8 : 40) + offset + "px";
  element.style.zIndex = String(++z);
  if (app.size) element.style.cssText += "width:" + app.size[0] + "px;height:" + app.size[1] + "px";
  if (geometry) element.style.cssText += "left:" + geometry.left + "px;top:" + geometry.top + "px;width:" + geometry.width + "px;height:" + geometry.height + "px";
  element.innerHTML = '<header class="bar"><span class="bar-title"><img src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</span><div class="dots"><button type="button" class="m" data-min aria-label="minimize window"></button><button type="button" class="q" data-max aria-label="maximize window" aria-pressed="false"></button><button type="button" class="x" data-close aria-label="close window"></button></div></header><div class="body">' + app.html() + '</div><span class="win-grip" data-grip aria-hidden="true"></span>';
  wins.append(element);
  playSound("open");
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "task on opening";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", "true");
  tab.innerHTML = '<img src="' + app.icon + '" alt="">' + escapeHtml(app.name);
  tasks.append(tab);
  onOwnAnimationEnd(tab, () => tab.classList.remove("opening"));
  const entry = { el: element, tab, app, resizeObserver: null };
  open.set(id, entry);
  entry.cleanup = app.bind(element.querySelector(".body"));
  element.querySelector("[data-close]").addEventListener("click", () => closeApp(id));
  element.querySelector("[data-min]").addEventListener("click", () => minimizeApp(id));
  element.querySelector("[data-max]").addEventListener("click", () => toggleMaximize(id));
  element.querySelector(".bar").addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) toggleMaximize(id);
  });
  const openWindowMenu = (event) => {
    event.preventDefault();
    focusWin(id);
    showMenu(...toScene(event.clientX, event.clientY), windowMenu(id));
  };
  element.querySelector(".bar").addEventListener("contextmenu", openWindowMenu);
  tab.addEventListener("contextmenu", openWindowMenu);
  element.addEventListener("mousedown", () => focusWin(id));
  tab.addEventListener("click", () => {
    if (restoreApp(id)) return;
    focusWin(id);
  });
  drag(element);
  resizeGrip(element);
  if ("ResizeObserver" in window) {
    entry.resizeObserver = new ResizeObserver(() => constrainWindow(element));
    entry.resizeObserver.observe(element);
  }
  constrainWindow(element);
  zoomRects(launcherRect(id), element.getBoundingClientRect(), () => paintWindow(element, "opening"));
  focusWin(id);
}

function focusWin(id) {
  const selected = open.get(id);
  if (!selected) return;
  selected.el.classList.remove("min");
  activeId = id;
  open.forEach((entry, key) => {
    const active = key === id;
    entry.el.classList.toggle("focus", active);
    entry.tab.classList.toggle("on", active);
    entry.tab.setAttribute("aria-selected", String(active));
    if (active) entry.el.style.zIndex = String(++z);
  });
}

function closeApp(id) {
  const entry = open.get(id);
  if (!entry || entry.el.classList.contains("closing")) return;
  entry.cleanup?.(); entry.cleanup = null;
  entry.resizeObserver?.disconnect();
  entry.el.classList.remove("opening");
  const from = entry.el.getBoundingClientRect();
  entry.el.classList.add("closing");
  playSound("close");
  entry.tab.classList.add("closing");
  let finished = false;
  const finish = () => {
    if (finished || open.get(id) !== entry) return;
    finished = true;
    entry.el.remove();
    entry.tab.remove();
    open.delete(id);
    if (activeId === id) {
      activeId = null;
      activateTopWindow();
    }
  };
  zoomRects(from, launcherRect(id), finish);
}

function arrangeWindows(mode) {
  const list = Array.from(open.entries()).filter(([, entry]) => !entry.el.classList.contains("min") && !entry.el.classList.contains("minimizing")).sort((a, b) => Number(a[1].el.style.zIndex) - Number(b[1].el.style.zIndex));
  if (!list.length) return showToast("There are no open windows to arrange.");
  const area = wins.getBoundingClientRect();
  const columns = Math.ceil(Math.sqrt(list.length));
  const rows = Math.ceil(list.length / columns);
  list.forEach(([id, entry], index) => {
    const from = entry.el.getBoundingClientRect();
    entry.el.classList.remove("max");
    entry.el.querySelector("[data-max]")?.setAttribute("aria-pressed", "false");
    const step = index * 24;
    const size = apps.find((app) => app.id === id)?.size || [420, 320];
    const box = mode === "cascade" ? [12 + step, 12 + step, Math.min(size[0], Math.floor(area.width) - 24 - step), Math.min(size[1], Math.floor(area.height) - 24 - step)] : [Math.floor(index % columns * area.width / columns), Math.floor(Math.floor(index / columns) * area.height / rows), Math.floor(area.width / columns), Math.floor(area.height / rows)];
    entry.el.style.cssText += "left:" + box[0] + "px;top:" + box[1] + "px;width:" + Math.max(160, box[2]) + "px;height:" + Math.max(120, box[3]) + "px";
    entry.el.classList.add("restoring");
    zoomRects(from, entry.el.getBoundingClientRect(), () => paintWindow(entry.el, "restoring"));
    focusWin(id);
  });
  rememberWindows();
}
function arrangeMenu() {
  return [{ label: "Cascade windows", run: () => arrangeWindows("cascade") }, { label: "Tile windows", run: () => arrangeWindows("tile") }, { label: "Show the desktop", run: () => open.forEach((entry, id) => { if (!entry.el.classList.contains("min")) minimizeApp(id); }) }];
}
function closeAllWindows() {
  open.forEach((entry) => {
    entry.cleanup?.(false); entry.cleanup = null;
    entry.resizeObserver?.disconnect();
    entry.el.remove();
    entry.tab.remove();
  });
  open.clear();
  activeId = null;
}

function impact(node, speed, origin, horizontal) {
  if (speed < 0.15) return;
  const squash = Math.min(0.08, speed * 0.025);
  const scale = horizontal ? "scale(" + (1 - squash) + ", " + (1 + squash / 2) + ")" : "scale(" + (1 + squash / 2) + ", " + (1 - squash) + ")";
  node.animate([{ transformOrigin: origin, transform: scale }, { transformOrigin: origin, transform: "none" }], { duration: 170, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" });
  playSound("thud");
}
let flingCount = 0;
function flingWindow(node, velocityX, velocityY) {
  const token = String(++flingCount);
  const maximumLeft = Math.max(0, wins.clientWidth - node.offsetWidth);
  const maximumTop = Math.max(0, wins.clientHeight - node.offsetHeight);
  let x = node.offsetLeft;
  let y = node.offsetTop;
  let vx = Math.max(-6, Math.min(6, velocityX));
  let vy = Math.max(-6, Math.min(6, velocityY));
  let last = performance.now();
  node.dataset.flinging = token;
  desk.classList.add("moving");
  const step = (now) => {
    if (node.dataset.flinging !== token) return;
    if (!node.isConnected || node.classList.contains("max")) return desk.classList.remove("moving");
    const elapsed = Math.min(32, now - last);
    last = now;
    x += vx * elapsed;
    y += vy * elapsed;
    if (x < 0 || x > maximumLeft) {
      x = Math.max(0, Math.min(maximumLeft, x));
      impact(node, Math.abs(vx), x === 0 ? "left center" : "right center", true);
      vx = -vx * 0.78;
    }
    if (y < 0 || y > maximumTop) {
      y = Math.max(0, Math.min(maximumTop, y));
      impact(node, Math.abs(vy), y === 0 ? "center top" : "center bottom", false);
      vy = -vy * 0.78;
    }
    const friction = Math.pow(0.9982, elapsed);
    vx *= friction;
    vy *= friction;
    node.style.left = Math.round(x) + "px";
    node.style.top = Math.round(y) + "px";
    if (Math.hypot(vx, vy) > 0.025) requestAnimationFrame(step);
    else {
      delete node.dataset.flinging;
      desk.classList.remove("moving");
    }
  };
  requestAnimationFrame(step);
}
function resizeGrip(node) {
  const grip = node.querySelector("[data-grip]");
  grip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || node.classList.contains("max")) return;
    event.preventDefault();
    event.stopPropagation();
    focusWin(node.dataset.appId);
    const pointerId = event.pointerId;
    try { grip.setPointerCapture(pointerId); } catch { return; }
    const [startX, startY] = toScene(event.clientX, event.clientY);
    const startWidth = node.offsetWidth;
    const startHeight = node.offsetHeight;
    const style = getComputedStyle(node);
    const minimumWidth = parseInt(style.minWidth, 10) || 200;
    const minimumHeight = parseInt(style.minHeight, 10) || 150;
    const maximumWidth = wins.clientWidth - node.offsetLeft;
    const maximumHeight = wins.clientHeight - node.offsetTop;
    let width = startWidth;
    let height = startHeight;
    let frame = 0;
    desk.classList.add("moving");
    const apply = () => {
      frame = 0;
      node.style.width = width + "px";
      node.style.height = height + "px";
    };
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const [sceneX, sceneY] = toScene(moveEvent.clientX, moveEvent.clientY);
      width = Math.round(Math.max(minimumWidth, Math.min(maximumWidth, startWidth + sceneX - startX)));
      height = Math.round(Math.max(minimumHeight, Math.min(maximumHeight, startHeight + sceneY - startY)));
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const stop = (stopEvent) => {
      if (stopEvent.pointerId !== pointerId) return;
      cancelAnimationFrame(frame);
      apply();
      if (grip.hasPointerCapture(pointerId)) grip.releasePointerCapture(pointerId);
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", stop);
      grip.removeEventListener("pointercancel", stop);
      desk.classList.remove("moving");
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", stop);
    grip.addEventListener("pointercancel", stop);
  });
}
function drag(node) {
  const bar = node.querySelector(".bar");
  bar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button") || node.classList.contains("max")) return;
    event.preventDefault();
    focusWin(node.dataset.appId);
    delete node.dataset.flinging;
    const samples = [];
    const pointerId = event.pointerId;
    const [startX, startY] = toScene(event.clientX, event.clientY);
    const startLeft = node.offsetLeft;
    const startTop = node.offsetTop;
    const maximumLeft = Math.max(0, wins.clientWidth - node.offsetWidth);
    const maximumTop = Math.max(0, wins.clientHeight - node.offsetHeight);
    let pendingLeft = startLeft;
    let pendingTop = startTop;
    let dragFrame = 0;
    const applyDrag = () => {
      dragFrame = 0;
      node.style.left = pendingLeft + "px";
      node.style.top = pendingTop + "px";
    };
    try { bar.setPointerCapture(pointerId); } catch { return; }
    desk.classList.add("moving");
    document.body.classList.add("dragging");
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      samples.push([moveEvent.clientX, moveEvent.clientY, moveEvent.timeStamp]);
      if (samples.length > 6) samples.shift();
      const [sceneX, sceneY] = toScene(moveEvent.clientX, moveEvent.clientY);
      pendingLeft = Math.round(Math.min(maximumLeft, Math.max(0, startLeft + sceneX - startX)));
      pendingTop = Math.round(Math.min(maximumTop, Math.max(0, startTop + sceneY - startY)));
      if (!dragFrame) dragFrame = requestAnimationFrame(applyDrag);
    };
    const stop = (stopEvent) => {
      if (stopEvent.pointerId !== pointerId) return;
      cancelAnimationFrame(dragFrame);
      applyDrag();
      if (bar.hasPointerCapture(pointerId)) bar.releasePointerCapture(pointerId);
      document.body.classList.remove("dragging");
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", stop);
      bar.removeEventListener("pointercancel", stop);
      const recent = samples.filter((sample) => stopEvent.timeStamp - sample[2] < 120);
      const span = recent.length > 1 ? recent[recent.length - 1][2] - recent[0][2] : 0;
      const velocityX = span ? (recent[recent.length - 1][0] - recent[0][0]) / span : 0;
      const velocityY = span ? (recent[recent.length - 1][1] - recent[0][1]) / span : 0;
      if (Math.hypot(velocityX, velocityY) > 0.7 && !reducedMotion.matches) flingWindow(node, velocityX, velocityY);
      else constrainWindow(node);
      if (!node.dataset.flinging) desk.classList.remove("moving");
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
  });
}

window.addEventListener("resize", () => {
  open.forEach((entry) => constrainWindow(entry.el));
});

const icons = document.getElementById("icons");
const startBtn = document.getElementById("startBtn");
const startMenu = document.getElementById("startMenu");
const orderedApps = [...apps].sort((a, b) => { const ai = data.iconOrder.indexOf(a.id); const bi = data.iconOrder.indexOf(b.id); return (ai < 0 ? apps.length + apps.indexOf(a) : ai) - (bi < 0 ? apps.length + apps.indexOf(b) : bi); });

orderedApps.forEach((app) => {
  const button = document.createElement("button");
  button.type = "button";
  button.draggable = true;
  button.className = "icon";
  button.dataset.appId = app.id;
  button.setAttribute("aria-label", "Open " + app.name);
  button.addEventListener("dragstart", (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", app.id); });
  button.innerHTML = '<img class="desktop-icon" src="' + app.icon + '" alt=""><span>' + escapeHtml(app.name) + '</span>';
  button.addEventListener("click", () => {
    selectIcons(new Set([app.id]));
    openApp(app.id);
  });
  iconButtons.set(app.id, button);
  icons.append(button);
});
icons.addEventListener("dragover", (event) => { if (event.target.closest(".icon")) event.preventDefault(); });
icons.addEventListener("drop", (event) => { const dragged = event.dataTransfer.getData("text/plain"); const target = event.target.closest(".icon")?.dataset.appId; if (!dragged || !target || dragged === target || !iconButtons.has(dragged)) return; event.preventDefault(); icons.insertBefore(iconButtons.get(dragged), iconButtons.get(target)); data.iconOrder = Array.from(icons.querySelectorAll(".icon"), (button) => button.dataset.appId); persistData(); });

const desk = document.getElementById("desk");
const marquee = document.createElement("div");
marquee.className = "marquee hidden";
marquee.setAttribute("aria-hidden", "true");
desk.append(marquee);
function selectIcons(ids) {
  iconButtons.forEach((button, id) => button.classList.toggle("selected", ids.has(id)));
}
function selectedIconIds() {
  return Array.from(iconButtons).filter(([, button]) => button.classList.contains("selected")).map(([id]) => id);
}
desk.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || (event.target !== desk && event.target !== icons)) return;
  event.preventDefault();
  document.activeElement?.blur();
  selectIcons(new Set());
  const pointerId = event.pointerId;
  const [originX, originY] = toScene(event.clientX, event.clientY);
  const boxes = Array.from(iconButtons, ([id, button]) => [id, button.getBoundingClientRect()]);
  let pointerX = originX;
  let pointerY = originY;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const left = Math.min(originX, pointerX);
    const top = Math.min(originY, pointerY);
    const right = Math.max(originX, pointerX);
    const bottom = Math.max(originY, pointerY);
    marquee.style.cssText = "left:" + left + "px;top:" + top + "px;width:" + (right - left) + "px;height:" + (bottom - top) + "px";
    marquee.classList.remove("hidden");
    selectIcons(new Set(boxes.filter(([, box]) => box.right > left && box.left < right && box.bottom > top && box.top < bottom).map(([id]) => id)));
  };
  const move = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    [pointerX, pointerY] = toScene(moveEvent.clientX, moveEvent.clientY);
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const stop = (stopEvent) => {
    if (stopEvent.pointerId !== pointerId) return;
    cancelAnimationFrame(frame);
    marquee.classList.add("hidden");
    if (desk.hasPointerCapture(pointerId)) desk.releasePointerCapture(pointerId);
    desk.classList.remove("moving");
    desk.removeEventListener("pointermove", move);
    desk.removeEventListener("pointerup", stop);
    desk.removeEventListener("pointercancel", stop);
  };
  try { desk.setPointerCapture(pointerId); } catch { return; }
  desk.classList.add("moving");
  desk.addEventListener("pointermove", move);
  desk.addEventListener("pointerup", stop);
  desk.addEventListener("pointercancel", stop);
});
const sceneEvents = new WeakSet();
function retarget(event) {
  if (!event.isTrusted || sceneEvents.has(event)) return;
  const [x, y] = toScene(event.clientX, event.clientY);
  if (x === Math.round(event.clientX) && y === Math.round(event.clientY)) return;
  const target = document.elementFromPoint(x, y);
  if (!target || target === event.target || !desk.contains(target)) return;
  if (event.type !== "pointerdown") event.preventDefault();
  event.stopImmediatePropagation();
  if (event.type === "mousedown") {
    const focusable = target.closest("input, textarea, select, button, [tabindex]");
    if (focusable) focusable.focus({ preventScroll: true });
    if (focusable?.tagName === "SELECT") try { focusable.showPicker(); } catch {}
    else if (desk.contains(document.activeElement)) document.activeElement.blur();
  }
  const init = { bubbles: true, cancelable: true, composed: true, view: window, detail: event.detail, screenX: event.screenX, screenY: event.screenY, clientX: event.clientX, clientY: event.clientY, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey, button: event.button, buttons: event.buttons };
  const copy = event.type === "pointerdown" ? new PointerEvent(event.type, { ...init, pointerId: event.pointerId, pointerType: event.pointerType, isPrimary: event.isPrimary }) : new MouseEvent(event.type, init);
  sceneEvents.add(copy);
  target.dispatchEvent(copy);
}
["pointerdown", "mousedown", "click", "dblclick", "contextmenu"].forEach((type) => document.addEventListener(type, retarget, { capture: true }));
let sceneHover = null;
let hoverFrame = 0;
let hoverX = 0;
let hoverY = 0;
function updateSceneHover() {
  hoverFrame = 0;
  const [x, y] = toScene(hoverX, hoverY);
  const hit = document.elementFromPoint(x, y); const next = hit?.closest("button") || null;
  screenCursor.dataset.shape = hit?.closest("button:not(:disabled), a[href], select:not(:disabled), label") ? "pointing" : "pointer";
  if (next === sceneHover) return;
  sceneHover?.classList.remove("scene-hover");
  next?.classList.add("scene-hover");
  sceneHover = next;
}
document.addEventListener("pointermove", (event) => {
  hoverX = event.clientX;
  hoverY = event.clientY;
  if (!hoverFrame) hoverFrame = requestAnimationFrame(updateSceneHover);
}, { passive: true });
document.documentElement.addEventListener("pointerleave", () => {
  sceneHover?.classList.remove("scene-hover");
  sceneHover = null;
});
let scrollSettle = 0;
document.addEventListener("scroll", () => {
  if (!desk.classList.contains("moving")) desk.classList.add("moving");
  clearTimeout(scrollSettle);
  scrollSettle = window.setTimeout(() => {
    if (!document.body.classList.contains("dragging") && marquee.classList.contains("hidden") && !wins.querySelector("[data-flinging]")) desk.classList.remove("moving");
  }, 160);
}, { capture: true, passive: true });
const contextMenu = document.createElement("div");
contextMenu.className = "context-menu hidden";
contextMenu.setAttribute("role", "menu");
desk.append(contextMenu);
let menuItems = [];
let iconsByName = false;
function hideMenu() {
  contextMenu.classList.add("hidden");
  menuItems = [];
}
function showMenu(x, y, items) {
  menuItems = items;
  contextMenu.innerHTML = items.map((item, index) => item ? '<button type="button" role="menuitem" data-menu-index="' + index + '"' + (item.disabled ? " disabled" : "") + ">" + escapeHtml(item.label) + "</button>" : '<div class="menu-separator" role="separator"></div>').join("");
  contextMenu.classList.remove("hidden");
  contextMenu.style.left = Math.max(0, Math.min(Math.round(x), desk.clientWidth - contextMenu.offsetWidth - 2)) + "px";
  contextMenu.style.top = Math.max(0, Math.min(Math.round(y), desk.clientHeight - contextMenu.offsetHeight - 2)) + "px";
  contextMenu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
}
function windowMenu(id) {
  const maximized = open.get(id)?.el.classList.contains("max");
  return [{ label: "Restore", disabled: !maximized, run: () => toggleMaximize(id) }, { label: "Minimize", run: () => minimizeApp(id) }, { label: "Maximize", disabled: maximized, run: () => toggleMaximize(id) }, null, { label: "Close", run: () => closeApp(id) }];
}
function desktopMenu() {
  const effects = { full: "Realistic CRT", subtle: "Subtle scanlines", grid: "Gridlines", off: "Off" };
  const nextEffect = { full: "subtle", subtle: "grid", grid: "off", off: "full" }[data.effects];
  return [
    { label: iconsByName ? "Arrange icons by type" : "Arrange icons by name", run: () => {
      iconsByName = !iconsByName;
      const order = Array.from(iconButtons.values());
      if (iconsByName) order.sort((a, b) => a.textContent.localeCompare(b.textContent));
      order.forEach((button) => icons.append(button));
      data.iconOrder = Array.from(icons.querySelectorAll(".icon"), (button) => button.dataset.appId); persistData();
    } },
    { label: "Refresh", run: () => {
      icons.classList.remove("refreshing");
      void icons.offsetWidth;
      icons.classList.add("refreshing");
    } },
    null,
    { label: "New task", run: () => {
      openApp("checklist");
      open.get("checklist")?.el.querySelector("[data-task-input]")?.focus();
    } },
    { label: "New text file", run: () => { openApp("files"); open.get("files")?.el.querySelector("[data-files-new-text]")?.click(); } },
    { label: "New event today", run: () => openApp("calendar") },
    ...arrangeMenu(),
    null,
    null,
    { label: "Next screen effect: " + effects[nextEffect], run: () => {
      data.effects = nextEffect;
      persistData();
      applyTheme();
    } },
    { label: "Degauss", run: degauss },
    null,
    { label: "Properties", run: () => openApp("settings") },
  ];
}
contextMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-index]");
  if (!button) return;
  const item = menuItems[Number(button.dataset.menuIndex)];
  hideMenu();
  item?.run();
});
contextMenu.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const buttons = Array.from(contextMenu.querySelectorAll("button:not(:disabled)"));
  const index = buttons.indexOf(document.activeElement);
  buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".context-menu")) hideMenu();
});
desk.addEventListener("contextmenu", (event) => {
  const icon = event.target.closest(".icon");
  if (!icon && event.target !== desk && event.target !== icons) return;
  event.preventDefault();
  if (icon) {
    const id = Array.from(iconButtons).find(([, button]) => button === icon)?.[0];
    selectIcons(new Set([id]));
    return showMenu(...toScene(event.clientX, event.clientY), [{ label: "Open", run: () => openApp(id) }, null, { label: "Properties", run: () => openApp("settings") }]);
  }
  showMenu(...toScene(event.clientX, event.clientY), desktopMenu());
});
document.querySelector(".taskbar").addEventListener("contextmenu", (event) => { if (event.target.closest(".task, .start-wrap, .tray")) return; event.preventDefault(); showMenu(...toScene(event.clientX, event.clientY), arrangeMenu()); });
startMenu.innerHTML = '<div class="start-menu__banner"><img class="start-menu__avatar" src="icons/user-placeholder.png?v=3a2cefad8c" alt="" width="48" height="48"><div class="start-menu__who"><strong>LUMEN</strong><span>Builder Desk</span></div></div><label class="start-menu__search"><span class="sr-only">Search apps</span><input class="field" type="search" placeholder="Find an app" autocomplete="off" data-app-search></label><div class="start-menu__title">Programs</div>' + apps.map((app) => '<button type="button" role="menuitem" data-open-app="' + escapeHtml(app.id) + '"><img class="start-menu__glyph" src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</button>').join("") + '<div class="menu-separator" role="separator"></div><button type="button" role="menuitem" data-install-app><img class="start-menu__glyph" src="icons/info.png?v=b8b38795ff" alt=""><span data-install-label>Install LUMEN...</span></button>';
const startSearch = startMenu.querySelector("[data-app-search]");
function filterStartMenu(query) {
  const needle = query.trim().toLocaleLowerCase();
  startMenu.querySelectorAll("[data-open-app]").forEach((button) => button.classList.toggle("hidden", !button.textContent.toLocaleLowerCase().includes(needle)));
}
startSearch.addEventListener("input", () => filterStartMenu(startSearch.value));
startSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const firstMatch = startMenu.querySelector("[data-open-app]:not(.hidden)");
  if (!firstMatch) return;
  firstMatch.click();
});

function setStartMenu(show) {
  startMenu.classList.toggle("hidden", !show);
  startBtn.setAttribute("aria-expanded", String(show));
  if (show) {
    startSearch.value = "";
    filterStartMenu("");
    startSearch.focus();
  }
}

startBtn.addEventListener("click", () => setStartMenu(startMenu.classList.contains("hidden")));
startMenu.addEventListener("click", (event) => {
  const appButton = event.target.closest("[data-open-app]");
  if (appButton) {
    openApp(appButton.dataset.openApp);
    return;
  }
  if (event.target.closest("[data-install-app]")) {
    setStartMenu(false);
    installApp();
  }
});
document.addEventListener("mousedown", (event) => {
  if (!event.target.closest(".start-wrap")) setStartMenu(false);
});

const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiStep = 0;
function degauss() {
  if (desk.classList.contains("degauss") || reducedMotion.matches) return;
  desk.classList.add("degauss");
  primeAudio();
  playSound("degauss");
  window.setTimeout(() => desk.classList.remove("degauss"), 900);
}
document.addEventListener("keydown", (event) => {
  konamiStep = event.key === konami[konamiStep] ? konamiStep + 1 : event.key === konami[0] ? 1 : 0;
  if (konamiStep === konami.length) {
    konamiStep = 0;
    degauss();
  }
  if (event.key === "Enter" && !event.target.closest("input, textarea, select, button, a") && selectedIconIds().length) {
    event.preventDefault();
    selectedIconIds().forEach((id) => openApp(id));
    return;
  }
  if (event.key === "Escape") {
    if (!contextMenu.classList.contains("hidden")) {
      hideMenu();
      return;
    }
    selectIcons(new Set());
    if (!startMenu.classList.contains("hidden")) {
      setStartMenu(false);
      startBtn.focus();
    } else if (activeId) {
      closeApp(activeId);
    }
    return;
  }
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    const shortcuts = { "1": "notes", "2": "checklist", "3": "calculator", "4": "focus", "5": "shiplog", "6": "files", "7": "settings", "8": "about" };
    const appId = shortcuts[event.key];
    if (appId) {
      event.preventDefault();
      openApp(appId);
    }
  }
});

let deferredInstallPrompt = null;
function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function refreshInstallControls() {
  const installed = isInstalled();
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.disabled = installed;
    const label = button.querySelector("[data-install-label]");
    const text = installed ? "LUMEN is installed" : "Install LUMEN";
    if (label) label.textContent = text;
    else button.textContent = text;
  });
}
async function installApp() {
  if (isInstalled()) {
    showToast("LUMEN is already installed.");
    return;
  }
  if (!deferredInstallPrompt) {
    showToast("Use your browser's Install App or Add to Home Screen command.");
    return;
  }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  refreshInstallControls();
  if (choice.outcome === "accepted") showToast("LUMEN installation started.");
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallControls();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  refreshInstallControls();
  showToast("LUMEN was installed.");
});

function tickClock() {
  const now = new Date();
  const clock = document.querySelector("[data-clock-time]");
  const label = clockFormat.format(now);
  writeText(clock, label);
  clock.dateTime = now.toISOString().slice(0, 16);
  window.setTimeout(tickClock, 60000 - (now.getTime() % 60000) + 50);
}
tickClock();
document.getElementById("clock").addEventListener("click", () => openApp("calendar"));
window.addEventListener("beforeunload", persistData);
document.addEventListener("pointerdown", primeAudio);
document.addEventListener("pointerdown", () => Object.keys(sounds).forEach(loadSound), { once: true });

function bendScreen() {
  const lenses = document.querySelectorAll("[data-crt-lens]");
  const bends = document.querySelectorAll("[data-crt-bend]");
  if (!lenses.length) return;
  if (document.documentElement.dataset.effects !== "full") return;
  const strength = 0.028;
  const width = 160;
  const height = Math.max(1, Math.round(width * window.innerHeight / window.innerWidth));
  const scale = Math.ceil(2 * strength * Math.max(window.innerWidth, window.innerHeight));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x + 0.5) / width * 2 - 1;
      const ny = (y + 0.5) / height * 2 - 1;
      const pull = strength * (nx * nx + ny * ny) / scale / 2;
      const index = (y * width + x) * 4;
      image.data[index] = Math.round(255 * (0.5 + nx * pull * window.innerWidth));
      image.data[index + 1] = Math.round(255 * (0.5 + ny * pull * window.innerHeight));
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const map = canvas.toDataURL();
  lenses.forEach((lens) => lens.setAttribute("href", map));
  bends.forEach((bend) => bend.setAttribute("scale", String(scale)));
  lens = { strength, width: window.innerWidth, height: window.innerHeight };
}
let bendTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(bendTimer);
  bendTimer = window.setTimeout(bendScreen, 160);
});
function rememberWindows() {
  data.windows = Array.from(open.entries()).sort((a, b) => Number(a[1].el.style.zIndex) - Number(b[1].el.style.zIndex)).map(([id, entry]) => {
    const maximized = entry.el.classList.contains("max");
    return {
      id,
      left: parseInt(entry.el.style.left, 10) || 0,
      top: parseInt(entry.el.style.top, 10) || 0,
      width: maximized ? parseInt(entry.el.style.width, 10) || 420 : entry.el.offsetWidth,
      height: maximized ? parseInt(entry.el.style.height, 10) || 320 : entry.el.offsetHeight,
      minimized: entry.el.classList.contains("min") || entry.el.classList.contains("minimizing"),
      maximized,
    };
  });
  persistData();
}
function restoreWindows() {
  const saved = data.windows.filter((item) => apps.some((app) => app.id === item.id));
  saved.forEach((item) => {
    openApp(item.id, item);
    const entry = open.get(item.id);
    if (!entry) return;
    if (item.maximized) {
      entry.el.classList.add("max");
      entry.el.querySelector("[data-max]")?.setAttribute("aria-pressed", "true");
      entry.el.querySelector("[data-max]")?.setAttribute("aria-label", "restore window");
    }
    if (item.minimized) {
      entry.el.classList.add("min");
      entry.el.classList.remove("focus");
      entry.tab.classList.remove("on");
      entry.tab.setAttribute("aria-selected", "false");
    }
  });
  if (activeId && open.get(activeId)?.el.classList.contains("min")) {
    activeId = null;
    activateTopWindow();
  }
  return saved.length > 0;
}
window.addEventListener("pagehide", rememberWindows);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") rememberWindows();
});
async function boot() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const post = document.querySelector("[data-boot-post]");
  const print = (line) => {
    post.textContent += line + "\n";
  };
  print("LUMEN BIOS v1.04  Copyright 1987 Lumen Systems");
  print("");
  print("Main processor: Lumen 386 at 33 MHz");
  for (let memory = 0; memory <= 640; memory += 64) {
    post.textContent = post.textContent.replace(/Memory test: \d+K( OK)?\n$/, "") + "Memory test: " + memory + "K" + (memory === 640 ? " OK" : "") + "\n";
    await wait(28);
  }
  for (const line of ["Detecting floppy drive A: ... 1.44 MB", "Detecting hard disk C: ... LUMEN DESK", "Checking local storage ... private", "", "Starting LUMEN..."]) {
    print(line);
    await wait(90);
  }
  post.remove();
  document.querySelector("[data-boot-brand]").classList.remove("hidden");
  document.getElementById("desk").classList.remove("hidden");
  await wait(700);
  document.getElementById("boot").classList.add("fade");
  await wait(420);
  document.getElementById("boot").remove();
  const requestedApp = location.hash.slice(1) === "texttools" ? "notes" : location.hash.slice(1);
  const restored = restoreWindows();
  if (apps.some((app) => app.id === requestedApp)) openApp(requestedApp);
  else if (!restored) openApp("about");
  refreshInstallControls();
}
window.addEventListener("hashchange", () => {
  const requestedApp = location.hash.slice(1) === "texttools" ? "notes" : location.hash.slice(1);
  if (apps.some((app) => app.id === requestedApp)) openApp(requestedApp);
});
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch((error) => console.warn("Service worker registration failed:", error));
  });
}

const saver = document.createElement("div");
saver.className = "saver hidden";
saver.setAttribute("aria-hidden", "true");
saver.innerHTML = '<span class="saver__logo">LUMEN</span>';
desk.append(saver);
let lastActive = performance.now();
let saverFrame = 0;
function startSaver() {
  if (!data.screensaver || reducedMotion.matches || document.hidden || document.getElementById("boot")) return;
  const logo = saver.firstElementChild;
  saver.classList.remove("hidden");
  screenCursor.classList.add("hidden");
  const maximumX = Math.max(0, window.innerWidth - logo.offsetWidth);
  const maximumY = Math.max(0, window.innerHeight - logo.offsetHeight);
  let x = Math.round(maximumX / 3);
  let y = Math.round(maximumY / 4);
  let velocityX = 0.09;
  let velocityY = 0.07;
  let hue = 210;
  logo.style.transform = "translate(" + x + "px, " + y + "px)";
  let last = performance.now();
  const step = (now) => {
    const elapsed = Math.min(50, now - last);
    last = now;
    x += velocityX * elapsed;
    y += velocityY * elapsed;
    if (x <= 0 || x >= maximumX || y <= 0 || y >= maximumY) {
      if (x <= 0 || x >= maximumX) velocityX = -velocityX;
      if (y <= 0 || y >= maximumY) velocityY = -velocityY;
      x = Math.max(0, Math.min(maximumX, x));
      y = Math.max(0, Math.min(maximumY, y));
      hue = (hue + 67) % 360;
      logo.style.color = "hsl(" + hue + " 90% 62%)";
    }
    logo.style.transform = "translate(" + Math.round(x) + "px, " + Math.round(y) + "px)";
    saverFrame = requestAnimationFrame(step);
  };
  saverFrame = requestAnimationFrame(step);
}
function wake(event) {
  lastActive = performance.now();
  if (saver.classList.contains("hidden")) return;
  cancelAnimationFrame(saverFrame);
  saver.classList.add("hidden");
  if (event.type === "keydown" || event.type === "pointerdown") {
    event.preventDefault();
    event.stopPropagation();
  }
}
["pointermove", "pointerdown", "keydown", "wheel"].forEach((type) => document.addEventListener(type, wake, { capture: true }));
window.setInterval(() => {
  if (saver.classList.contains("hidden") && performance.now() - lastActive > 180000) startSaver();
}, 5000);
boot();
