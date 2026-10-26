import { makeDefaultData, cloneFiles, newFolderName, localDay, caretPosition, mineCustomField, eventOn, nextOccurrence, clampNumber, normalizeData, normalizeTags, extractNoteHeadings, noteReadingMinutes, noteStats, appendNoteRevision, restoreNoteRevision, validateLogEntry, filterLogs, restoreTimerState, appendCompletedSession, logsToCsv, calculateExpression, createMinefield, neighbors, revealArea, floodFill, linePoints, shapePoints, monthGrid, cursorSurfaceMatrix, smudgePixels } from "./data-core.mjs?v=e259d52e50";
import { runScript, display, suggest, compiledExpression } from "./lumen-script.mjs?v=0db2593a2d";
import { PixelScreen, parseColor, toHex } from "./lumen-screen.mjs?v=f58703268d";
import { bindScriptEditor } from "./script-editor.mjs?v=8fee3934bd";
import { characterSets, characterGroups, rememberCharacter } from "./character-map.mjs?v=569255b407";
import { createSystemFiles, resolveVirtualFile } from "./system-files.mjs?v=e9d1407102";
const sprites = await readSprites();
function sprite(name) { return sprites[name] || ""; }
async function readSprites() { const link = document.querySelector('link[href*="sprites.css"]'); const rule = () => [...document.styleSheets].find((sheet) => sheet.href?.includes("sprites.css"))?.cssRules[0]; if (!rule() && link) await new Promise((resolve) => { link.addEventListener("load", resolve, { once: true }); link.addEventListener("error", resolve, { once: true }); }); const urls = {}; const style = rule()?.style; if (style) for (const property of style) if (property.startsWith("--icon-")) urls[property.slice(7)] = style.getPropertyValue(property).trim().replace(/^url\("?|"?\)$/g, ""); return urls; }
document.querySelectorAll("img[data-icon]").forEach((image) => { image.src = sprite(image.dataset.icon); });

const KEY = "lumen-desk-v1";
const APP_TITLE = "LUMEN - Builder Desk";
const TIMER_TICK_MS = 1000;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const screenCursor = document.querySelector("[data-screen-cursor]");
let cursorFrame = 0;
let cursorX = -40;
let cursorY = -40;
function angleCursor(x, y) { const position = "translate3d(" + x + "px," + y + "px,0)"; if (!lens.strength || data.effects !== "full") { screenCursor.classList.toggle("hidden", x < 0 || y < lens.top || x >= innerWidth || y >= lens.top + lens.height); screenCursor.style.transform = position; return; } const [surfaceX, surfaceY] = toScene(x, y); screenCursor.classList.toggle("hidden", surfaceX < 0 || surfaceY < lens.top || surfaceX >= innerWidth || surfaceY >= lens.top + lens.height); const matrix = cursorSurfaceMatrix(x, y - lens.top, lens.width, lens.height, lens.strength); screenCursor.style.transform = position + " matrix(" + matrix.join(",") + ",0,0)"; }
document.addEventListener("pointermove", (event) => { if (data.cursorType !== "pixel") return; const x = Math.round(event.clientX); const y = Math.round(event.clientY); if (x === cursorX && y === cursorY) return; cursorX = x; cursorY = y; if (!cursorFrame) cursorFrame = requestAnimationFrame(() => { cursorFrame = 0; angleCursor(cursorX, cursorY); }); }, { passive: true });
document.documentElement.addEventListener("pointerleave", () => screenCursor.classList.add("hidden"));
let lens = { strength: 0, top: 0, width: 1, height: 1 };

function toScene(x, y) {
  if (!lens.strength || document.documentElement.dataset.effects !== "full") return [x, y];
  const nx = x / lens.width * 2 - 1;
  const ny = (y - lens.top) / lens.height * 2 - 1;
  const pull = lens.strength * (nx * nx + ny * ny) / 2;
  return [Math.round(x + nx * pull * lens.width), Math.round(y + ny * pull * lens.height)];
}
const fullDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const monthTitleFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayHeadingFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const logDateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const narrowDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
let clockFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

const htmlEscapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
function escapeHtml(value) {
  const text = String(value);
  return /[&<>"']/.test(text) ? text.replace(/[&<>"']/g, (character) => htmlEscapes[character]) : text;
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
    try { const raw = localStorage.getItem(KEY); if (raw) { localStorage.setItem(KEY + "-unreadable", raw); window.setTimeout(() => showToast("Saved data could not be read, so LUMEN started fresh. A copy was kept in this browser."), 2000); } } catch {} return {};
  }
}
let data = normalizeData(loadData(), makeId);
const syncSystemFiles = createSystemFiles(normalizeData);
const PAINT_KEY = KEY + "-paint";
const WALLPAPER_KEY = KEY + "-wallpaper";
function showCustomWallpaper() {
  let picture = "";
  try { picture = localStorage.getItem(WALLPAPER_KEY) || ""; } catch {}
  if (picture.startsWith("data:image/jpeg;base64,")) document.documentElement.style.setProperty("--custom-wall", "url(\"" + picture + "\")");
  else document.documentElement.style.removeProperty("--custom-wall");
  return Boolean(picture);
}
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
function showToast(message, undo) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  const title = document.createElement("strong");
  title.className = "toast__title";
  title.textContent = "LUMEN";
  const icon = document.createElement("img");
  icon.className = "toast__icon";
  icon.src = sprite("info");
  icon.alt = "";
  toast.replaceChildren(icon, title, message);
  if (undo) { const button = document.createElement("button"); button.type = "button"; button.className = "btn toast__undo"; button.textContent = "Undo"; button.addEventListener("click", (event) => { event.stopPropagation(); toast.classList.add("hidden"); undo(); }); toast.append(button); }
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), undo ? 6000 : Math.max(3200, String(message).length * 70));
}
function showWindowDialog({ title = "LUMEN", message, value, options, confirmLabel = "OK", danger = false, onDesk = false, suggestions = [], cancelLabel = "Cancel" } = {}) {
  return new Promise((resolve) => {
    const host = !onDesk && activeId && open.get(activeId) ? open.get(activeId).el : document.getElementById("desk");
    const previousFocus = document.activeElement;
    if (host.querySelector(".window-dialog")) return resolve(null);
    const overlay = document.createElement("div");
    overlay.className = "window-dialog";
    overlay.setAttribute("role", "presentation");
    const control = Array.isArray(options) ? '<select class="field" data-dialog-value>' + options.map((option) => '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '</option>').join("") + "</select>" : value !== undefined ? '<input class="field" data-dialog-value value="' + escapeHtml(value) + '"' + (suggestions.length ? ' list="windowDialogSuggestions" autocomplete="off"><datalist id="windowDialogSuggestions">' + suggestions.map((item) => '<option value="' + escapeHtml(item) + '">').join("") + "</datalist>" : ">") : "";
    overlay.innerHTML = '<form class="window-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="windowDialogTitle"><strong class="window-dialog__title" id="windowDialogTitle">' + escapeHtml(title) + '</strong><div class="window-dialog__content"><span>' + escapeHtml(message) + '</span>' + control + '<div class="window-dialog__actions"><button type="button" class="btn" data-dialog-cancel>' + escapeHtml(cancelLabel) + '</button><button type="submit" class="btn' + (danger ? " danger" : " primary") + '">' + escapeHtml(confirmLabel) + "</button></div></div></form>";
    const settle = (result) => { overlay.remove(); previousFocus?.focus({ preventScroll: true }); resolve(result); };
    host.append(overlay);
    overlay.querySelector("form").addEventListener("submit", (event) => { event.preventDefault(); settle(overlay.querySelector("[data-dialog-value]")?.value ?? true); });
    overlay.querySelector("[data-dialog-cancel]").addEventListener("click", () => settle(null));
    overlay.addEventListener("keydown", (event) => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); settle(null); } if (event.key === "Tab") { const controls = Array.from(overlay.querySelectorAll("input, select, button")); const index = controls.indexOf(document.activeElement); event.preventDefault(); controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length]?.focus(); } });
    (overlay.querySelector("[data-dialog-value]") || overlay.querySelector("button[type=submit]")).focus();
  });
}
let lastSaved = "", systemFileErrors = [];
let savingPaused = false; function persistData() { if (savingPaused) return false;
  try {
    const system = syncSystemFiles(data); systemFileErrors = system.errors;
    if (system.changed.length) queueMicrotask(() => { applyTheme(); layoutIcons(); renderPinned(); renderQuickLaunch(); paintVolume(); tickClock(); const label = open.get("focus")?.el.querySelector("[data-focus-label]"); if (label && system.changed.includes("focusLabel")) label.value = data.focusLabel; document.dispatchEvent(new CustomEvent("lumen-system-changed", { detail: system.changed })); });
    const serialized = JSON.stringify({ ...data, paintImage: "" });
    if (serialized !== lastSaved) localStorage.setItem(KEY, serialized);
    lastSaved = serialized; paintBin();
    return true;
  } catch {
    showToast("LUMEN could not save data in this browser.");
    return false;
  }
}
let binFull = null; function paintBin() { const full = data.recycle.length > 0; if (full === binFull) return; const image = document.querySelector('.icon[data-app-id="recycle"] .desktop-icon'); if (!image) return; binFull = full; image.src = sprite(full ? "recycle-bin-full" : "recycle-bin"); }
function readDisplayChoices(root) {
  data.fontSize = root.querySelector("#fontChoice").value;
  const iconSize = root.querySelector("#iconChoice").value;
  const iconSizeChanged = data.iconSize !== iconSize;
  data.iconSize = iconSize;
  data.wallpaperFit = root.querySelector("#fitChoice").value;
  data.cursorType = root.querySelector("#cursorChoice").value;
  data.deskColor = /^#[0-9a-f]{6}$/i.test(root.querySelector("#deskColor").value) ? root.querySelector("#deskColor").value : data.deskColor;
  data.showClock = root.querySelector("#clockShown").value === "on";
  data.showQuickLaunch = root.querySelector("#quickShown").value === "on";
  data.showIcons = root.querySelector("#iconsShown").value === "on"; data.autoHideTaskbar = root.querySelector("#autoHide").value === "on"; data.showTips = root.querySelector("#tipsShown").value === "on";
  data.dragContents = root.querySelector("#dragChoice").value === "on";
  data.transitions = root.querySelector("#motionChoice").value === "on";
  if (iconSizeChanged) requestAnimationFrame(layoutIcons);
}
function applyTheme() {
  document.documentElement.dataset.theme = data.theme;
  document.documentElement.dataset.effects = data.effects;
  const tone = "brightness(" + data.brightness / 100 + ") contrast(" + data.contrast / 100 + ")";
  document.documentElement.style.setProperty("--tube", "saturate(1.12) contrast(1.05) " + tone);
  document.documentElement.style.setProperty("--tone", tone === "brightness(1) contrast(1)" ? "none" : tone);
  bendScreen();
  document.documentElement.dataset.wallpaper = data.wallpaper;
  const cursorChanged = document.documentElement.dataset.cursor !== data.cursorType;
  document.documentElement.dataset.cursor = data.cursorType;
  document.documentElement.dataset.curvedCursor = data.cursorType === "pixel" ? "on" : "off";
  if (cursorChanged && data.cursorType === "pixel") angleCursor(cursorX, cursorY);
  Object.assign(document.documentElement.dataset, { fit: data.wallpaperFit, fontSize: data.fontSize, iconSize: data.iconSize, clock: data.showClock ? "on" : "off", transitions: data.transitions ? "on" : "off", quickLaunch: data.showQuickLaunch ? "on" : "off", icons: data.showIcons ? "on" : "off", autohide: data.autoHideTaskbar ? "on" : "off" });
  document.documentElement.style.setProperty("--desk-color", data.deskColor);
  clockFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: data.clock24 ? "h23" : "h12" });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = "#1d1d20";
}
persistData();
showCustomWallpaper();
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
  const logged = data.focusLabel.trim() && validateLogEntry({ hours: Math.max(0.25, Math.round(timerMinutes("focus") / 15) / 4), description: data.focusLabel, tags: "focus" });
  if (!logged?.ok) return null; const entry = { id: makeId(), ...logged.value, at: new Date().toISOString() }; data.logs.unshift(entry); document.dispatchEvent(new Event("lumen-logs-changed")); return entry;
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
function longBreakDue() {
  const today = new Date().toDateString();
  const done = data.sessions.filter((session) => new Date(session.at).toDateString() === today).length;
  return done > 0 && done % 4 === 0;
}
function timerMinutes(mode = timer.mode) {
  return mode === "break" ? (longBreakDue() ? data.longBreakMin : data.breakMin) : data.focusMin;
}
function timerLabel(mode = timer.mode) {
  return mode === "break" ? (longBreakDue() ? "Long break" : "Break") : "Focus";
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
    gain.gain.value = data.volume / 100;
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
  const tray = document.getElementById("trayTimer");
  const active = timer.running || (!timer.finished && timer.secondsLeft < timerMinutes() * 60);
  tray.classList.toggle("hidden", !active);
  if (active) writeAttribute(tray, "title", timerLabel() + ": " + formatTime(timer.secondsLeft) + (timer.running ? " left" : " left, paused"));
  const focusTab = open.get("focus")?.tab.lastChild;
  if (focusTab) writeText(focusTab, active ? "Focus " + formatTime(timer.secondsLeft) : "Focus");
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
  const logged = recordCompletedSession();
  saveTimerState();
  const message = timerLabel() + " timer finished.";
  document.title = "✓ " + message + " - LUMEN";
  paintTimer();
  renderSessionHistory();
  playSound("timer");
  if (logged) showToast(message + " Logged " + logged.h + "h to Ship Log.", () => { data.logs = data.logs.filter((item) => item.id !== logged.id); persistData(); document.dispatchEvent(new Event("lumen-logs-changed")); }); else showToast(message);
  if (activeId !== "focus") open.get("focus")?.tab.classList.add("flashing");
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    new Notification(message, {
      body: timer.mode === "focus" ? (longBreakDue() ? "Four sessions done. Take a long break." : "Time for a break.") : "Ready for another focus session?",
      icon: sprite("l"),
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
  writeText(element, stats.words + " words · " + stats.characters + " characters · " + stats.lines + " lines · ~" + noteReadingMinutes(notes) + " min read");
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
    return '<article class="log-item' + selectedClass + '"><div class="log-item__header"><label class="log-select"><input type="checkbox" data-log-select="' + escapeHtml(entry.id) + '"' + checked + '> Select</label><strong>' + escapeHtml(formatHours(entry.h)) + 'h</strong><small>' + escapeHtml(formatLogDate(entry.at)) + '</small></div>' + (metadata ? '<p class="log-meta">' + metadata + '</p>' : '') + '<p>' + escapeHtml(entry.text) + '</p><div class="row row--actions"><button type="button" class="btn" data-log-action="edit" data-log-id="' + escapeHtml(entry.id) + '">Edit</button><button type="button" class="btn" data-log-action="again" data-log-id="' + escapeHtml(entry.id) + '" title="Add this entry again for today">Log again</button><button type="button" class="btn danger" data-log-action="delete" data-log-id="' + escapeHtml(entry.id) + '">Delete</button></div></article>';
  }).join("") + (rows.length > logLimit ? '<button type="button" class="btn log-more" data-log-action="more">Show ' + Math.min(100, rows.length - logLimit) + " more of " + (rows.length - logLimit) + " remaining</button>" : "");
}
function totalLoggedHours() {
  return formatHours(data.logs.reduce((sum, entry) => sum + Number(entry.h || 0), 0));
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
function filesHtml() { return '<div class="files"><div class="files__toolbar"><button type="button" class="btn" data-files-new-folder>New folder</button><button type="button" class="btn" data-files-new-text>New text file</button><button type="button" class="btn" data-files-new-script>New script</button><button type="button" class="btn" data-files-import>Import...</button><input class="sr-only" type="file" multiple accept=".lsc,.txt,.md,.csv,.json,.log,.html,.css,.js,text/*" data-files-import-input><button type="button" class="btn" data-files-rename disabled>Rename</button><button type="button" class="btn" data-files-move disabled>Move...</button><button type="button" class="btn" data-files-copy disabled>Copy</button><button type="button" class="btn" data-files-paste disabled>Paste</button><button type="button" class="btn" data-files-duplicate disabled>Duplicate</button><button type="button" class="btn danger" data-files-delete disabled>Delete</button></div><div class="files__address"><button type="button" class="btn" data-files-up disabled>Up</button><span class="files__path" data-files-path>C:\\</span><select class="field files__sort" data-files-sort aria-label="Sort by"><option value="name">Name</option><option value="size">Size</option><option value="type">Type</option><option value="date">Date modified</option></select></div><div class="files__main"><ul class="files__list" data-files-list aria-label="Files"></ul><section class="files__editor"><header class="files__editor-head"><strong data-files-editor-name>Select a text file</strong><button type="button" class="btn" data-files-download disabled>Download</button></header><textarea class="field" data-files-content disabled aria-label="Text file contents"></textarea></section></div><span class="hint hint--flush" data-files-status aria-live="polite">Drop text files into this window to import them.</span></div>'; }
async function importTextFiles(list, parent = null) {
  const readable = Array.from(list || []).filter((file) => file.size <= 200000 && (file.type.startsWith("text/") || /\.(lsc|txt|md|csv|json|log|html|css|js)$/i.test(file.name))).slice(0, 50);
  for (const file of readable) data.files.push({ id: makeId(), kind: "text", name: file.name.replace(/[\\/]/g, "-").slice(0, 80), parent, content: (await file.text()).slice(0, 200000), modifiedAt: new Date(file.lastModified || Date.now()).toISOString() });
  if (readable.length) { persistData(); document.dispatchEvent(new Event("lumen-files-changed")); }
  return readable.length;
}
function bindFiles(root) {
  const list = root.querySelector("[data-files-list]");
  const content = root.querySelector("[data-files-content]");
  let editor = null;
  let current = null;
  let selected = null;
  let saveTimer = null;
  const selectedItem = () => data.files.find((item) => item.id === selected);
  const folderPath = () => { const names = []; const visited = new Set(); let id = current; while (id && !visited.has(id)) { visited.add(id); const folder = data.files.find((item) => item.id === id && item.kind === "folder"); if (!folder) break; names.unshift(folder.name); id = folder.parent; } return "C:\\" + names.join("\\"); };
  const render = (refreshList = true) => {
    const order = root.querySelector("[data-files-sort]").value;
    const extension = (name) => (name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
    const items = refreshList ? data.files.filter((item) => item.parent === current).sort((a, b) => a.kind !== b.kind ? (a.kind === "folder" ? -1 : 1) : order === "size" ? b.content.length - a.content.length || a.name.localeCompare(b.name) : order === "date" ? (b.modifiedAt || "").localeCompare(a.modifiedAt || "") || a.name.localeCompare(b.name) : order === "type" ? extension(a.name).localeCompare(extension(b.name)) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)) : [];
    if (refreshList) list.innerHTML = items.length ? items.map((item) => '<li><button type="button" class="files__item' + (item.id === selected ? " selected" : "") + '" data-file-id="' + escapeHtml(item.id) + '"><img class="files__glyph" src="' + (item.kind === "folder" ? sprite("folder") : sprite("text-file")) + '" alt="" width="16" height="16"><span>' + escapeHtml(item.name) + '</span>' + (item.modifiedAt ? '<small class="files__date">' + escapeHtml(shortDateFormat.format(new Date(item.modifiedAt))) + '</small>' : "") + '</button></li>').join("") : '<li class="hint">This folder is empty.</li>';
    root.querySelector("[data-files-path]").textContent = folderPath();
    const folderName = current ? data.files.find((file) => file.id === current)?.name || "Files" : "Files";
    const win = root.closest?.(".win");
    if (win) { writeText(win.querySelector(".bar-title").lastChild, folderName); const label = open.get("files")?.tab.querySelector(".task__label"); if (label) writeText(label, folderName); }
    list.querySelectorAll("[data-file-id]").forEach((button) => { button.classList.toggle("selected", button.dataset.fileId === selected); button.setAttribute("aria-pressed", String(button.dataset.fileId === selected)); });
    root.querySelector("[data-files-up]").disabled = current === null;
    root.querySelectorAll("[data-files-rename],[data-files-move],[data-files-copy],[data-files-duplicate],[data-files-delete]").forEach((button) => button.disabled = !selectedItem());
    root.querySelector("[data-files-paste]").disabled = !data.files.some((item) => item.id === fileClipboard);
    const item = selectedItem();
    root.querySelector("[data-files-editor-name]").textContent = item?.kind === "text" ? item.name : "Select a text file";
    content.disabled = item?.kind !== "text";
    root.querySelector("[data-files-download]").disabled = item?.kind !== "text";
    content.value = item?.kind === "text" ? item.content : "";
    editor?.refresh();
    if (item?.kind === "text" && data.recentFiles[0] !== item.id) data.recentFiles = [item.id, ...data.recentFiles.filter((id) => id !== item.id)].slice(0, 10);
    writeText(root.querySelector("[data-files-status]"), item?.kind === "text" ? item.content.length.toLocaleString() + " characters" : (refreshList ? items.length + (items.length === 1 ? " item" : " items") : "Folder selected"));
  };
  root.querySelector("[data-files-sort]").value = data.views.filesSort; root.querySelector("[data-files-sort]").addEventListener("change", () => { data.views.filesSort = root.querySelector("[data-files-sort]").value; persistData(); render(); });
  const refreshFromBin = () => { if (!root.isConnected) return document.removeEventListener("lumen-files-changed", refreshFromBin); render(); };
  document.addEventListener("lumen-files-changed", refreshFromBin);
  const openFromSearch = (event) => { if (!root.isConnected) return document.removeEventListener("lumen-open-file", openFromSearch); const item = data.files.find((file) => file.id === event.detail); if (!item) return; current = item.parent; selected = item.id; render(); };
  document.addEventListener("lumen-open-file", openFromSearch);
  const importInput = root.querySelector("[data-files-import-input]");
  root.querySelector("[data-files-import]").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => { const count = await importTextFiles(importInput.files, current); importInput.value = ""; if (count) { render(); showToast(count === 1 ? "Imported 1 file." : "Imported " + count + " files."); } });
  root.addEventListener("dragover", (event) => { if (event.dataTransfer?.types.includes("Files")) { event.preventDefault(); event.stopPropagation(); root.classList.add("drop-ready"); } });
  root.addEventListener("dragleave", (event) => { if (!root.contains(event.relatedTarget)) root.classList.remove("drop-ready"); });
  root.addEventListener("drop", async (event) => { if (!event.dataTransfer?.files.length) return; event.preventDefault(); event.stopPropagation(); root.classList.remove("drop-ready"); const count = await importTextFiles(event.dataTransfer.files, current); if (count) { render(); showToast(count === 1 ? "Imported 1 file." : "Imported " + count + " files."); } else showToast("Only text files can be imported."); });
  const createItem = async (kind) => { const script = kind === "script"; const proposed = await showWindowDialog({ title: kind === "folder" ? "New folder" : script ? "New script" : "New text file", message: "Enter a name.", value: kind === "folder" ? "New Folder" : script ? "Untitled.lsc" : "New Text File.txt", confirmLabel: "Create" }); let name = proposed?.trim().replace(/[\\/]/g, "-").slice(0, 80); if (!name) return; if (script && !/\.lsc$/i.test(name)) name = name.slice(0, 76) + ".lsc"; const item = { id: makeId(), kind: kind === "folder" ? "folder" : "text", name, parent: current, content: script ? "window \"Untitled\", 480, 360, \"paint\"\nscreen 240, 160\nwhile 1\n  cls \"#101b30\"\n  text 120, 70, \"Hello, LUMEN!\", \"#ffffff\", 16, 1, \"title\"\n  frame\nwend" : "", modifiedAt: new Date().toISOString() }; data.files.push(item); selected = item.id; persistData(); render(); if (kind !== "folder") content.focus(); };
  root.querySelector("[data-files-new-folder]").addEventListener("click", () => createItem("folder"));
  root.querySelector("[data-files-new-text]").addEventListener("click", () => createItem("text"));
  root.querySelector("[data-files-new-script]").addEventListener("click", () => createItem("script"));
  list.addEventListener("click", (event) => { const button = event.target.closest("[data-file-id]"); if (!button || selected === button.dataset.fileId) return; selected = button.dataset.fileId; render(false); });
  list.addEventListener("focusin", (event) => { const button = event.target.closest("[data-file-id]"); if (!button || selected === button.dataset.fileId) return; selected = button.dataset.fileId; render(false); });
  const isScript = (item) => item.kind === "text" && /\.lsc$/i.test(item.name); const runFile = (item) => { openApp("terminal"); document.dispatchEvent(new CustomEvent("lumen-run-script", { detail: { fileId: item.id, name: item.name, content: item.content } })); };
  editor = bindScriptEditor(root, { getFile: selectedItem, run: runFile, stop: () => document.dispatchEvent(new Event("lumen-stop-script")), save: () => { clearTimeout(saveTimer); const item = selectedItem(); if (!item || item.kind !== "text") return false; item.content = content.value.slice(0, 200000); item.modifiedAt = new Date().toISOString(); return persistData(); }, ask: (title, message, value) => showWindowDialog({ title, message, value, confirmLabel: "Go" }) });
  list.addEventListener("dblclick", (event) => { const item = data.files.find((candidate) => candidate.id === event.target.closest("[data-file-id]")?.dataset.fileId); if (!item) return; if (item.kind === "folder") { current = item.id; selected = null; render(); } else if (isScript(item)) runFile(item); else content.focus(); });
  list.addEventListener("contextmenu", (event) => { const button = event.target.closest("[data-file-id]"); const item = button && data.files.find((candidate) => candidate.id === button.dataset.fileId); if (!item) return; event.preventDefault(); event.stopPropagation(); selected = item.id; render(false); const run = () => runFile(item); showMenu(...toScene(event.clientX, event.clientY), [...(isScript(item) ? [{ label: "Run", run }] : []), { label: item.kind === "folder" ? "Open" : "Edit", run: () => item.kind === "folder" ? (current = item.id, selected = null, render()) : content.focus() }, ...(item.kind === "text" && /\.txt$/i.test(item.name) ? [{ label: "Run in Command Prompt", run }] : []), null, { label: "Rename", run: () => root.querySelector("[data-files-rename]").click() }, { label: "Duplicate", run: () => root.querySelector("[data-files-duplicate]").click() }, { label: "Delete", run: () => root.querySelector("[data-files-delete]").click() }]); });
  list.addEventListener("dragover", (event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); });
  list.addEventListener("drop", async (event) => { const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("text/") || /\.txt$/i.test(file.name)); if (!files.length) return; event.preventDefault(); const destination = current; try { const imported = await Promise.all(files.slice(0, Math.min(20, Math.max(0, 512 - data.files.length))).map(async (file) => ({ id: makeId(), kind: "text", name: file.name.replace(/[\\/]/g, "-").slice(0, 80), parent: destination, content: (await file.slice(0, 800000).text()).slice(0, 200000) }))); data.files.push(...imported.slice(0, Math.max(0, 512 - data.files.length))); const saved = persistData(); render(); root.querySelector("[data-files-status]").textContent = saved ? "Imported " + imported.length + (imported.length === 1 ? " text file." : " text files.") : "Import could not be saved. Export your files to keep them."; } catch { showToast("These text files could not be imported."); } });
  root.querySelector("[data-files-up]").addEventListener("click", () => { current = data.files.find((item) => item.id === current)?.parent ?? null; selected = null; render(); });
  content.addEventListener("input", () => { const item = selectedItem(); if (!item || item.kind !== "text") return; item.content = content.value.slice(0, 200000); item.modifiedAt = new Date().toISOString(); clearTimeout(saveTimer); saveTimer = setTimeout(() => { root.querySelector("[data-files-status]").textContent = persistData() ? systemFileErrors.find((error) => error.id === item.id)?.message || "Saved." : "Save failed. Download this file to keep your edits."; }, 300); });
  root.querySelector("[data-files-download]").addEventListener("click", () => { const item = selectedItem(); if (!item || item.kind !== "text") return; const url = URL.createObjectURL(new Blob([item.content], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = item.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); });
  content.maxLength = 200000;
  content.addEventListener("blur", () => { clearTimeout(saveTimer); root.querySelector("[data-files-status]").textContent = persistData() ? systemFileErrors.find((error) => error.id === selectedItem()?.id)?.message || "Saved." : "Save failed. Download this file to keep your edits."; });
  root.querySelector("[data-files-rename]").addEventListener("click", async () => { const item = selectedItem(); if (!item) return; const renamed = await showWindowDialog({ title: "Rename", message: "Enter a new name.", value: item.name, confirmLabel: "Rename" }); const name = renamed?.trim().replace(/[\\/]/g, "-").slice(0, 80); if (!name) return; item.name = name; persistData(); render(); });
  const descendantsOf = (id) => { const descendants = new Set([id]); let changed = true; while (changed) { changed = false; data.files.forEach((item) => { if (item.parent && descendants.has(item.parent) && !descendants.has(item.id)) { descendants.add(item.id); changed = true; } }); } return descendants; };
  root.querySelector("[data-files-move]").addEventListener("click", async () => { const item = selectedItem(); if (!item) return; const blocked = item.kind === "folder" ? descendantsOf(item.id) : new Set(); const folders = data.files.filter((candidate) => candidate.kind === "folder" && !blocked.has(candidate.id)); const choice = await showWindowDialog({ title: "Move " + item.name, message: "Choose a destination.", options: [{ value: "", label: "Desktop" }, ...folders.map((folder) => ({ value: folder.id, label: folder.name }))], confirmLabel: "Move" }); if (choice === null) return; item.parent = choice || null; persistData(); selected = null; render(); });
  const pasteCopy = (id, parent) => { const copies = cloneFiles(data.files, id, parent, makeId); if (!copies.length) return; copies[0].modifiedAt = new Date().toISOString(); data.files.push(...copies); selected = copies[0].id; current = parent; persistData(); render(); showToast(copies.length === 1 ? "Copied " + copies[0].name + "." : "Copied " + copies[0].name + " and " + (copies.length - 1) + " more."); };
  root.querySelector("[data-files-copy]").addEventListener("click", () => { if (!selectedItem()) return; fileClipboard = selected; render(false); writeText(root.querySelector("[data-files-status]"), selectedItem().name + " is ready to paste."); });
  root.querySelector("[data-files-paste]").addEventListener("click", () => pasteCopy(fileClipboard, current));
  root.querySelector("[data-files-duplicate]").addEventListener("click", () => { const item = selectedItem(); if (item) pasteCopy(item.id, item.parent); });
  root.querySelector("[data-files-delete]").addEventListener("click", async () => { const item = selectedItem(); if (!item || !await showWindowDialog({ title: "Delete " + item.name, message: item.kind === "folder" ? "Move this folder and everything inside it to the Recycle Bin?" : "Move this text file to the Recycle Bin?", confirmLabel: "Delete" })) return; const removing = new Set([item.id]); let changed = true; while (changed) { changed = false; data.files.forEach((candidate) => { if (candidate.parent && removing.has(candidate.parent) && !removing.has(candidate.id)) { removing.add(candidate.id); changed = true; } }); } data.recycle = [{ id: makeId(), deletedAt: new Date().toISOString(), items: data.files.filter((candidate) => removing.has(candidate.id)) }, ...data.recycle].slice(0, 50); data.files = data.files.filter((candidate) => !removing.has(candidate.id)); selected = null; persistData(); render(); document.dispatchEvent(new Event("lumen-files-changed")); });
  list.addEventListener("keydown", (event) => { const shortcut = { c: "[data-files-copy]", v: "[data-files-paste]", d: "[data-files-duplicate]" }[event.key.toLowerCase()]; if ((event.ctrlKey || event.metaKey) && !event.altKey && shortcut) { event.preventDefault(); event.stopPropagation(); root.querySelector(shortcut).click(); return; } if (event.ctrlKey || event.metaKey || event.altKey) return; const buttons = Array.from(list.querySelectorAll("[data-file-id]")); const index = buttons.findIndex((button) => button.dataset.fileId === selected); if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && buttons.length) { event.preventDefault(); event.stopPropagation(); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))); selected = buttons[next].dataset.fileId; render(false); buttons[next].focus(); } else if (event.key === "Enter" && selectedItem()) { event.preventDefault(); if (selectedItem().kind === "folder") { current = selected; selected = null; render(); list.querySelector("button")?.focus(); } else if (isScript(selectedItem())) runFile(selectedItem()); else content.focus(); } else if (event.key === "F2" && selectedItem()) { event.preventDefault(); root.querySelector("[data-files-rename]").click(); } else if (event.key === "Delete" && selectedItem()) { event.preventDefault(); root.querySelector("[data-files-delete]").click(); } else if (event.key === "Backspace" && current) { event.preventDefault(); root.querySelector("[data-files-up]").click(); list.querySelector("button")?.focus(); } });
  render();
  return (flush = true) => { clearTimeout(saveTimer); editor?.destroy(); document.removeEventListener("lumen-files-changed", refreshFromBin); document.removeEventListener("lumen-open-file", openFromSearch); if (flush) persistData(); };
}
let fileClipboard = null;
async function clearAllData() {
  const confirmed = await showWindowDialog({ title: "Clear all data", message: "Clear all LUMEN notes, files, settings, and ship log entries?", confirmLabel: "Clear", danger: true });
  if (!confirmed) return;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PAINT_KEY);
    localStorage.removeItem(WALLPAPER_KEY); localStorage.removeItem(KEY + "-unreadable");
    showCustomWallpaper();
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
  installScriptSamples(); showToast("All LUMEN data was cleared.");
}
async function installScriptSamples() { const { scriptSamples, retiredSamples, sampleHash } = await import("./script-samples.mjs?v=d8e2e4c382"); let folder = data.files.find((item) => item.kind === "folder" && item.parent === null && item.name === "Programs"); if (!folder) { folder = { id: makeId(), kind: "folder", name: "Programs", parent: null, content: "", modifiedAt: new Date().toISOString() }; data.files.push(folder); } const added = scriptSamples.filter((sample) => !data.files.some((item) => item.parent === folder.id && item.name === sample.name)); added.forEach((sample) => data.files.push({ id: makeId(), kind: "text", name: sample.name, parent: folder.id, content: sample.content, modifiedAt: new Date().toISOString() })); let upgraded = 0; scriptSamples.forEach((sample) => { const file = data.files.find((item) => item.parent === folder.id && item.kind === "text" && item.name === sample.name); if (file && file.content !== sample.content && retiredSamples.includes(sample.name + ":" + sampleHash(file.content))) { file.content = sample.content; file.modifiedAt = new Date().toISOString(); upgraded += 1; } }); data.samplesInstalled = true; persistData(); document.dispatchEvent(new Event("lumen-files-changed")); return added.length + upgraded; }
function createScriptHost(stop) {
  const host = {};
  const keyName = (key) => { const name = String(key).toLowerCase(); return name === " " || name === "spacebar" ? "space" : name === "esc" ? "escape" : name; };
  const iconFor = (name) => sprite(String(name).toLowerCase()) || apps.find((app) => app.id === String(name).toLowerCase())?.icon || sprite("terminal");
  const fonts = { mono: "'Lucida Console', monospace", sans: "Tahoma, Verdana, sans-serif", serif: "'Times New Roman', serif", bold: "bold Tahoma, sans-serif", type: "bold 'Courier New', Courier, monospace", title: "bold 'Trebuchet MS', Tahoma, sans-serif" }; const textFont = (size, font) => { const family = fonts[String(font).toLowerCase()] || fonts.sans; return family.startsWith("bold ") ? "bold " + size + "px " + family.slice(5) : size + "px " + family; }; const measureText = (text, size, font) => { scratchContext.font = textFont(size, font); return scratchContext.measureText(text).width; };
  const pixelEffects = new Set(["pixelate", "posterize", "threshold", "wave", "ripple", "chroma", "kaleido", "grain", "edges"]);
  const cssEffects = new Set(["brightness", "contrast", "saturate", "grayscale", "sepia", "invert", "hue", "blur", "zoom", "rotate", "spin", "mirror", "shake", "scanlines", "vignette", "glow"]);
  const textCache = new Map(); const iconCache = new Map(); const images = new Map();
  const scratch = document.createElement("canvas"); const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
  let current = null; let lastFrame = performance.now(); let fpsValue = 60; let deltaValue = 1 / 60;
  const need = () => { if (!current?.canvas?.isConnected) throw new Error("Open a window first, for example: window \"My program\", 320, 240, \"paint\""); return current; };
  const rasterText = (text, size, font) => { const key = size + "|" + font + "|" + text; const cached = textCache.get(key); if (cached) return cached; scratchContext.font = Math.max(4, Math.round(size)) + "px " + (fonts[font] || fonts.mono); const width = Math.max(1, Math.ceil(scratchContext.measureText(text).width)); const height = Math.max(1, Math.ceil(size * 1.3)); scratch.width = width; scratch.height = height; scratchContext.font = Math.max(4, Math.round(size)) + "px " + (fonts[font] || fonts.mono); scratchContext.textBaseline = "top"; scratchContext.fillStyle = "#fff"; scratchContext.fillText(text, 0, 0); const pixels = scratchContext.getImageData(0, 0, width, height).data; const bits = new Uint8Array(width * height); for (let index = 0; index < bits.length; index += 1) bits[index] = pixels[index * 4 + 3] > 110 ? 1 : 0; const result = { bits, width, height }; if (textCache.size > 400) textCache.clear(); textCache.set(key, result); return result; };
  const loadIcon = (name) => { const key = String(name).toLowerCase(); if (iconCache.has(key)) return iconCache.get(key); const pending = new Promise((resolve) => { const picture = new Image(); picture.onload = () => { scratch.width = picture.naturalWidth || 1; scratch.height = picture.naturalHeight || 1; scratchContext.clearRect(0, 0, scratch.width, scratch.height); scratchContext.drawImage(picture, 0, 0); const data = scratchContext.getImageData(0, 0, scratch.width, scratch.height).data; const image = { width: scratch.width, height: scratch.height, data: new Uint32Array(data.slice().buffer) }; iconCache.set(key, image); resolve(image); }; picture.onerror = () => { const image = { width: 1, height: 1, data: new Uint32Array(1) }; iconCache.set(key, image); resolve(image); }; picture.src = iconFor(key); }); iconCache.set(key, pending); return pending; };
  const customShader = (state, pixels, time) => { const { width: w, height: h } = state.screen; const out = new Uint32Array(pixels.length); const values = { x: 0, y: 0, u: 0, v: 0, r: 0, g: 0, b: 0, t: time, w, h }; const vars = { has: (name) => Object.hasOwn(values, name) || Boolean(host.globals?.has(name)), get: (name) => Object.hasOwn(values, name) ? values[name] : host.globals?.get(name) }; const env = { vars, call: (name, args) => functions[name] ? functions[name](...args) : (() => { throw new Error("Unknown function " + name + "() in shader"); })(), functions: host.userFunctions }; const [first, second, third] = state.custom; const clampByte = (value) => value < 0 ? 0 : value > 255 ? 255 : value | 0; for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const index = y * w + x; const p = pixels[index]; values.x = x; values.y = y; values.u = x / w; values.v = y / h; values.r = p & 255; values.g = (p >>> 8) & 255; values.b = (p >>> 16) & 255; if (second) out[index] = ((255 << 24) | (clampByte(third(env)) << 16) | (clampByte(second(env)) << 8) | clampByte(first(env))) >>> 0; else out[index] = parseColor(first(env)); } return out; };
  const styleShaders = (state, time) => { const s = state.shaders; const filters = []; const take = (name, fallback) => s.has(name) ? s.get(name)[0] ?? fallback : null; [["brightness", 1], ["contrast", 1], ["saturate", 1], ["grayscale", 1], ["sepia", 1], ["invert", 1]].forEach(([name, fallback]) => { const value = take(name, fallback); if (value !== null) filters.push(name + "(" + value + ")"); }); if (s.has("hue")) filters.push("hue-rotate(" + (s.get("hue")[0] ?? 90) + "deg)"); if (s.has("blur")) filters.push("blur(" + (s.get("blur")[0] ?? 1) + "px)"); if (s.has("glow")) { const [amount = 4, color = "#ffffff"] = s.get("glow"); filters.push("drop-shadow(0 0 " + amount + "px " + toHex(parseColor(color)) + ")"); } const transforms = []; if (s.has("shake")) { const amount = s.get("shake")[0] ?? 3; transforms.push("translate(" + ((Math.random() * 2 - 1) * amount).toFixed(1) + "px, " + ((Math.random() * 2 - 1) * amount).toFixed(1) + "px)"); } if (s.has("zoom")) transforms.push("scale(" + (s.get("zoom")[0] ?? 2) + ")"); if (s.has("rotate")) transforms.push("rotate(" + (s.get("rotate")[0] ?? 0) + "deg)"); if (s.has("spin")) transforms.push("rotate(" + ((time * (s.get("spin")[0] ?? 45)) % 360).toFixed(2) + "deg)"); if (s.has("mirror")) { const mode = s.get("mirror")[0] ?? 1; transforms.push("scale(" + (mode & 1 ? -1 : 1) + ", " + (mode & 2 ? -1 : 1) + ")"); } const origin = s.has("zoom") ? ((s.get("zoom")[1] ?? 0.5) * 100) + "% " + ((s.get("zoom")[2] ?? 0.5) * 100) + "%" : "50% 50%"; const style = state.stage.style; const filter = filters.join(" ") || "none"; const transform = transforms.join(" ") || "none"; if (style.filter !== filter) style.filter = filter; if (style.transform !== transform) style.transform = transform; if (style.transformOrigin !== origin) style.transformOrigin = origin; state.frame.style.setProperty("--scan", s.has("scanlines") ? String(s.get("scanlines")[0] ?? 0.35) : "0"); state.frame.style.setProperty("--vignette", s.has("vignette") ? String(s.get("vignette")[0] ?? 0.6) : "0"); };
  const drawTexts = (state) => { const layer = state.textLayer; if (!layer?.isConnected) return; const ratio = window.devicePixelRatio || 1; const width = Math.max(1, Math.round(layer.clientWidth * ratio)); const height = Math.max(1, Math.round(layer.clientHeight * ratio)); const key = width + "x" + height + "|" + state.screen.width + "x" + state.screen.height; if (!state.textDirty && state.textKey === key) return; state.textDirty = false; state.textKey = key; if (layer.width !== width || layer.height !== height) { layer.width = width; layer.height = height; } const context = state.textContext; context.clearRect(0, 0, width, height); if (!state.texts.length) return; const scale = Math.min(width / state.screen.width, height / state.screen.height); const left = (width - state.screen.width * scale) / 2; const top = (height - state.screen.height * scale) / 2; context.textBaseline = "top"; for (const item of state.texts) { context.font = textFont(Math.round(item.size * scale * 10) / 10, item.font); context.fillStyle = item.color; context.textAlign = item.align === 1 ? "center" : item.align === 2 ? "right" : "left"; context.fillText(item.words, Math.round(left + item.x * scale), Math.round(top + item.y * scale)); } };
  const coverTexts = (state, x, y, width, height, color) => { if (!state.texts.length || (parseColor(color) >>> 24) < 255) return; const kept = state.texts.filter((item) => item.left < x || item.top < y || item.left + item.width > x + width || item.top + item.height > y + height); if (kept.length !== state.texts.length) { state.texts = kept; state.textDirty = true; } };
  const present = (state = current) => { if (!state?.canvas?.isConnected) return; const screen = state.screen; const time = performance.now() / 1000; let pixels = screen.buffer; const list = [...state.shaders].filter(([name]) => pixelEffects.has(name)).map(([name, args]) => ({ name, a: args[0], b: args[1], c: args[2] })); if (list.length) pixels = screen.effects(list, time); if (state.custom) pixels = customShader(state, pixels, time); if (state.canvas.width !== screen.width || state.canvas.height !== screen.height) { state.canvas.width = screen.width; state.canvas.height = screen.height; } state.context.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.length * 4), screen.width, screen.height), 0, 0); drawTexts(state); styleShaders(state, time); screen.dirty = false; };
  const fitAuto = (state) => { if (!state.auto) return; const box = state.frame.getBoundingClientRect(); const width = Math.max(1, Math.floor(box.width / state.auto)); const height = Math.max(1, Math.floor(box.height / state.auto)); if (width !== state.screen.width || height !== state.screen.height) { state.screen.resize(width, height, true); state.resized = true; present(state); } };
  const fitWindow = (state) => { state.fitPending = false; const entry = open.get(state.id); if (!entry || state.auto || !state.frame?.isConnected || entry.el.classList.contains("max")) return; for (let pass = 0; pass < 2; pass += 1) { const frameWidth = state.frame.clientWidth; const frameHeight = state.frame.clientHeight; const { width, height } = state.screen; let scale = Math.max(1, Math.round(Math.min(frameWidth / width, frameHeight / height))); const chromeWidth = entry.el.offsetWidth - frameWidth; const chromeHeight = entry.el.offsetHeight - frameHeight; while (scale > 1 && (chromeWidth + width * scale > 1200 || chromeHeight + height * scale > 900)) scale -= 1; entry.el.style.width = Math.max(200, chromeWidth + width * scale) + "px"; entry.el.style.height = Math.max(150, chromeHeight + height * scale) + "px"; } constrainWindow(entry.el); };
  const widget = (name, label, build) => { const state = need(); state.bar.hidden = false; const key = String(name); if (state.widgets.has(key)) return state.widgets.get(key); const holder = document.createElement("label"); holder.className = "script-window__widget"; const caption = document.createElement("span"); caption.textContent = display(label); const control = build(); holder.append(caption, control.element); state.bar.append(holder); state.widgets.set(key, control); control.element.addEventListener("input", () => { state.changes.add(key); }); control.element.addEventListener("change", () => { state.changes.add(key); state.canvas.focus({ preventScroll: true }); }); return control; };
  const fileByName = (name) => resolveVirtualFile(data.files, name).file;
  const saveFile = (name, text, append) => { const content = display(text), target = resolveVirtualFile(data.files, name); let file = target.file; if (!file) { const programs = data.files.find((item) => item.kind === "folder" && item.parent === null && item.name === "Programs"); file = { id: makeId(), kind: "text", name: target.name, parent: target.qualified ? target.parent : programs?.id ?? null, content: "" }; data.files.push(file); } file.content = ((append ? file.content : "") + content).slice(0, 200000); file.modifiedAt = new Date().toISOString(); persistData(); const error = systemFileErrors.find((item) => item.id === file.id); if (error) throw new Error(error.message); document.dispatchEvent(new Event("lumen-files-changed")); };
  const commands = {
    window: (title = "Program", width = 320, height = 240, icon = "terminal") => {
      const id = "script:" + makeId().slice(0, 8);
      const state = { id, keys: new Set(), hits: new Set(), typed: [], texts: [], textDirty: true, clicks: new Set(), changes: new Set(), widgets: new Map(), shaders: new Map(), custom: null, auto: 0, resized: false, wheel: 0, mouse: { x: 0, y: 0, down: false, hits: 0 }, screen: new PixelScreen(160, 120), cleanup: [] };
      const app = { id, name: display(title).slice(0, 60), icon: iconFor(icon), size: [Math.max(200, Math.min(1200, Math.round(Number(width) || 320))), Math.max(150, Math.min(900, Math.round(Number(height) || 240)))], html: () => '<div class="script-window"><div class="script-window__bar" data-script-bar hidden></div><div class="script-window__screen" data-script-screen><div class="script-window__stage" data-script-stage><canvas class="script-window__canvas" data-script-canvas width="160" height="120" tabindex="0" aria-label="Program screen"></canvas><canvas class="script-window__text" data-script-text aria-hidden="true"></canvas></div></div></div>', bind: (root) => {
        state.root = root; state.frame = root.querySelector("[data-script-screen]"); state.canvas = root.querySelector("[data-script-canvas]"); state.stage = root.querySelector("[data-script-stage]"); state.textLayer = root.querySelector("[data-script-text]"); state.textContext = state.textLayer.getContext("2d"); state.context = state.canvas.getContext("2d"); state.bar = root.querySelector("[data-script-bar]");
        root.addEventListener("keydown", (event) => { if (event.target.closest("input")) return; const key = keyName(event.key); state.keys.add(key); state.hits.add(key); const typedKey = event.key.length === 1 ? event.key : { Enter: "\n", Backspace: "\b", Tab: "\t" }[event.key]; if (typedKey && state.typed.length < 64) state.typed.push(typedKey); if (["arrowup", "arrowdown", "arrowleft", "arrowright", "space", "tab"].includes(key)) event.preventDefault(); });
        root.addEventListener("keyup", (event) => state.keys.delete(keyName(event.key)));
        const locate = (event) => { const [x, y] = toScene(event.clientX, event.clientY); const box = state.frame.getBoundingClientRect(); const scale = Math.min(box.width / state.screen.width, box.height / state.screen.height) || 1; const left = box.left + (box.width - state.screen.width * scale) / 2; const top = box.top + (box.height - state.screen.height * scale) / 2; state.mouse.x = Math.floor((x - left) / scale); state.mouse.y = Math.floor((y - top) / scale); return x >= left && y >= top && x < left + state.screen.width * scale && y < top + state.screen.height * scale; };
        const move = (event) => locate(event); const release = () => { state.mouse.down = false; };
        state.canvas.addEventListener("pointerdown", (event) => { if (event.button !== 0 || !locate(event)) return; state.mouse.down = true; state.mouse.hits += 1; state.canvas.focus({ preventScroll: true }); });
        state.frame.addEventListener("pointerdown", (event) => { if (event.target === state.frame && locate(event)) { state.mouse.down = true; state.mouse.hits += 1; state.canvas.focus({ preventScroll: true }); } });
        const wheelTarget = root.closest(".win") || root; const wheel = (event) => { if (!locate(event)) return; event.preventDefault(); state.wheel += Math.sign(event.deltaY) * Math.max(1, Math.round(Math.abs(event.deltaY) / 100)); };
        wheelTarget.addEventListener("wheel", wheel, { passive: false });
        document.addEventListener("pointermove", move, { passive: true }); window.addEventListener("pointerup", release);
        const observer = new ResizeObserver(() => { fitAuto(state); drawTexts(state); }); observer.observe(state.frame);
        state.cleanup.push(() => { document.removeEventListener("pointermove", move); window.removeEventListener("pointerup", release); wheelTarget.removeEventListener("wheel", wheel); observer.disconnect(); });
        state.bar.addEventListener("click", (event) => { const button = event.target.closest("[data-script-button]"); if (!button) return; state.clicks.add(button.dataset.scriptButton); state.canvas.focus({ preventScroll: true }); });
        present(state); state.canvas.focus({ preventScroll: true });
        return () => { state.cleanup.forEach((cleanup) => cleanup()); const index = apps.indexOf(app); if (index >= 0) apps.splice(index, 1); if (current === state) stop(); };
      } };
      state.app = app; apps.push(app); current = state; openApp(id);
      if (!state.canvas) throw new Error("The window could not open");
    },
    screen: (width = 160, height = 120) => { const state = need(); if (String(width).toLowerCase() === "auto") { state.auto = Math.max(1, Number(height) || 1) || 1; if (height === 120) state.auto = 1; fitAuto(state); return; } state.auto = 0; state.texts = []; state.textDirty = true; state.screen.resize(width, height); present(state); if (!state.fitPending) { state.fitPending = true; window.setTimeout(() => fitWindow(state), 0); } },
    cls: (color = 0) => { const state = need(); state.screen.clear(color); if (state.texts.length) { state.texts = []; state.textDirty = true; } },
    pixel: (x, y, color = 15) => need().screen.pixel(x, y, color),
    rect: (x, y, width, height, color = 15) => { const state = need(); state.screen.rect(x, y, width, height, color); coverTexts(state, x, y, width, height, color); },
    box: (x, y, width, height, color = 15) => need().screen.box(x, y, width, height, color),
    line: (x1, y1, x2, y2, color = 15) => need().screen.line(x1, y1, x2, y2, color),
    circle: (x, y, radius, color = 15, solid = 1) => need().screen.circle(x, y, radius, color, solid),
    triangle: (x1, y1, x2, y2, x3, y3, color = 15) => need().screen.triangle(x1, y1, x2, y2, x3, y3, color),
    scroll: (dx = 0, dy = 0, wrap = 0, color = 0) => need().screen.scroll(dx, dy, wrap, color),
    text: (x, y, value, color = 15, size = 8, align = 0, font = "sans") => { const state = need(); const words = display(value); const pixelSize = Math.max(4, Number(size) || 8); const anchor = [1, 2].includes(Number(align)) ? Number(align) : 0; if (String(font).toLowerCase() === "pixel") { const glyphs = rasterText(words, pixelSize, "mono"); const left = anchor === 1 ? x - glyphs.width / 2 : anchor === 2 ? x - glyphs.width : x; state.screen.mask(glyphs.bits, glyphs.width, glyphs.height, left, y, color); return; } const width = measureText(words, pixelSize, font); const packed = parseColor(color); const alpha = packed >>> 24; const item = { x: Number(x) || 0, y: Number(y) || 0, align: anchor, top: Number(y) || 0, width, height: pixelSize * 1.2, words, size: pixelSize, font: String(font), color: toHex(packed) + (alpha < 255 ? alpha.toString(16).padStart(2, "0") : "") }; item.left = anchor === 1 ? item.x - width / 2 : anchor === 2 ? item.x - width : item.x; state.texts = state.texts.filter((other) => other.x !== item.x || other.y !== item.y || other.align !== item.align); state.texts.push(item); if (state.texts.length > 500) state.texts.shift(); state.textDirty = true; },
    drawicon: (name, x, y, scale = 1) => { const state = need(); const image = iconCache.get(String(name).toLowerCase()); if (image && !(image instanceof Promise)) { state.screen.blit(image, x, y, scale); return; } return Promise.resolve(loadIcon(name)).then((loaded) => state.screen.blit(loaded, x, y, scale)); },
    capture: (name, x, y, width, height) => { images.set(String(name), need().screen.capture(x, y, width, height)); },
    stamp: (name, x, y, scale = 1, flip = 0) => { const image = images.get(String(name)); if (!image) throw new Error("No captured image named " + name + ". Use CAPTURE first"); need().screen.blit(image, x, y, scale, flip); },
    present: () => present(need()),
    frame: () => { const state = need(); present(state); const now = performance.now(); deltaValue = Math.min(0.25, (now - lastFrame) / 1000); fpsValue = fpsValue * 0.9 + (1 / Math.max(0.001, deltaValue)) * 0.1; lastFrame = now; return new Promise((resolve) => { let done = false; const finish = () => { if (done) return; done = true; resolve(); }; requestAnimationFrame(finish); window.setTimeout(finish, 34); }); },
    shader: (name, ...args) => { const state = need(); const effect = String(name).toLowerCase(); if (effect === "off" || effect === "none") { state.shaders.clear(); state.custom = null; present(state); return; } if (effect === "custom") { state.custom = args.length ? args.slice(0, 3).map((source) => compiledExpression(String(source))) : null; return; } if (!pixelEffects.has(effect) && !cssEffects.has(effect)) { const guess = suggest(effect, [...pixelEffects, ...cssEffects, "custom", "off"]); throw new Error("Unknown shader: " + effect + (guess ? ". Did you mean " + guess + "?" : "")); } state.shaders.set(effect, args); },
    noshader: (name) => { const state = need(); const effect = String(name).toLowerCase(); if (effect === "custom") state.custom = null; else state.shaders.delete(effect); },
    button: (name, label = name) => { const state = need(); state.bar.hidden = false; if (state.widgets.has(String(name))) return; const button = document.createElement("button"); button.type = "button"; button.className = "btn"; button.dataset.scriptButton = String(name); button.textContent = display(label); state.bar.append(button); state.widgets.set(String(name), { element: button, read: () => 0 }); },
    slider: (name, label = name, low = 0, high = 100, start = low, step = 1) => { widget(name, label, () => { const input = document.createElement("input"); input.type = "range"; input.className = "knob"; input.min = String(low); input.max = String(high); input.step = String(step); input.value = String(start); return { element: input, read: () => Number(input.value), write: (value) => { input.value = String(value); } }; }); },
    checkbox: (name, label = name, checked = 0) => { widget(name, label, () => { const input = document.createElement("input"); input.type = "checkbox"; input.checked = Boolean(checked); return { element: input, read: () => input.checked, write: (value) => { input.checked = Boolean(value); } }; }); },
    textbox: (name, label = name, start = "") => { widget(name, label, () => { const input = document.createElement("input"); input.type = "text"; input.className = "field"; input.value = display(start); return { element: input, read: () => input.value, write: (value) => { input.value = display(value); } }; }); },
    label: (name, text = "") => { const state = need(); const control = widget(name, "", () => { const output = document.createElement("output"); output.textContent = display(text); return { element: output, read: () => output.textContent, write: (value) => { output.textContent = display(value); } }; }); control.write?.(text); },
    setvalue: (name, value) => { const control = need().widgets.get(String(name)); if (!control?.write) throw new Error("No slider, checkbox, textbox, or label named " + name); control.write(value); },
    tone: (frequency = 440, duration = 150, wave = "square", volume = 0.15) => { if (!data.sounds) return; primeAudio(); if (!audioContext) return; const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = ["sine", "square", "sawtooth", "triangle"].includes(String(wave)) ? String(wave) : "square"; oscillator.frequency.value = Math.max(20, Math.min(20000, Number(frequency) || 440)); const level = Math.max(0, Math.min(1, Number(volume) || 0)) * (data.volume / 100); const start = audioContext.currentTime; const end = start + Math.max(0.01, Math.min(10, (Number(duration) || 150) / 1000)); gain.gain.setValueAtTime(level, start); gain.gain.exponentialRampToValueAtTime(0.0001, end); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(end + 0.02); },
    sound: (name = "thud") => playSound(String(name)),
    caption: (title) => { const state = need(); state.app.name = display(title).slice(0, 60); const entry = open.get(state.id); if (entry) { writeText(entry.el.querySelector(".bar-title").lastChild, state.app.name); writeText(entry.tab.querySelector(".task__label"), state.app.name); } },
    icon: (name) => { const state = need(); state.app.icon = iconFor(name); const entry = open.get(state.id); if (entry) { entry.el.querySelector(".bar-title img").src = state.app.icon; entry.tab.querySelector("img").src = state.app.icon; } },
    windowsize: (width, height) => { const entry = open.get(need().id); if (entry && !entry.el.classList.contains("max")) { entry.el.style.width = Math.max(200, Math.round(width)) + "px"; entry.el.style.height = Math.max(150, Math.round(height)) + "px"; constrainWindow(entry.el); } },
    maximize: () => { const entry = open.get(need().id); if (entry && !entry.el.classList.contains("max")) toggleMaximize(need().id); },
    closewindow: () => { if (current && open.has(current.id)) closeApp(current.id); },
    writefile: (name, text = "") => saveFile(name, text, false),
    appendfile: (name, text = "") => saveFile(name, text, true),
  };
  const functions = {
    key: (name) => Boolean(current?.keys.has(keyName(name))),
    keyhit: (name) => { const key = keyName(name); if (!current?.hits.has(key)) return false; current.hits.delete(key); return true; },
    lastkey: () => current?.typed.shift() ?? "",
    mousex: () => current?.mouse.x ?? 0,
    mousey: () => current?.mouse.y ?? 0,
    mousedown: () => Boolean(current?.mouse.down),
    mousehit: () => { if (!current?.mouse.hits) return false; current.mouse.hits -= 1; return true; },
    wheel: () => { const value = current?.wheel ?? 0; if (current) current.wheel = 0; return value; },
    clicked: (name) => { if (!current?.clicks.has(String(name))) return false; current.clicks.delete(String(name)); return true; },
    value: (name) => { const control = current?.widgets.get(String(name)); if (!control) throw new Error("No widget named " + name); return control.read(); },
    changed: (name) => { if (!current?.changes.has(String(name))) return false; current.changes.delete(String(name)); return true; },
    width: () => current?.screen.width ?? 0,
    height: () => current?.screen.height ?? 0,
    winwidth: () => Math.round(current?.frame?.getBoundingClientRect().width ?? 0),
    winheight: () => Math.round(current?.frame?.getBoundingClientRect().height ?? 0),
    resized: () => { if (!current?.resized) return false; current.resized = false; return true; },
    getpixel: (x, y) => toHex(need().screen.getPixel(x, y)),
    textwidth: (value, size = 8, font = "sans") => String(font).toLowerCase() === "pixel" ? rasterText(display(value), Math.max(4, Number(size) || 8), "mono").width : Math.ceil(measureText(display(value), Math.max(4, Number(size) || 8), font)),
    fps: () => Math.round(fpsValue),
    delta: () => deltaValue,
    readfile: (name) => fileByName(name)?.content ?? "",
    hasfile: (name) => Boolean(fileByName(name)),
    files: () => data.files.filter((item) => item.kind === "text").map((item) => item.name),
  };
  Object.assign(host, { commands, functions, input: (prompt) => showWindowDialog({ title: current?.app.name || "Input", message: prompt, value: "", confirmLabel: "OK", onDesk: true }), refresh: (warp) => { if (!warp && current?.screen.dirty) present(current); }, finish: () => { if (current) present(current); } });
  return host;
}
const apps = [
  {
    id: "notes",
    name: "Notes",
    size: [580, 440],
    icon: sprite("notes"),
    html() {
      return '<p class="hint">Saved automatically on this device. Use Markdown headings to navigate longer notes. Press Ctrl+F to find and F5 to stamp the time and date.</p><div class="notes-format"><label class="notes-format__wrap"><input type="checkbox" data-notes-wrap> Word wrap</label><label>Font <select class="field" data-notes-font><option value="sans">Tahoma</option><option value="mono">Lucida Console</option><option value="serif">Times New Roman</option></select></label><label>Size <select class="field" data-notes-size><option value="11">11</option><option value="12">12</option><option value="14">14</option><option value="16">16</option><option value="20">20</option></select></label></div><div class="notes-find" data-note-find hidden><input class="field" data-note-find-input aria-label="Find" placeholder="Find"><input class="field" data-note-replace-input aria-label="Replace with" placeholder="Replace with"><button type="button" class="btn" data-note-find-next>Find Next</button><button type="button" class="btn" data-note-replace-all>Replace All</button><span class="hint hint--flush" data-note-find-count aria-live="polite"></span><button type="button" class="btn" data-note-find-close>Close</button></div><div class="notes-layout"><textarea id="notesArea" aria-label="Project notes" placeholder="Write a note">' + escapeHtml(data.notes) + '</textarea><aside class="notes-sidebar"><nav class="notes-outline" data-note-outline aria-label="Notes outline"></nav><section class="notes-history" data-note-history aria-label="Notes version history"></section></aside></div><div class="row row--actions notes-status-row"><span class="hint hint--flush" data-notes-status aria-live="polite">All changes saved.</span><span class="notes-status-actions"><span class="hint hint--flush notes-caret" data-note-caret>Ln 1, Col 1</span><span class="hint hint--flush" data-note-stats></span><button type="button" class="btn" data-note-to-file>Save as file...</button><button type="button" class="btn" data-save-note-version aria-keyshortcuts="Control+Shift+S Meta+Shift+S" title="Save version (Ctrl/Command+Shift+S)">Save version</button><button type="button" class="btn" data-note-trim>Trim lines</button><button type="button" class="btn" data-note-copy>Copy</button></span></div>';
    },
    bind(root) {
      const area = root.querySelector("#notesArea");
      const status = root.querySelector("[data-notes-status]");
      const outline = root.querySelector("[data-note-outline]");
      const history = root.querySelector("[data-note-history]");
      const stats = root.querySelector("[data-note-stats]");
      const caret = root.querySelector("[data-note-caret]"); const showCaret = () => { const [line, column] = caretPosition(area.value, area.selectionEnd); writeText(caret, "Ln " + line + ", Col " + column); }; ["input", "keyup", "click", "select", "focus"].forEach((type) => area.addEventListener(type, showCaret));
      const formatNotes = () => { area.style.whiteSpace = data.notesWrap ? "pre-wrap" : "pre"; area.style.overflowX = data.notesWrap ? "hidden" : "auto"; area.style.fontFamily = { sans: "var(--font)", mono: "var(--mono)", serif: '"Times New Roman", Times, serif' }[data.notesFont]; area.style.fontSize = data.notesSize + "px"; };
      root.querySelector("[data-notes-wrap]").checked = data.notesWrap;
      root.querySelector("[data-notes-font]").value = data.notesFont;
      root.querySelector("[data-notes-size]").value = String(data.notesSize);
      root.querySelector(".notes-format").addEventListener("change", () => { data.notesWrap = root.querySelector("[data-notes-wrap]").checked; data.notesFont = root.querySelector("[data-notes-font]").value; data.notesSize = Number(root.querySelector("[data-notes-size]").value); formatNotes(); persistData(); });
      formatNotes();
      root.querySelector("[data-note-to-file]").addEventListener("click", async () => {
        if (!area.value.trim()) return showToast("Write something before saving it as a file.");
        const heading = extractNoteHeadings(area.value)[0]?.title;
        const proposed = await showWindowDialog({ title: "Save as file", message: "Save a copy of this note in Files as:", value: (heading || "Note").replace(/[\\/]/g, "-").slice(0, 70) + ".txt", confirmLabel: "Save" });
        const name = proposed?.trim().replace(/[\\/]/g, "-").slice(0, 80);
        if (!name) return;
        data.files.push({ id: makeId(), kind: "text", name, parent: null, content: area.value.slice(0, 200000) });
        persistData();
        document.dispatchEvent(new Event("lumen-files-changed"));
        showToast(name + " was saved in Files.");
      });
      const finder = root.querySelector("[data-note-find]");
      const findInput = root.querySelector("[data-note-find-input]");
      const findCount = root.querySelector("[data-note-find-count]");
      const countMatches = () => { const needle = findInput.value.toLowerCase(); const total = needle ? area.value.toLowerCase().split(needle).length - 1 : 0; writeText(findCount, needle ? (total === 1 ? "1 match" : total + " matches") : ""); return total; };
      const findNext = (backward = false) => {
        const needle = findInput.value.toLowerCase();
        if (!needle || !countMatches()) return;
        const haystack = area.value.toLowerCase();
        let at = backward ? haystack.lastIndexOf(needle, area.selectionStart - 1) : haystack.indexOf(needle, area.selectionEnd);
        if (at < 0) at = backward ? haystack.lastIndexOf(needle) : haystack.indexOf(needle);
        area.focus({ preventScroll: true });
        area.setSelectionRange(at, at + needle.length);
        area.scrollTop = Math.max(0, area.value.slice(0, at).split("\n").length * 15 - area.clientHeight / 2);
        findInput.focus({ preventScroll: true });
      };
      const openFinder = () => { finder.hidden = false; const picked = area.value.slice(area.selectionStart, area.selectionEnd); if (picked && !picked.includes("\n")) findInput.value = picked; findInput.select(); countMatches(); };
      area.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") { event.preventDefault(); openFinder(); } if (event.key === "F5") { event.preventDefault(); const now = new Date(); area.setRangeText(now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) + " " + now.toLocaleDateString(), area.selectionStart, area.selectionEnd, "end"); area.dispatchEvent(new Event("input", { bubbles: true })); } });
      findInput.addEventListener("input", countMatches);
      finder.addEventListener("keydown", (event) => { event.stopPropagation(); if (event.key === "Enter") { event.preventDefault(); findNext(event.shiftKey); } if (event.key === "Escape") { finder.hidden = true; area.focus(); } });
      root.querySelector("[data-note-find-next]").addEventListener("click", () => findNext());
      root.querySelector("[data-note-find-close]").addEventListener("click", () => { finder.hidden = true; area.focus(); });
      root.querySelector("[data-note-replace-all]").addEventListener("click", () => { const needle = findInput.value; if (!needle) return; const total = countMatches(); if (!total) return; const replacement = root.querySelector("[data-note-replace-input]").value; area.value = area.value.replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), () => replacement); area.dispatchEvent(new Event("input", { bubbles: true })); countMatches(); showToast("Replaced " + total + (total === 1 ? " match." : " matches.")); });
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
    icon: sprite("timer"),
    size: [380, 344],
    html() {
      return '<div class="timer-modes" aria-label="Timer mode"><button type="button" class="btn" data-timer-mode="focus" aria-pressed="false">Focus</button><button type="button" class="btn" data-timer-mode="break" aria-pressed="false">Break</button></div><p class="hint" data-timer-status aria-live="polite"></p><input class="field focus-label" type="text" maxlength="80" placeholder="What are you working on?" title="Finished focus sessions are added to Ship Log under this name" aria-label="What are you working on? Finished sessions go to Ship Log." data-focus-label><div class="timer" id="timer" role="timer"></div><div class="row"><button type="button" class="btn primary" data-focus-start>Start</button><button type="button" class="btn" data-focus-pause>Pause</button><button type="button" class="btn" data-focus-reset>Reset</button></div><section class="session-history" data-session-history aria-live="polite"></section>';
    },
    bind(root) {
      root.querySelectorAll("[data-timer-mode]").forEach((button) => {
        button.addEventListener("click", () => selectTimerMode(button.dataset.timerMode));
      });
      const label = root.querySelector("[data-focus-label]"); label.value = data.focusLabel; label.addEventListener("input", () => { data.focusLabel = label.value.slice(0, 80); clearTimeout(label.saveTimer); label.saveTimer = setTimeout(persistData, 400); }); label.addEventListener("change", persistData);
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
    icon: sprite("logs"),
    size: [540, 460],
    html() {
      return '<p class="hint">Total logged: <strong class="stat-strong" data-log-total>' + totalLoggedHours() + 'h</strong> · This week: <strong class="stat-strong" data-log-week-total></strong></p><div class="week" data-log-week aria-label="Hours logged in the last seven days"></div><div class="log-entry-form"><input class="field" type="number" min="0.25" max="24" step="0.25" value="1" id="logH" aria-label="Hours shipped"><input class="field" type="text" maxlength="240" placeholder="What did you ship?" id="logText" aria-label="Ship description"><input class="field" type="text" maxlength="48" placeholder="Project (optional)" id="logProject" aria-label="Project"><input class="field" type="text" placeholder="Tags, comma separated" id="logTags" aria-label="Tags"><button type="button" class="btn primary" data-add-log>Add entry</button></div><div class="log-tools"><label class="form-label log-filter">Search entries<input class="field" type="search" placeholder="Description, project, tag, hours, or date" value="' + escapeHtml(shipFilter) + '" data-log-filter></label><label class="form-label">Date range<select class="field" data-log-range><option value="all"' + (shipDateRange === "all" ? " selected" : "") + '>All time</option><option value="7"' + (shipDateRange === "7" ? " selected" : "") + '>Last 7 days</option><option value="30"' + (shipDateRange === "30" ? " selected" : "") + '>Last 30 days</option></select></label><button type="button" class="btn" data-export-log>Export filtered CSV</button></div><div class="log-list" data-log-list>' + logListHtml() + '</div>';
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
      let weekTotal = null;
      const paintWeek = () => {
        const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - 6 + index); return [day, 0]; });
        data.logs.forEach((entry) => { const at = new Date(entry.at); at.setHours(0, 0, 0, 0); const slot = days.find(([day]) => day.getTime() === at.getTime()); if (slot) slot[1] += Number(entry.h || 0); });
        const peak = Math.max(1, ...days.map(([, hours]) => hours));
        root.querySelector("[data-log-week]").innerHTML = days.map(([day, hours]) => '<div class="week__day" title="' + escapeHtml(fullDateFormat.format(day)) + ": " + formatHours(hours) + 'h"><span class="week__bar" style="height:' + Math.round(hours / peak * 40) + 'px"></span><span class="week__label">' + escapeHtml(narrowDayFormat.format(day)) + "</span></div>").join("");
        const total = days.reduce((sum, [, hours]) => sum + hours, 0); writeText(root.querySelector("[data-log-week-total]"), formatHours(total) + "h" + (data.weekGoal ? " of " + data.weekGoal + "h" : "")); if (data.weekGoal && weekTotal !== null && weekTotal < data.weekGoal && total >= data.weekGoal) { const goal = data.weekGoal; setTimeout(() => { showToast("You reached your " + goal + "h goal for the week."); playSound("win"); }, 0); } weekTotal = total;
      };
      paintWeek();
      const render = () => {
        const rows = filteredLogs();
        const validIds = new Set(data.logs.map((entry) => entry.id));
        selectedLogIds.forEach((id) => {
          if (!validIds.has(id)) selectedLogIds.delete(id);
        });
        list.innerHTML = logListHtml(rows);
        total.textContent = totalLoggedHours() + "h";
        paintWeek();
        const visibleIds = rows.map((entry) => entry.id);
        const visibleSelected = visibleIds.filter((id) => selectedLogIds.has(id)).length;
        const selectVisible = list.querySelector("[data-select-visible]");
        if (selectVisible) {
          selectVisible.checked = visibleIds.length > 0 && visibleSelected === visibleIds.length;
          selectVisible.indeterminate = visibleSelected > 0 && visibleSelected < visibleIds.length;
        }
      };
      const refreshLogs = () => { if (!root.isConnected) return document.removeEventListener("lumen-logs-changed", refreshLogs); render(); }; document.addEventListener("lumen-logs-changed", refreshLogs); document.addEventListener("lumen-day-changed", refreshLogs);
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
          const before = data.logs.slice(); data.logs = data.logs.filter((item) => !selectedLogIds.has(item.id));
          if (editingLogId && selectedLogIds.has(editingLogId)) editingLogId = null;
          selectedLogIds.clear();
          persistData();
          render();
          showToast(count + " ship log " + (count === 1 ? "entry deleted." : "entries deleted."), () => { data.logs = before; persistData(); if (root.isConnected) render(); });
          return;
        }
        const entry = data.logs.find((item) => item.id === id);
        if (action === "cancel") {
          editingLogId = null;
          render();
          return;
        }
        if (!entry) return;
        if (action === "again") { const copy = { ...entry, id: makeId(), at: new Date().toISOString() }; data.logs.unshift(copy); persistData(); render(); showToast("Logged " + formatHours(copy.h) + "h again.", () => { data.logs = data.logs.filter((item) => item.id !== copy.id); persistData(); if (root.isConnected) render(); }); return; }
        if (action === "edit") {
          editingLogId = id;
          render();
          list.querySelector("[data-edit-text]")?.focus();
          return;
        }
        if (action === "delete") {
          if (!await showWindowDialog({ title: "Delete ship log entry", message: "Delete this ship log entry?", confirmLabel: "Delete", danger: true })) return;
          const before = data.logs.slice();
          data.logs = data.logs.filter((item) => item.id !== id);
          selectedLogIds.delete(id);
          if (editingLogId === id) editingLogId = null;
          persistData();
          render();
          showToast("Ship log entry deleted.", () => { data.logs = before; persistData(); if (root.isConnected) render(); });
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
      return () => { document.removeEventListener("lumen-logs-changed", refreshLogs); document.removeEventListener("lumen-day-changed", refreshLogs); };
    },
  },
  {
    id: "checklist",
    name: "Checklist",
    icon: sprite("checklist"),
    size: [500, 420],
    html() {
      return '<form class="checklist-entry" data-task-form><input class="field" type="text" maxlength="160" placeholder="Add a task" aria-label="New task" data-task-input required><input class="field checklist-due" type="date" aria-label="Due date, optional" title="Optional due date" data-task-due><button type="submit" class="btn primary">Add task</button></form><div class="checklist-toolbar"><span class="hint hint--flush" data-task-summary></span><select class="field checklist-view" data-task-show aria-label="Show"><option value="all">All</option><option value="open">To do</option><option value="done">Done</option></select><select class="field checklist-view" data-task-sort aria-label="Sort"><option value="newest">My order</option><option value="name">A to Z</option><option value="open">Unfinished first</option><option value="due">Due date</option><option value="important">Important first</option></select><button type="button" class="btn" data-clear-completed>Clear completed</button></div><div class="checklist" data-task-list></div>';
    },
    bind(root) {
      const form = root.querySelector("[data-task-form]");
      const input = root.querySelector("[data-task-input]");
      const list = root.querySelector("[data-task-list]");
      const summary = root.querySelector("[data-task-summary]");
      const clearCompleted = root.querySelector("[data-clear-completed]");
      const today = () => localDay();
      const render = () => {
        const show = root.querySelector("[data-task-show]").value;
        const sort = root.querySelector("[data-task-sort]").value;
        const shown = data.tasks.filter((task) => show === "all" || (show === "done") === task.done);
        if (sort === "name") shown.sort((a, b) => a.text.localeCompare(b.text));
        if (sort === "open") shown.sort((a, b) => Number(a.done) - Number(b.done));
        if (sort === "important") shown.sort((a, b) => Number(Boolean(b.important)) - Number(Boolean(a.important))); if (sort === "due") shown.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
        list.innerHTML = shown.length ? shown.map((task) => '<div class="checklist-item' + (task.important ? " important" : "") + '" data-task-row="' + escapeHtml(task.id) + '"><label><input type="checkbox" data-task-toggle="' + escapeHtml(task.id) + '"' + (task.done ? " checked" : "") + '><span data-task-text="' + escapeHtml(task.id) + '" title="Double-click to rename">' + escapeHtml(task.text) + '</span>' + (task.due ? '<small class="checklist-when' + (!task.done && task.due < today() ? " late" : !task.done && task.due === today() ? " soon" : "") + '">' + escapeHtml(task.due === today() ? "Today" : shortDateFormat.format(new Date(task.due + "T12:00"))) + "</small>" : "") + '</label><button type="button" class="btn" data-task-delete="' + escapeHtml(task.id) + '" aria-label="Delete ' + escapeHtml(task.text) + '">Delete</button></div>').join("") : '<p class="hint">' + (data.tasks.length ? "Nothing to show here." : "No tasks yet.") + "</p>";
        summary.textContent = data.tasks.filter((task) => !task.done).length + " remaining · " + data.tasks.length + " total";
        clearCompleted.disabled = !data.tasks.some((task) => task.done);
      };
      root.querySelector("[data-task-show]").value = data.views.taskShow; root.querySelector("[data-task-sort]").value = data.views.taskSort; render(); const dayRefresh = () => { if (!root.isConnected) return document.removeEventListener("lumen-day-changed", dayRefresh); render(); }; document.addEventListener("lumen-day-changed", dayRefresh);
      root.querySelectorAll(".checklist-view").forEach((picker) => picker.addEventListener("change", () => { data.views.taskShow = root.querySelector("[data-task-show]").value; data.views.taskSort = root.querySelector("[data-task-sort]").value; persistData(); render(); }));
      list.addEventListener("dblclick", async (event) => {
        const label = event.target.closest("[data-task-text]");
        if (!label) return;
        event.preventDefault();
        const task = data.tasks.find((item) => item.id === label.dataset.taskText);
        const text = task && await showWindowDialog({ title: "Rename task", message: "Change the task text.", value: task.text, confirmLabel: "Rename" });
        if (!text || !text.trim()) return;
        task.text = text.trim().slice(0, 160);
        persistData();
        render();
      });
      clearCompleted.addEventListener("click", () => {
        const before = data.tasks.slice(); const removed = before.length - before.filter((task) => !task.done).length; data.tasks = data.tasks.filter((task) => !task.done);
        persistData();
        render(); if (removed) showToast(removed === 1 ? "Cleared 1 completed task." : "Cleared " + removed + " completed tasks.", () => { data.tasks = before; persistData(); if (root.isConnected) render(); });
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        const due = root.querySelector("[data-task-due]").value;
        data.tasks.unshift({ id: makeId(), text: text.slice(0, 160), done: false, createdAt: new Date().toISOString(), ...(due ? { due } : {}) });
        input.value = "";
        root.querySelector("[data-task-due]").value = "";
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
        const before = data.tasks.slice();
        data.tasks = data.tasks.filter((task) => task.id !== button.dataset.taskDelete);
        persistData();
        render();
        showToast("Task deleted.", () => { data.tasks = before; persistData(); if (root.isConnected) render(); });
      });
      list.addEventListener("keydown", (event) => { const id = event.target.dataset?.taskToggle; if (!id || !event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key) || root.querySelector("[data-task-sort]").value !== "newest") return; event.preventDefault(); const index = data.tasks.findIndex((item) => item.id === id); const swap = index + (event.key === "ArrowUp" ? -1 : 1); if (index < 0 || swap < 0 || swap >= data.tasks.length) return; [data.tasks[index], data.tasks[swap]] = [data.tasks[swap], data.tasks[index]]; persistData(); render(); list.querySelector('[data-task-toggle="' + CSS.escape(id) + '"]')?.focus(); });
      list.addEventListener("contextmenu", (event) => { const row = event.target.closest("[data-task-row]"); const task = row && data.tasks.find((item) => item.id === row.dataset.taskRow); if (!task) return; event.preventDefault(); event.stopPropagation(); const flip = (key) => { task[key] = !task[key]; if (!task[key]) delete task[key]; persistData(); render(); }; showMenu(...toScene(event.clientX, event.clientY), [{ label: task.done ? "Mark as not done" : "Mark as done", run: () => { task.done = !task.done; persistData(); render(); } }, { label: task.important ? "Not important" : "Mark important", run: () => flip("important") }, null, { label: "Rename", run: () => row.querySelector("[data-task-text]")?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })) }, { label: "Delete", run: () => row.querySelector("[data-task-delete]")?.click() }]); });
      let suppressClick = false;
      list.addEventListener("click", (event) => { if (!suppressClick) return; event.preventDefault(); event.stopPropagation(); }, true);
      list.addEventListener("pointerdown", (event) => { const row = event.target.closest("[data-task-row]"); if (!row || event.button !== 0 || event.target.closest("input, button") || root.querySelector("[data-task-sort]").value !== "newest") return; const startY = event.clientY; let target = null; let after = false; let moved = false; try { list.setPointerCapture(event.pointerId); } catch { return; } const clearMarks = () => list.querySelectorAll(".drop-before, .drop-after").forEach((item) => item.classList.remove("drop-before", "drop-after")); const move = (next) => { if (!moved && Math.abs(next.clientY - startY) < 4) return; moved = true; row.classList.add("dragging"); const [x, y] = toScene(next.clientX, next.clientY); const over = document.elementFromPoint(x, y)?.closest("[data-task-row]"); clearMarks(); target = over && over !== row && list.contains(over) ? over : null; if (!target) return; const box = target.getBoundingClientRect(); after = y > box.top + box.height / 2; target.classList.add(after ? "drop-after" : "drop-before"); }; const stop = () => { list.removeEventListener("pointermove", move); list.removeEventListener("pointerup", stop); list.removeEventListener("pointercancel", stop); row.classList.remove("dragging"); clearMarks(); if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); } if (!target) return; const task = data.tasks.find((item) => item.id === row.dataset.taskRow); data.tasks = data.tasks.filter((item) => item !== task); data.tasks.splice(data.tasks.findIndex((item) => item.id === target.dataset.taskRow) + (after ? 1 : 0), 0, task); persistData(); render(); }; list.addEventListener("pointermove", move); list.addEventListener("pointerup", stop); list.addEventListener("pointercancel", stop); });
    },
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: sprite("calculator"),
    size: [284, 436],
    html() {
      const keys = [["MC", "mc", "mem"], ["MR", "mr", "mem"], ["M+", "m+", "mem"], ["M−", "m-", "mem"], ["√", "sqrt", "fn"], ["%", "percent", "fn"], ["±", "negate", "fn"], ["1/x", "inverse", "fn"], ["C", "clear", "op"], ["(", "(", "op"], [")", ")", "op"], ["÷", "/", "op"], ["7", "7", "digit"], ["8", "8", "digit"], ["9", "9", "digit"], ["×", "*", "op"], ["4", "4", "digit"], ["5", "5", "digit"], ["6", "6", "digit"], ["−", "-", "op"], ["1", "1", "digit"], ["2", "2", "digit"], ["3", "3", "digit"], ["+", "+", "op"], ["⌫", "back", "op"], ["0", "0", "digit"], [".", ".", "digit"], ["=", "equals", "op"]];
      return '<div class="calc" data-calc data-autofocus tabindex="0" aria-label="Calculator. Type numbers and operators or use the keypad."><div class="calc__screen"><span class="calc__expr" data-calc-expr></span><output class="calc__value" data-calc-value aria-live="polite">0</output></div><div class="calc__keys">' + keys.map(([label, key, kind]) => '<button type="button" class="btn calc__' + kind + '" data-calc-key="' + escapeHtml(key) + '" aria-label="' + escapeHtml(key === "back" ? "Backspace" : key === "clear" ? "Clear" : key === "equals" ? "Equals" : { mc: "Memory clear", mr: "Memory recall", "m+": "Memory add", "m-": "Memory subtract", sqrt: "Square root", percent: "Percent", negate: "Change sign", inverse: "Reciprocal" }[key] || label) + '">' + label + '</button>').join("") + '</div><ol class="calc__tape" data-calc-tape aria-label="Recent results"></ol></div>';
    },
    bind(root) {
      const calc = root.querySelector("[data-calc]");
      const exprView = root.querySelector("[data-calc-expr]");
      const valueView = root.querySelector("[data-calc-value]");
      const tape = root.querySelector("[data-calc-tape]");
      const pretty = (value) => value.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
      let expression = "";
      let evaluated = false;
      const results = data.calcTape; const paintTape = () => { tape.innerHTML = results.map(([sum, answer]) => '<li><button type="button" data-calc-recall="' + escapeHtml(answer) + '">' + escapeHtml(sum) + " = <strong>" + escapeHtml(answer) + "</strong></button></li>").join(""); }; paintTape();
      let memory = 0;
      const render = (value, preview) => {
        writeText(exprView, pretty(expression));
        writeText(valueView, value);
        valueView.classList.toggle("preview", preview);
      };
      const press = (key) => {
        if (["sqrt", "percent", "negate", "inverse"].includes(key)) {
          const current = calculateExpression(expression || "0");
          if (!current.ok) return render(current.error, false);
          const value = { sqrt: Math.sqrt(current.value), percent: current.value / 100, negate: -current.value, inverse: 1 / current.value }[key];
          if (!Number.isFinite(value)) return render("That calculation has no finite result.", false);
          const tidy = Number(value.toPrecision(12));
          results.unshift([{ sqrt: "√", percent: "%", negate: "±", inverse: "1/" }[key] + "(" + pretty(expression || "0") + ")", String(tidy)]);
          results.length = Math.min(results.length, 5);
          paintTape(); persistData();
          expression = tidy < 0 ? "(0" + tidy + ")" : String(tidy);
          evaluated = true;
          return render(String(tidy), false);
        }
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
          paintTape(); persistData();
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
      calc.addEventListener("paste", (event) => {
        const text = event.clipboardData?.getData("text/plain").replace(/,/g, "").trim() || "";
        if (!/^[\d\s()+\-*/%.]+$/.test(text)) return;
        event.preventDefault();
        press("clear");
        [...text.replace(/\s+/g, "")].slice(0, 120).forEach((character) => press(character));
      });
      calc.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
          event.preventDefault();
          navigator.clipboard?.writeText(valueView.textContent).then(() => showToast("Copied " + valueView.textContent + "."), () => {});
          return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = { Enter: "equals", "=": "equals", Backspace: "back", Escape: "clear", Delete: "clear", x: "*", X: "*", "@": "sqrt", F9: "negate", r: "inverse", R: "inverse" }[event.key] || (/^[\d.+\-*/%()]$/.test(event.key) ? event.key : null);
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
    icon: sprite("minesweeper"),
    size: [236, 334],
    html() {
      return '<div class="mines"><div class="mines__bar"><output class="mines__led" data-mine-count aria-label="Mines left">010</output><button type="button" class="btn mines__reset" data-mine-reset aria-label="New game"><img src="' + sprite("mine-face") + '" alt="" width="24" height="24"></button><output class="mines__led" data-mine-time aria-label="Seconds elapsed">000</output></div><select class="field mines__level" data-mine-level aria-label="Difficulty"><option value="beginner">Beginner, 9 by 9</option><option value="intermediate">Intermediate, 16 by 16</option><option value="expert">Expert, 30 by 16</option><option value="custom" data-mine-custom-label>Custom</option><option value="custom-edit">Custom...</option></select><div class="mines__board" data-mine-board role="grid" aria-label="Minefield"></div><p class="hint hint--flush" data-mine-status aria-live="polite"></p></div>';
    },
    bind(root) {
      const levels = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [30, 16, 99] };
      let [width, height, mines] = data.mineLevel === "custom" ? data.mineCustom : levels[data.mineLevel];
      const levelPicker = root.querySelector("[data-mine-level]");
      const showCustomLabel = () => writeText(levelPicker.querySelector("[data-mine-custom-label]"), "Custom, " + data.mineCustom[0] + " by " + data.mineCustom[1]); showCustomLabel(); levelPicker.value = data.mineLevel;
      const best = () => data.mineLevel === "beginner" ? data.mineBest : data.mineBests[data.mineLevel] || 0;
      const board = root.querySelector("[data-mine-board]");
      const counter = root.querySelector("[data-mine-count]");
      const clock = root.querySelector("[data-mine-time]");
      const status = root.querySelector("[data-mine-status]");
      let cells = [];
      const build = () => {
        [width, height, mines] = data.mineLevel === "custom" ? data.mineCustom : levels[data.mineLevel];
        board.style.gridTemplateColumns = "repeat(" + width + ", 20px)";
        board.innerHTML = Array.from({ length: width * height }, (_, index) => '<button type="button" class="mine-cell" data-mine-cell="' + index + '" aria-label="Hidden square"></button>').join("");
        cells = Array.from(board.children);
        const win = root.closest(".win");
        if (win && !win.classList.contains("max")) win.style.cssText += "width:" + Math.max(236, width * 20 + 52) + "px;height:" + (height * 20 + 210) + "px";
      };
      build();
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
          writeText(cell, open && !info.mine && info.count ? String(info.count) : "");
          cell.classList.toggle("flagged", !open && flags.has(index));
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
        writeText(status, best() ? "Best time " + best() + "s. Right click or press F to flag." : "Click a square to start. Right click or press F to flag, and click a number to clear around it.");
        paint();
      };
      const finish = (won) => {
        over = true;
        stopClock();
        if (won) {
          const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
          const record = data.mineLevel !== "custom" && (!best() || seconds < best());
          if (record && data.mineLevel === "beginner") data.mineBest = seconds;
          else if (record) data.mineBests[data.mineLevel] = seconds;
          persistData();
          writeText(status, "Cleared in " + seconds + "s." + (record ? " New best time." : best() ? " Best is " + best() + "s." : ""));
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
        if (flags.has(index)) return;
        if (revealed.has(index)) {
          const info = field?.[index];
          if (!info || info.mine || !info.count) return;
          const around = neighbors(index, width, height);
          if (around.filter((cell) => flags.has(cell)).length !== info.count) return;
          for (const cell of around) {
            if (flags.has(cell) || revealed.has(cell)) continue;
            revealed = revealArea(field, width, height, cell, revealed, flags);
            if (field[cell].mine) return finish(false);
          }
          if (revealed.size === width * height - mines) return finish(true);
          return paint();
        }
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
      levelPicker.addEventListener("change", async () => { if (levelPicker.value === "custom-edit") { const answer = await showWindowDialog({ title: "Custom Field", message: "Enter the width, height, and number of mines. Width runs from 8 to 30 and height from 8 to 24.", value: data.mineCustom.join(" "), confirmLabel: "OK" }); const field = answer === null ? null : mineCustomField(answer); if (!field) { levelPicker.value = data.mineLevel; return; } data.mineCustom = field; levelPicker.value = "custom"; } data.mineLevel = levelPicker.value; showCustomLabel(); persistData(); build(); reset(); });
      reset();
      return stopClock;
    },
  },
  {
    id: "paint",
    name: "Paint",
    icon: sprite("paint"),
    size: [372, 444],
    html() {
      const colors = ["#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"];
      return '<div class="paint"><div class="paint__tools" role="toolbar" aria-label="Paint tools" data-paint-tools><button type="button" class="btn active" data-paint-tool="pencil" aria-pressed="true">Pencil</button><button type="button" class="btn" data-paint-tool="eraser" aria-pressed="false">Eraser</button><button type="button" class="btn" data-paint-tool="fill" aria-pressed="false">Fill</button><button type="button" class="btn" data-paint-tool="airbrush" aria-pressed="false">Airbrush</button><button type="button" class="btn" data-paint-tool="smudge" aria-pressed="false">Smudge</button><button type="button" class="btn" data-paint-tool="picker" aria-pressed="false">Picker</button><button type="button" class="btn" data-paint-tool="line" aria-pressed="false">Line</button><button type="button" class="btn" data-paint-tool="rect" aria-pressed="false">Rectangle</button><button type="button" class="btn" data-paint-tool="ellipse" aria-pressed="false">Ellipse</button><label class="paint__size">Size <select class="field" data-paint-size><option value="1">1</option><option value="2" selected>2</option><option value="4">4</option><option value="8">8</option></select></label></div><canvas class="paint__canvas" data-paint-canvas width="160" height="104" tabindex="0" aria-label="Drawing canvas"></canvas><div class="paint__palette" role="radiogroup" aria-label="Colors" data-paint-palette>' + colors.map((color, index) => '<button type="button" class="paint__swatch" style="--swatch:' + color + '" data-paint-color="' + color + '" role="radio" aria-checked="' + (index === 0) + '" aria-label="Color ' + color + '"></button>').join("") + '</div><div class="row row--actions"><button type="button" class="btn" data-paint-undo disabled>Undo</button><button type="button" class="btn" data-paint-clear>Clear</button><button type="button" class="btn" data-paint-open>Open...</button><input class="sr-only" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp" data-paint-file><button type="button" class="btn" data-paint-save>Save PNG</button><button type="button" class="btn" data-paint-edit-color title="Edit colors">Colors...</button><input class="sr-only" type="color" value="#000000" data-paint-custom aria-label="Custom color" tabindex="-1"><span class="hint hint--flush" data-paint-status aria-live="polite">Saved on this device.</span></div></div>';
    },
    bind(root) {
      const canvas = root.querySelector("[data-paint-canvas]");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const sizeInput = root.querySelector("[data-paint-size]");
      const status = root.querySelector("[data-paint-status]");
      let tool = "pencil";
      let color = "#000000";
      let last = null;
      let shapeStart = null;
      let shapeBase = null;
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
        if (["line", "rect", "ellipse"].includes(tool)) { shapeStart = at; shapeBase = undo[undo.length - 1]; stamp(at); return; }
        shapeStart = null;
        (tool === "airbrush" ? airbrush : tool === "smudge" ? smudge : stamp)(at);
        if (tool === "airbrush") { lastSpray = performance.now(); sprayFrame = requestAnimationFrame(spray); }
      });
      canvas.addEventListener("pointermove", (event) => {
        if (!last) return;
        const at = point(event);
        if (shapeStart && shapeBase) { context.putImageData(shapeBase, 0, 0); shapePoints(tool, shapeStart[0], shapeStart[1], at[0], at[1]).forEach(stamp); last = at; return; }
        linePoints(last[0], last[1], at[0], at[1]).forEach(tool === "airbrush" ? airbrush : tool === "smudge" ? smudge : stamp);
        last = at;
      });
      const end = () => {
        cancelAnimationFrame(sprayFrame); sprayFrame = 0;
        if (!last) return;
        last = null;
        shapeStart = null;
        shapeBase = null;
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
      const customColor = root.querySelector("[data-paint-custom]"); root.querySelector("[data-paint-edit-color]").addEventListener("click", () => { customColor.value = color; try { customColor.showPicker(); } catch { customColor.click(); } }); customColor.addEventListener("input", () => { color = customColor.value; root.querySelectorAll("[data-paint-color]").forEach((item) => item.setAttribute("aria-checked", String(item.dataset.paintColor === color))); if (tool === "eraser") root.querySelector('[data-paint-tool="pencil"]').click(); writeText(status, "Color " + color.toUpperCase() + "."); });
      root.querySelector("[data-paint-palette]").addEventListener("click", (event) => {
        const swatch = event.target.closest("[data-paint-color]");
        if (!swatch) return;
        color = swatch.dataset.paintColor;
        root.querySelectorAll("[data-paint-color]").forEach((item) => item.setAttribute("aria-checked", String(item === swatch)));
        if (tool === "eraser") root.querySelector('[data-paint-tool="pencil"]').click();
      });
      undoButton.addEventListener("click", () => { const image = undo.pop(); if (!image) return; context.putImageData(image, 0, 0); undoButton.disabled = undo.length === 0; store(); });
      root.addEventListener("keydown", (event) => { if (!(event.ctrlKey || event.metaKey) || event.altKey || event.target.closest("input, textarea")) return; const key = event.key.toLowerCase(); if (key === "z" && !undoButton.disabled) { event.preventDefault(); undoButton.click(); } else if (key === "o") { event.preventDefault(); root.querySelector("[data-paint-open]")?.click(); } });
      root.querySelector("[data-paint-clear]").addEventListener("click", async () => {
        if (!await showWindowDialog({ title: "Paint", message: "Clear the whole drawing?", confirmLabel: "Clear", danger: true })) return;
        snapshot();
        blank();
        store();
      });
      const paintFile = root.querySelector("[data-paint-file]");
      root.querySelector("[data-paint-open]").addEventListener("click", () => paintFile.click());
      paintFile.addEventListener("change", async () => {
        const file = paintFile.files?.[0];
        paintFile.value = "";
        if (!file) return;
        try {
          const picture = await createImageBitmap(file);
          const scale = Math.min(canvas.width / picture.width, canvas.height / picture.height);
          const width = Math.max(1, Math.round(picture.width * scale));
          const height = Math.max(1, Math.round(picture.height * scale));
          snapshot();
          blank();
          context.imageSmoothingEnabled = true;
          context.drawImage(picture, Math.floor((canvas.width - width) / 2), Math.floor((canvas.height - height) / 2), width, height);
          picture.close();
          store();
          showToast(file.name + " was opened in Paint.");
        } catch {
          showToast("Paint could not open that picture.");
        }
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
    icon: sprite("calendar"),
    size: [400, 560],
    html() {
      return '<div class="cal"><div class="cal__head"><button type="button" class="btn cal__step" data-cal-step="-1" aria-label="Previous month">◀</button><strong class="cal__title" data-cal-title aria-live="polite"></strong><button type="button" class="btn cal__step" data-cal-step="1" aria-label="Next month">▶</button><button type="button" class="btn" data-cal-today>Today</button></div><div class="cal__grid" data-cal-grid></div><h3 class="section-title" data-cal-selected></h3><ul class="cal__events" data-cal-events></ul><form class="checklist-entry" data-cal-form><input class="field" type="text" maxlength="160" placeholder="Add an event" aria-label="New event" data-cal-input required><input class="field cal__time" type="time" aria-label="Reminder time, optional" title="Optional reminder time" data-cal-time><select class="field cal__repeat-pick" aria-label="Repeat" title="Repeat" data-cal-repeat><option value="">Once</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select><button type="submit" class="btn">Add</button></form><h3 class="cal__upcoming-title">Upcoming</h3><ul class="cal__upcoming" data-cal-upcoming></ul></div>';
    },
    bind(root) {
      const localDate = localDay;
      let today = localDate(new Date());
      let year = new Date().getFullYear();
      let month = new Date().getMonth();
      let selected = today;
      const grid = root.querySelector("[data-cal-grid]");
      const list = root.querySelector("[data-cal-events]");
      const input = root.querySelector("[data-cal-input]");
      const render = () => {
        today = localDate(new Date());
        const busy = new Set(monthGrid(year, month).map((cell) => cell.date).filter((date) => data.events.some((event) => eventOn(event, date))));
        writeText(root.querySelector("[data-cal-title]"), monthTitleFormat.format(new Date(year, month, 1)));
        grid.innerHTML = ["S", "M", "T", "W", "T", "F", "S"].map((day) => '<span class="cal__weekday" aria-hidden="true">' + day + "</span>").join("") + monthGrid(year, month).map((cell) => '<button type="button" class="cal__day' + (cell.inMonth ? "" : " out") + (cell.date === today ? " today" : "") + (cell.date === selected ? " selected" : "") + (busy.has(cell.date) ? " busy" : "") + '" data-cal-date="' + cell.date + '" aria-pressed="' + (cell.date === selected) + '" aria-label="' + escapeHtml(fullDateFormat.format(new Date(cell.date + "T12:00"))) + (busy.has(cell.date) ? ", has events" : "") + '">' + cell.day + "</button>").join("");
        const focusDay = grid.querySelector('[data-cal-date="' + selected + '"]') || grid.querySelector(".cal__day:not(.out)"); grid.querySelectorAll("[data-cal-date]").forEach((day) => { day.tabIndex = day === focusDay ? 0 : -1; if (day.dataset.calDate === today) day.setAttribute("aria-current", "date"); }); writeText(root.querySelector("[data-cal-selected]"), dayHeadingFormat.format(new Date(selected + "T12:00")));
        const upcoming = data.events.map((event) => ({ ...event, date: nextOccurrence(event, today) })).filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")).slice(0, 5);
        root.querySelector("[data-cal-upcoming]").innerHTML = upcoming.length ? upcoming.map((event) => '<li><button type="button" class="cal__jump" data-cal-jump="' + event.date + '"><span>' + escapeHtml(shortDateFormat.format(new Date(event.date + "T12:00"))) + "</span> " + (event.time ? escapeHtml(event.time) + " " : "") + escapeHtml(event.text) + "</button></li>").join("") : '<li class="hint">Nothing coming up.</li>';
        const events = data.events.filter((event) => eventOn(event, selected)).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        list.innerHTML = events.length ? events.map((event) => '<li class="checklist-item"><span data-cal-edit="' + escapeHtml(event.id) + '" title="Double-click to edit">' + (event.time ? '<strong class="cal__at">' + escapeHtml(event.time) + "</strong> " : "") + escapeHtml(event.text) + (event.repeat ? ' <span class="cal__repeat">' + event.repeat[0].toUpperCase() + event.repeat.slice(1) + "</span>" : "") + '</span><button type="button" class="btn" data-cal-delete="' + escapeHtml(event.id) + '" aria-label="Delete ' + escapeHtml(event.text) + '">Delete</button></li>').join("") : '<li class="hint">Nothing planned.</li>';
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
        const time = root.querySelector("[data-cal-time]").value;
        data.events.push({ id: makeId(), date: selected, text: text.slice(0, 160), ...(time ? { time } : {}), ...(root.querySelector("[data-cal-repeat]").value ? { repeat: root.querySelector("[data-cal-repeat]").value } : {}) });
        data.events.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
        input.value = "";
        root.querySelector("[data-cal-time]").value = ""; root.querySelector("[data-cal-repeat]").value = "";
        persistData();
        render();
      });
      root.querySelector("[data-cal-upcoming]").addEventListener("click", (event) => { const jump = event.target.closest("[data-cal-jump]"); if (!jump) return; selected = jump.dataset.calJump; const picked = new Date(selected + "T12:00"); year = picked.getFullYear(); month = picked.getMonth(); render(); });
      list.addEventListener("dblclick", async (event) => { const item = data.events.find((entry) => entry.id === event.target.closest("[data-cal-edit]")?.dataset.calEdit); if (!item) return; const answer = await showWindowDialog({ title: "Edit event", message: "Change the event. Start with a time like 09:30 to set a reminder.", value: (item.time ? item.time + " " : "") + item.text, confirmLabel: "Save" }); const match = answer?.trim().match(/^(([01]\d|2[0-3]):[0-5]\d)\s+(.+)$/); const text = (match ? match[3] : answer || "").trim().slice(0, 160); if (!text) return; if ((match?.[1] || "") !== (item.time || "")) delete item.reminded; item.text = text; if (match) item.time = match[1]; else delete item.time; data.events.sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")); persistData(); render(); });
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-cal-delete]");
        if (!button) return;
        const before = data.events.slice(); data.events = data.events.filter((item) => item.id !== button.dataset.calDelete);
        persistData();
        render(); showToast("Event deleted.", () => { data.events = before; persistData(); if (root.isConnected) render(); });
      });
      render(); const dayRefresh = () => { if (!root.isConnected) return document.removeEventListener("lumen-day-changed", dayRefresh); render(); }; document.addEventListener("lumen-day-changed", dayRefresh);
    },
  },
  {
    id: "terminal",
    name: "Command Prompt",
    icon: sprite("terminal"),
    size: [500, 300],
    html() {
      return '<div class="cmd" data-cmd><pre class="cmd__log" data-cmd-log aria-live="polite"></pre><form class="cmd__line" data-cmd-form><label class="cmd__prompt" for="cmdInput">C:\\LUMEN&gt;</label><input id="cmdInput" class="cmd__input" type="text" autocomplete="off" spellcheck="false" data-cmd-input data-autofocus></form></div>';
    },
    bind(root) {
      const log = root.querySelector("[data-cmd-log]");
      const input = root.querySelector("[data-cmd-input]");
      const history = [];
      let cursor = 0;
      let scriptController = null;
      const print = (text) => {
        log.textContent += text + "\n";
        log.scrollTop = log.scrollHeight;
      };
      const findApp = (name) => apps.find((app) => app.id === name.toLowerCase() || app.name.toLowerCase() === name.toLowerCase());
      const scriptTargets = (selector) => selector === "*" ? [...open.values()] : [...open.values()].filter((entry) => entry.app.id.toLowerCase() === selector.toLowerCase() || entry.app.name.toLowerCase() === selector.toLowerCase());
      const scriptAction = async (command, args) => { const [selector = "", ...parts] = args.split(/\s+/); const targets = scriptTargets(selector); if (command === "open") { const app = findApp(args); if (!app) throw new Error("No program named " + args); openApp(app.id); } else if (command === "close") targets.forEach((entry) => closeApp(entry.app.id)); else if (command === "focus") targets[0] && focusWin(targets[0].app.id); else if (command === "minimize") targets.forEach((entry) => minimizeApp(entry.app.id)); else if (command === "restore") targets.forEach((entry) => restoreApp(entry.app.id)); else if (command === "title") targets.forEach((entry) => { entry.el.querySelector(".bar-title").lastChild.textContent = parts.join(" ").slice(0, 80); }); else if (command === "move") { const [x, y] = parts.map(Number); if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Usage: MOVE window x y"); targets.forEach((entry) => { entry.el.style.left = Math.round(x) + "px"; entry.el.style.top = Math.round(y) + "px"; constrainWindow(entry.el); }); } else if (command === "jitter") { const amount = Math.max(1, Math.min(96, Number(parts[0]) || 16)); targets.forEach((entry) => { entry.el.style.left = entry.el.offsetLeft + Math.round((Math.random() * 2 - 1) * amount) + "px"; entry.el.style.top = entry.el.offsetTop + Math.round((Math.random() * 2 - 1) * amount) + "px"; constrainWindow(entry.el); }); } else if (command === "toast") showToast(args); else { const guess = suggest(command, ["open", "close", "focus", "minimize", "restore", "title", "move", "jitter", "toast", "window", "screen", "cls", "pixel", "rect", "box", "line", "circle", "text", "button", "frame", "sound", "caption", "icon", "closewindow", "print", "let", "if", "while", "for", "gosub", "sub", "call", "dim", "input", "sleep"]); throw new Error("Unknown command: " + command + (guess ? ". Did you mean " + guess + "?" : "")); } };
      const demoScript = 'open calculator\nopen notes\nopen files\nlet n = 0\nloop:\ntitle * You are an idiot\njitter * 28\nsleep 90\nlet n = n + 1\nif n < 45 goto loop\ntitle * LUMEN survived\ntoast Harmless chaos complete.';
      const executeScript = async (source, fileId = null) => { scriptController?.abort(); const controller = new AbortController(); scriptController = controller; try { await runScript(source, { action: scriptAction, output: print, signal: controller.signal, host: createScriptHost(() => controller.abort()) }); return "Script complete."; } catch (error) { if (error.name !== "AbortError" && fileId && data.files.some((item) => item.id === fileId)) { openApp("files"); document.dispatchEvent(new CustomEvent("lumen-open-file", { detail: fileId })); document.dispatchEvent(new CustomEvent("lumen-script-error", { detail: { fileId, line: Number(error.message.match(/^Line (\d+):/)?.[1] || 1), message: error.message.replace(/^Line \d+:\s*/, "") } })); } return error.name === "AbortError" ? "Script stopped." : "Script error: " + error.message; } finally { if (scriptController === controller) scriptController = null; } };
      const runRequested = (event) => { print("C:\\LUMEN>run " + event.detail.name); executeScript(event.detail.content, event.detail.fileId).then(print); }; document.addEventListener("lumen-run-script", runRequested);
      const stopRequested = () => scriptController?.abort(); document.addEventListener("lumen-stop-script", stopRequested);
      const commands = {
        help: () => "apps            list programs\nopen <app>      start a program\ncalc <sum>      do arithmetic\ntask <text>     add to Checklist\ntasks           show Checklist\nnote <text>     append a line to Notes\nstart <app>     same as open\nrun <file>      run a LUMEN Script program, like run flappy.lsc\nsamples         copy example programs into Files\\Programs\nscript help     show the scripting language\nscript demo     run harmless window chaos\neval <code>     run one LUMEN Script statement\nstop            stop a running script\ndir             list files in C:\\\ntree            show every folder and file\ntype <file>     print a text file\ndate            show the date\ntime            show the time\nwhoami          show who is signed in\nmem             show storage use\ncolor <xy>      set colors, for example color 1f\necho <text>     repeat text\ncls             clear the screen\nver             show the version\nshutdown        turn off LUMEN\nexit            close this window",
        apps: () => apps.filter((app) => !isFolderId(app.id)).map((app) => app.id.padEnd(14) + app.name).join("\n"),
        open: (args) => {
          const app = findApp(args);
          if (!app) return "No program named " + args + "." + ((guess) => guess ? " Did you mean " + guess + "?" : " Type apps to list them.")(suggest(args, apps.filter((item) => !isFolderId(item.id) && !item.id.startsWith("script:")).flatMap((item) => [item.id, item.name])));
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
        run: (args) => { const file = data.files.find((item) => item.kind === "text" && item.name.toLowerCase() === args.toLowerCase()); return file ? executeScript(file.content, file.id) : "The system cannot find the script file." + ((guess) => guess ? " Did you mean " + guess + "?" : " Type samples to get example programs.")(suggest(args, data.files.filter((item) => item.kind === "text").map((item) => item.name))); },
        note: (args) => {
          if (!args) return "Usage: note <text>";
          if (open.has("notes")) return "Close Notes first so its open edits are not overwritten.";
          data.notes = (data.notes ? data.notes.replace(/\n*$/, "\n") : "") + args;
          persistData();
          return "Appended to Notes.";
        },
        start: (args) => commands.open(args),
        script: (args) => { const topic = args.toLowerCase().replace(/^help\b/, "").trim(); if (topic === "demo") return executeScript(demoScript); const pages = { "": "LUMEN Script 3 is a BASIC style language with its own graphics windows.\nscript help language   values, loops, functions, subs and arrays\nscript help draw       windows, the pixel screen, text and images\nscript help input      keyboard, mouse, wheel and widgets\nscript help shaders    pixel shaders and screen effects\nscript help more       sound, files and the desktop\nExamples live in Files, in the Programs folder. Try run breakout.lsc, run orbits.lsc, run sorting.lsc, or run raycaster.lsc, run explorer.lsc, run plasma.lsc,\nrun fireworks.lsc, run synth.lsc, run flappy.lsc, run snake.lsc, run life.lsc, or run typewriter.lsc.\nSelect any .lsc file in Files to edit it. F5 runs, F6 checks, and Shift+F5 stops. Ctrl+C or stop ends a program.", "language": "Values: numbers, \"text\", true, false, and arrays like [1, 2, 3]\nMath: + - * / % ^, comparisons == != < > <= >=, and, or, not\nname = value   LOCAL name = value   DIM grid(w, h)   grid[x][y] = 1\nPRINT a, b   INPUT name, \"prompt\"   SLEEP ms\nIF cond THEN statement   IF cond THEN ... ELSE ... END IF\nWHILE cond ... WEND   FOR i = 1 TO 10 STEP 2 ... NEXT   REPEAT ... UNTIL cond   BREAK   CONTINUE\nlabel:   GOTO label   GOSUB label ... RETURN   END\nFUNCTION name(a, b) ... RETURN value ... END FUNCTION runs instantly and can call itself\nSUB name(a, b) ... END SUB, then CALL name(1, 2)\nWARP ... END WARP runs a block without redrawing the screen, like running without screen refresh in Scratch\nFunctions: abs int floor ceil round sqrt sin cos tan atan2 pow exp log min max clamp lerp fract smoothstep\n  map dist noise rnd random pi len str num upper lower mid left right instr replace repeat chr ord fixed pad\n  time clock array push pop shift insert remove join split slice indexof contains copy sort reverse fill sum\n  rgb rgba hsv", "draw": "WINDOW \"Title\", width, height, \"icon\"   CAPTION text   ICON name   WINDOWSIZE w, h   MAXIMIZE   CLOSEWINDOW\n  the icon can be any program or picture, like files, paint, notes, fortune, or recycle-bin\nSCREEN w, h sets the resolution and fits the window to a whole number scale\nSCREEN \"auto\", scale follows the window as it resizes\nCLS color   PIXEL x, y, color   RECT x, y, w, h, color   BOX x, y, w, h, color   LINE x1, y1, x2, y2, color\nCIRCLE x, y, r, color, solid   TRIANGLE x1, y1, x2, y2, x3, y3, color   SCROLL dx, dy, wrap\nTEXT x, y, value, color, size, align, font   align is 0 left, 1 center, or 2 right\n  fonts: sans, mono, serif, bold, title, type, and pixel for blocky text drawn into the screen\n  Text stays sharp at any size until CLS, a solid RECT over it, or new text at the same spot\nDRAWICON name, x, y, scale   CAPTURE name, x, y, w, h   STAMP name, x, y, scale, flip\nColors: 0 to 15, names like \"red\", \"#rgb\", \"#rrggbb\", \"#rrggbbaa\" to see through, rgb(), rgba(), hsv()\nFRAME shows the picture and waits for the next frame. PRESENT shows it without waiting\nwidth() height() winwidth() winheight() resized() getpixel(x, y) textwidth(text, size, font) fps() delta()", "input": "key(\"space\") is held down   keyhit(\"arrowup\") was pressed since you last asked\nlastkey() gives the next typed character, with chr(10) for Enter and chr(8) for Backspace\nmousex() mousey() mousedown() mousehit() wheel()\nBUTTON name, \"Label\"   SLIDER name, \"Label\", low, high, start, step   CHECKBOX name, \"Label\", on\nTEXTBOX name, \"Label\", start   LABEL name, \"text\"   SETVALUE name, value\nclicked(name) value(name) changed(name)", "shaders": "SHADER name, amount   NOSHADER name   SHADER \"off\" removes them all\nScreen effects: brightness contrast saturate grayscale sepia invert hue blur glow zoom rotate spin\n  mirror shake scanlines vignette\nPixel effects: pixelate posterize threshold wave ripple chroma kaleido grain edges\nSHADER \"custom\", \"red\", \"green\", \"blue\" runs LUMEN Script expressions for every pixel.\n  They can use x y u v r g b t w h, your variables, and your functions. One expression may return a color", "more": "TONE frequency, ms, wave, volume   waves: square, sine, triangle, sawtooth   SOUND name\nWRITEFILE name, text   APPENDFILE name, text   readfile(name) hasfile(name) files()\nDesktop: OPEN, CLOSE, FOCUS, MINIMIZE, RESTORE, TITLE, MOVE, JITTER window   TOAST text\nscript demo runs harmless chaos." }; return pages[topic] ?? pages[""]; },
        samples: async () => { const added = await installScriptSamples(); return (added ? "Copied or updated " + added + " example programs" : "The example programs are already") + " in Files, in the Programs folder.\nTry run breakout.lsc, run orbits.lsc, run sorting.lsc, or run raycaster.lsc.\nSelect a file to edit it. F5 runs, F6 checks syntax, and Shift+F5 stops."; },
        eval: (args) => args ? executeScript(args) : "Usage: eval <LUMEN Script statement>",
        stop: () => { if (!scriptController) return "No script is running."; scriptController.abort(); return "Stopping script..."; },
        dir: () => { const top = data.files.filter((item) => !item.parent); return top.length ? " Directory of C:\\\n\n" + top.map((item) => (item.kind === "folder" ? "<DIR>     " : String(item.content.length).padStart(9) + " ") + item.name).join("\n") + "\n\n" + top.length + " item(s)" : " Directory of C:\\\n\nFile Not Found"; },
        tree: () => { const lines = []; const walk = (parent, depth) => data.files.filter((item) => item.parent === parent).forEach((item) => { lines.push("    ".repeat(depth) + (item.kind === "folder" ? "+-- " : "|   ") + item.name); if (item.kind === "folder") walk(item.id, depth + 1); }); walk(null, 0); return "C:\\\n" + (lines.join("\n") || "No subfolders exist"); },
        type: (args) => { const file = data.files.find((item) => item.kind === "text" && item.name.toLowerCase() === args.toLowerCase()); return file ? file.content || "(empty)" : "The system cannot find the file specified." + ((guess) => guess ? " Did you mean " + guess + "?" : "")(suggest(args, data.files.filter((item) => item.kind === "text").map((item) => item.name))); },
        time: () => new Date().toLocaleTimeString(),
        whoami: () => "lumen\\builder",
        mem: () => { let used = 0; try { used = Object.keys(localStorage).reduce((sum, key) => sum + key.length + (localStorage.getItem(key) || "").length, 0); } catch {} return Math.round(used / 1024) + "K of browser storage in use\n" + data.files.length + " files, " + data.tasks.length + " tasks, " + data.logs.length + " log entries"; },
        color: (args) => { const palette = ["#000", "#000080", "#008000", "#008080", "#800000", "#800080", "#808000", "#c0c0c0", "#808080", "#0000ff", "#00ff00", "#00ffff", "#ff0000", "#ff00ff", "#ffff00", "#fff"]; const code = (args || "07").toLowerCase(); if (!/^[0-9a-f]{2}$/.test(code) || code[0] === code[1]) return "Usage: color <background><text>, for example color 07 or color 1f"; const shell = root.querySelector(".cmd"); shell.style.background = palette[parseInt(code[0], 16)]; shell.style.color = palette[parseInt(code[1], 16)]; return null; },
        shutdown: () => { turnOffDialog(); return null; },
        date: () => new Date().toLocaleDateString(undefined, { dateStyle: "full" }),
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
      root.querySelector("[data-cmd-form]").addEventListener("submit", async (event) => {
        event.preventDefault();
        const line = input.value.trim();
        input.value = "";
        print("C:\\LUMEN>" + line);
        if (!line) return;
        history.push(line);
        cursor = history.length;
        const [name, ...rest] = line.split(/\s+/);
        const command = Object.hasOwn(commands, name.toLowerCase()) ? commands[name.toLowerCase()] : null;
        const output = command ? await command(rest.join(" ")) : "'" + name + "' is not recognized as a command." + ((guess) => guess ? " Did you mean " + guess + "?" : " Type help.")(suggest(name, Object.keys(commands)));
        if (output !== null) print(output);
      });
      input.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); scriptController?.abort(); print("^C"); return; }
        if (event.key === "Tab" && input.value.trim()) {
          event.preventDefault();
          const [word, ...rest] = input.value.split(" ");
          const pool = rest.length ? (["open", "start"].includes(word.toLowerCase()) ? apps.map((app) => app.id) : ["type", "run"].includes(word.toLowerCase()) ? data.files.filter((item) => item.kind === "text").map((item) => item.name) : []) : Object.keys(commands);
          const partial = (rest.length ? rest.join(" ") : word).toLowerCase();
          const matches = pool.filter((option) => option.toLowerCase().startsWith(partial));
          if (matches.length === 1) input.value = rest.length ? word + " " + matches[0] : matches[0] + " ";
          else if (matches.length > 1) print(matches.join("  "));
          return;
        }
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
      print("LUMEN [Version 1.04]\nCopyright 1987 Lumen Systems. Type help for commands, or run flappy.lsc to play.\n");
      return () => { scriptController?.abort(); document.removeEventListener("lumen-run-script", runRequested); document.removeEventListener("lumen-stop-script", stopRequested); };
    },
  },
  {
    id: "petrock",
    name: "Pet Rock",
    icon: sprite("pet-rock"),
    size: [320, 300],
    html() {
      return '<div class="toy"><img class="toy__art" src="' + sprite("pet-rock-art") + '" alt="Your pet rock" width="96" height="96"><p class="toy__line" data-rock-mood aria-live="polite"></p><div class="row row--center"><button type="button" class="btn primary" data-rock-pet>Pet the rock</button><button type="button" class="btn" data-rock-name>Name...</button></div><p class="hint hint--flush" data-rock-count></p></div>';
    },
    bind(root) {
      const mood = root.querySelector("[data-rock-mood]");
      const count = root.querySelector("[data-rock-count]");
      const lines = import("./rock-lines.mjs?v=e67b37432f");
      const who = () => data.rockName || "The rock";
      const render = () => {
        count.textContent = data.rockPets === 1 ? "Petted once." : "Petted " + data.rockPets + " times.";
      };
      mood.textContent = who() + " is resting.";
      root.querySelector("[data-rock-name]").addEventListener("click", async () => { const name = await showWindowDialog({ title: "Name your rock", message: "Every rock deserves a name.", value: data.rockName, confirmLabel: "Name" }); if (name === null) return; data.rockName = name.trim().slice(0, 24); persistData(); mood.textContent = who() + " likes that name, probably."; });
      root.querySelector("[data-rock-pet]").addEventListener("click", () => {
        data.rockPets += 1;
        persistData();
        lines.then(({ nextRockLine }) => { const next = nextRockLine(data.rockDialogue); data.rockDialogue = next.state; persistData(); mood.textContent = next.line.replace(/^The rock/, who()); });
        render();
      });
      const systemChanged = (event) => { if (event.detail.some((key) => key.startsWith("rock"))) { render(); mood.textContent = who() + " is resting."; } }; document.addEventListener("lumen-system-changed", systemChanged);
      render();
      return () => document.removeEventListener("lumen-system-changed", systemChanged);
    },
  },
  {
    id: "fortune",
    name: "Fortune",
    icon: sprite("fortune"),
    size: [380, 200],
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
    icon: sprite("coin"),
    size: [420, 332],
    html() {
      return '<div class="toy"><div class="coin-stage"><div class="coin-tilt"><div class="coin" data-coin>' + Array.from({ length: 7 }, (_, index) => '<img class="coin__edge" src="' + sprite("coin-heads") + '" alt="" width="64" height="64" style="--depth:' + (index - 3) + 'px">').join("") + '<img class="coin__face" src="' + sprite("coin-heads") + '" alt="" width="64" height="64"><img class="coin__face coin__face--tails" src="' + sprite("coin-tails") + '" alt="" width="64" height="64"></div></div><span class="coin-shadow" data-coin-shadow></span></div><output class="toy__line" data-coin-result aria-live="polite">Ready to flip.</output><button type="button" class="btn primary" data-coin-flip>Flip the coin</button><p class="hint hint--flush" data-coin-tally>No flips yet.</p></div>';
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
    icon: sprite("busy"),
    size: [380, 210],
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
    icon: sprite("charmap"),
    size: [430, 312],
    html() {
      return '<div class="charmap"><label class="form-label charmap__set">Character set<select class="field" data-charmap-set>' + characterGroups.map((group) => '<optgroup label="' + escapeHtml(group) + '">' + Object.entries(characterSets).filter(([, set]) => set.group === group).map(([id, set]) => '<option value="' + id + '">' + escapeHtml(set.label) + '</option>').join('') + '</optgroup>').join('') + '</select></label><div class="charmap__recent" data-charmap-recent></div><div class="charmap__body"><div class="charmap__grid" data-charmap-grid aria-label="Characters"></div><div class="charmap__side"><div class="charmap__zoom" data-charmap-zoom aria-live="polite"></div><span class="hint hint--flush" data-charmap-code></span></div></div><div class="row"><input class="field charmap__text" data-charmap-text dir="auto" aria-label="Characters to copy" placeholder="Click characters to collect them"><button type="button" class="btn" data-charmap-clear>Clear</button><button type="button" class="btn primary" data-charmap-copy>Copy</button></div></div>';
    },
    bind(root) {
      const sets = characterSets;
      const pick = root.querySelector("[data-charmap-set]");
      const grid = root.querySelector("[data-charmap-grid]");
      const zoom = root.querySelector("[data-charmap-zoom]");
      const code = root.querySelector("[data-charmap-code]");
      const text = root.querySelector("[data-charmap-text]");
      const show = (char) => { zoom.textContent = char; code.textContent = "U+" + char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"); };
      const render = () => { const chars = [...sets[pick.value].characters]; grid.innerHTML = chars.map((char) => '<button type="button" class="charmap__cell" data-char="' + escapeHtml(char) + '">' + escapeHtml(char) + "</button>").join(""); show(chars[0]); };
      const recentRow = root.querySelector("[data-charmap-recent]");
      const paintRecent = () => { recentRow.innerHTML = data.recentChars ? '<span class="hint hint--flush">Recent</span>' + [...data.recentChars].map((char) => '<button type="button" class="charmap__cell" data-char="' + escapeHtml(char) + '">' + escapeHtml(char) + "</button>").join("") : ""; };
      const remember = (char) => { data.recentChars = rememberCharacter(data.recentChars, char); persistData(); paintRecent(); };
      recentRow.addEventListener("click", (event) => { const cell = event.target.closest("[data-char]"); if (!cell) return; text.value += cell.dataset.char; show(cell.dataset.char); remember(cell.dataset.char); });
      paintRecent();
      pick.addEventListener("change", render);
      grid.addEventListener("focusin", (event) => { if (event.target.dataset.char) show(event.target.dataset.char); });
      grid.addEventListener("click", (event) => { const cell = event.target.closest("[data-char]"); if (!cell) return; text.value += cell.dataset.char; show(cell.dataset.char); remember(cell.dataset.char); });
      root.querySelector("[data-charmap-clear]").addEventListener("click", () => { text.value = ""; });
      root.querySelector("[data-charmap-copy]").addEventListener("click", async () => { if (!text.value) return showToast("Pick some characters first."); try { await navigator.clipboard.writeText(text.value); showToast("Copied " + text.value + " to the clipboard."); } catch { text.select(); showToast("Press Ctrl+C to copy the selection."); } });
      const systemChanged = (event) => { if (event.detail.includes("recentChars")) paintRecent(); }; document.addEventListener("lumen-system-changed", systemChanged);
      render();
      return () => document.removeEventListener("lumen-system-changed", systemChanged);
    },
  },
  {
    id: "settings",
    name: "Settings",
    icon: sprite("help"),
    size: [452, 476],
    html() {
      const fullEffectsSelected = data.effects === "full" ? " selected" : "";
      const subtleEffectsSelected = data.effects === "subtle" ? " selected" : "";
      const offEffectsSelected = data.effects === "off" ? " selected" : "";
      const gridEffectsSelected = data.effects === "grid" ? " selected" : "";
      const classicWallpaperSelected = data.wallpaper === "classic" ? " selected" : "";
      const midnightWallpaperSelected = data.wallpaper === "midnight" ? " selected" : "";
      const auroraWallpaperSelected = data.wallpaper === "aurora" ? " selected" : "";
      const graphiteWallpaperSelected = data.wallpaper === "graphite" ? " selected" : "";
      const spectrumWallpaperSelected = data.wallpaper === "spectrum" ? " selected" : "";
      return '<div class="tabs" role="tablist"><button type="button" role="tab" class="tabs__tab" data-tab="display" aria-selected="true">Display</button><button type="button" role="tab" class="tabs__tab" data-tab="desktop" aria-selected="false">Desktop</button><button type="button" role="tab" class="tabs__tab" data-tab="saver" aria-selected="false">Screen Saver</button><button type="button" role="tab" class="tabs__tab" data-tab="time" aria-selected="false">Date and Time</button><button type="button" role="tab" class="tabs__tab" data-tab="backup" aria-selected="false">Backup</button></div><form data-settings-form><div class="tab-panel" data-panel="display" role="tabpanel"><fieldset class="group"><legend>Appearance</legend><div class="settings-grid"><label class="form-label">Color scheme<select class="field" id="themeChoice"><option value="dark">Luna Blue</option><option value="olive">Olive Green</option><option value="light">Silver</option><option value="royale">Royale</option><option value="zune">Zune</option><option value="classic">Windows Classic</option></select></label><label class="form-label">Desk background<select class="field" id="wallpaperChoice"><option value="classic"' + classicWallpaperSelected + '>Classic LUMEN</option><option value="midnight"' + midnightWallpaperSelected + '>Midnight Grid</option><option value="aurora"' + auroraWallpaperSelected + '>Aurora Dust</option><option value="graphite"' + graphiteWallpaperSelected + '>Graphite Desk</option><option value="spectrum"' + spectrumWallpaperSelected + '>Spectrum Steps</option><option value="none">None</option><option value="custom">My picture</option></select></label><label class="form-label">Font size<select class="field" id="fontChoice"><option value="normal">Normal</option><option value="large">Large</option></select></label><label class="form-label">Icon size<select class="field" id="iconChoice"><option value="normal">Normal</option><option value="large">Large</option></select></label></div></fieldset><fieldset class="group"><legend>Monitor</legend><div class="settings-grid"><label class="form-label">Screen effects<select class="field" id="effectsChoice"><option value="full"' + fullEffectsSelected + '>Realistic CRT</option><option value="subtle"' + subtleEffectsSelected + '>Subtle scanlines</option><option value="grid"' + gridEffectsSelected + '>Gridlines</option><option value="off"' + offEffectsSelected + '>Off</option></select></label><label class="form-label">Brightness<input class="knob" id="brightnessKnob" type="range" min="70" max="130" step="5" value="' + data.brightness + '"></label><label class="form-label">Contrast<input class="knob" id="contrastKnob" type="range" min="70" max="140" step="5" value="' + data.contrast + '"></label></div></fieldset></div><div class="tab-panel" data-panel="desktop" role="tabpanel" hidden><fieldset class="group"><legend>Desktop</legend><div class="settings-grid"><label class="form-label">Wallpaper position<select class="field" id="fitChoice"><option value="stretch">Stretch</option><option value="center">Center</option><option value="tile">Tile</option></select></label><label class="form-label">Background color<input class="field field--color" id="deskColor" type="color" value="' + data.deskColor + '"></label><label class="form-label">Cursor type<select class="field" id="cursorChoice"><option value="pixel">LUMEN pixel</option><option value="system">System default</option><option value="crosshair">Crosshair</option><option value="pointer">Pointer</option><option value="wait">Wait</option><option value="text">Text</option></select></label><label class="form-label">Desktop icons<select class="field" id="iconsShown"><option value="on">Show</option><option value="off">Hide</option></select></label></div><div class="row"><button type="button" class="btn" data-wallpaper-browse>Browse...</button><button type="button" class="btn" data-wallpaper-remove>Remove picture</button><input class="sr-only" type="file" accept="image/*" data-wallpaper-file></div></fieldset><fieldset class="group"><legend>Taskbar</legend><div class="settings-grid"><label class="form-label">Show Quick Launch<select class="field" id="quickShown"><option value="on">Yes</option><option value="off">No</option></select></label><label class="form-label">Auto-hide the taskbar<select class="field" id="autoHide"><option value="off">No</option><option value="on">Yes</option></select></label></div></fieldset><fieldset class="group"><legend>Effects</legend><div class="settings-grid"><label class="form-label">Window dragging<select class="field" id="dragChoice"><option value="on">Show contents</option><option value="off">Show an outline</option></select></label><label class="form-label">Window animations<select class="field" id="motionChoice"><option value="on">On</option><option value="off">Off</option></select></label></div></fieldset></div><div class="tab-panel" data-panel="saver" role="tabpanel" hidden><fieldset class="group"><legend>Screen saver</legend><div class="settings-grid"><label class="form-label">Screensaver<select class="field" id="saverChoice"><option value="on"' + (data.screensaver ? " selected" : "") + '>On</option><option value="off"' + (data.screensaver ? "" : " selected") + '>Off</option></select></label><label class="form-label">Screen saver<select class="field" id="saverStyle"><option value="logo">LUMEN logo</option><option value="starfield">Starfield</option><option value="mystify">Mystify</option><option value="blank">Blank</option></select></label><label class="form-label">Wait<select class="field" id="saverWait"><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label></div><div class="row"><button type="button" class="btn" data-saver-preview>Preview</button></div></fieldset><fieldset class="group"><legend>Sounds</legend><div class="settings-grid"><label class="form-label">System sounds<select class="field" id="soundsChoice"><option value="on"' + (data.sounds ? " selected" : "") + '>On</option><option value="off"' + (data.sounds ? "" : " selected") + '>Off</option></select></label><label class="form-label">Tips at startup<select class="field" id="tipsShown"><option value="on">Show</option><option value="off">Hide</option></select></label></div></fieldset></div><div class="tab-panel" data-panel="time" role="tabpanel" hidden><fieldset class="group"><legend>Clock</legend><div class="settings-grid"><label class="form-label">Taskbar clock<select class="field" id="clockChoice"><option value="12">12-hour</option><option value="24">24-hour</option></select></label><label class="form-label">Show the clock<select class="field" id="clockShown"><option value="on">Yes</option><option value="off">No</option></select></label></div></fieldset><fieldset class="group"><legend>Focus timer</legend><div class="settings-grid"><label class="form-label">Focus length<input class="field" id="focusMinutes" type="number" min="1" max="180" step="1" value="' + data.focusMin + '" required></label><label class="form-label">Break length<input class="field" id="breakMinutes" type="number" min="1" max="60" step="1" value="' + data.breakMin + '" required></label><label class="form-label">Long break, every fourth<input class="field" id="longBreakMinutes" type="number" min="1" max="90" step="1" value="' + data.longBreakMin + '" required></label></div></fieldset><fieldset class="group"><legend>Ship Log</legend><div class="settings-grid"><label class="form-label">Weekly hours goal<input class="field" id="weekGoal" type="number" min="0" max="80" step="1" value="' + data.weekGoal + '" title="Set to 0 to turn the goal off"></label></div></fieldset></div><div class="row row--actions" data-settings-actions><span class="hint hint--flush" data-settings-status aria-live="polite"></span><button type="submit" class="btn primary">Apply</button></div></form><div class="tab-panel" data-panel="backup" role="tabpanel" hidden><fieldset class="group"><legend>Backup and Restore</legend><p class="hint">Export your desk to a JSON file or restore a previous export.</p><div class="row"><button type="button" class="btn" data-export-backup>Export backup...</button><button type="button" class="btn" data-import-backup>Import backup...</button><input class="sr-only" type="file" accept="application/json,.json" data-import-file></div></fieldset><fieldset class="group"><legend>Install LUMEN</legend><button type="button" class="btn" data-install-app><span data-install-label>Install...</span></button></fieldset><fieldset class="group"><legend>Reset</legend><button type="button" class="btn danger" data-clear-data>Clear all data...</button></fieldset></div>';
    },
    bind(root) {
      const form = root.querySelector("[data-settings-form]");
      root.querySelector(".tabs").addEventListener("click", (event) => { const tab = event.target.closest("[data-tab]"); if (!tab) return; root.querySelectorAll("[data-tab]").forEach((item) => item.setAttribute("aria-selected", String(item === tab))); root.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== tab.dataset.tab; }); root.querySelector("[data-settings-actions]").hidden = tab.dataset.tab === "backup"; });
      const status = root.querySelector("[data-settings-status]");
      const fileInput = root.querySelector("[data-import-file]");
      root.querySelector("#clockChoice").value = data.clock24 ? "24" : "12";
      root.querySelector("#themeChoice").value = data.theme;
      [["#fontChoice", data.fontSize], ["#iconChoice", data.iconSize], ["#fitChoice", data.wallpaperFit], ["#cursorChoice", data.cursorType], ["#saverStyle", data.saverStyle], ["#saverWait", String(data.saverWait)], ["#clockShown", data.showClock ? "on" : "off"], ["#dragChoice", data.dragContents ? "on" : "off"], ["#motionChoice", data.transitions ? "on" : "off"], ["#quickShown", data.showQuickLaunch ? "on" : "off"], ["#iconsShown", data.showIcons ? "on" : "off"], ["#autoHide", data.autoHideTaskbar ? "on" : "off"], ["#tipsShown", data.showTips ? "on" : "off"]].forEach(([selector, value]) => { root.querySelector(selector).value = value; });
      const wallpaperFile = root.querySelector("[data-wallpaper-file]");
      root.querySelector("[data-wallpaper-browse]").addEventListener("click", () => wallpaperFile.click());
      wallpaperFile.addEventListener("change", async () => {
        const file = wallpaperFile.files?.[0];
        wallpaperFile.value = "";
        if (!file) return;
        try {
          const picture = await createImageBitmap(file);
          const scale = Math.min(1, 1600 / picture.width, 1000 / picture.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(picture.width * scale));
          canvas.height = Math.max(1, Math.round(picture.height * scale));
          canvas.getContext("2d").drawImage(picture, 0, 0, canvas.width, canvas.height);
          picture.close();
          localStorage.setItem(WALLPAPER_KEY, canvas.toDataURL("image/jpeg", 0.85));
          showCustomWallpaper();
          data.wallpaper = "custom";
          root.querySelector("#wallpaperChoice").value = "custom";
          persistData();
          applyTheme();
          showToast(file.name + " is now the desk background.");
        } catch {
          showToast("That picture could not be used. Try a smaller image.");
        }
      });
      root.querySelector("[data-wallpaper-remove]").addEventListener("click", () => { try { localStorage.removeItem(WALLPAPER_KEY); } catch {} showCustomWallpaper(); if (data.wallpaper === "custom") { data.wallpaper = "classic"; root.querySelector("#wallpaperChoice").value = "classic"; persistData(); applyTheme(); } });
      root.querySelector("[data-saver-preview]").addEventListener("click", () => { const style = data.saverStyle; data.saverStyle = root.querySelector("#saverStyle").value; startSaver(true); data.saverStyle = style; });
      form.addEventListener("input", (event) => { if (!event.target.matches(".knob, #themeChoice, #wallpaperChoice, #effectsChoice, #fontChoice, #iconChoice, #fitChoice, #cursorChoice, #deskColor, #clockShown, #quickShown, #dragChoice, #motionChoice")) return; readDisplayChoices(root); data.theme = root.querySelector("#themeChoice").value; data.wallpaper = root.querySelector("#wallpaperChoice").value; data.effects = root.querySelector("#effectsChoice").value; data.brightness = clampNumber(root.querySelector("#brightnessKnob").value, 70, 130, 100); data.contrast = clampNumber(root.querySelector("#contrastKnob").value, 70, 140, 100); applyTheme(); persistData(); });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        data.focusMin = clampNumber(root.querySelector("#focusMinutes").value, 1, 180, data.focusMin);
        data.breakMin = clampNumber(root.querySelector("#breakMinutes").value, 1, 60, data.breakMin);
        data.longBreakMin = clampNumber(root.querySelector("#longBreakMinutes").value, 1, 90, data.longBreakMin);
        data.weekGoal = clampNumber(root.querySelector("#weekGoal").value, 0, 80, data.weekGoal);
        data.theme = root.querySelector("#themeChoice").value;
        data.effects = root.querySelector("#effectsChoice").value;
        data.wallpaper = root.querySelector("#wallpaperChoice").value;
        data.sounds = root.querySelector("#soundsChoice").value === "on";
        paintVolume();
        data.screensaver = root.querySelector("#saverChoice").value === "on";
        data.clock24 = root.querySelector("#clockChoice").value === "24";
        readDisplayChoices(root);
        data.saverStyle = root.querySelector("#saverStyle").value;
        data.saverWait = Number(root.querySelector("#saverWait").value);
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
    id: "files", name: "Files", icon: sprite("files"), size: [660, 420], html: filesHtml, bind: bindFiles,
  },
  {
    id: "about",
    name: "About",
    icon: sprite("info"),
    size: [460, 460],
    html() {
      return '<img class="about-art" src="' + sprite("about-art") + '" alt="" width="147" height="48"><h2 class="about-title">LUMEN</h2><p class="hint hint--flush">Version 1.05</p><p>Notes, tasks, calculations, focus sessions, work logs, and a few gloriously pointless toys in one offline desk.</p><p class="hint">Data stays in this browser unless you export it.</p><h3 class="section-title">Shortcuts</h3><ul class="shortcut-list"><li><kbd>Alt</kbd> + <kbd>1</kbd> - Notes</li><li><kbd>Alt</kbd> + <kbd>2</kbd> - Checklist</li><li><kbd>Alt</kbd> + <kbd>3</kbd> - Calculator</li><li><kbd>Alt</kbd> + <kbd>4</kbd> - Focus</li><li><kbd>Alt</kbd> + <kbd>5</kbd> - Ship Log</li><li><kbd>Alt</kbd> + <kbd>6</kbd> - Files</li><li><kbd>Alt</kbd> + <kbd>7</kbd> - Settings</li><li><kbd>Alt</kbd> + <kbd>8</kbd> - About</li><li><kbd>Ctrl</kbd> + <kbd>Esc</kbd> - Start menu</li><li><kbd>Alt</kbd> + <kbd>Esc</kbd> - switch windows</li><li><kbd>Ctrl</kbd> + <kbd>S</kbd> - save a Notes version or the Paint picture</li><li><kbd>Ctrl</kbd> + <kbd>Z</kbd> and <kbd>Ctrl</kbd> + <kbd>O</kbd> - undo and open in Paint</li><li><kbd>Ctrl</kbd> + <kbd>F</kbd> - find in Notes</li><li><kbd>F5</kbd> - stamp the time and date in Notes</li><li><kbd>Alt</kbd> + <kbd>Space</kbd> - window menu</li><li><kbd>Alt</kbd> + <kbd>Up</kbd> or <kbd>Down</kbd> - move a checklist task</li><li><kbd>Esc</kbd> - close menus and dialogs</li><li><kbd>F1</kbd> - this window</li><li><kbd>F2</kbd> - rename the selected desktop icon</li><li><kbd>Ctrl</kbd> + <kbd>A</kbd> - select every desktop icon</li><li>Tap the Windows or Command key to open the Start menu, add D to show the desktop, or E to open Files</li><li>Drag across the desktop to select icons, then press <kbd>Enter</kbd> to open them all</li></ul><h3 class="section-title">System</h3><dl class="about-stats" data-about-stats></dl>';
    },
    bind(root) {
      let used = 0;
      try { used = Object.keys(localStorage).reduce((sum, key) => sum + key.length + (localStorage.getItem(key) || "").length, 0); } catch {}
      const count = (number, one, many) => number + " " + (number === 1 ? one : many);
      root.querySelector("[data-about-stats]").innerHTML = [["Storage used", Math.max(1, Math.round(used / 1024)) + " KB in this browser"], ["Files", count(data.files.filter((item) => item.kind === "text").length, "text file", "text files") + " in " + count(data.files.filter((item) => item.kind === "folder").length, "folder", "folders")], ["Tasks", data.tasks.filter((task) => !task.done).length + " open of " + data.tasks.length], ["Ship Log", count(data.logs.length, "entry", "entries") + ", " + totalLoggedHours() + " hours"], ["Events", count(data.events.length, "event", "events") + " on the calendar"], ["Installed", isInstalled() ? "Yes" : "No"]].map(([label, value]) => "<dt>" + label + "</dt><dd>" + escapeHtml(value) + "</dd>").join("");
    },
  },
  {
    id: "recycle",
    name: "Recycle Bin",
    icon: sprite("recycle-bin"),
    size: [430, 320],
    html() {
      return '<div class="bin"><div class="files__toolbar"><button type="button" class="btn" data-bin-restore disabled>Restore</button><button type="button" class="btn" data-bin-restore-all>Restore all</button><button type="button" class="btn" data-bin-delete disabled>Delete</button><button type="button" class="btn" data-bin-empty>Empty Recycle Bin</button></div><div class="bin__list" data-bin-list role="listbox" tabindex="0" aria-label="Deleted items"></div><p class="hint hint--flush" data-bin-status aria-live="polite"></p></div>';
    },
    bind(root) {
      const list = root.querySelector("[data-bin-list]");
      const status = root.querySelector("[data-bin-status]");
      const icons = { folder: sprite("folder"), text: sprite("text-file") };
      let selected = null;
      const render = () => {
        if (!data.recycle.some((entry) => entry.id === selected)) selected = null;
        list.innerHTML = data.recycle.length ? data.recycle.map((entry) => '<button type="button" role="option" class="bin__item" data-bin-id="' + escapeHtml(entry.id) + '" aria-selected="' + (entry.id === selected) + '"><img src="' + icons[entry.items[0].kind] + '" alt="" width="16" height="16"><span class="bin__name">' + escapeHtml(entry.items[0].name) + '</span><span class="bin__meta">' + (entry.items.length > 1 ? entry.items.length + " items" : entry.items[0].kind === "folder" ? "Folder" : "Text file") + '</span><span class="bin__meta">' + escapeHtml(entry.deletedAt ? dateTimeFormat.format(new Date(entry.deletedAt)) : "") + "</span></button>").join("") : '<p class="hint bin__empty">The Recycle Bin is empty.</p>';
        writeText(status, data.recycle.length === 1 ? "1 deleted item" : data.recycle.length + " deleted items");
        root.querySelector("[data-bin-restore]").disabled = !selected;
        root.querySelector("[data-bin-delete]").disabled = !selected;
        root.querySelector("[data-bin-empty]").disabled = !data.recycle.length; root.querySelector("[data-bin-restore-all]").disabled = !data.recycle.length;
      };
      const restore = (picked, quiet = false) => {
        const entry = picked?.items ? picked : data.recycle.find((item) => item.id === selected);
        if (!entry) return;
        const taken = new Set(data.files.map((item) => item.id));
        const items = entry.items.filter((item) => !taken.has(item.id));
        const ids = new Set(items.map((item) => item.id));
        items.forEach((item) => { if (item.parent && !ids.has(item.parent) && !data.files.some((file) => file.id === item.parent && file.kind === "folder")) item.parent = null; });
        data.files.push(...items);
        data.recycle = data.recycle.filter((item) => item !== entry);
        persistData();
        if (quiet) return;
        showToast(entry.items[0].name + " was restored to Files.");
        document.dispatchEvent(new Event("lumen-files-changed"));
      };
      const refresh = () => { if (!root.isConnected) return document.removeEventListener("lumen-files-changed", refresh); render(); };
      document.addEventListener("lumen-files-changed", refresh);
      list.addEventListener("click", (event) => { const item = event.target.closest("[data-bin-id]"); if (!item) return; selected = item.dataset.binId; render(); list.querySelector('[data-bin-id="' + CSS.escape(selected) + '"]')?.focus(); });
      list.addEventListener("dblclick", (event) => { if (event.target.closest("[data-bin-id]")) restore(); });
      list.addEventListener("keydown", (event) => { if (event.key === "Delete" && selected) root.querySelector("[data-bin-delete]").click(); if (event.key === "Enter" && selected) restore(); });
      root.querySelector("[data-bin-restore]").addEventListener("click", () => restore());
      root.querySelector("[data-bin-restore-all]").addEventListener("click", () => { const count = data.recycle.length; if (!count) return; [...data.recycle].reverse().forEach((entry) => restore(entry, true)); showToast(count === 1 ? "Restored 1 item to Files." : "Restored " + count + " items to Files."); document.dispatchEvent(new Event("lumen-files-changed")); });
      root.querySelector("[data-bin-delete]").addEventListener("click", async () => { const entry = data.recycle.find((item) => item.id === selected); if (!entry || !await showWindowDialog({ title: "Delete " + entry.items[0].name, message: "Permanently delete this item? This cannot be undone.", confirmLabel: "Delete", danger: true })) return; data.recycle = data.recycle.filter((item) => item !== entry); persistData(); render(); });
      root.querySelector("[data-bin-empty]").addEventListener("click", async () => { if (!data.recycle.length || !await showWindowDialog({ title: "Empty Recycle Bin", message: "Permanently delete all " + data.recycle.length + " items in the Recycle Bin?", confirmLabel: "Empty", danger: true })) return; data.recycle = []; persistData(); playSound("close"); render(); });
      render();
      return () => document.removeEventListener("lumen-files-changed", refresh);
    },
  },
];

const wins = document.getElementById("wins");
const tasks = document.getElementById("tasks");
function dragReorder(container, selector, onDrop) {
  container.addEventListener("dragstart", (event) => event.preventDefault());
  container.addEventListener("pointerdown", (event) => {
    const item = event.target.closest(selector); if (!item || event.button !== 0) return;
    const [startX] = toScene(event.clientX, event.clientY); let dragging = false;
    const move = (next) => { const [x] = toScene(next.clientX, next.clientY); if (!dragging && Math.abs(x - startX) < 6) return; if (!dragging) { dragging = true; item.classList.add("reordering"); document.body.classList.add("dragging"); } const others = [...container.querySelectorAll(selector)].filter((other) => other !== item); const before = others.find((other) => { const box = other.getBoundingClientRect(); return x < box.left + box.width / 2; }); if (before && item.nextElementSibling !== before) container.insertBefore(item, before); else if (!before && others.length && others[others.length - 1].nextElementSibling !== item) others[others.length - 1].after(item); };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); if (!dragging) return; item.classList.remove("reordering"); document.body.classList.remove("dragging"); const block = (click) => { click.stopImmediatePropagation(); click.preventDefault(); }; item.addEventListener("click", block, true); window.setTimeout(() => item.removeEventListener("click", block, true), 0); onDrop?.(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
  });
}
dragReorder(tasks, ".task");
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
    .filter(([, entry]) => !entry.el.classList.contains("min") && !entry.el.classList.contains("minimizing"))
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
  if (reducedMotion.matches || !data.transitions) return void done?.();
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
  let finished = false; const finish = () => { if (finished) return; finished = true; frames.forEach((frame) => frame.remove()); done?.(); }; window.setTimeout(finish, 400);
  const tick = (now) => { if (document.hidden || now - started >= 198) { finish(); return; } const step = Math.min(8, Math.floor((now - started) / 22) + 1); if (step !== lastStep) { draw(step); lastStep = step; } requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}
function paintWindow(element, phase) {
  if (!data.transitions) { element.classList.remove(phase); element.querySelector("[data-autofocus]")?.focus({ preventScroll: true }); return; }
  if (!element.classList.replace(phase, "painting")) return;
  element.querySelector("[data-autofocus]")?.focus({ preventScroll: true });
  onOwnAnimationEnd(element, () => element.classList.remove("painting"));
}
function launcherRect(id) {
  return (iconButtons.get(id) || startBtn).getBoundingClientRect();
}
function activateTopWindow() {
  const next = visibleWindowsByZ()[0];
  if (next) focusWin(next[0]); else icons.classList.remove("blurred");
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
  button?.setAttribute("title", maximized ? "Restore Down" : "Maximize");
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
  if (!geometry && !id.startsWith("script:")) data.launches[id] = (data.launches[id] || 0) + 1;
  const element = document.createElement("section");
  const offset = (open.size % 8) * 24;
  element.className = "win focus opening";
  element.dataset.appId = id;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "false");
  element.setAttribute("aria-label", app.name);
  element.style.left = (window.innerWidth <= 640 ? 8 : iconEdge() + 12) + offset + "px";
  element.style.top = (window.innerWidth <= 640 ? icons.offsetTop + icons.offsetHeight + 8 : 40) + offset + "px";
  element.style.zIndex = String(++z);
  if (app.size) element.style.cssText += "width:" + app.size[0] + "px;height:" + app.size[1] + "px";
  if (geometry) element.style.cssText += "left:" + geometry.left + "px;top:" + geometry.top + "px;width:" + geometry.width + "px;height:" + geometry.height + "px";
  element.innerHTML = '<header class="bar"><span class="bar-title"><img src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</span><div class="dots"><button type="button" class="m" data-min aria-label="minimize window" title="Minimize"></button><button type="button" class="q" data-max aria-label="maximize window" aria-pressed="false" title="Maximize"></button><button type="button" class="x" data-close aria-label="close window" title="Close"></button></div></header><div class="body">' + app.html() + '</div><span class="win-grip" data-grip aria-hidden="true"></span><span class="win-edge win-edge--n" data-grip="n" aria-hidden="true"></span><span class="win-edge win-edge--s" data-grip="s" aria-hidden="true"></span><span class="win-edge win-edge--e" data-grip="e" aria-hidden="true"></span><span class="win-edge win-edge--w" data-grip="w" aria-hidden="true"></span><span class="win-edge win-edge--nw" data-grip="nw" aria-hidden="true"></span><span class="win-edge win-edge--ne" data-grip="ne" aria-hidden="true"></span><span class="win-edge win-edge--sw" data-grip="sw" aria-hidden="true"></span>';
  wins.append(element);
  if (!restoringSession) playSound("open");
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "task on opening";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", "true");
  tab.innerHTML = '<img src="' + app.icon + '" alt=""><span class="task__label">' + escapeHtml(app.name) + '</span>';
  tab.title = app.name;
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
  const barIcon = element.querySelector(".bar-title img");
  barIcon.addEventListener("click", (event) => { event.stopPropagation(); focusWin(id); const box = barIcon.getBoundingClientRect(); showMenu(Math.round(box.left), Math.round(box.bottom) + 4, windowMenu(id)); });
  barIcon.addEventListener("dblclick", (event) => { event.stopPropagation(); hideMenu(); closeApp(id); });
  tab.addEventListener("contextmenu", openWindowMenu);
  tab.addEventListener("mousedown", (event) => { if (event.button !== 1) return; event.preventDefault(); closeApp(id); });
  element.addEventListener("mousedown", () => focusWin(id));
  tab.addEventListener("click", () => {
    if (restoreApp(id)) return;
    if (activeId === id && !element.classList.contains("minimizing")) return minimizeApp(id);
    focusWin(id);
  });
  drag(element);
  resizeGrip(element);
  if ("ResizeObserver" in window) {
    entry.resizeObserver = new ResizeObserver(() => constrainWindow(element));
    entry.resizeObserver.observe(element);
  }
  constrainWindow(element);
  if (restoringSession) element.classList.remove("opening"); else zoomRects(launcherRect(id), element.getBoundingClientRect(), () => paintWindow(element, "opening"));
  focusWin(id);
}

function focusWin(id) { refreshSceneHover(); icons.classList.add("blurred");
  const selected = open.get(id);
  if (!selected) return;
  selected.tab.classList.remove("flashing");
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
let hiddenByDesktop = [];
function toggleDesktop() {
  const showing = Array.from(open.keys()).filter((id) => !open.get(id).el.classList.contains("min") && !open.get(id).el.classList.contains("minimizing"));
  if (showing.length) {
    hiddenByDesktop = showing;
    showing.forEach((id) => minimizeApp(id));
    return;
  }
  hiddenByDesktop.filter((id) => open.has(id)).forEach((id) => restoreApp(id));
  hiddenByDesktop = [];
}
function arrangeMenu() {
  return [{ label: "Cascade windows", run: () => arrangeWindows("cascade") }, { label: "Tile windows", run: () => arrangeWindows("tile") }, { label: "Show the desktop", run: toggleDesktop }];
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

const windowImpacts = new WeakMap();
function impact(node, speed, origin, horizontal) {
  if (speed < 0.15) return;
  const squash = Math.min(0.08, speed * 0.025);
  const scale = horizontal ? "scale(" + (1 - squash) + ", " + (1 + squash / 2) + ")" : "scale(" + (1 + squash / 2) + ", " + (1 - squash) + ")";
  windowImpacts.get(node)?.cancel(); windowImpacts.set(node, node.animate([{ transformOrigin: origin, transform: scale }, { transformOrigin: origin, transform: "none" }], { duration: 170, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" }));
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
  node.querySelectorAll("[data-grip]").forEach((grip) => grip.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || node.classList.contains("max")) return;
    event.preventDefault();
    event.stopPropagation();
    focusWin(node.dataset.appId);
    const pointerId = event.pointerId;
    try { grip.setPointerCapture(pointerId); } catch { return; }
    delete node.dataset.flinging; windowImpacts.get(node)?.cancel();
    const edge = grip.dataset.grip || "se";
    const [startX, startY] = toScene(event.clientX, event.clientY);
    const start = { left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight };
    const style = getComputedStyle(node);
    const minimumWidth = parseInt(style.minWidth, 10) || 200;
    const minimumHeight = parseInt(style.minHeight, 10) || 150;
    let box = { ...start };
    let frame = 0;
    desk.classList.add("moving"); document.body.dataset.resizing = edge;
    const apply = () => {
      frame = 0;
      node.style.cssText += "left:" + box.left + "px;top:" + box.top + "px;width:" + box.width + "px;height:" + box.height + "px";
    };
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const [sceneX, sceneY] = toScene(moveEvent.clientX, moveEvent.clientY);
      const dx = Math.round(sceneX - startX);
      const dy = Math.round(sceneY - startY);
      box = { ...start };
      if (edge.includes("e")) box.width = Math.max(minimumWidth, Math.min(wins.clientWidth - start.left, start.width + dx));
      if (edge.includes("s")) box.height = Math.max(minimumHeight, Math.min(wins.clientHeight - start.top, start.height + dy));
      if (edge.includes("w")) { box.width = Math.max(minimumWidth, Math.min(start.left + start.width, start.width - dx)); box.left = start.left + start.width - box.width; }
      if (edge.includes("n")) { box.height = Math.max(minimumHeight, Math.min(start.top + start.height, start.height - dy)); box.top = start.top + start.height - box.height; }
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
      desk.classList.remove("moving"); delete document.body.dataset.resizing;
      rememberWindows();
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", stop);
    grip.addEventListener("pointercancel", stop);
  }));
}
function drag(node) {
  const bar = node.querySelector(".bar");
  bar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button") || node.classList.contains("max")) return;
    event.preventDefault();
    focusWin(node.dataset.appId);
    delete node.dataset.flinging; windowImpacts.get(node)?.cancel();
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
    const outline = data.dragContents ? null : document.createElement("div");
    const applyDrag = () => {
      dragFrame = 0;
      const target = outline || node;
      target.style.left = pendingLeft + "px";
      target.style.top = pendingTop + "px";
    };
    try { bar.setPointerCapture(pointerId); } catch { return; }
    if (outline) {
      outline.className = "drag-outline";
      outline.style.cssText = "left:" + startLeft + "px;top:" + startTop + "px;width:" + node.offsetWidth + "px;height:" + node.offsetHeight + "px";
      wins.append(outline);
    }
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
      if (outline) {
        outline.remove();
        node.style.left = pendingLeft + "px";
        node.style.top = pendingTop + "px";
        samples.length = 0;
      }
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

let resizeFrame = 0; window.addEventListener("resize", () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; open.forEach((entry) => constrainWindow(entry.el)); layoutIcons(); }); });

const icons = document.getElementById("icons");
const startBtn = document.getElementById("startBtn");
const startMenu = document.getElementById("startMenu");
const FOLDER_PREFIX = "folder:";
function isFolderId(id) { return String(id).startsWith(FOLDER_PREFIX); }
function folderOf(id) { return data.deskFolders.find((folder) => FOLDER_PREFIX + folder.id === id); }
function folderApp(folder) { return { id: FOLDER_PREFIX + folder.id, name: folder.name, icon: sprite("desk-folder"), size: [380, 280], html: () => '<div class="desk-folder" data-folder-list role="listbox" tabindex="0" aria-label="Programs in this folder"></div><p class="hint hint--flush" data-folder-status></p>', bind: (root) => bindFolder(root, folder.id) }; }
data.deskFolders = data.deskFolders.map((folder) => ({ ...folder, apps: folder.apps.filter((id) => !isFolderId(id) && apps.some((app) => app.id === id)) })).filter((folder) => folder.apps.length); data.deskFolders.forEach((folder) => apps.push(folderApp(folder)));
const orderedApps = [...apps].sort((a, b) => { const ai = data.iconOrder.indexOf(a.id); const bi = data.iconOrder.indexOf(b.id); return (ai < 0 ? apps.length + apps.indexOf(a) : ai) - (bi < 0 ? apps.length + apps.indexOf(b) : bi); });

function addDeskButton(app) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon";
  button.dataset.appId = app.id;
  button.setAttribute("aria-label", "Open " + (data.iconNames[app.id] || app.name));
  button.innerHTML = '<img class="desktop-icon" src="' + app.icon + '" alt=""><span>' + escapeHtml(data.iconNames[app.id] || app.name) + '</span>';
  button.addEventListener("click", (event) => {
    if (iconDragged || event.ctrlKey || event.metaKey) return;
    selectIcons(new Set([app.id]));
    if (!icons.classList.contains("free")) openApp(app.id);
  });
  button.addEventListener("dblclick", () => openApp(app.id));
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); openApp(app.id); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const here = [button.offsetLeft, button.offsetTop];
    const next = Array.from(iconButtons.values()).filter((item) => item !== button && !item.hidden).map((item) => { const dx = item.offsetLeft - here[0]; const dy = item.offsetTop - here[1]; const along = dx * direction[0] + dy * direction[1]; const across = Math.abs(dx * direction[1]) + Math.abs(dy * direction[0]); return [item, along, across]; }).filter(([, along]) => along > 0).sort((a, b) => a[1] + a[2] * 3 - (b[1] + b[2] * 3))[0]?.[0];
    if (!next) return;
    selectIcons(new Set([next.dataset.appId]));
    next.focus();
  });
  iconButtons.set(app.id, button);
  icons.append(button); return button;
} orderedApps.forEach(addDeskButton); paintBin(); syncFolderIcons();
function syncFolderIcons() { const inside = new Set(data.deskFolders.flatMap((folder) => folder.apps)); iconButtons.forEach((button, id) => { button.hidden = inside.has(id); if (button.hidden) button.classList.remove("selected"); }); document.dispatchEvent(new Event("lumen-folders-changed")); }
function snapSpot(spot) { return data.iconGrid ? { x: Math.max(0, 8 + Math.round((spot.x - 8) / ICON_STEP_X) * ICON_STEP_X), y: Math.max(0, 10 + Math.round((spot.y - 10) / ICON_STEP_Y) * ICON_STEP_Y) } : spot; }
function groupIcons(targetId, ids) {
  const targetButton = iconButtons.get(targetId);
  let folder = folderOf(targetId);
  if (!folder) { folder = { id: makeId(), name: newFolderName(data.deskFolders.map((item) => item.name)), apps: [targetId] }; data.deskFolders.push(folder); const app = folderApp(folder); apps.push(app); addDeskButton(app); data.iconPositions[app.id] = data.iconPositions[targetId] || { x: targetButton.offsetLeft, y: targetButton.offsetTop }; delete data.iconPositions[targetId]; }
  ids.filter((id) => id !== targetId && !isFolderId(id) && !folder.apps.includes(id)).forEach((id) => { data.deskFolders.forEach((item) => { item.apps = item.apps.filter((other) => other !== id); }); folder.apps.push(id); delete data.iconPositions[id]; });
  data.deskFolders.filter((item) => !item.apps.length).forEach((item) => removeFolder(item.id));
  syncFolderIcons(); persistData(); layoutIcons(); selectIcons(new Set([FOLDER_PREFIX + folder.id])); playSound("thud");
}
function removeFolder(folderId) {
  const id = FOLDER_PREFIX + folderId;
  data.deskFolders = data.deskFolders.filter((item) => item.id !== folderId);
  const index = apps.findIndex((app) => app.id === id); if (index >= 0) apps.splice(index, 1);
  if (open.has(id)) closeApp(id);
  iconButtons.get(id)?.remove(); iconButtons.delete(id); delete data.iconPositions[id];
  data.startPins = data.startPins.filter((item) => item !== id); data.quickLaunch = data.quickLaunch.filter((item) => item !== id); renderQuickLaunch();
}
function dissolveFolder(folderId) { removeFolder(folderId); syncFolderIcons(); persistData(); layoutIcons(); }
function moveOutOfFolder(appId, spot) {
  const folder = data.deskFolders.find((item) => item.apps.includes(appId)); if (!folder) return;
  folder.apps = folder.apps.filter((id) => id !== appId);
  if (!folder.apps.length) removeFolder(folder.id);
  if (spot) data.iconPositions[appId] = snapSpot(spot); else delete data.iconPositions[appId];
  syncFolderIcons(); persistData(); layoutIcons(); selectIcons(new Set([appId]));
}
function bindFolder(root, folderId) {
  const list = root.querySelector("[data-folder-list]");
  const render = () => { const folder = data.deskFolders.find((item) => item.id === folderId); if (!folder) return; list.innerHTML = folder.apps.map((id) => apps.find((app) => app.id === id)).filter(Boolean).map((app) => '<button type="button" role="option" class="desk-folder__item" data-folder-app="' + escapeHtml(app.id) + '"><img src="' + app.icon + '" alt="" width="32" height="32"><span>' + escapeHtml(data.iconNames[app.id] || app.name) + "</span></button>").join(""); writeText(root.querySelector("[data-folder-status]"), (folder.apps.length === 1 ? "1 program" : folder.apps.length + " programs") + ". Drag one onto the desk to take it out."); };
  const refresh = () => render();
  document.addEventListener("lumen-folders-changed", refresh);
  list.addEventListener("dragstart", (event) => event.preventDefault());
  list.addEventListener("dblclick", (event) => { const item = event.target.closest("[data-folder-app]"); if (item) openApp(item.dataset.folderApp); });
  list.addEventListener("keydown", (event) => { const item = event.target.closest("[data-folder-app]"); if (!item) return; if (event.key === "Enter") { event.preventDefault(); openApp(item.dataset.folderApp); } else if (event.key === "Delete") { event.preventDefault(); moveOutOfFolder(item.dataset.folderApp); } });
  list.addEventListener("contextmenu", (event) => { const item = event.target.closest("[data-folder-app]"); if (!item) return; event.preventDefault(); event.stopPropagation(); const id = item.dataset.folderApp; showMenu(...toScene(event.clientX, event.clientY), [{ label: "Open", run: () => openApp(id) }, { label: "Move to desktop", run: () => moveOutOfFolder(id) }]); });
  list.addEventListener("pointerdown", (event) => {
    const item = event.target.closest("[data-folder-app]"); if (!item || event.button !== 0) return;
    const id = item.dataset.folderApp; const [startX, startY] = toScene(event.clientX, event.clientY); let dragging = false; let lastX = startX; let lastY = startY;
    const move = (next) => { const [x, y] = toScene(next.clientX, next.clientY); lastX = x; lastY = y; if (!dragging && Math.abs(x - startX) + Math.abs(y - startY) > 5) { dragging = true; document.body.classList.add("dragging"); item.classList.add("dragging"); } };
    const stop = (end) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop);
      if (!dragging) return; document.body.classList.remove("dragging"); item.classList.remove("dragging");
      const x = lastX; const y = lastY; const box = root.closest(".win").getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return;
      const target = document.elementsFromPoint(x, y).map((node) => node.closest?.(".icon")).find((node) => node && !node.hidden);
      if (target && target.dataset.appId !== FOLDER_PREFIX + folderId) { groupIcons(target.dataset.appId, [id]); return; }
      const area = icons.getBoundingClientRect(); moveOutOfFolder(id, { x: Math.max(0, Math.round(x - area.left - 44)), y: Math.max(0, Math.round(y - area.top - 20)) });
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop);
  });
  render();
  return () => document.removeEventListener("lumen-folders-changed", refresh);
}
let ICON_STEP_X = 92;
let ICON_STEP_Y = 76;
let iconDragged = false;
const freeIcons = window.matchMedia("(min-width: 641px)");
function layoutIcons() {
  icons.classList.toggle("free", freeIcons.matches);
  ICON_STEP_X = data.iconSize === "large" ? 100 : 92;
  ICON_STEP_Y = data.iconSize === "large" ? 92 : 76;
  if (!freeIcons.matches) return iconButtons.forEach((button) => { button.style.left = ""; button.style.top = ""; });
  const width = icons.clientWidth;
  const height = icons.clientHeight;
  if (!width || !height) return;
  const rows = Math.max(1, Math.floor((height - 10) / ICON_STEP_Y));
  const saved = Object.values(data.iconPositions);
  let slot = 0;
  icons.querySelectorAll(".icon:not([hidden])").forEach((button) => {
    let spot = data.iconPositions[button.dataset.appId];
    while (!spot) {
      const candidate = { x: 8 + Math.floor(slot / rows) * ICON_STEP_X, y: 10 + (slot % rows) * ICON_STEP_Y };
      slot += 1;
      if (!saved.some((item) => Math.abs(item.x - candidate.x) < 46 && Math.abs(item.y - candidate.y) < 38)) spot = candidate;
    }
    button.style.left = Math.max(0, Math.min(spot.x, width - 88)) + "px";
    button.style.top = Math.max(0, Math.min(spot.y, height - 72)) + "px";
  });
}
function iconEdge() {
  if (!icons.classList.contains("free")) return icons.offsetLeft + icons.offsetWidth;
  return Math.min(320, Math.max(8, ...Array.from(iconButtons.values(), (button) => button.offsetLeft < 300 ? button.offsetLeft + button.offsetWidth : 0)));
}
icons.addEventListener("dragstart", (event) => event.preventDefault());
icons.addEventListener("pointerdown", (event) => {
  const button = event.target.closest(".icon");
  if (!button || event.button !== 0 || !icons.classList.contains("free")) return;
  const id = button.dataset.appId;
  if (event.ctrlKey || event.metaKey) {
    button.classList.toggle("selected");
    return;
  }
  if (!button.classList.contains("selected")) selectIcons(new Set([id]));
  const starts = Array.from(icons.querySelectorAll(".icon.selected"), (item) => [item, item.offsetLeft, item.offsetTop]);
  const [startX, startY] = toScene(event.clientX, event.clientY);
  let dragging = false;
  let frame = 0;
  let shiftX = 0;
  let shiftY = 0;
  const clampX = (value) => Math.max(0, Math.min(value, icons.clientWidth - 88));
  const clampY = (value) => Math.max(0, Math.min(value, icons.clientHeight - 72));
  const paint = () => {
    frame = 0;
    starts.forEach(([item, left, top]) => { item.style.left = clampX(left + shiftX) + "px"; item.style.top = clampY(top + shiftY) + "px"; });
  };
  const move = (moveEvent) => {
    if (moveEvent.pointerId !== event.pointerId) return;
    const [x, y] = toScene(moveEvent.clientX, moveEvent.clientY);
    shiftX = x - startX;
    shiftY = y - startY;
    if (!dragging && Math.abs(shiftX) + Math.abs(shiftY) < 5) return;
    if (!dragging) {
      dragging = true;
      iconButtons.forEach((item, itemId) => { if (!data.iconPositions[itemId]) data.iconPositions[itemId] = { x: item.offsetLeft, y: item.offsetTop }; });
      document.body.classList.add("dragging");
      desk.classList.add("moving");
    }
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const stop = (stopEvent) => {
    if (stopEvent.pointerId !== event.pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    cancelAnimationFrame(frame);
    if (!dragging) return;
    document.body.classList.remove("dragging");
    desk.classList.remove("moving");
    iconDragged = true;
    window.setTimeout(() => { iconDragged = false; }, 0);
    const dropX = startX + shiftX; const dropY = startY + shiftY; const target = document.elementsFromPoint(dropX, dropY).map((node) => node.closest?.(".icon")).find((node) => node && !node.hidden && !starts.some(([item]) => item === node)); const grouping = target ? starts.map(([item]) => item.dataset.appId).filter((id) => !isFolderId(id)) : [];
    if (grouping.length) { starts.forEach(([item, left, top]) => { item.style.left = left + "px"; item.style.top = top + "px"; }); groupIcons(target.dataset.appId, grouping); return; }
    starts.forEach(([item, left, top]) => {
      let x = clampX(left + shiftX);
      let y = clampY(top + shiftY);
      if (data.iconGrid) {
        x = clampX(8 + Math.round((x - 8) / ICON_STEP_X) * ICON_STEP_X);
        y = clampY(10 + Math.round((y - 10) / ICON_STEP_Y) * ICON_STEP_Y);
      }
      const clash = Object.entries(data.iconPositions).find(([other, spot]) => other !== item.dataset.appId && spot.x === x && spot.y === y && !starts.some(([moving]) => moving.dataset.appId === other));
      if (clash) data.iconPositions[clash[0]] = { x: left, y: top };
      data.iconPositions[item.dataset.appId] = { x, y };
    });
    persistData();
    layoutIcons();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
});
freeIcons.addEventListener("change", layoutIcons);
layoutIcons();

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
desk.addEventListener("pointerdown", (event) => { if (!event.target.closest(".win, .taskbar, .context-menu")) icons.classList.remove("blurred"); }, true);
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
    marquee.style.cssText = "left:" + left + "px;top:" + (top - desk.offsetTop) + "px;width:" + (right - left) + "px;height:" + (bottom - top) + "px";
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
function refreshSceneHover() { sceneHover?.classList.remove("scene-hover"); sceneHover = null; if (!hoverFrame) hoverFrame = requestAnimationFrame(updateSceneHover); }
function updateSceneHover() {
  hoverFrame = 0;
  const [x, y] = toScene(hoverX, hoverY);
  const hit = document.elementFromPoint(x, y); const next = hit?.closest("button") || null;
  const grip = document.body.dataset.resizing ?? hit?.closest("[data-grip]")?.dataset.grip; writeAttribute(screenCursor, "data-shape", grip !== undefined ? "resize-" + ({ n: "ns", s: "ns", e: "ew", w: "ew", ne: "nesw", sw: "nesw" }[grip] || "nwse") : hit?.closest("button:not(:disabled), a[href], select:not(:disabled), label") ? "pointing" : "pointer");
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
function hideMenu() { refreshSceneHover();
  contextMenu.classList.add("hidden");
  menuItems = [];
}
function showMenu(x, y, items) {
  menuItems = items;
  contextMenu.innerHTML = items.map((item, index) => item ? '<button type="button" role="menuitem" data-menu-index="' + index + '"' + (item.disabled ? " disabled" : "") + ">" + escapeHtml(item.label) + "</button>" : '<div class="menu-separator" role="separator"></div>').join("");
  contextMenu.classList.remove("hidden");
  contextMenu.style.left = Math.max(0, Math.min(Math.round(x), desk.clientWidth - contextMenu.offsetWidth - 2)) + "px";
  contextMenu.style.top = Math.max(0, Math.min(Math.round(y) - desk.offsetTop, desk.clientHeight - document.querySelector(".taskbar").offsetHeight - contextMenu.offsetHeight)) + "px";
  contextMenu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
}
function centerWindow(id) {
  const node = open.get(id)?.el;
  if (!node) return;
  const from = node.getBoundingClientRect();
  node.style.left = Math.max(0, Math.round((wins.clientWidth - node.offsetWidth) / 2)) + "px";
  node.style.top = Math.max(0, Math.round((wins.clientHeight - node.offsetHeight) / 2)) + "px";
  node.classList.add("restoring");
  zoomRects(from, node.getBoundingClientRect(), () => paintWindow(node, "restoring"));
  rememberWindows();
}
async function renameFolder(id) { const folder = folderOf(id); const app = apps.find((item) => item.id === id); if (!folder || !app) return; const name = await showWindowDialog({ title: "Rename", message: "Type a new name for this folder.", value: folder.name, confirmLabel: "Rename" }); if (!name?.trim()) return; folder.name = app.name = name.trim().slice(0, 40); persistData(); const button = iconButtons.get(id); if (button) { writeText(button.querySelector("span"), folder.name); button.setAttribute("aria-label", "Open " + folder.name); } const entry = open.get(id); if (entry) { writeText(entry.el.querySelector(".bar-title").lastChild, folder.name); writeText(entry.tab.querySelector(".task__label"), folder.name); entry.tab.title = folder.name; } }
async function renameIcon(id) { if (isFolderId(id)) return renameFolder(id); const app = apps.find((item) => item.id === id); const button = iconButtons.get(id); if (!app || !button) return; const name = await showWindowDialog({ title: "Rename", message: "Type a new name for this shortcut. Leave it empty to use " + app.name + ".", value: data.iconNames[id] || app.name, confirmLabel: "Rename" }); if (name === null) return; const trimmed = name.trim().slice(0, 40); if (!trimmed || trimmed === app.name) delete data.iconNames[id]; else data.iconNames[id] = trimmed; persistData(); writeText(button.querySelector("span"), data.iconNames[id] || app.name); button.setAttribute("aria-label", "Open " + (data.iconNames[id] || app.name)); }
function showProperties(id) {
  const app = apps.find((item) => item.id === id);
  if (!app) return;
  const key = Object.entries({ "1": "notes", "2": "checklist", "3": "calculator", "4": "focus", "5": "shiplog", "6": "files", "7": "settings", "8": "about" }).find(([, appId]) => appId === id)?.[0];
  const size = app.size ? app.size.join(" by ") + " pixels" : "420 by 320 pixels";
  showWindowDialog({ title: app.name + " Properties", message: "Type: LUMEN program\nOpens at: " + size + "\nShortcut key: " + (key ? "Alt+" + key : "None") + "\nRunning now: " + (open.has(id) ? "Yes" : "No") + "\nStorage: this browser only", onDesk: true });
}
function windowMenu(id) {
  const maximized = open.get(id)?.el.classList.contains("max");
  const pinned = open.get(id)?.el.classList.contains("pinned");
  return [{ label: "Restore", disabled: !maximized, run: () => toggleMaximize(id) }, { label: "Minimize", run: () => minimizeApp(id) }, { label: "Maximize", disabled: maximized, run: () => toggleMaximize(id) }, { label: "Move to center", disabled: maximized, run: () => centerWindow(id) }, { label: (pinned ? "✓ " : "") + "Always on top", run: () => open.get(id)?.el.classList.toggle("pinned") }, null, { label: "Close", run: () => closeApp(id) }];
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
      data.iconOrder = Array.from(icons.querySelectorAll(".icon"), (button) => button.dataset.appId);
      data.iconPositions = {};
      persistData();
      layoutIcons();
    } },
    { label: (data.iconGrid ? "✓ " : "") + "Align icons to grid", run: () => { data.iconGrid = !data.iconGrid; persistData(); } },
    { label: (data.showIcons ? "✓ " : "") + "Show desktop icons", run: () => { data.showIcons = !data.showIcons; persistData(); applyTheme(); } },
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
    null,
    ...arrangeMenu(),
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
  const items = Array.from(contextMenu.querySelectorAll("button:not(:disabled)")); if (event.key === "Home" || event.key === "End") { event.preventDefault(); items[event.key === "Home" ? 0 : items.length - 1]?.focus(); return; } if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) { const start = items.indexOf(document.activeElement); const match = [...items.slice(start + 1), ...items.slice(0, start + 1)].find((button) => button.textContent.replace(/^✓ /, "").toLowerCase().startsWith(event.key.toLowerCase())); if (match) { event.preventDefault(); match.focus(); } return; }
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
    if (isFolderId(id)) return showMenu(...toScene(event.clientX, event.clientY), [{ label: "Open", run: () => openApp(id) }, null, { label: "Rename", run: () => renameIcon(id) }, { label: "Ungroup folder", run: () => dissolveFolder(id.slice(FOLDER_PREFIX.length)) }]);
    return showMenu(...toScene(event.clientX, event.clientY), [{ label: "Open", run: () => openApp(id) }, pinItem(id), quickItem(id), null, { label: "Rename", run: () => renameIcon(id) }, { label: "Properties", run: () => showProperties(id) }]);
  }
  showMenu(...toScene(event.clientX, event.clientY), desktopMenu());
});
desk.addEventListener("dragover", (event) => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); });
desk.addEventListener("drop", async (event) => { if (!event.dataTransfer?.files.length) return; event.preventDefault(); const count = await importTextFiles(event.dataTransfer.files, null); if (!count) return showToast("Only text files can be imported."); openApp("files"); showToast(count === 1 ? "Imported 1 file into C:\\." : "Imported " + count + " files into C:\\."); });
document.querySelector(".taskbar").addEventListener("contextmenu", (event) => { if (event.target.closest(".task, .start-wrap, .tray")) return; event.preventDefault(); showMenu(...toScene(event.clientX, event.clientY), [...arrangeMenu(), null, { label: (data.autoHideTaskbar ? "✓ " : "") + "Auto-hide the taskbar", run: () => { data.autoHideTaskbar = !data.autoHideTaskbar; persistData(); applyTheme(); } }, { label: "Properties", run: () => openApp("settings") }]); });
document.addEventListener("pointermove", (event) => { if (!data.autoHideTaskbar) return; const bar = document.querySelector(".taskbar"); const [, y] = toScene(event.clientX, event.clientY); const bottom = desk.getBoundingClientRect().bottom; bar.classList.toggle("peek", y >= bottom - (bar.classList.contains("peek") ? bar.offsetHeight : 4) || !contextMenu.classList.contains("hidden")); }, { passive: true });
const startItem = (id, label) => { const app = apps.find((item) => item.id === id); return '<button type="button" role="menuitem" data-open-app="' + escapeHtml(id) + '"><img class="start-menu__glyph" src="' + app.icon + '" alt=""><span>' + escapeHtml(label || app.name) + "</span></button>"; };
startMenu.innerHTML = '<div class="start-menu__banner"><img class="start-menu__avatar" src="' + sprite("user-placeholder") + '" alt="" width="48" height="48"><div class="start-menu__who"><strong>LUMEN</strong><span>Builder Desk</span></div></div><div class="start-menu__cols"><div class="start-menu__left"><label class="start-menu__search"><span class="sr-only">Search apps</span><input class="field" type="search" placeholder="Find an app" autocomplete="off" data-app-search></label><div class="start-menu__pinned"></div><div class="start-menu__all">' + apps.filter((app) => !isFolderId(app.id)).map((app) => startItem(app.id)).join("") + '</div><div class="start-menu__found" data-start-found></div><div class="menu-separator" role="separator"></div><button type="button" role="menuitem" class="start-menu__more" data-all-programs><span>All Programs</span></button></div><div class="start-menu__right">' + [["files", "My Files"], ["calendar", "My Calendar"], ["charmap", "Character Map"]].map(([id, label]) => startItem(id, label)).join("") + '<div class="start-menu__recent" data-start-recent></div><div class="menu-separator" role="separator"></div>' + [["settings", "Control Panel"], ["about", "Help and Support"]].map(([id, label]) => startItem(id, label)).join("") + '<button type="button" role="menuitem" data-run><img class="start-menu__glyph" src="' + sprite("run") + '" alt=""><span>Run...</span></button><button type="button" role="menuitem" data-install-app><img class="start-menu__glyph" src="' + sprite("info") + '" alt=""><span data-install-label>Install LUMEN...</span></button></div></div><div class="start-menu__foot"><button type="button" role="menuitem" data-log-off><img src="' + sprite("logoff") + '" alt="" width="22" height="22">Log Off</button><button type="button" role="menuitem" data-power-off><img src="' + sprite("power") + '" alt="" width="22" height="22">Turn Off Computer</button></div>';
const startSearch = startMenu.querySelector("[data-app-search]");
function filterStartMenu(query) {
  const needle = query.trim().toLocaleLowerCase();
  startMenu.classList.toggle("searching", Boolean(needle));
  startMenu.querySelectorAll(".start-menu__all [data-open-app]").forEach((button) => button.classList.toggle("hidden", !button.textContent.toLocaleLowerCase().includes(needle)));
  const found = needle ? data.files.filter((item) => item.kind === "text" && (item.name.toLocaleLowerCase().includes(needle) || item.content.toLocaleLowerCase().includes(needle))).slice(0, 5) : [];
  startMenu.querySelector("[data-start-found]").innerHTML = found.length ? '<div class="start-menu__heading">Files</div>' + found.map((item) => '<button type="button" role="menuitem" data-open-file="' + escapeHtml(item.id) + '"><img class="start-menu__glyph" src="' + sprite("text-file") + '" alt=""><span>' + escapeHtml(item.name) + "</span></button>").join("") : "";
}
startSearch.addEventListener("input", () => filterStartMenu(startSearch.value));
startSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const firstMatch = startMenu.querySelector(".start-menu__all [data-open-app]:not(.hidden), [data-open-file]");
  if (!firstMatch) return;
  firstMatch.click();
});

