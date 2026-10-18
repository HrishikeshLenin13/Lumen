# LUMEN
Lumen is an installable offline workspace for notes, task tracking, focus sessions, and work logs.
Open apps from the desktop, keyboard shortcuts, or the searchable Start menu.
Drag desktop icons to keep your preferred app order.
The pixel cursor tilts with the curved CRT surface, and confirmations stay inside LUMEN windows.
Draw your art in `art/`, one PNG per icon at its current size, then run `node scripts/build-atlas.mjs`. It packs every icon into one generated sheet, `css/sprites.css`, so the page loads one small file instead of dozens of images, and builds the favicon and both app icons from `art/lumen-logo.png`. It also saves `art/atlas-preview.png`, a sheet of every sprite for viewing that the app never loads. Cursor hotspots use the top-left pixel.

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
- A programmable Command Prompt with local scripts, loops, conditions, and safe window automation
- Windows resize from any edge, the Start menu learns your most used programs, and a balloon lists today's events at startup
- Notes word wrap and font choices, and Checklist filtering, sorting, and renaming
- Calendar reminders at a set time, a tray volume popup, Alt+Esc window switching, and a weekly hours chart in Ship Log
- Import text files into Files with a button or by dropping them on the Files window or the desk
- Paint line, rectangle, and ellipse tools, Minesweeper chording, Command Prompt tab completion, and Start menu search that finds files
- Your own picture or Spectrum Steps as the desk background, selectable pixel/system/crosshair/pointer/wait/text cursors, outline window dragging, an animations switch, upcoming events in Calendar, and a nameable pet rock
- Recent files in the Start menu, a tray menu for the clock and sound, folder names in the Files title, file sorting, and system details in About
- Save notes as files, due dates on tasks, calculator copy and paste, recent characters, a Mystify screen saver, and a long break after every fourth focus session
- Undo after deleting tasks, ship log entries, and events, copy, paste, and duplicate in Files, a full Recycle Bin icon, Ctrl+A on the desk, F1 for help, and the Windows key for Start
- Repeating calendar events, a Zune color scheme, programs you can pin to the Start menu, and checklist tasks you can drag or Alt+arrow into your own order
- Auto-hide the taskbar and hide desktop icons from the right-click menus or Display Properties
- Rename desktop shortcuts with F2, see the caret line and column in Notes, pick a custom Minesweeper field, and find desktop and taskbar options on their own Display Properties tab
- Name what you are focusing on and finished sessions land in Ship Log, Ctrl+S saves inside LUMEN, and Paint has a Colors picker plus window-wide Ctrl+Z and Ctrl+O
- A rotating Did you know tip at startup, which you can hide from the Screen Saver tab
- Log a Ship Log entry again, restore the whole Recycle Bin at once, edit calendar events by double-clicking, and pick recent commands in Run
- Add any program to Quick Launch from its right-click menu, and undo Clear completed in Checklist
- File modified dates, important tasks, a calculator tape that survives restarts, and an optional weekly hours goal in Ship Log
- Drop one desktop icon on another to make a folder, drag programs back out of a folder window, drag taskbar and Quick Launch buttons to rearrange them, and resize cursors on window edges
- LUMEN Script 3 in Command Prompt: a Turing complete language with functions, recursion, subs, 2D arrays, and warp blocks that skip screen refresh, plus script windows with a fast pixel screen, sharp text, auto sizing, sliders, checkboxes, mouse wheel, sound, file access, screen effects, and custom pixel shaders written in LUMEN Script. Eighteen examples land in Files\\Programs, including Breakout, an orbital gravity sandbox, a sorting race, a 3D raycaster, a Mandelbrot explorer, plasma, fireworks, a synth, Flappy LUMEN, and Snake
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
- Run `node scripts/build-atlas.mjs` after changing anything in `art/`. It also refreshes the cache stamps.
- Run `node scripts/stamp-cache.mjs` after changing cached files to refresh content-hash cache stamps.
- Run tests with `node --test tests/*.test.mjs`.

## Writing LUMEN programs

Choose **New script** in Files for a runnable starter, or select an existing file in **Programs** to edit it. Double-clicking a .lsc file runs it. The editor keeps your work in this browser and shows syntax colors, line numbers, and parser diagnostics.

- **F5** saves and runs the current program. **Shift+F5** stops execution.
- **F6** checks syntax without running the program. Click an error to select its source line.
- **Ctrl+S** saves, **Ctrl+F** opens find and replace, and **Ctrl+G** goes to a line.
- **Tab / Shift+Tab** indent or outdent a selection. Enter continues block indentation.
- Press **Escape**, then **Tab** to move keyboard focus out of the editor.
- **Ctrl+D** duplicates a line. **Ctrl+Z / Ctrl+Y** undo and redo editing.
- Runtime errors open the matching file at the reported line. Modified example files are preserved when stock samples update.

Try these showcases with Run in the editor or `run <filename>` in Command Prompt:

| Program | What to try |
| --- | --- |
| `breakout.lsc` | Clear changing brick layouts with mouse or keyboard control, particles, saved best scores, and pause/restart controls. |
| `orbits.lsc` | Launch bodies by dragging, switch to a binary system, and explore mutual gravity, adjustable time, and orbit trails. |
| `sorting.lsc` | Race bubble, insertion, and selection sort on identical inputs, with comparison/write counts and adjustable playback speed. |
| `raycaster.lsc` | Collect eight orbs in a textured 3D maze. Shift sprints, M toggles the map, P pauses, and R starts a new expedition. |
| `explorer.lsc` | Zoom and pan the Mandelbrot set, or use Interesting location for preset destinations. |
| `synth.lsc` | Record a tune, change its waveform, and save or load `synth-tune.txt`. |
| `life.lsc` | Paint cells, seed a glider gun, pause, and advance one generation at a time. |
| `sketch.lsc` | Try mirror and rainbow brushes, then undo the last stroke. |
