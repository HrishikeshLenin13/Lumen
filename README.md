# LUMEN
Lumen is an installable offline workspace for notes, task tracking, focus sessions, and work logs.
Open apps from the desktop, keyboard shortcuts, or the searchable Start menu.
Drag desktop icons to keep your preferred app order.
The pixel cursor tilts with the curved CRT surface, and confirmations stay inside LUMEN windows.
Replace `icons/mine-bomb.png`, `icons/cursor-pointing.png`, and `icons/cursor-dragging.png` with your own 16×16 PNGs. Cursor hotspots use the top-left pixel, matching `cursor-2x.png`.

## Features

- Notes with automatic saving, Markdown outlines, statistics, line trimming, copying, and version history

- Checklist with persistent completion state
- Calculator with a real keypad, keyboard input, live preview, and a result tape
- Calendar with local events, opened from the taskbar clock
- Command Prompt that opens apps, does math, and adds tasks and notes
- Paint with pencil, eraser, fill, airbrush, smudge, picker, undo, a VGA palette, and PNG export
- Files with folders, autosaved text documents, drag-in import, download, and keyboard navigation; use F2 to rename, Enter to open, and Backspace to go up
- Minesweeper with a safe first click, flags, and a saved best time
- Pet Rock, Fortune, Coin Flip, and Busy Work for moments that need no productivity at all
- Character Map for copying arrows, box drawing, currency, accents, and math symbols
- A Recycle Bin that keeps deleted files and folders until you restore or empty them
- A Run dialog that understands classic names like notepad, calc, mspaint, cmd, and winmine
- Minesweeper difficulty levels, find and replace in Notes, Paint can open pictures, and calculator square root, percent, sign, and reciprocal keys
- Command Prompt commands for dir, tree, type, time, whoami, mem, color, start, and shutdown
- Luna Blue, Olive Green, Silver, Royale, and Windows Classic themes that preview as you pick them
- Desktop icons you can drag anywhere, with optional align to grid
- Display options for font size, icon size, wallpaper position, background color, screen saver style and wait, and taskbar clock and Quick Launch
- Monitor brightness and contrast knobs and a 12 or 24-hour clock
- An XP-style two-column Start menu with Log Off and Turn Off Computer, which fades the desk to gray before the tube collapses

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

## Sounds
System sounds live in `sounds/` as MP3 files: open, close, minimize, restore, thud, win, boom, degauss, timer, and flip. Replace any file with your own MP3 of the same name and reload. Sounds always load fresh when online and stay cached for offline use.

## Credits
Created by Hrishikesh Lenin and Sandeep Shenoy. Art and creative direction are human-made.

## Development

- `js/main.js` contains the desktop, window manager, and app bindings.
- `js/data-core.mjs` contains normalized storage and reusable data operations.
- `sw.js` manages the versioned offline app shell.
- Run `node scripts/stamp-cache.mjs` after changing cached files to refresh content-hash cache stamps.
- Run tests with `node --test tests/*.test.mjs`.
