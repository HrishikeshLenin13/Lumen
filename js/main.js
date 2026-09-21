const KEY = "lumen-desk-v1";
const APP_TITLE = "LUMEN - Builder Desk";

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

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }
  
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function defaultData() {
  return {
    notes: "Project notes...\nWhat are you building today?",
    logs: [],
    focusMin: 25,
    breakMin: 5,
    theme: "dark",
  };
}

function normalizeData(value) {
  const defaults = defaultData();
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const logs = Array.isArray(source.logs) ? source.logs
  .map((entry) => {
    const hours = Number(entry?.h);
    const text = typeof entry?.text === "string" ? entry.text.trim() : "";

    if (!Number.isFinite(hours) || hours <= 0 || !text) {
      return null;
    }
    
    return {
      id: typeof entry?.id === "string" && entry.id ? entry.id : makeId(),
      h: hours,
      text,
      at: typeof entry.at === "string" ? entry.at : new Date().toISOString(),
    };
  })
  .filter(Boolean) : [];

  return {
    notes: typeof source.notes === "string" ? source.notes : defaults.notes,
    focusMin: clampNumber(source.focusMin, 1, 180, defaults.focusMin),
    breakMin: clampNumber(source.breakMin, 1, 60, defaults.breakMin),
    theme: source.theme === "light" ? "light" : "dark",
    logs,
  };
}
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
let data = normalizeData(loadData());
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
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = data.theme === "light" ? "#6f84a9" : "#245edb";
}
persistData();
applyTheme();
const timer = {
  mode: "focus",
  secondsLeft: data.focusMin * 60,
  running: false,
  finished: false,
  endAt: null,
  intervalId: null,
};
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
  const message = timerLabel() + " timer finished.";
  document.title = "✓ " + message + " — LUMEN";
  paintTimer();
  playFinishedSound();
  showToast(message);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(message, {
      body: timer.mode === "focus" ? "Time for a break." : "Ready for another focus session?",
      icon: "icons/lumen.svg?v=8",
    });
  }
}
function updateTimer() {
  if (!timer.running || !timer.endAt) return;
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
  timer.intervalId = setInterval(updateTimer, 250);
  paintTimer();
}
function pauseTimer() {
  if (!timer.running) return;
  updateTimer();
  if (timer.finished) return;
  stopTimerInterval();
  timer.running = false;
  timer.endAt = null;
  paintTimer();
}
function resetTimer(mode = timer.mode) {
  stopTimerInterval();
  timer.mode = mode;
  timer.secondsLeft = timerMinutes(mode) * 60;
  timer.running = false;
  timer.finished = false;
  timer.endAt = null;
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
let editingLogId = null;
function formatLogDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
function formatHours(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
function filteredLogs() {
  const query = shipFilter.trim().toLowerCase();
  if (!query) return data.logs;
  return data.logs.filter((entry) => {
    return [entry.text, entry.h, formatLogDate(entry.at)].join(" ").toLowerCase().includes(query);
  });
}
function logListHtml() {
  const rows = filteredLogs();
  if (!rows.length) {
    return '<p class="hint hint--flush">' + (shipFilter ? "No entries match this filter." : "No entries yet.") + "</p>";
  }
  return rows.map((entry) => {
    if (entry.id === editingLogId) {
      return '<article class="log-item" data-log-row="' + escapeHtml(entry.id) + '"><label class="form-label">Hours<input class="field" type="number" min="0.25" step="0.25" value="' + escapeHtml(entry.h) + '" data-edit-hours></label><label class="form-label">What did you ship?<input class="field" type="text" value="' + escapeHtml(entry.text) + '" data-edit-text></label><div class="row row--actions"><button type="button" class="btn primary" data-log-action="save" data-log-id="' + escapeHtml(entry.id) + '">Save changes</button><button type="button" class="btn" data-log-action="cancel" data-log-id="' + escapeHtml(entry.id) + '">Cancel</button></div></article>';
    }
    return '<article class="log-item"><div class="log-item__header"><strong>' + escapeHtml(formatHours(entry.h)) + 'h</strong><small>' + escapeHtml(formatLogDate(entry.at)) + '</small></div><p>' + escapeHtml(entry.text) + '</p><div class="row row--actions"><button type="button" class="btn" data-log-action="edit" data-log-id="' + escapeHtml(entry.id) + '">Edit</button><button type="button" class="btn danger" data-log-action="delete" data-log-id="' + escapeHtml(entry.id) + '">Delete</button></div></article>';
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
    icon: "icons/notes.png?v=8",
    html() {
      return '<p class="hint">Saved automatically on this device.</p><textarea id="notesArea" aria-label="Project notes">' + escapeHtml(data.notes) + '</textarea><div class="row row--actions"><span class="hint hint--flush" data-notes-status aria-live="polite">All changes saved.</span></div>';
    },
    bind(root) {
      const area = root.querySelector("#notesArea");
      const status = root.querySelector("[data-notes-status]");
      let saveTimer = null;
      const commit = () => {
        clearTimeout(saveTimer);
        data.notes = area.value;
        if (persistData()) status.textContent = "All changes saved.";
      };
      area.addEventListener("input", () => {
        data.notes = area.value;
        status.textContent = "Saving…";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(commit, 450);
      });
      area.addEventListener("blur", commit);
    },
  },
  {
    id: "focus",
    name: "Focus",
    glyph: "F",
    icon: "icons/timer.png?v=8",
    html() {
      return '<div class="timer-modes" aria-label="Timer mode"><button type="button" class="btn" data-timer-mode="focus" aria-pressed="false">Focus</button><button type="button" class="btn" data-timer-mode="break" aria-pressed="false">Break</button></div><p class="hint" data-timer-status aria-live="polite"></p><div class="timer" id="timer" role="timer" aria-live="polite"></div><div class="row"><button type="button" class="btn primary" data-focus-start>Start</button><button type="button" class="btn" data-focus-pause>Pause</button><button type="button" class="btn" data-focus-reset>Reset</button></div>';
    },
    bind(root) {
      root.querySelectorAll("[data-timer-mode]").forEach((button) => {
        button.addEventListener("click", () => selectTimerMode(button.dataset.timerMode));
      });
      root.querySelector("[data-focus-start]").addEventListener("click", startTimer);
      root.querySelector("[data-focus-pause]").addEventListener("click", pauseTimer);
      root.querySelector("[data-focus-reset]").addEventListener("click", () => resetTimer());
      paintTimer(root);
    },
  },
  {
    id: "shiplog",
    name: "Ship Log",
    glyph: "H",
    icon: "icons/logs.png?v=8",
    html() {
      return '<p class="hint">Total logged: <strong class="stat-strong" data-log-total>' + totalLoggedHours() + 'h</strong></p><div class="log-entry-form"><input class="field" type="number" min="0.25" step="0.25" value="1" id="logH" aria-label="Hours shipped"><input class="field" type="text" placeholder="What did you ship?" id="logText" aria-label="Ship description"><button type="button" class="btn primary" data-add-log>Add entry</button></div><label class="form-label log-filter">Filter old entries<input class="field" type="search" placeholder="Search description, hours, or date" value="' + escapeHtml(shipFilter) + '" data-log-filter></label><div class="log-list" data-log-list>' + logListHtml() + '</div>';
    },
    bind(root) {
      const hoursInput = root.querySelector("#logH");
      const textInput = root.querySelector("#logText");
      const filterInput = root.querySelector("[data-log-filter]");
      const list = root.querySelector("[data-log-list]");
      const total = root.querySelector("[data-log-total]");
      const render = () => {
        list.innerHTML = logListHtml();
        total.textContent = totalLoggedHours() + "h";
      };
      const addEntry = () => {
        const hours = Number(hoursInput.value);
        const text = textInput.value.trim();
        if (!text || !Number.isFinite(hours) || hours <= 0) {
          showToast("Enter positive hours and a ship description.");
          return;
        }
        data.logs.unshift({
          id: makeId(),
          h: hours,
          text,
          at: new Date().toISOString(),
        });
        editingLogId = null;
        persistData();
        hoursInput.value = "1";
        textInput.value = "";
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
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-log-action]");
        if (!button) return;
        const action = button.dataset.logAction;
        const id = button.dataset.logId;
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
          if (editingLogId === id) editingLogId = null;
          persistData();
          render();
          showToast("Ship log entry deleted.");
          return;
        }
        if (action === "save") {
          const row = button.closest("[data-log-row]");
          const hours = Number(row.querySelector("[data-edit-hours]").value);
          const text = row.querySelector("[data-edit-text]").value.trim();
          if (!text || !Number.isFinite(hours) || hours <= 0) {
            showToast("Enter positive hours and a description.");
            return;
          }
          entry.h = hours;
          entry.text = text;
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
    icon: "icons/help.png?v=8",
    html() {
      const darkSelected = data.theme === "dark" ? " selected" : "";
      const lightSelected = data.theme === "light" ? " selected" : "";
      return '<form data-settings-form><div class="settings-grid"><label class="form-label">Focus length<input class="field" id="focusMinutes" type="number" min="1" max="180" step="1" value="' + data.focusMin + '" required></label><label class="form-label">Break length<input class="field" id="breakMinutes" type="number" min="1" max="60" step="1" value="' + data.breakMin + '" required></label><label class="form-label">Color scheme<select class="field" id="themeChoice"><option value="dark"' + darkSelected + '>Luna Blue</option><option value="light"' + lightSelected + '>Silver</option></select></label></div><div class="row row--actions"><button type="submit" class="btn primary">Apply</button><span class="hint hint--flush" data-settings-status aria-live="polite"></span></div></form><hr class="separator"><h3 class="section-title">Backup and Restore</h3><p class="hint">Export your desk to a JSON file or restore a previous export.</p><div class="row"><button type="button" class="btn" data-export-backup>Export backup...</button><button type="button" class="btn" data-import-backup>Import backup...</button><input class="sr-only" type="file" accept="application/json,.json" data-import-file></div><h3 class="section-title">Install LUMEN</h3><button type="button" class="btn" data-install-app>Install...</button><hr class="separator"><h3 class="section-title">Reset</h3><button type="button" class="btn danger" data-clear-data>Clear all data...</button>';
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
    icon: "icons/info.png?v=8",
    html() {
      return '<h2 class="about-title">LUMEN</h2><p>Offline builder desk for notes, focus sessions, breaks, and shipped work.</p><p class="hint">Data stays in this browser unless you export it.</p><h3 class="section-title">Shortcuts</h3><ul class="shortcut-list"><li><kbd>Alt</kbd> + <kbd>1</kbd> — Notes</li><li><kbd>Alt</kbd> + <kbd>2</kbd> — Focus</li><li><kbd>Alt</kbd> + <kbd>3</kbd> — Ship Log</li><li><kbd>Alt</kbd> + <kbd>4</kbd> — Settings</li><li><kbd>Alt</kbd> + <kbd>5</kbd> — About</li><li><kbd>Esc</kbd> — close active window</li></ul><p class="hint hint--flush">Accounts and cloud sync are intentionally not included.</p>';
    },
    bind() {},
  },
];

const wins = document.getElementById("wins");
const tasks = document.getElementById("tasks");
const open = new Map();
let activeId = null;
let z = 10;

function visibleWindowsByZ() {
  return Array.from(open.entries())
    .filter(([, entry]) => !entry.el.classList.contains("min"))
    .sort((a, b) => Number(b[1].el.style.zIndex) - Number(a[1].el.style.zIndex));
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
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "false");
  element.setAttribute("aria-label", app.name);
  element.style.left = 120 + offset + "px";
  element.style.top = 40 + offset + "px";
  element.style.zIndex = String(++z);
  element.innerHTML = '<header class="bar"><span class="bar-title"><img src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</span><div class="dots"><button type="button" class="m" data-min aria-label="minimize window"></button><button type="button" class="q" data-max aria-label="maximize window" aria-pressed="false"></button><button type="button" class="x" data-close aria-label="close window"></button></div></header><div class="body">' + app.html() + '</div>';
  wins.append(element);
  element.addEventListener("animationend", () => element.classList.remove("opening"), { once: true });
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "task on";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", "true");
  tab.innerHTML = '<img src="' + app.icon + '" alt="">' + escapeHtml(app.name);
  tasks.append(tab);
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
  const finish = () => {
    entry.el.remove();
    entry.tab.remove();
    open.delete(id);
    if (activeId === id) {
      activeId = null;
      activateTopWindow();
    }
  };
  entry.el.addEventListener("animationend", finish, { once: true });
  window.setTimeout(() => {
    if (open.get(id) === entry) finish();
  }, 220);
}

function closeAllWindows() {
  Array.from(open.keys()).forEach(closeApp);
}

function drag(node) {
  const bar = node.querySelector(".bar");
  bar.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || event.target.closest("button") || node.classList.contains("max")) return;
    event.preventDefault();
    const bounds = wins.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left - node.offsetLeft;
    const offsetY = event.clientY - bounds.top - node.offsetTop;
    const move = (moveEvent) => {
      const desiredLeft = moveEvent.clientX - bounds.left - offsetX;
      const desiredTop = moveEvent.clientY - bounds.top - offsetY;
      const maximumLeft = Math.max(0, wins.clientWidth - node.offsetWidth);
      const maximumTop = Math.max(0, wins.clientHeight - node.offsetHeight);
      node.style.left = Math.min(maximumLeft, Math.max(0, desiredLeft)) + "px";
      node.style.top = Math.min(maximumTop, Math.max(0, desiredTop)) + "px";
    };
    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
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

startMenu.innerHTML = '<div class="start-menu__banner"><strong>LUMEN</strong><span>Builder Desk</span></div><div class="start-menu__title">Programs</div>' + apps.map((app) => '<button type="button" role="menuitem" data-open-app="' + escapeHtml(app.id) + '"><img class="start-menu__glyph" src="' + app.icon + '" alt="">' + escapeHtml(app.name) + '</button>').join("") + '<div class="menu-separator" role="separator"></div><button type="button" role="menuitem" data-install-app><img class="start-menu__glyph" src="icons/info.png?v=8" alt="">Install LUMEN...</button>';

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
  document.querySelectorAll("[data-install-app]").forEach((button) => {
    button.disabled = isInstalled();
    button.textContent = isInstalled() ? "LUMEN is installed" : "Install LUMEN";
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
    navigator.serviceWorker.register("./sw.js?v=8", { updateViaCache: "none" }).then((registration) => registration.update()).catch((error) => console.warn("Service worker registration failed:", error));
  });
}

const smoothCursor = document.getElementById("smoothCursor");
if (smoothCursor && window.matchMedia("(pointer: fine)").matches) {
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
