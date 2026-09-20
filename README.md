# LUMEN

LUMEN is a one-page, offline builder desk: a small desktop-style UI in the browser for project notes, a Pomodoro focus timer, and a ship log. No account or server—data stays on your device.

## Repo

https://github.com/HrishikeshLenin13/Lumen

## Setup and run

No install or build step.

1. Clone the repo (or download the folder).
2. Open the project directory.

**Option A — open the file**

Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge).

**Option B — local server (recommended)**

Some browsers behave more predictably over HTTP than with `file://`:

```bash
cd /path/to/Lumen
python3 -m http.server 8080
```

Then visit http://localhost:8080

## How to use

After the short boot screen, you see a desktop with app icons on the left and a taskbar at the bottom.

**Notes** — Write what you are building. Click **Save note** to store text on this device. A brief “Saved” confirmation appears after saving.

**Focus** — Pomodoro-style timer. Use **Start**, **Pause**, and **Reset**. The default session length is 25 minutes (stored in app data; there is no settings screen yet).

**Ship Log** — Enter hours and a short description of what you shipped, then **Add entry** (or press **Enter** in the description field). The total hours update at the top; entries list newest first.

**About** — Short description of LUMEN.

**Windows** — Drag by the title bar. Use the colored dots to minimize or close. Open apps also appear as tabs on the taskbar; click a tab to bring that window forward or restore it from minimized.

**LUMEN button** (taskbar) — Opens the About window.

The clock in the taskbar shows the current local time.

## How it works

**Files**

- `index.html` — Page shell: boot screen, desktop layout, taskbar, script tag.
- `css/lumen.css` — Colors, layout, windows, and app styling.
- `js/main.js` — Loads and saves data, defines each “app” (HTML + behavior), opens and manages windows, builds dock icons, runs the boot sequence and clock.

**Data**

All persistent state is in **localStorage** under the key `lumen-desk-v1`:

- `notes` — note text
- `logs` — array of `{ h, text, at }` ship log entries
- `focusMin` — focus session length in minutes (default 25)

Clearing site data for this origin deletes your notes and log. Nothing is uploaded to a backend.

**Apps**

Each app is a small object: id, name, icon letter, a function that returns inner HTML for the window body, and a `bind` function that wires buttons and inputs after the window opens.

**Windows**

Opening an app creates a window element, runs `bind` on its body, adds a taskbar tab, and tracks open windows in memory. Focus timer remaining time can persist on `window.__focusLeft` while the page stays open.

## Stack

- HTML, CSS, JavaScript (no framework)
- IBM Plex Sans and IBM Plex Mono via Google Fonts

## License

MIT — see LICENSE.
