# LUMEN

LUMEN is a tiny fake desktop in your browser—a builder desk for notes, a focus timer, and a log of what you shipped. It runs offline, saves everything on your machine, and doesn’t need a login or backend.

https://github.com/HrishikeshLenin13/Lumen

## Run it

Clone the repo, then either open `index.html` in your browser or:

```bash
python3 -m http.server 8080
```

and go to http://localhost:8080

## What you get

Notes, Focus (Pomodoro-style start/pause/reset), Ship Log (hours + what you built), and About. Icons on the left open apps; windows drag, minimize, and close like a real desktop. The LUMEN button on the taskbar opens About. Hit Enter in Ship Log to add a line fast.

Your data lives in localStorage under `lumen-desk-v1`. Clear site data and it’s gone—nothing leaves your browser.

## Files

- `index.html` — page shell  
- `css/lumen.css` — look and layout  
- `js/main.js` — apps, windows, saving, boot  

MIT license (see LICENSE).
