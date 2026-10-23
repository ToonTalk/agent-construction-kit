// Write every example under ＋ New society to examples/<its title>.json, stamped with this version.
//   node tools/export_examples.mjs
// Run it after any change to an example or to AK.VERSION (a test checks that examples/mini-ani.json is current).
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { JSDOM } = createRequire(join(execSync("npm root -g").toString().trim(), "noop.js"))("jsdom");
const html = readFileSync(join(root, "index.html"), "utf8");
const model = /<script id="ak-model">([\s\S]*?)<\/script>/.exec(html)[1];
const w = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only", url: "http://localhost/" }).window;
w.eval(model);
const { Seeds, Society } = w.AK;
for (const ex of Seeds.EXAMPLES) {
  const soc = ex.make();
  const name = soc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".json";
  const text = Society.exportSociety(soc, null);
  writeFileSync(join(root, "examples", name), typeof text === "string" ? text : JSON.stringify(text, null, 2));
  console.log("examples/" + name);
}
