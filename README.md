# LUMEN

Lumen is a Windows XP-style desktop that runs in your browser. You can keep notes, track work, draw in Paint, play Minesweeper, and write programs in its own scripting language. It can also be installed and used offline after its files have been cached.

The desktop has a curved CRT display, scanlines, system sounds, and a pixel cursor that tilts with the screen. Windows can be moved, resized from any edge, tiled, or cascaded. Display Properties has the theme and monitor settings, including controls to reduce or turn off the CRT effects.

## Run it locally

From the repository folder, start a static HTTP server:

```sh
python3 -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000). Use an HTTP server instead of opening `index.html` directly, since Lumen uses ES modules and a service worker.

To install it, open the LUMEN menu on the taskbar and choose Install LUMEN... in a browser that supports installation.

## Apps

- Notes saves as you type and keeps version history. It also has a Markdown outline, word counts, find and replace, and font and word-wrap settings.
- Checklist supports due dates, important tasks, filtering, and sorting. Drag tasks to reorder them, or use Alt and the arrow keys.
- Focus has work and break timers, with a longer break after every fourth work session. Give a session a name and it gets added to Ship Log when you finish. Ship Log supports projects, tags, a weekly hours goal, and CSV export.
- Paint has brushes, an eraser, fill, shapes, an airbrush, smudge, and undo. You can open a picture, pick colors, and export the result as a PNG.
- Files has folders and an autosaving text editor. Import or drop in text files, copy and move them between folders, and download them when you're done. Deleted files go to the Recycle Bin.
- Calendar keeps local events, repeating events, and timed reminders. Clicking the taskbar clock opens it.
- Calculator works with its keypad or your keyboard and keeps a result tape between visits.
- Character Map has 35 character sets, including world scripts, math symbols, box drawing, and musical notation. It remembers your five most recent characters.
- Minesweeper has difficulty levels, custom fields, saved best times, and a safe first click. Pet Rock has over 2,000 possible dialogues and works through a saved cycle before repeating a line.

There's also Fortune, Coin Flip, and Busy Work. You can give the rock a name, too.

You can search for apps and files from Start, pin programs there or in Quick Launch, and drag one desktop icon onto another to make a folder. Right-click the desktop or taskbar for layout options. The Run dialog accepts familiar names like `notepad`, `calc`, `mspaint`, and `cmd`.

## Your data

Notes, files, settings, timers, and work logs are saved in the browser you're using. There are no accounts or automatic syncing between devices.

Export a JSON backup from Settings if you want to move your desk to another browser or keep a separate copy. Clearing the browser's site data removes the local copy of your work, so export anything you want to keep first.

## Writing programs

LUMEN Script 3 is a BASIC-style language with loops, functions, recursion, subs, and 2D arrays. Programs can create windows, draw to a pixel screen, add controls, play sound, and read or write Lumen files. They can also move, rename, minimize, and close other Lumen windows.

Open Files and choose New script for a starter program. The editor has syntax colors, line numbers, and error messages that take you to the relevant line. Double-click a `.lsc` file to run it. You can also right-click a `.txt` file and run it in Command Prompt.

To copy the example programs into the Programs folder, enter this in Lumen's Command Prompt:

```text
samples
run breakout.lsc
```

There are 18 examples. A few to start with:

- `breakout.lsc` has changing brick layouts, mouse or keyboard controls, and saved best scores.
- `orbits.lsc` lets you launch bodies by dragging and watch their orbits, or switch to a binary system.
- `sorting.lsc` races three sorting algorithms on the same input and counts their comparisons and writes.
- `raycaster.lsc` is a textured 3D maze with eight orbs to collect. Shift sprints, M shows the map, P pauses, and R restarts.
- `explorer.lsc` lets you zoom and pan through the Mandelbrot set.
- `synth.lsc` records a tune, changes its waveform, and saves it to `synth-tune.txt`.
- `life.lsc` lets you paint cells, seed a glider gun, and step through generations.
- `sketch.lsc` has mirror and rainbow brushes, plus stroke undo.

In the editor:

- `F5` saves and runs. `Shift+F5` stops the program.
- `F6` checks syntax without running it. Click an error to select its source line.
- `Ctrl+S` saves, `Ctrl+F` opens find and replace, and `Ctrl+G` goes to a line.
- `Tab` and `Shift+Tab` indent or outdent a selection. Enter continues the current block's indentation.
- `Ctrl+D` duplicates a line. `Ctrl+Z` and `Ctrl+Y` undo and redo edits.
- Press `Escape`, then `Tab` to move keyboard focus out of the editor.

Runtime errors open the matching file at the reported line. If you change an example program, later sample updates leave your version alone.

Command Prompt's `script help` explains the language. Use `eval` to run a single statement directly, or `stop` to end a running program.

## System files

The System folder in Files contains live configuration files. Editing these changes the state Lumen uses, and changes made through the apps appear in the files too.

`display.json` controls the theme, CRT effects, and other display options. `sound.json` contains sound and volume settings. `rock.json` stores the rock's name, pet count, and dialogue cycle. There are also files for focus sessions, the screen saver, desktop layout, and history.

For example, this command replaces Character Map's recent characters:

```text
eval writefile "System/recent-characters.txt", "★→♥✓♫"
```

JSON edits can contain only the settings you want to change. If an edit is invalid, the draft stays in Files and the last working settings remain active. Check `System/status.txt` for errors or `System/README.txt` for the full list of files and examples.

These files belong to Lumen's virtual filesystem. Scripts can access them, but they don't get access to files elsewhere on your computer.

## Art

Editable PNGs live in `art/`. Keep each icon at its current dimensions, then rebuild the generated assets:

```sh
node scripts/build-atlas.mjs
```

The script bundles the icons into `css/sprites.css` and creates `art/atlas-preview.png` so you can check them together. The app doesn't load the preview. It also builds `art/lumen-logo.png`, the favicon, and the install icons from `art/l.png`, so changing the L updates all of those. Cursor hotspots use the top-left pixel.

## Sounds

The MP3s in `sounds/` are named `open`, `close`, `minimize`, `restore`, `thud`, `win`, `boom`, `degauss`, `timer`, and `flip`. Replace one with an MP3 of the same name to change that sound. Sounds refresh when online and are cached for offline use.

## Development

The app runs as static HTML, CSS, and JavaScript. `js/main.js` handles the desktop, window manager, and app bindings; `js/data-core.mjs` handles stored data and shared data operations.

The scripting runtime is in `js/lumen-script.mjs`, its graphics code is in `js/lumen-screen.mjs`, and the editor is in `js/script-editor.mjs`. `js/system-files.mjs` handles the live System folder, while `js/character-map.mjs` contains the character sets. The service worker is `sw.js`.

After changing cached code or assets, refresh the content hashes so installed copies can pick up the changes:

```sh
node scripts/stamp-cache.mjs
```

The art build runs that step for you. To check the project:

```sh
node --test tests/*.test.mjs
git diff --check
```

## Credits

Created by Hrishikesh Lenin and Sandeep Shenoy. Art and creative direction are human-made.

## Notes reading time

The Notes status line includes an approximate reading time at **200 words per minute**, alongside word, character, and line counts. An empty note shows zero minutes. This is a simple pacing estimate, not a reading-speed measurement.

Calendar recurrence also handles leap-day reminders across non-leap centuries. Restored focus timers normalize invalid modes and negative or non-finite saved durations. These behaviors are covered by the standard Node test suite above.

## Developer resources

- [Feature usage and API contracts](docs/RECENT_IMPROVEMENTS.md)
- [Troubleshooting and recovery](docs/TROUBLESHOOTING.md)
- [Contributor checks and change review](docs/CONTRIBUTOR_CHECKLIST.md)
