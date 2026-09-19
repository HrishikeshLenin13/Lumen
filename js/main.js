const KEY = "lumen-desk-v1";

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
      <p class="hint">Saved on this device only.</p>
      <textarea id="notesArea" aria-label="Project notes">${escapeHtml(data.notes)}</textarea>
      <div class="row row--actions">
        <button type="button" class="btn primary" data-save-notes>Save note</button>
        <span class="hint hint--flush" data-notes-status hidden aria-live="polite">Saved</span>
      </div>`,
    bind(root) {
      const status = root.querySelector("[data-notes-status]");
      root.querySelector("[data-save-notes]").onclick = () => {
        data.notes = root.querySelector("#notesArea").value;
        save(data);
        status.hidden = false;
        clearTimeout(status._t);
        status._t = setTimeout(() => {
          status.hidden = true;
        }, 1600);
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
        <p class="hint hint--flush">Pomodoro for deep work on your ship.</p>
        <div class="timer" id="timer" aria-live="polite">${mm}:${ss}</div>
        <div class="row">
          <button type="button" class="btn primary" data-focus-start>Start ${data.focusMin}m</button>
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
        <p class="hint">Total logged: <strong class="stat-strong">${total}h</strong></p>
        <input class="field" type="number" min="0.25" step="0.25" value="1" id="logH" aria-label="Hours shipped" />
        <input class="field" type="text" placeholder="What did you ship?" id="logText" aria-label="Ship description" />
        <button type="button" class="btn primary" data-add-log>Add entry</button>
        <div class="log-list">${list || '<p class="hint hint--flush">No entries yet.</p>'}</div>`;
    },
    bind(root) {
      const add = () => {
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
      root.querySelector("[data-add-log]").onclick = add;
      root.querySelector("#logText").addEventListener("keydown", (e) => {
        if (e.key === "Enter") add();
      });
    },
  },
  {
    id: "about",
    name: "About",
    glyph: "i",
    html: () => `
      <h2 class="about-title">LUMEN</h2>
      <p>Offline builder desk: notes, focus timer, and ship log in one page.</p>
      <p class="hint hint--flush">Built for Hack Club. Data stays in your browser.</p>`,
    bind() {},
  },
];

const wins = document.getElementById("wins");
const tasks = document.getElementById("tasks");
const open = new Map();
let z = 10;

function openApp(id) {
  const app = apps.find((a) => a.id === id);
  if (!app) return;
  if (open.has(id)) {
    const w = open.get(id);
    w.el.classList.remove("min");
    focusWin(id);
    return;
  }
  const el = document.createElement("section");
  el.className = "win focus";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", app.name);
  el.style.left = `${120 + open.size * 24}px`;
  el.style.top = `${40 + open.size * 20}px`;
  el.style.zIndex = String(++z);
  el.innerHTML = `
    <header class="bar">
      <span>${app.name}</span>
      <div class="dots">
        <button type="button" class="m" data-min aria-label="minimize"></button>
        <button type="button" class="x" data-close aria-label="close"></button>
      </div>
    </header>
    <div class="body">${app.html()}</div>`;
  wins.append(el);
  app.bind(el.querySelector(".body"));
  el.querySelector("[data-close]").onclick = () => closeApp(id);
  el.querySelector("[data-min]").onclick = () => {
    el.classList.add("min");
  };
  el.addEventListener("mousedown", () => focusWin(id));
  drag(el);

  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "task on";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", "true");
  tab.textContent = app.name;
  tab.onclick = () => {
    if (el.classList.contains("min")) el.classList.remove("min");
    focusWin(id);
  };
  tasks.append(tab);

  open.set(id, { el, tab, app });
  focusWin(id);
}

function focusWin(id) {
  open.forEach((w, key) => {
    const on = key === id;
    w.el.classList.toggle("focus", on);
    w.tab.classList.toggle("on", on);
    w.tab.setAttribute("aria-selected", on ? "true" : "false");
    if (key === id) w.el.style.zIndex = String(++z);
  });
}

function closeApp(id) {
  const w = open.get(id);
  if (!w) return;
  w.el.remove();
  w.tab.remove();
  open.delete(id);
}

function drag(node) {
  const bar = node.querySelector(".bar");
  bar.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    const ox = e.clientX - node.offsetLeft;
    const oy = e.clientY - node.offsetTop;
    const move = (ev) => {
      node.style.left = `${Math.max(0, ev.clientX - ox)}px`;
      node.style.top = `${Math.max(0, ev.clientY - oy)}px`;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", () => window.removeEventListener("mousemove", move), { once: true });
  });
}

const icons = document.getElementById("icons");
apps.forEach((app) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon";
  b.setAttribute("aria-label", `Open ${app.name}`);
  b.innerHTML = `<div class="g" aria-hidden="true">${app.glyph}</div><span>${app.name}</span>`;
  b.onclick = () => openApp(app.id);
  icons.append(b);
});

document.getElementById("startBtn")?.addEventListener("click", () => openApp("about"));

function tickClock() {
  const now = new Date();
  const clock = document.getElementById("clock");
  clock.textContent = now.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  clock.dateTime = now.toISOString();
}
tickClock();
setInterval(tickClock, 30_000);

async function boot() {
  await new Promise((r) => setTimeout(r, 900));
  document.getElementById("boot").classList.add("fade");
  document.getElementById("desk").classList.remove("hidden");
  await new Promise((r) => setTimeout(r, 400));
  document.getElementById("boot").remove();
  openApp("about");
}
boot();
