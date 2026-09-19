# LUMEN

[![Hack Club](https://img.shields.io/badge/Hack%20Club-ship-7dffc3)](https://hackclub.com)

**LUMEN** is a one-page, offline **builder desk** for Hack Club: a tiny desktop-style UI where you keep project **notes**, run a **Pomodoro focus timer**, and log **ship time**—all in the browser, with no account or server.

## Features

- **Notes** — scratch pad for what you’re building; saved on your device
- **Focus** — 25-minute Pomodoro timer with start, pause, and reset
- **Ship Log** — log hours and what you shipped; running total at the top
- **About** — quick project blurb

Windows can be dragged, minimized, and closed; open apps show in the taskbar. Press **Enter** in Ship Log to add an entry quickly.

## Run locally

No build step. From this folder:

```bash
# optional: avoid file:// quirks with a tiny static server
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080), or open `index.html` directly in your browser.

## Project layout

```
index.html      — shell (desk markup)
css/lumen.css   — theme and layout
js/main.js      — storage, apps, window manager, boot
```

## Data

Everything lives in **localStorage** under the key `lumen-desk-v1`. Clearing site data removes your notes and log. Nothing is sent to a backend.

## Stack

- Vanilla HTML, CSS, and JavaScript
- [IBM Plex Sans / Mono](https://fonts.google.com/) via Google Fonts

## Repo

https://github.com/HrishikeshLenin13/Lumen

## License

MIT — see [LICENSE](LICENSE).

Built for **Hack Club**.
