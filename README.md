# LUMEN

LUMEN is a Windows XP-inspired desktop in your browser - a builder desk for notes, a focus timer, and a log of what you shipped. It runs offline, saves everything on your machine, and doesn’t need a login or backend.

https://github.com/HrishikeshLenin13/Lumen

## Run it

Clone the repo, then run a local server:

```bash
python3 -m http.server 8080
```

and go to http://localhost:8080

## What you get

LUMEN includes autosaved notes, separate focus and break timers, completion alerts, editable and filterable ship-log entries, light and dark themes, backup import/export, a full Start menu, keyboard shortcuts, and resizable or maximizable windows.

Your data lives in localStorage under `lumen-desk-v1`. It stays on the current device unless you export a JSON backup. Accounts and cloud sync are intentionally not included.

## Install it

Open LUMEN through localhost or HTTPS, then choose **Install LUMEN** from the Start menu or Settings. Direct `file://` pages cannot register the offline service worker.

Keyboard shortcuts: `Alt+1` Notes, `Alt+2` Focus, `Alt+3` Ship Log, `Alt+4` Settings, `Alt+5` About, and `Esc` to close the active window.

## Files

- `index.html` - page shell
- `css/lumen-vintage.css` - look and layout
- `js/main.js` - apps, windows, saving, boot
- `manifest.webmanifest` - installable app metadata
- `sw.js` - offline application cache
- `icons/lumen.svg` - application icon
- `icons/*.png` - pixel-art desktop and window-control icons

MIT license (see LICENSE).
