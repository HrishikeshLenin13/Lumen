import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
const check = process.argv.includes("--check");
const digest = (value) => createHash("sha256").update(value).digest("hex").slice(0, 10);
const locate = (ref, base) => [new URL(ref, base), new URL(ref.replace(/^(\.\.?\/)+/, ""), root)].find((url) => existsSync(url));
const stale = [];
for (const file of ["manifest.webmanifest", "css/lumen-vintage.css", "js/main.js", "index.html", "sw.js"]) {
  const url = new URL(file, root);
  const source = readFileSync(url, "utf8");
  const stamped = source.replace(/([\w./-]+\.(?:css|mjs|js|png|mp3|webmanifest))\?v=[\w-]+/g, (match, ref) => { const target = locate(ref, url); return target ? ref + "?v=" + digest(readFileSync(target)) : match; });
  const next = stamped.replace(/lumen-app-[\w-]+/, () => "lumen-app-" + digest(stamped.replace(/lumen-app-[\w-]+/, "")));
  if (next === source) continue;
  stale.push(file);
  if (!check) writeFileSync(url, next);
}
if (stale.length) console.log((check ? "Stale cache stamps in " : "Stamped ") + stale.join(", "));
process.exitCode = check && stale.length ? 1 : 0;
