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
- Windows resize from any edge, the Start menu learns your most used programs, and a balloon lists today's events at startup
- Notes word wrap and font choices, and Checklist filtering, sorting, and renaming
- Calendar reminders at a set time, a tray volume popup, Alt+Esc window switching, and a weekly hours chart in Ship Log
- Import text files into Files with a button or by dropping them on the Files window or the desk
- Paint line, rectangle, and ellipse tools, Minesweeper chording, Command Prompt tab completion, and Start menu search that finds files
- Your own picture as the desk background, outline window dragging, an animations switch, upcoming events in Calendar, and a nameable pet rock
- Recent files in the Start menu, a tray menu for the clock and sound, folder names in the Files title, file sorting, and system details in About
- Save notes as files, due dates on tasks, calculator copy and paste, recent characters, a Mystify screen saver, and a long break after every fourth focus session
- Undo after deleting tasks, ship log entries, and events, copy, paste, and duplicate in Files, a full Recycle Bin icon, Ctrl+A on the desk, F1 for help, and the Windows key for Start
- Repeating calendar events, a Zune color scheme, programs you can pin to the Start menu, and checklist tasks you can drag or Alt+arrow into your own order
- Auto-hide the taskbar and hide desktop icons from the right-click menus or Display Properties
- Rename desktop shortcuts with F2, see the caret line and column in Notes, pick a custom Minesweeper field, and find desktop and taskbar options on their own Display Properties tab
- Name what you are focusing on and finished sessions land in Ship Log, Ctrl+S saves inside LUMEN, and Paint has a Colors picker plus window-wide Ctrl+Z and Ctrl+O
- A rotating Did you know tip at startup, which you can hide from the Screen Saver tab
- Log a Ship Log entry again, restore the whole Recycle Bin at once, edit calendar events by double-clicking, and pick recent commands in Run
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
