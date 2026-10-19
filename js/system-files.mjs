const definitions = [
  { name: "display.json", keys: ["theme", "effects", "wallpaper", "wallpaperFit", "deskColor", "fontSize", "iconSize", "brightness", "contrast", "cursorType", "showClock", "clock24", "showIcons", "autoHideTaskbar", "dragContents", "transitions"] },
  { name: "sound.json", keys: ["sounds", "volume"] },
  { name: "screensaver.json", keys: ["screensaver", "saverStyle", "saverWait"] },
  { name: "focus.json", keys: ["focusMin", "breakMin", "longBreakMin", "focusLabel"] },
  { name: "rock.json", keys: ["rockName", "rockPets", "rockDialogue"] },
  { name: "history.json", keys: ["runHistory", "recentFiles", "showTips", "tipIndex"] },
  { name: "desktop.json", keys: ["startPins", "quickLaunch", "iconGrid", "iconPositions"] },
  { name: "recent-characters.txt", keys: ["recentChars"], text: true },
];
const encode = (definition, data) => definition.text ? data.recentChars : JSON.stringify(Object.fromEntries(definition.keys.map((key) => [key, data[key]])), null, 2) + "\n";
export function createSystemFiles(normalize) {
  const snapshots = new WeakMap();
  return (data, at = new Date().toISOString()) => {
    if (!snapshots.has(data)) snapshots.set(data, new Map());
    const previous = snapshots.get(data), changed = new Set(), errors = [];
    const ensure = (id, name, parent, kind, content = "") => {
      let suffix = 0, candidate;
      while ((candidate = data.files.find((file) => file.id === (suffix ? id + "-" + suffix : id))) && (candidate.kind !== kind || candidate.name !== name || candidate.parent !== parent)) suffix += 1;
      if (candidate) return candidate;
      const file = { id: suffix ? id + "-" + suffix : id, name, parent, kind, content, modifiedAt: at };
      data.files.push(file);
      return file;
    };
    const folderName = data.files.some((file) => file.parent === null && file.name === "System" && !/^lumen-system(?:-\d+)?$/.test(file.id)) ? "Lumen System" : "System";
    const folder = ensure("lumen-system", folderName, null, "folder");
    const setContent = (file, content) => { if (file.content !== content) { file.content = content; file.modifiedAt = at; } };
    for (const definition of definitions) {
      const canonical = encode(definition, data);
      const file = ensure("lumen-system-" + definition.name, definition.name, folder.id, "text", canonical);
      const snapshot = previous.get(file.id);
      if (snapshot?.error && snapshot.content === file.content) { errors.push({ id: file.id, message: snapshot.error }); continue; }
      if (file.content !== (snapshot?.content ?? canonical)) {
        try {
          const patch = definition.text ? { recentChars: file.content.trim() } : JSON.parse(file.content);
          if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Expected a JSON object.");
          for (const key of Object.keys(patch)) if (!definition.keys.includes(key)) throw new Error("Unknown setting: " + key + ".");
          const normalized = normalize({ ...data, ...patch });
          for (const key of Object.keys(patch)) if (!definition.text && JSON.stringify(patch[key]) !== JSON.stringify(normalized[key])) throw new Error("Invalid value for " + key + ".");
          for (const key of Object.keys(patch)) if (JSON.stringify(data[key]) !== JSON.stringify(normalized[key])) { data[key] = normalized[key]; changed.add(key); }
        } catch (error) {
          const message = definition.name + ": " + (error instanceof SyntaxError ? "Invalid JSON. Your last working settings are still active." : error.message);
          previous.set(file.id, { content: file.content, error: message });
          errors.push({ id: file.id, message });
          continue;
        }
      }
      setContent(file, encode(definition, data));
      previous.set(file.id, { content: file.content });
    }
    const readme = [
      "LUMEN SYSTEM FILES",
      "",
      "These are live files in Lumen's local virtual filesystem, not files on your computer's operating system.",
      "Edit them in Files, or use readfile and writefile in LUMEN Script. Valid edits apply automatically when saved.",
      "Changes made in Lumen's apps also appear here. Everything stays in this browser and is included in desk backups.",
      "",
      "recent-characters.txt - Your five most recent unique Character Map characters, newest first. Replace the text to change them.",
      "display.json - Theme, wallpaper, CRT effects, cursor, visibility, and window movement preferences.",
      "sound.json - sounds (true or false) and volume (0 to 100).",
      "screensaver.json - Screen saver enabled, style, and wait time.",
      "focus.json - Session durations and label. Changes affect the next session, not a running timer.",
      "rock.json - Rock name, pet count, and the saved no-repeat dialogue deck. Set rockDialogue to null to start a fresh cycle.",
      "history.json - Run history, recent files, and startup tips.",
      "desktop.json - Start pins, Quick Launch, icon grid, and icon positions.",
      "",
      "JSON edits may contain just the settings you want to change. Unknown settings and invalid values are rejected together.",
      "Invalid drafts stay editable. Your last working settings remain active. See status.txt for validation errors.",
      "Managed files are recreated if deleted or moved. README.txt and status.txt are generated, not configuration.",
      "",
      "Try these lines in Command Prompt:",
      'eval print readfile("' + folder.name + '/sound.json")',
      'eval writefile "' + folder.name + '/recent-characters.txt", "★→♥✓♫"',
      'eval writefile "' + folder.name + '/rock.json", "{\\"rockName\\":\\"Pebbletron\\"}"',
      "",
      "Use System/filename or C:\\System\\filename paths to avoid same-name files in other folders.",
    ].join("\n") + "\n";
    setContent(ensure("lumen-system-readme", "README.txt", folder.id, "text"), readme);
    setContent(ensure("lumen-system-status", "status.txt", folder.id, "text"), errors.length ? errors.map((error) => error.message).join("\n") + "\n" : "All system files valid. Changes are saved only on this device.\n");
    return { changed: [...changed], errors, folder };
  };
}
export function resolveVirtualFile(files, value) {
  const path = String(value).replaceAll("\\", "/").replace(/^C:\//i, "").replace(/^\/+/, "");
  const parts = path.split("/").filter((part) => part !== ".");
  if (!parts.length || parts.some((part) => !part || part === "..") || parts.at(-1).length > 80) throw new Error("Invalid virtual file path.");
  const name = parts.pop(), qualified = parts.length > 0 || /^[\\/]|^C:/i.test(String(value));
  let parent = null;
  for (const part of parts) { const folder = files.find((file) => file.kind === "folder" && file.parent === parent && file.name.toLowerCase() === part.toLowerCase()); if (!folder) throw new Error("Folder not found: " + part); parent = folder.id; }
  const file = files.find((item) => item.kind === "text" && item.name.toLowerCase() === name.toLowerCase() && (!qualified || item.parent === parent));
  return { file, name, parent, qualified };
}
