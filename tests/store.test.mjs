// Saved work (gzip + base64) and the helper's prompt.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const wz = modelWindow({ gzip: true });
  const data = { a: [1, 2, 3], s: "héllo ✓", n: { deep: true } };
  T.test("store: plain JSON when compression isn't available", ["Store"], async () => { const p = await w.AK.Store.pack(data); return p.startsWith("js1:") && same(await w.AK.Store.unpack(p), data); });
  T.test("store: gzip + base64 when it is", ["Store"], async () => { const p = await wz.AK.Store.pack(data); return p.startsWith("gz1:") && same(await wz.AK.Store.unpack(p), data); });
  T.test("store: a whole society comes back the same, and smaller", ["Store", "Seeds"], async () => {
    const s = wz.AK.Seeds.makePebbles();
    const p = await wz.AK.Store.pack(s);
    return same(await wz.AK.Store.unpack(p), s) && p.length < JSON.stringify(s).length;
  });
  T.test("store: an unknown format is refused", ["Store"], async () => { try { await w.AK.Store.unpack("zz9:???"); return false; } catch (e) { return true; } });

  const { Helper, Seeds, Pretend } = w.AK;
  T.test("helper: its instructions say ask, don't tell", ["Helper"], () => /ask questions rather than giving answers/i.test(Helper.HELPER_SYSTEM) && /Never tell the learner the fix/i.test(Helper.HELPER_SYSTEM) && /next small step/i.test(Helper.HELPER_SYSTEM));
  T.test("helper: it reads the society, the run and the scenarios", ["Helper"], () => {
    const req = Helper.helperRequest(Seeds.makeTelephone(), [{ kind: "activation", round: 1, agentName: "Describer", response: { text: "A red circle.", data: {} } }], "why?", []);
    const t = req.messages[0].content;
    return /About it: Like the party game/.test(t) && /Describer/.test(t) && /A red circle\./.test(t) && /SCENARIOS/.test(t) && /WHEN Artist responds ALWAYS SEND words TO Renderer/.test(t) && req.system === Helper.HELPER_SYSTEM;
  });
  T.test("the pretend helper answers a failing scenario with a question, not the fix", ["Helper", "Pretend"], () => {
    const reply = Pretend.personas.helper.reply({ helperState: { question: "why does my scenario fail?", failing: [{ agent: "Grid Judge", scenario: "3 by 5", expected: "pass to be true", actual: "false" }] } });
    return /\?$/.test(reply.trim()) && /3 by 5/.test(reply);
  });
}
