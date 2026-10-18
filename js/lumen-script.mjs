const reserved = new Set(["and", "or", "not", "mod", "true", "false"]);
const statementWords = ["let", "print", "goto", "gosub", "return", "if", "then", "else", "end", "endif", "while", "wend", "for", "next", "sub", "call", "dim", "sleep", "wait", "input", "rem"];
const blockKinds = new Set(["ifblock", "else", "endif", "while", "wend", "for", "next", "sub", "endsub"]);
const constant = (value) => () => value;
const hsv = (h, s = 1, v = 1) => { const channel = (n) => { const k = (n + (((h % 360) + 360) % 360) / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); }; return rgb(channel(5), channel(3), channel(1)); };
const rgb = (r, g, b) => "#" + [r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0))).toString(16).padStart(2, "0")).join("");
export const builtins = { abs: Math.abs, int: Math.trunc, floor: Math.floor, ceil: Math.ceil, round: Math.round, sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, atan: Math.atan, atan2: Math.atan2, pow: Math.pow, exp: Math.exp, log: Math.log, sign: Math.sign, min: (...values) => Math.min(...values), max: (...values) => Math.max(...values), clamp: (value, low, high) => Math.min(high, Math.max(low, value)), rnd: (count = 2) => Math.floor(Math.random() * count), random: () => Math.random(), pi: () => Math.PI, len: (value) => Array.isArray(value) ? value.length : String(value).length, str: (value) => display(value), num: (value) => Number(value) || 0, upper: (text) => String(text).toUpperCase(), lower: (text) => String(text).toLowerCase(), mid: (text, start, count = Infinity) => String(text).substr(start, count), left: (text, count) => String(text).slice(0, count), right: (text, count) => String(text).slice(-count), instr: (text, part) => String(text).indexOf(String(part)), chr: (code) => String.fromCharCode(code), ord: (text) => String(text).charCodeAt(0) || 0, time: () => Date.now(), array: (size, fill = 0) => Array.from({ length: Math.max(0, Math.min(1000000, Math.floor(size))) }, () => fill), push: (list, value) => { if (!Array.isArray(list)) throw new Error("push needs an array"); list.push(value); return list.length; }, pop: (list) => Array.isArray(list) ? list.pop() ?? 0 : 0, join: (list, separator = ",") => Array.isArray(list) ? list.join(separator) : String(list), split: (text, separator = ",") => String(text).split(separator), rgb, hsv };
export function display(value) { if (Array.isArray(value)) return "[" + value.map(display).join(", ") + "]"; if (typeof value === "number" && !Number.isInteger(value) && Number.isFinite(value)) return String(Number(value.toFixed(10))); return String(value); }
export function tokenize(source) { const tokens = []; const text = String(source); const pattern = /\s*(?:(\d+\.?\d*|\.\d+)|("(?:[^"\\]|\\.)*")|([a-z_]\w*)|(==|!=|<>|<=|>=|&&|\|\||[-+*/%^()<>=!,[\]]))/iy; let index = 0; while (index < text.length) { if (!text.slice(index).trim()) break; pattern.lastIndex = index; const match = pattern.exec(text); if (!match) throw new Error("Unexpected " + text.slice(index).trim()[0]); index = pattern.lastIndex; if (match[1] !== undefined) tokens.push({ type: "num", value: Number(match[1]) }); else if (match[2] !== undefined) tokens.push({ type: "str", value: match[2].slice(1, -1).replace(/\\n/g, "\n").replace(/\\(.)/g, "$1") }); else if (match[3] !== undefined) tokens.push({ type: "name", value: match[3].toLowerCase() }); else tokens.push({ type: "op", value: match[4] }); } return tokens; }
function compileExpression(source) {
  const tokens = tokenize(source); let position = 0;
  const peek = () => tokens[position];
  const word = (value) => { const token = peek(); return Boolean(token) && (token.type === "op" || token.type === "name") && token.value === value; };
  const take = (value) => { if (!word(value)) throw new Error("Expected " + value + (peek() ? " near " + peek().value : " at the end")); position += 1; };
  const compare = { "==": (x, y) => x === y, "=": (x, y) => x === y, "!=": (x, y) => x !== y, "<>": (x, y) => x !== y, "<": (x, y) => x < y, ">": (x, y) => x > y, "<=": (x, y) => x <= y, ">=": (x, y) => x >= y };
  const parseOr = () => { let left = parseAnd(); while (word("or") || word("||")) { position += 1; const a = left; const b = parseAnd(); left = (env) => a(env) || b(env); } return left; };
  const parseAnd = () => { let left = parseNot(); while (word("and") || word("&&")) { position += 1; const a = left; const b = parseNot(); left = (env) => a(env) && b(env); } return left; };
  const parseNot = () => { if (word("not") || word("!")) { position += 1; const a = parseNot(); return (env) => !a(env); } return parseCompare(); };
  const parseCompare = () => { let left = parseSum(); while (peek()?.type === "op" && Object.hasOwn(compare, peek().value)) { const operation = compare[tokens[position++].value]; const a = left; const b = parseSum(); left = (env) => operation(a(env), b(env)); } return left; };
  const parseSum = () => { let left = parseProduct(); while (word("+") || word("-")) { const plus = tokens[position++].value === "+"; const a = left; const b = parseProduct(); left = plus ? (env) => { const x = a(env); const y = b(env); return typeof x === "string" || typeof y === "string" ? display(x) + display(y) : x + y; } : (env) => a(env) - b(env); } return left; };
  const parseProduct = () => { let left = parseUnary(); while (word("*") || word("/") || word("%") || word("mod")) { const operator = tokens[position++].value; const a = left; const b = parseUnary(); left = operator === "*" ? (env) => a(env) * b(env) : operator === "/" ? (env) => a(env) / b(env) : (env) => { const y = b(env); return ((a(env) % y) + y) % y; }; } return left; };
  const parseUnary = () => { if (word("-")) { position += 1; const a = parseUnary(); return (env) => -a(env); } if (word("+")) { position += 1; return parseUnary(); } return parsePower(); };
  const parsePower = () => { const base = parsePostfix(); if (word("^")) { position += 1; const exponent = parseUnary(); return (env) => base(env) ** exponent(env); } return base; };
  const parseArguments = () => { const list = []; take("("); if (!word(")")) { list.push(parseOr()); while (word(",")) { position += 1; list.push(parseOr()); } } take(")"); return list; };
  const parsePostfix = () => { let value = parsePrimary(); while (word("[")) { position += 1; const target = value; const index = parseOr(); take("]"); value = (env) => { const list = target(env); const at = Math.floor(index(env)); if (typeof list === "string") return list[at] ?? ""; if (!Array.isArray(list)) throw new Error("Only arrays and text can be indexed"); return list[at] ?? 0; }; } return value; };
  const parsePrimary = () => { const token = tokens[position++]; if (!token) throw new Error("The expression ended early"); if (token.type === "num" || token.type === "str") return constant(token.value); if (token.type === "op" && token.value === "(") { const inner = parseOr(); take(")"); return inner; } if (token.type === "name") { if (token.value === "true") return constant(true); if (token.value === "false") return constant(false); if (reserved.has(token.value)) throw new Error("Unexpected " + token.value); const name = token.value; if (word("(")) { const args = parseArguments(); const builtin = Object.hasOwn(builtins, name) ? builtins[name] : null; return builtin ? (env) => builtin(...args.map((arg) => arg(env))) : (env) => env.call(name, args.map((arg) => arg(env))); } return (env) => env.vars.has(name) ? env.vars.get(name) : 0; } throw new Error("Unexpected " + token.value); };
  const result = parseOr();
  if (position < tokens.length) throw new Error("Unexpected " + tokens[position].value);
  return result;
}
const cache = new Map();
function expression(source) { let compiled = cache.get(source); if (!compiled) { compiled = compileExpression(source); if (cache.size > 4000) cache.clear(); cache.set(source, compiled); } return compiled; }
const noFunctions = (name) => { throw new Error("Unknown function " + name + "()"); };
export function scriptExpression(source, variables = new Map(), call = noFunctions) { return expression(String(source))({ vars: variables, call }); }
export function splitArguments(text) { const parts = []; let depth = 0; let quoted = false; let current = ""; for (let index = 0; index < text.length; index += 1) { const character = text[index]; if (quoted) { current += character; if (character === "\\") current += text[++index] ?? ""; else if (character === "\"") quoted = false; continue; } if (character === "\"") quoted = true; else if (character === "(" || character === "[") depth += 1; else if (character === ")" || character === "]") depth -= 1; else if (character === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; } current += character; } if (current.trim()) parts.push(current.trim()); return parts; }
function splitStatements(source) { const lines = []; String(source).split(/\r?\n/).forEach((text, number) => { let quoted = false; let start = 0; for (let index = 0; index < text.length; index += 1) { if (text[index] === "\"" && text[index - 1] !== "\\") quoted = !quoted; else if (text[index] === ";" && !quoted) { lines.push([text.slice(start, index), number + 1]); start = index + 1; } } lines.push([text.slice(start), number + 1]); }); return lines; }
export function compileScript(source) { const instructions = []; const labels = new Map(); const lineNumbers = []; splitStatements(source).forEach(([raw, number]) => { const line = raw.trim(); if (!line || /^rem(\s|$)/i.test(line) || line.startsWith("#") || line.startsWith("'")) return; if (/^[a-z_]\w*:$/i.test(line)) labels.set(line.slice(0, -1).toLowerCase(), instructions.length); else { instructions.push(line); lineNumbers.push(number); } }); return { instructions, labels, lineNumbers }; }
const assignment = /^([a-z_]\w*)\s*(\[(.+)\])?\s*=(?!=)\s*([\s\S]+)$/i;
function parseStatement(line) {
  const match = line.match(/^([a-z_]\w*)\s*([\s\S]*)$/i); const keyword = match ? match[1].toLowerCase() : ""; const rest = match ? match[2] : "";
  const assign = keyword === "let" ? rest.match(assignment) : statementWords.includes(keyword) ? null : line.match(assignment);
  if (keyword === "let" && !assign) throw new Error("Usage: LET name = value");
  if (assign) return { kind: "let", name: assign[1].toLowerCase(), index: assign[3] ? expression(assign[3]) : null, value: expression(assign[4]) };
  if (keyword === "print") return { kind: "print", values: splitArguments(rest).map(expression) };
  if (keyword === "goto" || keyword === "gosub") return { kind: keyword, label: rest.trim().toLowerCase() };
  if (keyword === "call" || keyword === "sub") return { kind: keyword, name: rest.trim().replace(/\(\s*\)$/, "").toLowerCase() };
  if (keyword === "return") return { kind: "return" };
  if (keyword === "end") { const what = rest.trim().toLowerCase(); return { kind: what === "if" ? "endif" : what === "sub" ? "endsub" : what === "while" ? "wend" : "end" }; }
  if (keyword === "endif" || keyword === "else" || keyword === "wend" || keyword === "next") return { kind: keyword };
  if (keyword === "while") return { kind: "while", condition: expression(rest) };
  if (keyword === "for") { const parts = rest.match(/^([a-z_]\w*)\s*=\s*(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+))?$/i); if (!parts) throw new Error("Usage: FOR name = start TO end STEP size"); return { kind: "for", name: parts[1].toLowerCase(), start: expression(parts[2]), end: expression(parts[3]), step: parts[4] ? expression(parts[4]) : constant(1) }; }
  if (keyword === "dim") { const parts = rest.match(/^([a-z_]\w*)\s*[([](.+)[)\]]$/i); if (!parts) throw new Error("Usage: DIM name(size)"); return { kind: "dim", name: parts[1].toLowerCase(), size: expression(parts[2]) }; }
  if (keyword === "sleep" || keyword === "wait") return { kind: "sleep", time: expression(rest.trim() || "0") };
  if (keyword === "input") { const parts = rest.match(/^([a-z_]\w*)\s*(?:,\s*([\s\S]+))?$/i); if (!parts) throw new Error("Usage: INPUT name, \"prompt\""); return { kind: "input", name: parts[1].toLowerCase(), prompt: parts[2] ? expression(parts[2]) : constant("?") }; }
  if (keyword === "if") { const legacy = rest.match(/^(.+?)\s+goto\s+([a-z_]\w*)$/i); if (legacy && !/\sthen\s/i.test(" " + rest + " ")) return { kind: "ifgoto", condition: expression(legacy[1]), label: legacy[2].toLowerCase() }; const parts = rest.match(/^(.+?)\s+then(?:\s+([\s\S]*))?$/i); if (!parts) throw new Error("Usage: IF condition THEN statement"); if (!parts[2]?.trim()) return { kind: "ifblock", condition: expression(parts[1]) }; const body = parseStatement(parts[2].trim()); if (blockKinds.has(body.kind)) throw new Error("Put WHILE, FOR, ELSE, and SUB on their own lines"); return { kind: "ifinline", condition: expression(parts[1]), body }; }
  return { kind: "command", name: keyword, args: rest };
}
function matchBlocks(program, lineNumbers) {
  const matches = new Map(); const subs = new Map(); const open = [];
  const fail = (index, message) => { throw new Error("Line " + lineNumbers[index] + ": " + message); };
  const close = (index, kinds, message) => { const start = open.pop(); if (start === undefined || !kinds.includes(program[start].kind)) fail(index, message); matches.set(start, index); return start; };
  program.forEach((statement, index) => { const kind = statement.kind; if (kind === "ifblock" || kind === "while" || kind === "for" || kind === "sub") { open.push(index); if (kind === "sub") subs.set(statement.name, index); } else if (kind === "else") { const start = open[open.length - 1]; if (start === undefined || program[start].kind !== "ifblock") fail(index, "ELSE without IF"); matches.set(start, index); open[open.length - 1] = index; } else if (kind === "endif") close(index, ["ifblock", "else"], "END IF without IF"); else if (kind === "wend") matches.set(index, close(index, ["while"], "WEND without WHILE")); else if (kind === "next") matches.set(index, close(index, ["for"], "NEXT without FOR")); else if (kind === "endsub") close(index, ["sub"], "END SUB without SUB"); });
  if (open.length) fail(open[open.length - 1], program[open[open.length - 1]].kind.replace("ifblock", "IF").toUpperCase() + " is never closed");
  return { matches, subs };
}
function expand(text, variables) { return text.replace(/\$([a-z_]\w*)/gi, (_, name) => display(variables.get(name.toLowerCase()) ?? 0)); }
export function suggest(word, options) { const target = String(word).toLowerCase(); if (!target) return null; const list = [...new Set(options)].map(String); const prefixed = target.length > 1 ? list.find((option) => option.toLowerCase().startsWith(target)) : null; if (prefixed) return prefixed; let best = null; let bestScore = Infinity; for (const option of list) { const score = editDistance(target, option.toLowerCase()); if (score < bestScore) { bestScore = score; best = option; } } return best !== null && bestScore > 0 && bestScore <= Math.max(1, Math.floor(target.length / 3)) ? best : null; }
function editDistance(a, b) { const row = Array.from({ length: b.length + 1 }, (_, index) => index); for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const saved = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = saved; } } return row[b.length]; }
export async function runScript(source, { action, output, signal, host = {} } = {}) {
  const { instructions, labels, lineNumbers } = compileScript(source);
  const program = instructions.map((line, index) => { try { return parseStatement(line); } catch (error) { throw new Error("Line " + lineNumbers[index] + ": " + error.message); } });
  const { matches, subs } = matchBlocks(program, lineNumbers);
  const variables = new Map(); const returns = []; const loops = new Map(); let pc = 0; let steps = 0;
  const env = { vars: variables, call: (name, args) => { if (host.functions && Object.hasOwn(host.functions, name)) return host.functions[name](...args); const guess = suggest(name, [...Object.keys(builtins), ...Object.keys(host.functions || {})]); throw new Error("Unknown function " + name + "()" + (guess ? ". Did you mean " + guess + "()?" : "")); } };
  const jumpTo = (name) => { if (!labels.has(name)) { const guess = suggest(name, labels.keys()); throw new Error("Unknown label: " + name + (guess ? ". Did you mean " + guess + "?" : "")); } pc = labels.get(name); };
  const pause = (ms) => new Promise((resolve, reject) => { const timer = setTimeout(resolve, Math.max(0, Math.min(60000, Number(ms) || 0))); signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Script stopped", "AbortError")); }, { once: true }); });
  const execute = (statement, index) => {
    switch (statement.kind) {
      case "let": { const value = statement.value(env); if (!statement.index) { variables.set(statement.name, value); return; } const list = variables.get(statement.name); if (!Array.isArray(list)) throw new Error(statement.name + " is not an array. Use DIM " + statement.name + "(size) first"); const at = Math.floor(statement.index(env)); if (!(at >= 0 && at < 1000000)) throw new Error("Index " + at + " is outside " + statement.name); list[at] = value; return; }
      case "print": output?.(expand(statement.values.map((value) => display(value(env))).join(" "), variables)); return;
      case "goto": jumpTo(statement.label); return;
      case "ifgoto": if (statement.condition(env)) jumpTo(statement.label); return;
      case "ifinline": return statement.condition(env) ? execute(statement.body, index) : undefined;
      case "ifblock": case "while": if (!statement.condition(env)) pc = matches.get(index) + 1; return;
      case "else": case "sub": pc = matches.get(index) + 1; return;
      case "endif": return;
      case "wend": pc = matches.get(index); return;
      case "for": { const start = statement.start(env); const end = statement.end(env); const step = statement.step(env); if (!step) throw new Error("FOR STEP cannot be 0"); variables.set(statement.name, start); loops.set(index, { end, step }); if (step > 0 ? start > end : start < end) pc = matches.get(index) + 1; return; }
      case "next": { const head = matches.get(index); const loop = loops.get(head); if (!loop) throw new Error("NEXT reached without its FOR"); const name = program[head].name; const value = variables.get(name) + loop.step; variables.set(name, value); if (loop.step > 0 ? value <= loop.end : value >= loop.end) pc = head + 1; return; }
      case "gosub": if (returns.length > 10000) throw new Error("Too many nested GOSUB calls"); returns.push(pc); jumpTo(statement.label); return;
      case "call": if (!subs.has(statement.name)) { const guess = suggest(statement.name, subs.keys()); throw new Error("Unknown sub: " + statement.name + (guess ? ". Did you mean " + guess + "?" : "")); } if (returns.length > 10000) throw new Error("Too many nested calls"); returns.push(pc); pc = subs.get(statement.name) + 1; return;
      case "return": case "endsub": if (!returns.length) throw new Error(statement.kind === "return" ? "RETURN without GOSUB" : "END SUB reached without CALL"); pc = returns.pop(); return;
      case "dim": variables.set(statement.name, builtins.array(statement.size(env))); return;
      case "sleep": return pause(statement.time(env));
      case "input": return Promise.resolve(host.input ? host.input(display(statement.prompt(env))) : "").then((answer) => { const text = answer == null ? "" : String(answer); variables.set(statement.name, text.trim() !== "" && Number.isFinite(Number(text)) ? Number(text) : text); });
      case "end": return "end";
      default: { if (host.commands && Object.hasOwn(host.commands, statement.name)) { statement.compiled ??= splitArguments(statement.args).map(expression); return host.commands[statement.name](...statement.compiled.map((value) => value(env))); } if (action) return action(statement.name, expand(statement.args.trim().split(/\s+/).join(" "), variables)); const guess = suggest(statement.name, [...statementWords, ...Object.keys(host.commands || {})]); throw new Error("Unknown command: " + statement.name + (guess ? ". Did you mean " + guess + "?" : "")); }
    }
  };
  while (pc < program.length) {
    if (signal?.aborted) throw new DOMException("Script stopped", "AbortError");
    const index = pc++;
    try { let result = execute(program[index], index); if (result && typeof result.then === "function") result = await result; if (result === "end") break; } catch (error) { if (error.name === "AbortError" || error.scriptLine) throw error; const tagged = new Error("Line " + lineNumbers[index] + ": " + error.message); tagged.scriptLine = lineNumbers[index]; throw tagged; }
    if (++steps % 4000 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return variables;
}
