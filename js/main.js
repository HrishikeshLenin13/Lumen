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
  {
    id: "about",
    name: "About",
    glyph: "i",
    html: () => `
      <h2 style="margin:0 0 8px;font-family:var(--mono);color:var(--accent)">LUMEN</h2>
      <p>Offline builder desk: notes, focus timer, and ship log in one page.</p>
      <p style="color:var(--muted);font-size:13px">Built for Hack Club. Data stays in your browser.</p>`,
    bind() {},
  },
];

const wins = document.getElementById("wins");
const tasks = document.getElementById("tasks");
const open = new Map();
let z = 10;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
    w.el.classList.toggle("focus", key === id);
    w.tab.classList.toggle("on", key === id);
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
  b.innerHTML = `<div class="g">${app.glyph}</div><span>${app.name}</span>`;
  b.onclick = () => openApp(app.id);
  icons.append(b);
});

function tickClock() {
  document.getElementById("clock").textContent = new Date().toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
