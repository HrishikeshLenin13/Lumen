# LUMEN
Lumen is an installable offline workspace for notes, task tracking, focus sessions, and work logs.
Open apps from the desktop, keyboard shortcuts, or the searchable Start menu.

## Features

- Notes with automatic saving, Markdown outlines, statistics, and version history

- Checklist with persistent completion state
- Calculator for constrained arithmetic expressions
- Text Tools with live counts, line trimming, and clipboard copying

- Focus and break timers with notifications and session history
- Ship Log with projects, tags, filtering, bulk actions, and CSV export

## Run locally
Serve the repository with any static HTTP server so the service worker and ES modules can load correctly.

```sh

python3 -m http.server 8000

```
## Install

Open LUMEN in a supported browser, choose LUMEN on the taskbar, then select **Install LUMEN...**.

## Privacy and storage
Notes, tasks, settings, timer state, and work logs stay in browser storage. Settings can export or restore a JSON backup.

## Credits
Created by Hrishikesh Lenin and Sandeep Shenoy. Art and creative direction are human-made.

## Development

- `js/main.js` contains the desktop, window manager, and app bindings.
- `js/data-core.mjs` contains normalized storage and reusable data operations.
- `sw.js` manages the versioned offline app shell.
- Run `node scripts/stamp-cache.mjs` after changing cached files to refresh content-hash cache stamps.
- Run tests with `node --test tests/*.test.mjs`.
