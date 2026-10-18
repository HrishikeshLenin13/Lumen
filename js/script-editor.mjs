import { validateScript } from "./lumen-script.mjs?v=0db2593a2d";
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const words = new Set("let local print input if then else end endif while wend for to step next repeat until break continue goto gosub return sub call function dim warp rem and or not true false window screen cls pixel rect box line circle triangle text frame present shader noshader button slider checkbox textbox label setvalue tone sound caption icon capture stamp scroll writefile appendfile".split(" "));
export function highlightScript(source) {
  const pattern = /"(?:[^"\\]|\\.)*"|\brem\b[^\n]*|'[^\n]*|\b\d+(?:\.\d+)?\b|\b[a-z_]\w*\b/gi;
  let html = ""; let last = 0;
  for (const match of source.matchAll(pattern)) {
    html += escape(source.slice(last, match.index));
    const token = match[0];
    const kind = /^(rem\b|')/i.test(token) ? "comment" : token[0] === '"' ? "string" : /^\d/.test(token) ? "number" : words.has(token.toLowerCase()) ? "keyword" : "";
    html += kind ? '<span class="code-token--' + kind + '">' + escape(token) + "</span>" : escape(token);
    last = match.index + token.length;
  }
  return html + escape(source.slice(last)) + "\n";
}
export function lineRange(source, number) {
  const lines = source.split("\n");
  const line = Math.max(1, Math.min(lines.length, Math.floor(Number(number) || 1)));
  const start = lines.slice(0, line - 1).reduce((sum, text) => sum + text.length + 1, 0);
  return { start, end: start + lines[line - 1].length, line };
}
export function indentationEdit(source, start, end, outdent = false) {
  if (start === end && !outdent) return { from: start, to: end, text: "  ", start: start + 2, end: start + 2 };
  const from = start === 0 ? 0 : source.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && source[end - 1] === "\n" ? end - 1 : end;
  const next = source.indexOf("\n", last);
  const to = next < 0 ? source.length : next;
  const lines = source.slice(from, to).split("\n");
  const changed = lines.map((line) => outdent ? line.replace(/^( {1,2}|\t)/, "") : "  " + line);
  const text = changed.join("\n");
  const firstDelta = changed[0].length - lines[0].length;
  return { from, to, text, start: Math.max(from, start + firstDelta), end: Math.max(from, end + text.length - (to - from)) };
}
export function newlineEdit(source, start, end) {
  const line = source.slice(start === 0 ? 0 : source.lastIndexOf("\n", start - 1) + 1, start);
  const indent = line.match(/^[ \t]*/)[0];
  const opens = /^\s*(while\b|for\b|repeat\b|sub\b|function\b|warp\b|else\s*$)/i.test(line) || /^\s*if\b.*\bthen\s*$/i.test(line);
  const text = "\n" + indent + (opens ? "  " : "");
  return { from: start, to: end, text, start: start + text.length, end: start + text.length };
}
export function findRange(source, needle, start, backward = false, matchCase = false) {
  if (!needle) return null;
  const hay = matchCase ? source : source.toLowerCase();
  const word = matchCase ? needle : needle.toLowerCase();
  let at = backward ? (start <= 0 ? -1 : hay.lastIndexOf(word, start - 1)) : hay.indexOf(word, start);
  if (at < 0) at = backward ? hay.lastIndexOf(word) : hay.indexOf(word);
  return at < 0 ? null : { start: at, end: at + needle.length };
}
export function bindScriptEditor(root, { getFile, save, run, stop, ask }) {
  const area = root.querySelector("[data-files-content]");
  const panel = area.parentElement;
  const bar = document.createElement("div");
  bar.className = "code-toolbar";
  bar.innerHTML = '<button type="button" class="btn primary" data-code="run" aria-keyshortcuts="F5" title="Run (F5)">Run</button><button type="button" class="btn" data-code="stop" title="Stop (Shift+F5)">Stop</button><button type="button" class="btn" data-code="check" title="Check syntax (F6)">Check</button><button type="button" class="btn" data-code="save" title="Save (Ctrl+S)">Save</button><button type="button" class="btn" data-code="find" title="Find (Ctrl+F)">Find</button><button type="button" class="btn" data-code="goto" title="Go to line (Ctrl+G)">Go to</button>';
  const finder = document.createElement("div");
  finder.className = "code-find"; finder.hidden = true;
  finder.innerHTML = '<input class="field" data-code-find aria-label="Find in file" placeholder="Find" maxlength="256"><input class="field" data-code-replace aria-label="Replacement text" placeholder="Replace with" maxlength="256"><button type="button" class="btn" data-code="previous" aria-label="Previous match">Prev</button><button type="button" class="btn" data-code="next" aria-label="Next match">Next</button><button type="button" class="btn" data-code="replace">Replace all</button><label><input type="checkbox" data-code-case>Match case</label><button type="button" class="btn" data-code="dismiss" aria-label="Close find">Close</button>';
  const shell = document.createElement("div"); shell.className = "code-editor";
  const gutter = document.createElement("pre"); gutter.className = "code-editor__gutter"; gutter.setAttribute("aria-hidden", "true");
  const stage = document.createElement("div"); stage.className = "code-editor__stage";
  const syntax = document.createElement("pre"); syntax.className = "code-editor__syntax"; syntax.setAttribute("aria-hidden", "true");
  const footer = document.createElement("div"); footer.className = "code-status";
  const position = document.createElement("span");
  const diagnostic = document.createElement("button"); diagnostic.type = "button"; diagnostic.className = "code-status__diagnostic"; diagnostic.setAttribute("aria-live", "polite"); diagnostic.disabled = true;
  footer.append(position, diagnostic);
  panel.insertBefore(bar, area); panel.insertBefore(finder, area); panel.insertBefore(shell, area);
  stage.append(syntax, area); shell.append(gutter, stage); panel.append(footer);
  area.spellcheck = false; area.wrap = "off"; area.setAttribute("autocapitalize", "off"); area.setAttribute("autocorrect", "off"); area.setAttribute("data-gramm", "false"); area.setAttribute("data-gramm_editor", "false");
  let selected = null; let timer = null; let paint = 0; let errors = []; let lastValue = area.value; let applying = false; let undo = []; let redo = []; let lastEdit = 0; let lastType = ""; let gutterKey = ""; let paintedSource = null; let paintedScript = false; let offsets = [0]; let pendingBefore = null; let tabNavigation = false;
  const snapshot = () => ({ value: area.value, start: area.selectionStart, end: area.selectionEnd });
  const bound = (stack) => { while (stack.length > 40 || stack.reduce((total, item) => total + item.value.length, 0) > 2000000) stack.shift(); };
  const syncScroll = () => { syntax.scrollTop = area.scrollTop; syntax.scrollLeft = area.scrollLeft; gutter.scrollTop = area.scrollTop; };
  const render = () => {
    paint = 0;
    const file = getFile(); const source = area.value;
    const script = /\.lsc$/i.test(file?.name || ""); if (source !== paintedSource || script !== paintedScript) { syntax.innerHTML = script ? highlightScript(source) : escape(source) + "\n"; paintedSource = source; paintedScript = script; offsets = [0]; for (let i = 0; i < source.length; i += 1) if (source.charCodeAt(i) === 10) offsets.push(i + 1); }
    const count = offsets.length; const key = count + ":" + (errors[0]?.line || 0);
    if (key !== gutterKey) { gutter.innerHTML = Array.from({ length: count }, (_, i) => errors[0]?.line === i + 1 ? '<span class="code-editor__error">' + (i + 1) + "</span>" : String(i + 1)).join("\n") + "\n"; gutterKey = key; }
    let low = 0; let high = offsets.length; while (low < high) { const middle = (low + high) >>> 1; if (offsets[middle] <= area.selectionEnd) low = middle + 1; else high = middle; } const line = low; const column = area.selectionEnd - offsets[Math.max(0, low - 1)] + 1;
    position.textContent = "Ln " + line + ", Col " + column + " / " + count + (count === 1 ? " line" : " lines");
    syncScroll();
  };
  const schedule = () => { if (!paint) paint = requestAnimationFrame(render); };
  const showErrors = (list, success = false) => { errors = list; diagnostic.textContent = list.length ? "Line " + list[0].line + ": " + list[0].message : success ? "Syntax checked" : ""; diagnostic.classList.toggle("has-error", list.length > 0); diagnostic.disabled = !list.length; schedule(); };
  const check = () => { clearTimeout(timer); showErrors(validateScript(area.value), true); return errors.length === 0; };
  const jump = (number) => { const range = lineRange(area.value, number); area.focus(); area.setSelectionRange(range.start, range.end); area.scrollTop = Math.max(0, (range.line - 4) * 18); render(); };
  const restore = (entry) => { applying = true; area.value = entry.value; area.setSelectionRange(entry.start, entry.end); area.dispatchEvent(new Event("input", { bubbles: true })); applying = false; render(); };
  const edit = ({ from, to, text, start, end }) => { if (area.value.length - (to - from) + text.length > 200000) { diagnostic.textContent = "This file can contain at most 200,000 characters."; return; } undo.push(snapshot()); bound(undo); redo = []; applying = true; area.setRangeText(text, from, to, "end"); area.setSelectionRange(start, end); area.dispatchEvent(new Event("input", { bubbles: true })); applying = false; lastEdit = 0; render(); };
  const find = (backward = false) => { const needle = finder.querySelector("[data-code-find]").value; const range = findRange(area.value, needle, backward ? area.selectionStart : area.selectionEnd, backward, finder.querySelector("[data-code-case]").checked); if (!range) { diagnostic.textContent = needle ? "No matches." : "Enter text to find."; return; } area.focus(); area.setSelectionRange(range.start, range.end); area.scrollTop = Math.max(0, (area.value.slice(0, range.start).split("\n").length - 4) * 18); render(); };
  const action = async (name) => {
    const file = getFile(); if (!file || file.kind !== "text") return;
    if (name === "run") { if (check() && save()) run({ ...file, content: area.value }); }
    if (name === "stop") stop();
    if (name === "save") diagnostic.textContent = save() ? "Saved on this device." : "Save failed. Your edits remain open.";
    if (name === "check") check();
    if (name === "goto") { const value = await ask("Go to line", "Enter a line number.", "1"); if (value !== null) jump(value); }
    if (name === "find") { finder.hidden = false; const picked = area.value.slice(area.selectionStart, area.selectionEnd); const field = finder.querySelector("[data-code-find]"); if (picked && !picked.includes("\n")) field.value = picked; field.focus(); field.select(); }
    if (name === "dismiss") { finder.hidden = true; area.focus(); }
    if (name === "next" || name === "previous") find(name === "previous");
    if (name === "replace") {
      const needle = finder.querySelector("[data-code-find]").value; if (!needle) return;
      const replacement = finder.querySelector("[data-code-replace]").value;
      let result = ""; let at = 0; let count = 0;
      while (at <= area.value.length) { const range = findRange(area.value, needle, at, false, finder.querySelector("[data-code-case]").checked); if (!range || range.start < at) break; result += area.value.slice(at, range.start) + replacement; at = range.end; count += 1; if (result.length > 200000) break; }
      result += area.value.slice(at); if (result.length > 200000) { diagnostic.textContent = "Replacement would exceed 200,000 characters."; return; } if (count) edit({ from: 0, to: area.value.length, text: result, start: 0, end: 0 }); diagnostic.textContent = count ? "Replaced " + count + " matches." : "No matches.";
    }
  };
  const click = (event) => { const button = event.target.closest("[data-code]"); if (button) action(button.dataset.code); };
  bar.addEventListener("click", click); finder.addEventListener("click", click);
  finder.addEventListener("keydown", (event) => { event.stopPropagation(); if (event.key === "Enter") { event.preventDefault(); find(event.shiftKey); } if (event.key === "Escape") action("dismiss"); });
  diagnostic.addEventListener("click", () => { if (errors[0]) jump(errors[0].line); });
  area.addEventListener("beforeinput", () => { pendingBefore = snapshot(); });
  area.addEventListener("input", (event) => {
    if (!applying && area.value !== lastValue) { const now = performance.now(); if (now - lastEdit > 650 || event.inputType !== lastType || !undo.length) { undo.push(pendingBefore || { value: lastValue, start: Math.min(lastValue.length, area.selectionStart), end: Math.min(lastValue.length, area.selectionStart) }); bound(undo); } redo = []; lastEdit = now; lastType = event.inputType; }
    pendingBefore = null; lastValue = area.value; showErrors([]); clearTimeout(timer);
    if (/\.lsc$/i.test(getFile()?.name || "")) timer = setTimeout(() => showErrors(validateScript(area.value)), 500);
  });
  area.addEventListener("scroll", syncScroll, { passive: true });
  for (const type of ["keyup", "click", "select"]) area.addEventListener(type, schedule);
  area.addEventListener("keydown", (event) => {
    if (tabNavigation && event.key === "Tab") { tabNavigation = false; return; }
    if (!["Shift", "Control", "Meta", "Alt"].includes(event.key)) tabNavigation = false;
    const mod = event.ctrlKey || event.metaKey; const key = event.key.toLowerCase();
    const shortcut = event.key === "F5" ? (event.shiftKey ? "stop" : "run") : event.key === "F6" ? "check" : mod ? { s: "save", f: "find", g: "goto" }[key] : null;
    if (shortcut) { event.preventDefault(); event.stopPropagation(); action(shortcut); return; }
    if (mod && ["z", "y"].includes(key)) { event.preventDefault(); event.stopPropagation(); const backwards = key === "z" && !event.shiftKey; const stack = backwards ? undo : redo; const target = backwards ? redo : undo; if (stack.length) { target.push(snapshot()); bound(target); restore(stack.pop()); } return; }
    if (event.key === "Escape") { event.preventDefault(); if (!finder.hidden) action("dismiss"); else { tabNavigation = true; diagnostic.textContent = "Press Tab to move focus out of the editor."; } return; }
    if (event.key === "Tab" && !mod && !event.altKey) { event.preventDefault(); edit(indentationEdit(area.value, area.selectionStart, area.selectionEnd, event.shiftKey)); }
    if (event.key === "Enter" && !mod && !event.altKey) { event.preventDefault(); edit(newlineEdit(area.value, area.selectionStart, area.selectionEnd)); }
    if (mod && key === "d") { event.preventDefault(); const range = lineRange(area.value, area.value.slice(0, area.selectionStart).split("\n").length); const text = "\n" + area.value.slice(range.start, range.end); edit({ from: range.end, to: range.end, text, start: range.end + 1, end: range.end + text.length }); }
  });
  const runtimeError = (event) => { if (event.detail.fileId !== getFile()?.id) return; showErrors([{ line: event.detail.line || 1, message: event.detail.message }]); jump(event.detail.line || 1); };
  document.addEventListener("lumen-script-error", runtimeError);
  return {
    refresh: () => { const file = getFile(); if (selected !== file?.id) { selected = file?.id; undo = []; redo = []; errors = []; diagnostic.textContent = ""; clearTimeout(timer); pendingBefore = null; lastEdit = 0; area.setSelectionRange(0, 0); area.scrollTop = 0; area.scrollLeft = 0; finder.hidden = true; } lastValue = area.value; bar.querySelectorAll("button").forEach((button) => { button.disabled = file?.kind !== "text"; }); schedule(); },
    destroy: () => { clearTimeout(timer); cancelAnimationFrame(paint); document.removeEventListener("lumen-script-error", runtimeError); },
  };
}
