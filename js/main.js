const KEY = "lumen-desk-v1";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const save = (patch) => {
  const next = { ...load(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

let data = load();
if (!data.notes) data.notes = "Project notes…\n\nWhat are you building today?";
if (!data.logs) data.logs = [];
if (!data.focusMin) data.focusMin = 25;
save(data);

const apps = [
  {
    id: "notes",
    name: "Notes",
    glyph: "N",
    html: () => `
      <p style="margin:0 0 8px;color:var(--muted);font-size:13px">Saved on this device only.</p>
      <textarea id="notesArea">${escapeHtml(data.notes)}</textarea>
      <div class="row" style="margin-top:8px">
        <button type="button" class="btn primary" data-save-notes>Save note</button>
      </div>`,
    bind(root) {
      root.querySelector("[data-save-notes]").onclick = () => {
        data.notes = root.querySelector("#notesArea").value;
        save(data);
      };
    },
  },
  {
    id: "focus",
    name: "Focus",
    glyph: "F",
    html: () => {
      const left = window.__focusLeft || data.focusMin * 60;
      const mm = String(Math.floor(left / 60)).padStart(2, "0");
      const ss = String(left % 60).padStart(2, "0");
      return `
        <p style="margin:0;color:var(--muted);font-size:13px">Pomodoro for deep work on your ship.</p>
        <div class="timer" id="timer">${mm}:${ss}</div>
        <div class="row">
          <button type="button" class="btn primary" data-focus-start>Start 25m</button>
          <button type="button" class="btn" data-focus-pause>Pause</button>
          <button type="button" class="btn" data-focus-reset>Reset</button>
        </div>`;
    },
    bind(root) {
      let left = window.__focusLeft ?? data.focusMin * 60;
      let tick = null;
      const label = () => root.querySelector("#timer");
      const paint = () => {
        const mm = String(Math.floor(left / 60)).padStart(2, "0");
        const ss = String(left % 60).padStart(2, "0");
        if (label()) label().textContent = `${mm}:${ss}`;
        window.__focusLeft = left;
      };
      root.querySelector("[data-focus-start]").onclick = () => {
        if (tick) return;
        tick = setInterval(() => {
          if (left <= 0) {
            clearInterval(tick);
            tick = null;
            return;
          }
          left -= 1;
          paint();
        }, 1000);
      };
      root.querySelector("[data-focus-pause]").onclick = () => {
        clearInterval(tick);
        tick = null;
      };
      root.querySelector("[data-focus-reset]").onclick = () => {
        clearInterval(tick);
        tick = null;
        left = data.focusMin * 60;
        paint();
      };
    },
  },
  {
    id: "shiplog",
    name: "Ship Log",
    glyph: "H",
    html: () => {
      const total = data.logs.reduce((s, r) => s + Number(r.h || 0), 0).toFixed(1);
      const list = data.logs
        .map(
          (r) =>
            `<div class="log-item"><strong>${r.h}h</strong> — ${escapeHtml(r.text)}<br><small>${escapeHtml(r.at)}</small></div>`
        )
        .join("");
      return `
        <p style="margin:0 0 8px">Total logged: <strong style="color:var(--accent)">${total}h</strong></p>
        <input class="field" type="number" min="0.25" step="0.25" value="1" id="logH" />
        <input class="field" type="text" placeholder="What did you ship?" id="logText" />
        <button type="button" class="btn primary" data-add-log>Add entry</button>
        <div style="margin-top:12px">${list || "<p style='color:var(--muted)'>No entries yet.</p>"}</div>`;
    },
    bind(root) {
      root.querySelector("[data-add-log]").onclick = () => {
        const h = Number(root.querySelector("#logH").value);
        const text = root.querySelector("#logText").value.trim();
        if (!text) return;
        data.logs.unshift({
          h,
          text,
          at: new Date().toLocaleString(),
        });
        save(data);
        openApp("shiplog");
      };
    },
  },
