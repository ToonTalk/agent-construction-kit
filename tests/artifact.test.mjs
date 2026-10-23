// The claude.ai artifact build (tools/build_artifact.py): only keyless Claude (and Gemini Nano where Chrome has it),
// chosen by default, language links to the site, and a note saying where the full version is.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export default function (T, { pageWindow }) {
  const file = join(dirname(fileURLToPath(import.meta.url)), "..", "artifact", "agent-kit-claude-artifact.html");
  if (!existsSync(file)) return;
  T.test("artifact build: only keyless Claude in Settings, chosen by default, with links to the full site", ["Adapters"], async () => {
    const { w } = await pageWindow({ html: readFileSync(file, "utf8") });
    const ak = w.__ak;
    ak.openSettings();
    const m = Array.from(w.document.querySelectorAll(".modal-body")).pop();
    const conns = Array.from(m.querySelectorAll('input[name="conn"], .conn input[type="radio"]')).map(i => i.value);
    const sv = Array.from(m.querySelectorAll("a")).find(a => a.textContent === "Svenska");
    return ak.app.settings.connection === "keyless" && conns.join() === "keyless" && /artifact version of Agent Kit/.test(m.textContent) &&
      sv && sv.getAttribute("href") === "https://toontalk.github.io/agent-construction-kit/sv/" && sv.getAttribute("target") === "_blank";
  });
  // 1.18.0: the artifact's scripts are minified (tools/minify_artifact.mjs). The Worker's source is its functions' own
  // text, so their names must survive; and the build stays well under claude.ai's ~950 KB.
  T.test("artifact build: minified, well under 950 KB, and its Worker's own code still runs programs and stops a runaway loop", ["Sandbox"], async () => {
    const html = readFileSync(file, "utf8");
    const { w } = await pageWindow({ html });
    const { Sandbox, SafeJS } = w.AK;
    const src = Sandbox.WorkerExec.source(), replies = [], scope = { postMessage: m => replies.push(m) };
    new w.Function("self", src)(scope);
    const job = (id, body) => { const c = SafeJS.compileJS("function run(input, params, h) {\n" + body + "\n}", "program"); return { id, kind: "program", key: "program" + id, body: '"use strict";\n' + c.exec + "\n;return run;", input: { text: "a b" }, params: { k: 3 }, seed: 1, tickLimit: 1000 }; };
    scope.onmessage({ data: job(1, "return { n: h.words(input.text).length * params.k };") });
    scope.onmessage({ data: job(2, "while (true) { }\nreturn {};") });
    return Buffer.byteLength(html) < 800000 && !/SECTION: /.test(html) && replies[0].ok && replies[0].output.n === 6 && !replies[1].ok && /too many steps/.test(replies[1].error);
  });
}
