// Agent Kit test suite. `node tests/run.mjs [filter]`
// Prints a PASS count and a fingerprint (a hash of the sorted test names), so a
// change in what is tested shows up even when the count happens to stay the same.
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = join(here, "..", "index.html");
const HTML = readFileSync(HTML_PATH, "utf8");
const MODEL_SRC = (HTML.match(/<script id="ak-model">([\s\S]*?)<\/script>/) || [])[1];
const UI_SRC = (HTML.match(/<script id="ak-ui">([\s\S]*?)<\/script>/) || [])[1];
if (!MODEL_SRC || !UI_SRC) { console.error("Could not find the model or UI script in index.html"); process.exit(2); }

async function loadJsdom() {
  try { return await import("jsdom"); } catch (e) { /* not installed next to the repo */ }
  const root = execSync("npm root -g").toString().trim();
  return createRequire(join(root, "noop.js"))("jsdom");
}
const jsdom = await loadJsdom();
const { JSDOM, VirtualConsole } = jsdom;

// A bare window with only the model layer loaded (it is DOM-free).
function modelWindow(opts = {}) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only", url: "http://localhost/" });
  const w = dom.window;
  if (opts.gzip) for (const k of ["CompressionStream", "DecompressionStream", "ReadableStream", "TextEncoder", "TextDecoder"]) w[k] = globalThis[k];
  w.eval(MODEL_SRC);
  return w;
}
// The whole page, booted. Canvas "not implemented" messages are expected in jsdom.
async function pageWindow(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { if (!/Not implemented/i.test(String(e && e.message))) errors.push(String(e && e.message)); });
  vc.on("error", (...a) => errors.push(a.map(String).join(" ")));
  const dom = new JSDOM(HTML, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/index.html", virtualConsole: vc,
    beforeParse(w) { if (opts.storage) for (const [k, v] of Object.entries(opts.storage)) w.localStorage.setItem(k, v); if (opts.before) opts.before(w); }
  });
  await dom.window.__akBoot;
  return { w: dom.window, errors, dom };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const results = [];
const only = process.argv[2];
function makeT(file) {
  const pending = [];
  return {
    pending,
    test(name, modules, fn) { pending.push({ name, modules, fn, file }); }
  };
}
const files = readdirSync(here).filter(f => f.endsWith(".test.mjs")).sort();
const all = [];
for (const f of files) {
  const mod = await import(pathToFileURL(join(here, f)).href);
  const T = makeT(f);
  mod.default(T, { modelWindow, pageWindow, same, HTML, MODEL_SRC, UI_SRC, HTML_PATH });
  all.push(...T.pending);
}
let lastFile = "";
for (const t of all) {
  if (only && !t.file.includes(only) && !t.name.includes(only)) continue;
  if (t.file !== lastFile) { console.log("\n== " + t.file); lastFile = t.file; }
  let ok = false, why = "";
  try {
    const r = await t.fn();
    ok = r !== false;
    if (!ok) why = "returned false";
  } catch (e) { ok = false; why = (e && e.stack) ? String(e.stack).split("\n").slice(0, 3).join(" | ") : String(e); }
  results.push({ name: t.name, file: t.file, modules: t.modules, ok, why });
  console.log("  " + (ok ? "PASS" : "FAIL") + " " + t.name + (ok ? "" : "\n       " + why));
}
// Every model-layer module must be covered by at least one test.
const probe = modelWindow();
const modules = Array.from(probe.AK.MODULES);
const covered = new Set(all.flatMap(t => t.modules || []));
const missing = modules.filter(m => !covered.has(m));
const pass = results.filter(r => r.ok).length, fail = results.length - pass;
const names = all.map(t => t.file + " :: " + t.name).sort();
const fingerprint = createHash("sha256").update(names.join("\n")).digest("hex").slice(0, 12);
console.log("\n" + "=".repeat(60));
if (!only) console.log("Model modules covered: " + (modules.length - missing.length) + "/" + modules.length + (missing.length ? " (missing: " + missing.join(", ") + ")" : ""));
console.log("FINGERPRINT: " + pass + " PASS, " + fail + " FAIL · " + fingerprint + (only ? " (filtered: " + only + ")" : ""));
if (fail) console.log("Failed:\n  " + results.filter(r => !r.ok).map(r => r.file + " :: " + r.name).join("\n  "));
process.exit(fail || (!only && missing.length) ? 1 : 0);
