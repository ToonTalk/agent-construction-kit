// For a translated copy: render every view and list the sentences that still look English.
//   node tests/leftovers.mjs sv/index.html
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || "sv/index.html";
const HTML = readFileSync(join(here, "..", file), "utf8");
const { JSDOM, VirtualConsole } = createRequire(join(execSync("npm root -g").toString().trim(), "noop.js"))("jsdom");
const dom = new JSDOM(HTML, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/index.html", virtualConsole: new VirtualConsole() });
const w = dom.window;
await w.__akBoot;
const ak = w.__ak;
ak.app.settings.connection = "pretend"; ak.app.settings.speed = "instant";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const seen = new Set();
const grab = () => {
  const t = Array.from(w.document.body.children).filter(e => e.tagName !== "SCRIPT" && e.tagName !== "STYLE").map(e => e.textContent).join(" | ") + " " + Array.from(w.document.querySelectorAll("[title],[aria-label],[placeholder]")).map(e => [e.title, e.getAttribute("aria-label"), e.getAttribute("placeholder")].join(" ")).join(" ");
  for (const s of t.split(/(?<=[.!?:;])\s+|\n+|\s{2,}/)) { const x = s.trim(); if (x.length > 3) seen.add(x); }
};
const close = () => Array.from(w.document.querySelectorAll(".modal-back")).forEach(x => x.remove());
for (const id of ak.app.order.slice()) {
  ak.app.activeId = id; ak.app.ui.lookInside = true; ak.renderAll(); grab();
  for (const a of ak.soc().agents) { ak.openAgent(a.id); await sleep(5); grab(); close(); }
  const rec = await ak.runNow(); await sleep(20); if (rec) { ak.renderAll(); grab(); }
}
ak.openSettings(); await sleep(5); grab(); close();
for (const g of ["learner", "teacher"]) { const b = w.document.createElement("button"); b.dataset.act = "guide"; b.dataset.id = g; w.document.body.appendChild(b); b.click(); await sleep(5); grab(); close(); b.remove(); }
w.document.querySelector('[data-act="helper"]').click(); await sleep(5); grab();
w.document.querySelector('[data-act="new-society"]').click(); await sleep(5); grab(); close();
const ENGLISH = /\b(the|and|you|your|with|this|that|isn't|doesn't|what|which|when|from|have|has|will|can't|it's|there|their|they|here|into|only|more|than|press|click|choose)\b/i;
const left = Array.from(seen).filter(s => ENGLISH.test(s) && !/[åäöÅÄÖ]/.test(s.slice(0, 0)));
console.log(left.length + " sentences still look English (of " + seen.size + "):\n");
for (const s of left) console.log("- " + s.slice(0, 220));
process.exit(0);
