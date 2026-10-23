// Minifies an artifact build in place: its two scripts with terser (top-level names are kept, so the scripts still
// share them and the Worker's functions still find each other), and its styles by dropping comments and spaces.
// The artifact's code needn't be readable: the readable page is at toontalk.github.io/agent-construction-kit.
//   node tools/minify_artifact.mjs artifact/agent-kit-claude-artifact.html
// terser is found next to the repo or among the global packages (npm install -g terser), as the tests find jsdom.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { join } from "node:path";

async function loadTerser() {
  try { return await import("terser"); } catch (e) { /* not installed next to the repo */ }
  const root = execSync("npm root -g").toString().trim();
  return createRequire(join(root, "noop.js"))("terser");
}
const { minify } = await loadTerser();
// The Worker's source is these functions' own text (WorkerExec.source), calling each other by name: keep their names.
const WORKER = ["mulberry32", "makeGuard", "makeH", "computeShadowNames", "workerMain"];
const WORKER_RE = new RegExp("^(" + WORKER.join("|") + ")$");
const file = process.argv[2];
let html = readFileSync(file, "utf8");
const before = Buffer.byteLength(html);
const parts = [];
const re = /(<script id="ak-(?:model|ui)">)([\s\S]*?)(<\/script>)/g;
for (const m of html.matchAll(re)) parts.push(m);
for (const m of parts.reverse()) {   // from the end, so earlier offsets stay right
  const r = await minify(m[2], { ecma: 2020, toplevel: false, compress: { passes: 1 }, keep_fnames: WORKER_RE, mangle: { reserved: WORKER }, format: { comments: false, ascii_only: false } });
  if (!r.code) throw new Error("terser returned nothing for " + m[1]);
  const code = r.code.replace(/<\/script/gi, "<\\/script");
  html = html.slice(0, m.index) + m[1] + code + m[3] + html.slice(m.index + m[0].length);
}
const head = html.indexOf("<script");   // only the page's own styles, not the ones the trace page writes
html = html.slice(0, head).replace(/(<style>)([\s\S]*?)(<\/style>)/g, (all, a, css, b) => a + css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, " ").trim() + b) + html.slice(head);
writeFileSync(file, html);
console.log(file + ": " + Math.round(before / 1000) + " KB → " + Math.round(Buffer.byteLength(html) / 1000) + " KB");