function pinItem(id) { const pinned = data.startPins.includes(id); return { label: pinned ? "Unpin from Start menu" : "Pin to Start menu", run: () => { data.startPins = pinned ? data.startPins.filter((item) => item !== id) : [...data.startPins, id].slice(0, 12); persistData(); renderPinned(); } }; }
function renderPinned() {
  const pinned = data.startPins.filter((id) => apps.some((app) => app.id === id));
  const frequent = Object.entries(data.launches).filter(([id]) => !pinned.includes(id) && !isFolderId(id) && apps.some((app) => app.id === id)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  ["calculator", "paint", "focus", "shiplog", "minesweeper", "files"].forEach((id) => { if (!frequent.includes(id) && !pinned.includes(id)) frequent.push(id); });
  const recent = data.recentFiles.map((id) => data.files.find((item) => item.id === id && item.kind === "text")).filter(Boolean).slice(0, 3);
  startMenu.querySelector("[data-start-recent]").innerHTML = recent.length ? '<div class="start-menu__heading">Recent files</div>' + recent.map((item) => '<button type="button" role="menuitem" data-open-file="' + escapeHtml(item.id) + '"><img class="start-menu__glyph" src="' + sprite("text-file") + '" alt=""><span>' + escapeHtml(item.name) + "</span></button>").join("") : "";
  startMenu.querySelector(".start-menu__pinned").innerHTML = pinned.map((id) => startItem(id)).join("") + (pinned.length ? '<div class="menu-separator" role="separator"></div>' : "") + frequent.slice(0, Math.max(2, 7 - pinned.length)).map((id) => startItem(id)).join("");
}
function setStartMenu(show) { if (!show && startMenu.classList.contains("hidden")) return; refreshSceneHover();
  startMenu.classList.toggle("hidden", !show);
  startBtn.setAttribute("aria-expanded", String(show));
  if (show) {
    startSearch.value = "";
    startMenu.classList.remove("show-all"); writeText(startMenu.querySelector("[data-all-programs] span"), "All Programs"); document.getElementById("toast").classList.add("hidden");
    renderPinned();
    filterStartMenu("");
    startSearch.focus();
  }
}

startBtn.addEventListener("click", () => setStartMenu(startMenu.classList.contains("hidden")));
startMenu.addEventListener("keydown", (event) => {
  if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  if (event.target === startSearch && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;
  const column = event.target.closest(".start-menu__right, .start-menu__foot") || startMenu.querySelector(".start-menu__left");
  const visible = (scope) => Array.from(scope.querySelectorAll("button")).filter((button) => button.offsetParent !== null);
  event.preventDefault();
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    const other = column.matches(".start-menu__left") ? startMenu.querySelector(".start-menu__right") : startMenu.querySelector(".start-menu__left");
    return visible(other)[0]?.focus();
  }
  const buttons = visible(column);
  const index = buttons.indexOf(event.target);
  buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1) + (index < 0 && event.key === "ArrowUp" ? 1 : 0)) % buttons.length]?.focus();
});
startMenu.addEventListener("contextmenu", (event) => { const button = event.target.closest("[data-open-app]"); event.preventDefault(); if (!button) return; const id = button.dataset.openApp; showMenu(...toScene(event.clientX, event.clientY), [{ label: "Open", run: () => { setStartMenu(false); openApp(id); } }, pinItem(id), quickItem(id), null, { label: "Properties", run: () => { setStartMenu(false); showProperties(id); } }]); });
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
  if (event.target.closest("[data-all-programs]")) writeText(startMenu.querySelector("[data-all-programs] span"), startMenu.classList.toggle("show-all") ? "Back" : "All Programs");
  if (event.target.closest("[data-log-off]")) { setStartMenu(false); logOff(); }
  if (event.target.closest("[data-run]")) { setStartMenu(false); runDialog(); }
  const fileButton = event.target.closest("[data-open-file]");
  if (fileButton) { setStartMenu(false); openApp("files"); document.dispatchEvent(new CustomEvent("lumen-open-file", { detail: fileButton.dataset.openFile })); }
  if (event.target.closest("[data-power-off]")) { setStartMenu(false); turnOffDialog(); }
});
document.addEventListener("mousedown", (event) => {
  if (!event.target.closest(".start-wrap, .context-menu")) setStartMenu(false);
});
const runAliases = { notepad: "notes", calc: "calculator", mspaint: "paint", cmd: "terminal", command: "terminal", winmine: "minesweeper", explorer: "files", control: "settings", desk: "settings", timedate: "calendar", winver: "about", sol: "busywork", recycler: "recycle" };
async function runDialog() {
  const typed = await showWindowDialog({ title: "Run", message: "Type the name of a program, and LUMEN will open it for you.", value: data.runHistory[0] || "", suggestions: data.runHistory, onDesk: true });
  if (!typed || !typed.trim()) return;
  const name = typed.trim().toLowerCase().replace(/\.exe$/, "");
  const app = apps.find((item) => item.id === (runAliases[name] || name) || item.name.toLowerCase() === name) || apps.find((item) => item.name.toLowerCase().startsWith(name));
  if (!app) return showToast("LUMEN cannot find " + typed.trim() + ". Check the spelling and try again.");
  data.runHistory = [typed.trim(), ...data.runHistory.filter((item) => item.toLowerCase() !== typed.trim().toLowerCase())].slice(0, 8); persistData();
  openApp(app.id);
}
async function logOff() {
  if (!await showWindowDialog({ title: "Log Off LUMEN", message: "Are you sure you want to log off? Your notes, files, and drawings stay saved.", confirmLabel: "Log Off", onDesk: true })) return;
  Array.from(open.keys()).forEach((id) => closeApp(id));
  setStartMenu(false);
  showWelcome();
}
function showWelcome() {
  if (desk.querySelector(".welcome")) return;
  const screen = document.createElement("div");
  screen.className = "welcome";
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-label", "Welcome");
  screen.innerHTML = '<div class="welcome__band"></div><div class="welcome__middle"><div class="welcome__intro"><img class="welcome__mark" src="' + sprite("l") + '" alt="" width="28" height="32"><strong>LUMEN</strong><span>To begin, click your user name</span></div><div class="welcome__divider"></div><button type="button" class="welcome__user" data-welcome-user><img src="' + sprite("user-placeholder") + '" alt="" width="48" height="48"><span><strong>LUMEN</strong><small>Builder Desk</small></span></button></div><div class="welcome__band welcome__band--foot"><button type="button" class="welcome__off" data-welcome-off><img src="' + sprite("power") + '" alt="" width="22" height="22">Turn off LUMEN</button><span>Your notes, files, and drawings are saved.</span></div>';
  desk.append(screen);
  playSound("close");
  screen.querySelector("[data-welcome-user]").addEventListener("click", () => { screen.classList.add("leaving"); playSound("open"); window.setTimeout(() => screen.remove(), 320); });
  screen.querySelector("[data-welcome-off]").addEventListener("click", () => { screen.remove(); turnOffDialog(); });
  screen.querySelector("[data-welcome-user]").focus({ preventScroll: true });
}
function turnOffDialog() {
  if (desk.querySelector(".shutdown")) return;
  desk.classList.add("shutting");
  const dialog = document.createElement("div");
  dialog.className = "shutdown";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", "Turn off LUMEN");
  dialog.innerHTML = '<div class="shutdown__box"><div class="shutdown__head"><span>Turn off LUMEN</span><img src="' + sprite("l") + '" alt="" width="14" height="16"></div><div class="shutdown__choices"><button type="button" data-power="standby"><img class="shutdown__icon" src="' + sprite("stand-by") + '" alt="" width="32" height="32">Stand By</button><button type="button" data-power="off"><img class="shutdown__icon" src="' + sprite("turn-off") + '" alt="" width="32" height="32">Turn Off</button><button type="button" data-power="restart"><img class="shutdown__icon" src="' + sprite("restart") + '" alt="" width="32" height="32">Restart</button></div><div class="shutdown__foot"><button type="button" class="btn" data-power="cancel">Cancel</button></div></div>';
  desk.append(dialog);
  const close = () => { dialog.remove(); desk.classList.remove("shutting"); };
  dialog.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } });
  dialog.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-power]")?.dataset.power;
    if (!choice) return;
    close();
    if (choice === "standby") startSaver(true);
    if (choice === "off") powerOff();
    if (choice === "restart") { rememberWindows(); location.reload(); }
  });
  dialog.querySelector('[data-power="off"]').focus({ preventScroll: true });
}
function powerOff() {
  rememberWindows();
  playSound("close");
  document.documentElement.classList.add("powered-off");
  const hint = document.createElement("p");
  hint.className = "power-hint";
  hint.textContent = "LUMEN is off. Click or press any key to turn it on.";
  document.body.append(hint);
  window.setTimeout(() => {
    const wake = () => location.reload();
    document.addEventListener("pointerdown", wake, { once: true });
    document.addEventListener("keydown", wake, { once: true });
  }, 700);
}

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
  if (desk.querySelector(".welcome")) return;
  konamiStep = event.key === konami[konamiStep] ? konamiStep + 1 : event.key === konami[0] ? 1 : 0;
  if (konamiStep === konami.length) {
    konamiStep = 0;
    degauss();
  }
  if (event.key === "Enter" && !event.target.closest("input, textarea, select, button, a, .win") && selectedIconIds().length) {
    event.preventDefault();
    selectedIconIds().forEach((id) => openApp(id));
    return;
  }
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s") { event.preventDefault(); const target = activeId && open.get(activeId)?.el.querySelector({ notes: "[data-save-note-version]", paint: "[data-paint-save]" }[activeId] || "[data-save-shortcut]"); if (target) target.click(); else { persistData(); showToast("Saved on this device."); } return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a" && !event.target.closest("input, textarea, select, .win, [contenteditable]")) { event.preventDefault(); selectIcons(new Set([...iconButtons].filter(([, button]) => !button.hidden).map(([id]) => id))); return; }
  if (event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && ["d", "e"].includes(event.key.toLowerCase()) && !event.target.closest("input, textarea, select")) { event.preventDefault(); if (event.key.toLowerCase() === "d") toggleDesktop(); else openApp("files"); return; }
  if (event.key === "F1") { event.preventDefault(); openApp("about"); return; }
  if (event.key === "F2" && !event.target.closest("input, textarea, select, .win, [contenteditable]") && selectedIconIds().length === 1) { event.preventDefault(); renameIcon(selectedIconIds()[0]); return; }
  if (event.altKey && event.code === "Space" && activeId && open.has(activeId)) {
    event.preventDefault();
    const box = open.get(activeId).el.querySelector(".bar-title img").getBoundingClientRect();
    showMenu(Math.round(box.left), Math.round(box.bottom) + 4, windowMenu(activeId));
    return;
  }
  if (event.key === "Escape" && event.altKey) {
    event.preventDefault();
    const stack = Array.from(open.entries()).filter(([, entry]) => !entry.el.classList.contains("min")).sort((a, b) => Number(a[1].el.style.zIndex) - Number(b[1].el.style.zIndex));
    if (stack.length > 1) focusWin(stack[0][0]);
    return;
  }
  if (event.key === "Escape" && event.ctrlKey) {
    event.preventDefault();
    setStartMenu(startMenu.classList.contains("hidden"));
    return;
  }
  if (event.key === "Escape") {
    if (!volumePop.classList.contains("hidden")) { volumePop.classList.add("hidden"); return; }
    if (!contextMenu.classList.contains("hidden")) {
      hideMenu();
      return;
    }
    selectIcons(new Set());
    if (!startMenu.classList.contains("hidden")) {
      setStartMenu(false);
      startBtn.focus();
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

let metaAlone = false;
document.addEventListener("keydown", (event) => { if (event.key !== "Meta") metaAlone = false; else if (!event.repeat) metaAlone = true; }, true);
["pointerdown", "wheel"].forEach((type) => document.addEventListener(type, () => { metaAlone = false; }, true));
window.addEventListener("blur", () => { metaAlone = false; });
document.addEventListener("keyup", (event) => { if (event.key !== "Meta" || !metaAlone || document.querySelector("#boot")) return; metaAlone = false; setStartMenu(startMenu.classList.contains("hidden")); });
let deferredInstallPrompt = null;
function isInstalled() {
  return window.matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay)").matches || window.navigator.standalone === true;
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

function checkReminders() { if (!data.events.some((event) => event.time)) return;
  const now = new Date();
  const today = localDay(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const due = data.events.filter((event) => event.time && event.reminded !== true && event.reminded !== today && eventOn(event, today) && (([hours, mins]) => minutes - (hours * 60 + mins))(event.time.split(":").map(Number)) >= 0);
  if (!due.length) return;
  due.forEach((event) => { event.reminded = today; });
  const fresh = due.filter((event) => (([hours, mins]) => minutes - (hours * 60 + mins))(event.time.split(":").map(Number)) <= 30);
  persistData();
  if (!fresh.length) return;
  playSound("timer");
  showToast("Reminder, " + fresh[0].time + ": " + fresh[0].text + (fresh.length > 1 ? " and " + (fresh.length - 1) + " more" : ""));
  if (activeId !== "calendar") open.get("calendar")?.tab.classList.add("flashing");
}
window.setInterval(checkReminders, 20000);
let clockTimeout = null;
let clockDay = localDay();
function tickClock() {
  window.clearTimeout(clockTimeout);
  const now = new Date();
  const clock = document.querySelector("[data-clock-time]");
  const label = clockFormat.format(now);
  writeText(clock, label);
  clock.dateTime = now.toISOString().slice(0, 16);
  clock.parentElement.title = fullDateFormat.format(now); if (localDay(now) !== clockDay) { clockDay = localDay(now); document.dispatchEvent(new Event("lumen-day-changed")); }
  clockTimeout = window.setTimeout(tickClock, 60000 - (now.getTime() % 60000) + 50);
}
tickClock();
document.addEventListener("visibilitychange", () => { if (!document.hidden) tickClock(); });
window.addEventListener("focus", tickClock);
document.getElementById("clock").addEventListener("click", () => openApp("calendar"));
document.querySelector(".tray").addEventListener("contextmenu", (event) => {
  event.preventDefault();
  event.stopPropagation();
  showMenu(...toScene(event.clientX, event.clientY), [
    { label: "Adjust date and time", run: () => openApp("calendar") },
    { label: (data.clock24 ? "✓ " : "") + "Use 24-hour clock", run: () => { data.clock24 = !data.clock24; persistData(); applyTheme(); writeText(document.querySelector("[data-clock-time]"), clockFormat.format(new Date())); } },
    { label: (data.sounds ? "" : "✓ ") + "Mute sounds", run: () => { data.sounds = !data.sounds; persistData(); paintVolume(); } },
    null,
    { label: "Properties", run: () => openApp("settings") },
  ]);
});
document.getElementById("trayTimer").addEventListener("click", () => openApp("focus"));
document.querySelector("[data-show-desktop]").addEventListener("click", toggleDesktop);
function renderQuickLaunch() { const bar = document.querySelector(".quick-launch"); bar.querySelectorAll("[data-quick-app]").forEach((button) => button.remove()); data.quickLaunch.map((id) => apps.find((app) => app.id === id)).filter(Boolean).forEach((app) => { const button = document.createElement("button"); button.type = "button"; button.className = "quick-launch__app"; button.dataset.quickApp = app.id; button.title = app.name; button.setAttribute("aria-label", "Open " + app.name); button.innerHTML = '<img src="' + app.icon + '" alt="" width="16" height="16">'; bar.append(button); }); }
function quickItem(id) { const added = data.quickLaunch.includes(id); return { label: added ? "Remove from Quick Launch" : "Add to Quick Launch", run: () => { data.quickLaunch = added ? data.quickLaunch.filter((item) => item !== id) : [...data.quickLaunch, id].slice(0, 8); persistData(); renderQuickLaunch(); } }; }
document.querySelector(".quick-launch").addEventListener("click", (event) => { const button = event.target.closest("[data-quick-app]"); if (button) openApp(button.dataset.quickApp); });
document.querySelector(".quick-launch").addEventListener("contextmenu", (event) => { const button = event.target.closest("[data-quick-app]"); if (!button) return; event.preventDefault(); event.stopPropagation(); showMenu(...toScene(event.clientX, event.clientY), [{ label: "Open", run: () => openApp(button.dataset.quickApp) }, quickItem(button.dataset.quickApp)]); });
renderQuickLaunch(); dragReorder(document.querySelector(".quick-launch"), "[data-quick-app]", () => { data.quickLaunch = [...document.querySelectorAll(".quick-launch [data-quick-app]")].map((button) => button.dataset.quickApp); persistData(); });
function paintVolume() {
  const volume = document.getElementById("volume");
  volume.classList.toggle("muted", !data.sounds);
  volume.setAttribute("aria-pressed", String(!data.sounds));
  volume.setAttribute("aria-label", "Volume");
  volume.title = data.sounds ? "Volume " + data.volume + "%" : "Muted";
}
const volumePop = document.getElementById("volumePop");
document.getElementById("volume").addEventListener("click", (event) => {
  event.stopPropagation();
  volumePop.querySelector("[data-volume-slider]").value = String(data.volume);
  volumePop.querySelector("[data-volume-mute]").checked = !data.sounds;
  volumePop.classList.toggle("hidden");
  document.getElementById("toast").classList.add("hidden");
});
document.getElementById("volume").addEventListener("dblclick", () => { data.sounds = !data.sounds; persistData(); paintVolume(); });
volumePop.addEventListener("input", (event) => {
  if (event.target.matches("[data-volume-slider]")) data.volume = Number(event.target.value);
  if (event.target.matches("[data-volume-mute]")) data.sounds = !event.target.checked;
  persistData();
  paintVolume();
});
volumePop.addEventListener("change", (event) => { if (event.target.matches("[data-volume-slider]") && data.sounds) playSound("restore"); });
document.addEventListener("pointerdown", (event) => { if (!event.target.closest("#volumePop, #volume")) volumePop.classList.add("hidden"); });
document.getElementById("toast").addEventListener("click", () => document.getElementById("toast").classList.add("hidden"));
paintVolume();
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
  const desk = document.getElementById("desk");
  const screen = { clientWidth: desk.clientWidth || window.innerWidth, clientHeight: desk.clientHeight || window.innerHeight, offsetTop: desk.clientHeight ? desk.offsetTop : 0 };
  const height = Math.max(1, Math.round(width * screen.clientHeight / Math.max(1, screen.clientWidth)));
  const scale = Math.ceil(2 * strength * Math.max(screen.clientWidth, screen.clientHeight));
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
      image.data[index] = Math.round(255 * (0.5 + nx * pull * screen.clientWidth));
      image.data[index + 1] = Math.round(255 * (0.5 + ny * pull * screen.clientHeight));
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const map = canvas.toDataURL();
  lenses.forEach((lens) => lens.setAttribute("href", map));
  bends.forEach((bend) => bend.setAttribute("scale", String(scale)));
  lens = { strength, top: screen.offsetTop, width: screen.clientWidth, height: screen.clientHeight };
}
let bendTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(bendTimer);
  bendTimer = window.setTimeout(bendScreen, 160);
});
function rememberWindows() {
  if (document.getElementById("boot")) return;
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
let restoringSession = false;
function restoreWindows() {
  restoringSession = true; const saved = data.windows.filter((item) => apps.some((app) => app.id === item.id));
  saved.forEach((item) => {
    openApp(item.id, item);
    const entry = open.get(item.id);
    if (!entry) return;
    if (wins.clientWidth && wins.clientHeight) {
      entry.el.style.width = Math.min(item.width, wins.clientWidth) + "px";
      entry.el.style.height = Math.min(item.height, wins.clientHeight) + "px";
      constrainWindow(entry.el);
    }
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
  restoringSession = false; return saved.length > 0;
}
window.addEventListener("pagehide", rememberWindows);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") rememberWindows();
});
const tips = ["Drag desktop icons anywhere, then right-click the desk to line them up again.", "Press F2 on a selected desktop icon to rename it.", "Tap the Windows or Command key to open the Start menu.", "Right-click a program in the Start menu to pin it near the top.", "Type what you are working on in Focus and finished sessions land in Ship Log.", "Drag checklist tasks, or use Alt and the arrow keys, to put them in your own order.", "Calendar events can repeat every week, month, or year.", "Press Ctrl+F in Notes to find and replace, and F5 to stamp the time.", "Copy, paste, and duplicate files with Ctrl+C, Ctrl+V, and Ctrl+D in Files.", "Right-click the taskbar to tile or cascade windows, or to auto-hide the taskbar.", "Alt+Space opens the window menu, and Alt+Esc switches windows.", "Drop text files onto the desk to import them into Files.", "Export a backup from Display Properties to move your desk to another browser.", "Ctrl+S saves a Notes version or the Paint picture instead of the whole page."];
function showTip() { if (!data.showTips) return; const tip = tips[data.tipIndex % tips.length]; data.tipIndex = (data.tipIndex + 1) % tips.length; persistData(); showToast("Did you know? " + tip); }
async function boot() {
  let skipping = false;
  const skip = (event) => { if (event.type === "pointerdown" || event.key === "Escape" || event.key === "Enter" || event.key === " ") skipping = true; };
  document.addEventListener("keydown", skip);
  document.addEventListener("pointerdown", skip);
  const wait = (ms) => skipping ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
  const post = document.querySelector("[data-boot-post]");
  const print = (line) => {
    post.textContent += line + "\n";
  };
  print("LUMEN BIOS v1.04  Copyright 1987 Lumen Systems");
  print("");
  print("Main processor: Lumen 386 at 33 MHz");
  print("Press Esc to skip");
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
  bendScreen();
  layoutIcons();
  document.removeEventListener("keydown", skip);
  document.removeEventListener("pointerdown", skip);
  await wait(700);
  document.getElementById("boot").classList.add("fade");
  await wait(420);
  document.getElementById("boot").remove();
  const requestedApp = location.hash.slice(1) === "texttools" ? "notes" : location.hash.slice(1);
  const restored = restoreWindows();
  if (apps.some((app) => app.id === requestedApp)) openApp(requestedApp);
  else if (!restored) openApp("about");
  const now = new Date();
  const today = localDay(now);
  const agenda = data.events.filter((event) => eventOn(event, today));
  const dueTasks = data.tasks.filter((task) => !task.done && task.due && task.due <= today).sort((a, b) => a.due.localeCompare(b.due));
  if (dueTasks.length) window.setTimeout(() => showToast(dueTasks.length === 1 ? "Task due: " + dueTasks[0].text : dueTasks.length + " tasks are due, starting with " + dueTasks[0].text + "."), agenda.length ? 4200 : 900);
  if (agenda.length) window.setTimeout(() => showToast(agenda.length === 1 ? "Today: " + agenda[0].text : "You have " + agenda.length + " events today, starting with " + agenda[0].text + "."), 900);
  if (!agenda.length && !dueTasks.length) window.setTimeout(showTip, 1400);
  window.setTimeout(checkReminders, 4500); installScriptSamples().catch(() => {});
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
saver.innerHTML = '<span class="saver__logo">LUMEN</span><canvas class="saver__stars"></canvas>';
desk.append(saver);
let lastActive = performance.now();
let saverFrame = 0;
function startSaver(force = false) {
  if ((!data.screensaver && !force) || document.hidden || document.getElementById("boot")) return;
  const logo = saver.firstElementChild;
  const stars = saver.querySelector("canvas");
  saver.classList.remove("hidden");
  screenCursor.classList.add("hidden");
  logo.hidden = data.saverStyle !== "logo";
  stars.hidden = data.saverStyle !== "starfield" && data.saverStyle !== "mystify";
  if (data.saverStyle === "blank" || reducedMotion.matches) return;
  if (data.saverStyle === "mystify") {
    const context = stars.getContext("2d");
    stars.width = Math.ceil(window.innerWidth / 2);
    stars.height = Math.ceil(window.innerHeight / 2);
    const shapes = [0, 1].map((shape) => ({ hue: shape * 180, trail: [], points: Array.from({ length: 4 }, () => ({ x: Math.random() * stars.width, y: Math.random() * stars.height, dx: (Math.random() * 0.06 + 0.03) * (Math.random() < 0.5 ? -1 : 1), dy: (Math.random() * 0.06 + 0.03) * (Math.random() < 0.5 ? -1 : 1) })) }));
    let previous = performance.now();
    const drift = (now) => {
      const elapsed = Math.min(50, now - previous);
      previous = now;
      context.fillStyle = "#000";
      context.fillRect(0, 0, stars.width, stars.height);
      shapes.forEach((shape) => {
        shape.points.forEach((point) => {
          point.x += point.dx * elapsed;
          point.y += point.dy * elapsed;
          if (point.x < 0 || point.x > stars.width) { point.dx = -point.dx; point.x = Math.max(0, Math.min(stars.width, point.x)); }
          if (point.y < 0 || point.y > stars.height) { point.dy = -point.dy; point.y = Math.max(0, Math.min(stars.height, point.y)); }
        });
        shape.hue = (shape.hue + elapsed * 0.02) % 360;
        shape.trail.unshift(shape.points.map((point) => [Math.round(point.x) + 0.5, Math.round(point.y) + 0.5]));
        shape.trail.length = Math.min(shape.trail.length, 6);
        shape.trail.forEach((outline, index) => {
          context.strokeStyle = "hsl(" + Math.round(shape.hue) + " 90% " + (60 - index * 8) + "%)";
          context.beginPath();
          outline.forEach(([x, y], corner) => (corner ? context.lineTo(x, y) : context.moveTo(x, y)));
          context.closePath();
          context.stroke();
        });
      });
      saverFrame = requestAnimationFrame(drift);
    };
    saverFrame = requestAnimationFrame(drift);
    return;
  }
  if (data.saverStyle === "starfield") {
    const context = stars.getContext("2d");
    stars.width = Math.ceil(window.innerWidth / 2);
    stars.height = Math.ceil(window.innerHeight / 2);
    const field = Array.from({ length: 160 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()]);
    let previous = performance.now();
    const fly = (now) => {
      const elapsed = Math.min(50, now - previous);
      previous = now;
      context.fillStyle = "#000";
      context.fillRect(0, 0, stars.width, stars.height);
      field.forEach((star) => {
        star[2] -= elapsed * 0.00025;
        if (star[2] <= 0.02) { star[0] = Math.random() * 2 - 1; star[1] = Math.random() * 2 - 1; star[2] = 1; }
        const x = Math.round(stars.width / 2 + star[0] / star[2] * stars.width / 2);
        const y = Math.round(stars.height / 2 + star[1] / star[2] * stars.height / 2);
        const shade = Math.round(110 + 145 * (1 - star[2]));
        context.fillStyle = "rgb(" + shade + "," + shade + "," + shade + ")";
        context.fillRect(x, y, star[2] < 0.3 ? 2 : 1, star[2] < 0.3 ? 2 : 1);
      });
      saverFrame = requestAnimationFrame(fly);
    };
    saverFrame = requestAnimationFrame(fly);
    return;
  }
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
["pointermove", "pointerdown", "keydown", "wheel"].forEach((type) => document.addEventListener(type, wake, { capture: true, passive: type === "pointermove" || type === "wheel" }));
window.setInterval(() => {
  if (data.screensaver && saver.classList.contains("hidden") && performance.now() - lastActive > data.saverWait * 60000) startSaver();
}, 5000);
window.addEventListener("storage", async (event) => { if (event.key !== KEY || event.newValue === null || savingPaused) return; savingPaused = true; const reload = await showWindowDialog({ title: "LUMEN", message: "LUMEN was changed in another tab or window. Reload to bring those changes here, or keep this tab's version and save it over them.", confirmLabel: "Reload", cancelLabel: "Keep this tab", onDesk: true }); if (reload) { location.reload(); return; } savingPaused = false; lastSaved = ""; persistData(); });
boot();
