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
    const text = typeof entry?.t === "string" ? entry.t.trim() : "";

    if (!Number.isFinite(hours) || hours < 0 || !text) {
      return null;
    }
    
    return {
      id: typeof entry?.id === "string" ? entry.id : makeId(),
      h: hours,
      text,
      at: typeof entry.at === "string" ? entry.at : new Date().toISOString(),
    };
  })
  .filter(Boolean);

  return {
    ...defaults,
    ...source,
    logs,
  };
}
