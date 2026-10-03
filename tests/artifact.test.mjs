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
}
