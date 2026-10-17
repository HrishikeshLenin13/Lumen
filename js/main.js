import { makeDefaultData, clampNumber, normalizeData, normalizeTags, extractNoteHeadings, validateLogEntry, filterLogs, restoreTimerState, appendCompletedSession, logsToCsv } from "./data-core.mjs";

const KEY = "lumen-desk-v1";
const APP_TITLE = "LUMEN - Builder Desk";
const TIMER_TICK_MS = 1000;

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
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}
function persistData() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    showToast("LUMEN could not save data in this browser.");
    return false;
  }
}
function applyTheme() {
  document.documentElement.dataset.theme = data.theme;
  document.documentElement.dataset.effects = data.effects;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = data.theme === "light" ? "#6f84a9" : "#245edb";
}
persistData();
applyTheme();
// Store an absolute deadline so a running timer can resume accurately after reload.
const timer = {
  ...restoreTimerState(data.timerState, data.focusMin),
  intervalId: null,
};
function saveTimerState() {
  data.timerState = { mode: timer.mode, secondsLeft: timer.secondsLeft, running: timer.running, finished: timer.finished, endAt: timer.endAt };
  persistData();
}
// Keep a small, newest-first history; a finished focus block adds one record.
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
function playFinishedSound() {
  if (!audioContext) return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(660, now + 0.2);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  } catch {
    return;
  }
}
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}
function stopTimerInterval() {
  clearInterval(timer.intervalId);
  timer.intervalId = null;
}
function paintTimer(root = open.get("focus")?.el.querySelector(".body")) {
  if (!root) return;
  const readout = root.querySelector("#timer");
  const status = root.querySelector("[data-timer-status]");
  const start = root.querySelector("[data-focus-start]");
  const pause = root.querySelector("[data-focus-pause]");
  readout.textContent = formatTime(timer.secondsLeft);
  readout.classList.toggle("done", timer.finished);
  root.querySelectorAll("[data-timer-mode]").forEach((button) => {
    const selected = button.dataset.timerMode === timer.mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (timer.finished) status.textContent = timerLabel() + " complete.";
  else if (timer.running) status.textContent = timerLabel() + " timer is running.";
  else if (timer.secondsLeft < timerMinutes() * 60) status.textContent = timerLabel() + " timer is paused.";
  else status.textContent = "Ready for a " + timerMinutes() + " minute " + timerLabel().toLowerCase() + ".";
  if (timer.finished) start.textContent = "Restart " + timerLabel().toLowerCase();
  else if (timer.running) start.textContent = "Running…";
  else if (timer.secondsLeft < timerMinutes() * 60) start.textContent = "Resume";
  else start.textContent = "Start " + timerMinutes() + "m";
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
  playFinishedSound();
  showToast(message);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(message, {
      body: timer.mode === "focus" ? "Time for a break." : "Ready for another focus session?",
      icon: "icons/l.png?v=12",
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
  requestNotificationPermission();
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
let editingLogId = null;
const selectedLogIds = new Set();
function formatLogDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
function formatHours(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
function renderNoteOutline(nav, notes) {
  if (!nav) return;
  const headings = extractNoteHeadings(notes);
  nav.innerHTML = headings.length
    ? '<h3 class="notes-outline__title">In this note</h3><ol>' + headings.map((heading, index) => '<li><button type="button" class="btn notes-outline__item" data-note-heading="' + index + '" style="--heading-indent:' + ((heading.level - 1) * 8) + 'px" aria-label="Go to ' + escapeHtml(heading.title) + ', line ' + heading.line + '"><span>' + escapeHtml(heading.title) + '</span><small>' + heading.line + '</small></button></li>').join("") + '</ol>'
    : '<p class="hint">Add Markdown headings like <code># Today</code> to build an outline.</p>';
}
// Search, date presets, the visible list, and CSV all use this one result set.
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
function logListHtml() {
  const rows = filteredLogs();
  const selectedCount = selectedLogIds.size;
  const toolbar = data.logs.length ? '<div class="log-selection-bar"><label class="log-select-all"><input type="checkbox" data-select-visible> Select shown</label><span class="log-selection-count">' + selectedCount + ' selected</span><button type="button" class="btn danger" data-log-action="delete-selected"' + (selectedCount ? "" : " disabled") + '>Delete selected</button><button type="button" class="btn" data-log-action="clear-selection"' + (selectedCount ? "" : " disabled") + '>Clear</button></div>' : "";
  if (!rows.length) {
    const hasActiveFilter = shipFilter.trim() || shipDateRange !== "all";
    return toolbar + '<p class="hint hint--flush">' + (hasActiveFilter ? "No entries match this filter." : "No entries yet.") + "</p>";
  }
  return toolbar + rows.map((entry) => {
    const checked = selectedLogIds.has(entry.id) ? " checked" : "";
    const selectedClass = selectedLogIds.has(entry.id) ? " selected" : "";
    if (entry.id === editingLogId) {
      return '<article class="log-item' + selectedClass + '" data-log-row="' + escapeHtml(entry.id) + '"><label class="log-select"><input type="checkbox" data-log-select="' + escapeHtml(entry.id) + '"' + checked + '> Select entry</label><label class="form-label">Hours<input class="field" type="number" min="0.25" max="24" step="0.25" value="' + escapeHtml(entry.h) + '" data-edit-hours></label><label class="form-label">What did you ship?<input class="field" type="text" maxlength="240" value="' + escapeHtml(entry.text) + '" data-edit-text></label><label class="form-label">Project<input class="field" type="text" maxlength="48" value="' + escapeHtml(entry.project || "") + '" data-edit-project></label><label class="form-label">Tags<input class="field" type="text" value="' + escapeHtml(normalizeTags(entry.tags).join(", ")) + '" data-edit-tags></label><div class="row row--actions"><button type="button" class="btn primary" data-log-action="save" data-log-id="' + escapeHtml(entry.id) + '">Save changes</button><button type="button" class="btn" data-log-action="cancel" data-log-id="' + escapeHtml(entry.id) + '">Cancel</button></div></article>';
    }
    const metadata = [entry.project, ...normalizeTags(entry.tags).map((tag) => "#" + tag)].filter(Boolean).map(escapeHtml).join(" · ");
    return '<article class="log-item' + selectedClass + '"><div class="log-item__header"><label class="log-select"><input type="checkbox" data-log-select="' + escapeHtml(entry.id) + '"' + checked + '> Select</label><strong>' + escapeHtml(formatHours(entry.h)) + 'h</strong><small>' + escapeHtml(formatLogDate(entry.at)) + '</small></div>' + (metadata ? '<p class="log-meta">' + metadata + '</p>' : '') + '<p>' + escapeHtml(entry.text) + '</p><div class="row row--actions"><button type="button" class="btn" data-log-action="edit" data-log-id="' + escapeHtml(entry.id) + '">Edit</button><button type="button" class="btn danger" data-log-action="delete" data-log-id="' + escapeHtml(entry.id) + '">Delete</button></div></article>';
  }).join("");
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
    const confirmed = window.confirm("Importing this backup will replace the current desk data. Continue?");
    if (!confirmed) return;
    data = normalizeData(imported);
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
function clearAllData() {
  const confirmed = window.confirm("Clear all LUMEN notes, settings, and ship log entries?");
  if (!confirmed) return;
  try {
    localStorage.removeItem(KEY);
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
    glyph: "N",
    icon: "icons/notes.png?v=12",
    html() {
      return '<p class="hint">Saved automatically on this device. Use Markdown headings to navigate longer notes.</p><div class="notes-layout"><textarea id="notesArea" aria-label="Project notes">' + escapeHtml(data.notes) + '</textarea><nav class="notes-outline" data-note-outline aria-label="Notes outline"></nav></div><div class="row row--actions"><span class="hint hint--flush" data-notes-status aria-live="polite">All changes saved.</span></div>';
    },
    bind(root) {
      const area = root.querySelector("#notesArea");
      const status = root.querySelector("[data-notes-status]");
      const outline = root.querySelector("[data-note-outline]");
      let saveTimer = null;
      renderNoteOutline(outline, area.value);
      const commit = () => {
        clearTimeout(saveTimer);
        data.notes = area.value;
        if (persistData()) status.textContent = "All changes saved.";
      };
      area.addEventListener("input", () => {
        data.notes = area.value;
        status.textContent = "Saving…";
        renderNoteOutline(outline, area.value);
        clearTimeout(saveTimer);
        saveTimer = setTimeout(commit, 450);
      });
      area.addEventListener("blur", commit);
      outline.addEventListener("click", (event) => {
        const button = event.target.closest("[data-note-heading]");
        if (!button) return;
        const heading = extractNoteHeadings(area.value)[Number(button.dataset.noteHeading)];
        if (!heading) return;
        area.focus();
        area.setSelectionRange(heading.start, heading.end);
      });
    },
  },
  {
    id: "focus",
    name: "Focus",
    glyph: "F",
    icon: "icons/timer.png?v=12",
    html() {
      return '<div class="timer-modes" aria-label="Timer mode"><button type="button" class="btn" data-timer-mode="focus" aria-pressed="false">Focus</button><button type="button" class="btn" data-timer-mode="break" aria-pressed="false">Break</button></div><p class="hint" data-timer-status aria-live="polite"></p><div class="timer" id="timer" role="timer" aria-live="polite"></div><div class="row"><button type="button" class="btn primary" data-focus-start>Start</button><button type="button" class="btn" data-focus-pause>Pause</button><button type="button" class="btn" data-focus-reset>Reset</button></div><section class="session-history" data-session-history aria-live="polite"></section>';
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
    glyph: "H",
    icon: "icons/logs.png?v=12",
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
      const render = () => {
        const validIds = new Set(data.logs.map((entry) => entry.id));
        selectedLogIds.forEach((id) => {
          if (!validIds.has(id)) selectedLogIds.delete(id);
        });
        list.innerHTML = logListHtml();
        total.textContent = totalLoggedHours() + "h";
        const visibleIds = filteredLogs().map((entry) => entry.id);
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
        render();
      });
      rangeInput.addEventListener("change", () => { shipDateRange = rangeInput.value; render(); });
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
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-log-action]");
        if (!button) return;
        const action = button.dataset.logAction;
        const id = button.dataset.logId;
        if (action === "clear-selection") {
          selectedLogIds.clear();
          render();
          return;
        }
        if (action === "delete-selected") {
          const count = selectedLogIds.size;
          if (!count || !window.confirm("Delete " + count + " selected ship log " + (count === 1 ? "entry" : "entries") + "?")) return;
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
          if (!window.confirm("Delete this ship log entry?")) return;
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
    id: "settings",
    name: "Settings",
    glyph: "S",
    icon: "icons/help.png?v=12",
    html() {
      const darkSelected = data.theme === "dark" ? " selected" : "";
      const lightSelected = data.theme === "light" ? " selected" : "";
      const fullEffectsSelected = data.effects === "full" ? " selected" : "";
      const subtleEffectsSelected = data.effects === "subtle" ? " selected" : "";
      const offEffectsSelected = data.effects === "off" ? " selected" : "";
      return '<form data-settings-form><div class="settings-grid"><label class="form-label">Focus length<input class="field" id="focusMinutes" type="number" min="1" max="180" step="1" value="' + data.focusMin + '" required></label><label class="form-label">Break length<input class="field" id="breakMinutes" type="number" min="1" max="60" step="1" value="' + data.breakMin + '" required></label><label class="form-label">Color scheme<select class="field" id="themeChoice"><option value="dark"' + darkSelected + '>Luna Blue</option><option value="light"' + lightSelected + '>Silver</option></select></label><label class="form-label">Screen effects<select class="field" id="effectsChoice"><option value="full"' + fullEffectsSelected + '>Full CRT</option><option value="subtle"' + subtleEffectsSelected + '>Subtle</option><option value="off"' + offEffectsSelected + '>Off</option></select></label></div><div class="row row--actions"><button type="submit" class="btn primary">Apply</button><span class="hint hint--flush" data-settings-status aria-live="polite"></span></div></form><hr class="separator"><h3 class="section-title">Backup and Restore</h3><p class="hint">Export your desk to a JSON file or restore a previous export.</p><div class="row"><button type="button" class="btn" data-export-backup>Export backup...</button><button type="button" class="btn" data-import-backup>Import backup...</button><input class="sr-only" type="file" accept="application/json,.json" data-import-file></div><h3 class="section-title">Install LUMEN</h3><button type="button" class="btn" data-install-app><span data-install-label>Install...</span></button><hr class="separator"><h3 class="section-title">Reset</h3><button type="button" class="btn danger" data-clear-data>Clear all data...</button>';
    },
    bind(root) {
      const form = root.querySelector("[data-settings-form]");
      const status = root.querySelector("[data-settings-status]");
      const fileInput = root.querySelector("[data-import-file]");
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        data.focusMin = clampNumber(root.querySelector("#focusMinutes").value, 1, 180, data.focusMin);
        data.breakMin = clampNumber(root.querySelector("#breakMinutes").value, 1, 60, data.breakMin);
        data.theme = root.querySelector("#themeChoice").value;
        data.effects = root.querySelector("#effectsChoice").value;
        persistData();
        applyTheme();
        resetTimer(timer.mode);
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
    id: "about",
    name: "About",
    glyph: "i",
    icon: "icons/info.png?v=12",
    html() {
      return '<h2 class="about-title">LUMEN</h2><p>Offline builder desk for notes, focus sessions, breaks, and shipped work.</p><p class="hint">Data stays in this browser unless you export it.</p><h3 class="section-title">Shortcuts</h3><ul class="shortcut-list"><li><kbd>Alt</kbd> + <kbd>1</kbd> - Notes</li><li><kbd>Alt</kbd> + <kbd>2</kbd> - Focus</li><li><kbd>Alt</kbd> + <kbd>3</kbd> - Ship Log</li><li><kbd>Alt</kbd> + <kbd>4</kbd> - Settings</li><li><kbd>Alt</kbd> + <kbd>5</kbd> - About</li><li><kbd>Esc</kbd> - close active window</li></ul><p class="hint hint--flush">Accounts and cloud sync are intentionally not included.</p>';
    },
    bind() {},
  },
];

const wins = document.getElementById("wins");
const tasks = document.getElementById("tasks");
const open = new Map();
// Start a restored deadline only after window state exists for timer rendering.
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
  const handleAnimationEnd = (event) => {
    if (event.target !== element) return;
    element.removeEventListener("animationend", handleAnimationEnd);
    callback();
  };
  element.addEventListener("animationend", handleAnimationEnd);
}

function activateTopWindow() {
  const next = visibleWindowsByZ()[0];
  if (next) focusWin(next[0]);
}

function constrainWindow(node) {
  if (node.classList.contains("max")) return;
  const maximumLeft = Math.max(0, wins.clientWidth - node.offsetWidth);
  const maximumTop = Math.max(0, wins.clientHeight - node.offsetHeight);
  node.style.left = Math.min(maximumLeft, Math.max(0, node.offsetLeft)) + "px";
  node.style.top = Math.min(maximumTop, Math.max(0, node.offsetTop)) + "px";
}

function toggleMaximize(id) {
  const entry = open.get(id);
  if (!entry) return;
  const maximized = entry.el.classList.toggle("max");
  const button = entry.el.querySelector("[data-max]");
  button?.setAttribute("aria-pressed", String(maximized));
  button?.setAttribute("aria-label", maximized ? "restore window" : "maximize window");
  if (!maximized) requestAnimationFrame(() => constrainWindow(entry.el));
}

function minimizeApp(id) {
  const entry = open.get(id);
  if (!entry) return;
  entry.el.classList.add("min");
  entry.el.classList.remove("focus");
  entry.tab.classList.remove("on");
  entry.tab.setAttribute("aria-selected", "false");
  if (activeId === id) {
    activeId = null;
    activateTopWindow();
  }
}

function openApp(id) {
  const app = apps.find((candidate) => candidate.id === id);
  if (!app) return;
  setStartMenu(false);
  if (open.has(id)) {
    const existing = open.get(id);
    existing.el.classList.remove("min");
    focusWin(id);
    if (id === "focus") paintTimer(existing.el.querySelector(".body"));
    return;
  }
  const element = document.createElement("section");
  const offset = open.size * 24;
  element.className = "win focus opening";
  element.dataset.appId = id;
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "false");
  element.setAttribute("aria-label", app.name);
  element.style.left = 120 + offset + "px";
  element.style.top = 40 + offset + "px";
  element.style.zIndex = String(++z);
  element.innerHTML = '<header class="bar"><span class="bar-title"><img src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</span><div class="dots"><button type="button" class="m" data-min aria-label="minimize window"></button><button type="button" class="q" data-max aria-label="maximize window" aria-pressed="false"></button><button type="button" class="x" data-close aria-label="close window"></button></div></header><div class="body">' + app.html() + '</div>';
  wins.append(element);
  onOwnAnimationEnd(element, () => element.classList.remove("opening"));
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
  app.bind(element.querySelector(".body"));
  element.querySelector("[data-close]").addEventListener("click", () => closeApp(id));
  element.querySelector("[data-min]").addEventListener("click", () => minimizeApp(id));
  element.querySelector("[data-max]").addEventListener("click", () => toggleMaximize(id));
  element.querySelector(".bar").addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) toggleMaximize(id);
  });
  element.addEventListener("mousedown", () => focusWin(id));
  tab.addEventListener("click", () => {
    element.classList.remove("min");
    focusWin(id);
  });
  drag(element);
  if ("ResizeObserver" in window) {
    entry.resizeObserver = new ResizeObserver(() => constrainWindow(element));
    entry.resizeObserver.observe(element);
  }
  requestAnimationFrame(() => constrainWindow(element));
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
  entry.resizeObserver?.disconnect();
  entry.el.classList.remove("opening");
  entry.el.classList.add("closing");
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
  onOwnAnimationEnd(entry.el, finish);
  window.setTimeout(() => {
    if (open.get(id) === entry) finish();
  }, 220);
}

function closeAllWindows() {
  open.forEach((entry) => {
    entry.resizeObserver?.disconnect();
    entry.el.remove();
    entry.tab.remove();
  });
  open.clear();
  activeId = null;
}

function drag(node) {
  const bar = node.querySelector(".bar");
  bar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button") || node.classList.contains("max")) return;
    event.preventDefault();
    focusWin(node.dataset.appId);
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = node.offsetLeft;
    const startTop = node.offsetTop;
    bar.setPointerCapture(pointerId);
    document.body.classList.add("dragging");
    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const desiredLeft = startLeft + moveEvent.clientX - startX;
      const desiredTop = startTop + moveEvent.clientY - startY;
      const maximumLeft = Math.max(0, wins.clientWidth - node.offsetWidth);
      const maximumTop = Math.max(0, wins.clientHeight - node.offsetHeight);
      node.style.left = Math.min(maximumLeft, Math.max(0, desiredLeft)) + "px";
      node.style.top = Math.min(maximumTop, Math.max(0, desiredTop)) + "px";
    };
    const stop = (stopEvent) => {
      if (stopEvent.pointerId !== pointerId) return;
      if (bar.hasPointerCapture(pointerId)) bar.releasePointerCapture(pointerId);
      document.body.classList.remove("dragging");
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", stop);
      bar.removeEventListener("pointercancel", stop);
      constrainWindow(node);
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

apps.forEach((app) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon";
  button.setAttribute("aria-label", "Open " + app.name);
  button.innerHTML = '<img class="desktop-icon" src="' + app.icon + '" alt=""><span>' + escapeHtml(app.name) + '</span>';
  button.addEventListener("click", () => openApp(app.id));
  icons.append(button);
});

startMenu.innerHTML = '<div class="start-menu__banner"><strong>LUMEN</strong><span>Builder Desk</span></div><div class="start-menu__title">Programs</div>' + apps.map((app) => '<button type="button" role="menuitem" data-open-app="' + escapeHtml(app.id) + '"><img class="start-menu__glyph" src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</button>').join("") + '<div class="menu-separator" role="separator"></div><button type="button" role="menuitem" data-install-app><img class="start-menu__glyph" src="icons/info.png?v=12" alt=""><span data-install-label>Install LUMEN...</span></button>';

function setStartMenu(show) {
  startMenu.classList.toggle("hidden", !show);
  startBtn.setAttribute("aria-expanded", String(show));
  if (show) startMenu.querySelector("button")?.focus();
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!startMenu.classList.contains("hidden")) {
      setStartMenu(false);
      startBtn.focus();
    } else if (activeId) {
      closeApp(activeId);
    }
    return;
  }
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    const shortcuts = { "1": "notes", "2": "focus", "3": "shiplog", "4": "settings", "5": "about" };
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
  const clock = document.getElementById("clock");
  clock.textContent = now.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  clock.dateTime = now.toISOString();
}
tickClock();
setInterval(tickClock, 30_000);
window.addEventListener("beforeunload", persistData);

async function boot() {
  await new Promise((resolve) => setTimeout(resolve, 900));
  document.getElementById("boot").classList.add("fade");
  document.getElementById("desk").classList.remove("hidden");
  await new Promise((resolve) => setTimeout(resolve, 400));
  document.getElementById("boot").remove();
  const requestedApp = location.hash.slice(1);
  openApp(apps.some((app) => app.id === requestedApp) ? requestedApp : "about");
  refreshInstallControls();
}
window.addEventListener("hashchange", () => {
  const requestedApp = location.hash.slice(1);
  if (apps.some((app) => app.id === requestedApp)) openApp(requestedApp);
});
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20", { updateViaCache: "none" }).then((registration) => registration.update()).catch((error) => console.warn("Service worker registration failed:", error));
  });
}

const smoothCursor = document.getElementById("smoothCursor");
if (smoothCursor && window.matchMedia("(pointer: fine)").matches) {
  const cursorImage = new Image();
  cursorImage.addEventListener("load", () => document.documentElement.classList.add("custom-cursor"), { once: true });
  cursorImage.src = "icons/cursor.png?v=12";
  let cursorFrame = 0;
  document.addEventListener("pointermove", (event) => {
    const x = event.clientX;
    const y = event.clientY;
    cancelAnimationFrame(cursorFrame);
    cursorFrame = requestAnimationFrame(() => {
      smoothCursor.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    });
    smoothCursor.classList.add("visible");
  });
  document.documentElement.addEventListener("mouseleave", () => smoothCursor.classList.remove("visible"));
}
boot();
