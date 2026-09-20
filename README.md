# LUMEN

LUMEN is a one-page, offline **builder desk**: a small desktop-style UI in the browser for project notes, a Pomodoro focus timer, and a ship log. No install, no account, no server—everything stays in **localStorage** on your device.

**Repository:** https://github.com/HrishikeshLenin13/Lumen

## Quick start

1. Clone or download this repo.
2. Open `index.html` in a modern browser, **or** run a static server (recommended):

```bash
cd Lumen
python3 -m http.server 8080
```

Open http://localhost:8080

## Using LUMEN

After the boot screen you get a desktop (icons on the left, taskbar at the bottom).

| App | What it does |
|-----|----------------|
| **Notes** | Project scratch pad. Click **Save note** to persist on this device (brief “Saved” confirmation). |
| **Focus** | Pomodoro timer—**Start**, **Pause**, **Reset**. Default length is 25 minutes (`focusMin` in storage; no settings UI yet). |
| **Ship Log** | Log hours and what you shipped. **Add entry** or press **Enter** in the description field. Newest entries first; total hours at the top. |
| **About** | Short overview of LUMEN. |

**Windows:** drag the title bar; minimize or close with the dots; taskbar tabs focus or restore windows.

**Taskbar:** **LUMEN** opens About; the clock shows local time.

## Project layout

```
index.html      HTML shell (desk + taskbar)
css/lumen.css   Theme, windows, apps
js/main.js      Storage, apps, window manager, boot
LICENSE         MIT
```

## How it works

- **Apps** — Each app is an object with `html()` (window body markup) and `bind(root)` (event wiring after open).
- **Windows** — `openApp` creates a window, taskbar tab, and focus stack; timer state can live on `window.__focusLeft` until reload.
- **Storage key** — `lumen-desk-v1` with fields: `notes` (string), `logs` (`{ h, text, at }[]`), `focusMin` (number, default 25).

Clearing site data for this site deletes your notes and log. Nothing is sent to a backend.

## Stack

HTML, CSS, and vanilla JavaScript; IBM Plex Sans / Mono via Google Fonts.

## License

MIT — see [LICENSE](LICENSE).
