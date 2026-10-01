// The translator client: pretend canned translations, refusals, and a faked real translator.
export default function (T, { modelWindow }) {
  const w = modelWindow();
  const { Translator, Library, Society, Seeds, Scenarios, Runtime, Adapters } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const gridJudge = () => { const s = Seeds.makePebbles(); Society.applyChallenge(s, "grid3x5"); return Society.agentById(s, "judge"); };

  T.test("pretend: shipped pseudocode translates to the shipped program", ["Translator"], async () => { const a = gridJudge(); const r = await Translator.translate(a, a.pseudocode, pretend); return r.status === "ok" && r.result.js === Library.LIB["grid-judge"].js; });
  T.test("pretend: new pseudocode needs translation, and says so", ["Translator"], async () => (await Translator.translate(gridJudge(), "if rows is {3}\n  pass, and say \"fine\"", pretend)).status === "needs");
  T.test("a “looks happy” line gets a question, not code", ["Translator"], async () => {
    const r = await Translator.translate(gridJudge(), "if the drawing looks happy\n  pass, and say \"done\"", pretend);
    return r.status === "refused" && r.refusals[0].line === 1 && /can't tell whether the drawing looks happy/.test(r.refusals[0].reason) && /\?$/.test(r.refusals[0].reason);
  });
  T.test("editing a shipped agent's pseudocode retranslates it and reruns its scenarios", ["Translator", "Society", "Scenarios"], async () => {
    const a = gridJudge();
    const edited = Library.VARIANT_TRANSLATIONS[0].pseudocode;   // "… or rows is {5} and columns is {3}": canned in pretend mode
    const before = await Scenarios.runScenarios(a, Runtime);
    const r = await Translator.translate(a, edited, pretend);
    if (r.status !== "ok") return false;
    Society.installTranslation(a, edited, r.result);
    const after = await Scenarios.runScenarios(a, Runtime);
    return before.every(x => x.ok) && !after.find(x => x.id === "s2").ok && !!a.lastGood && a.code.js !== a.lastGood.js;
  });
  T.test("revert brings back the last good version", ["Society"], async () => {
    const a = gridJudge();
    const edited = Library.VARIANT_TRANSLATIONS[0].pseudocode;
    Society.installTranslation(a, edited, (await Translator.translate(a, edited, pretend)).result);
    Society.revertAgent(a);
    return a.code.js === Library.LIB["grid-judge"].js && a.pseudocode === Library.LIB["grid-judge"].pseudocode && !!a.lastGood;
  });
  T.test("changing only a slot needs no translation", ["Society", "Slots"], () => { const a = gridJudge(); const c = Society.classifyPseudoEdit(a, a.pseudocode.replace("{5}", "{6}")); return c.kind === "params" && c.values.columnsNeeded === 6; });
  T.test("changing the words needs translation", ["Society"], () => { const a = gridJudge(); return Society.classifyPseudoEdit(a, a.pseudocode.replace("pass, and", "pass, then")).kind === "translate"; });

  const fakeAdapter = reply => ({ id: "fake", label: "fake", calls: [], async call(req) { this.calls.push(req); return { raw: reply, model: "fake-model", system: req.system, request: {}, ms: 1 }; } });
  const good = { js: "function run(input, params, h) {\n  return { pass: input.data.rows === params.want, say: \"ok\" };\n}", lineMap: [{ pseudo: [1, 1], js: [2, 2] }], params: { want: 2 }, slots: [{ line: 1, text: "2", param: "want" }], refusals: [] };
  T.test("a real translation is validated, checked, cached and installed", ["Translator"], async () => {
    const a = gridJudge(), f = fakeAdapter("Here you go:\n```json\n" + JSON.stringify(good) + "\n```");
    const text = "pass if rows is {2}";
    const r1 = await Translator.translate(a, text, f), r2 = await Translator.translate(a, text, f);
    return r1.status === "ok" && r1.result.params.want === 2 && r2.cached && f.calls.length === 1 && /function run\(input, params, h\)/.test(f.calls[0].system) && f.calls[0].messages[0].content.indexOf("1  pass if rows is {2}") >= 0;
  });
  T.test("a translation that breaks a safety rule is not used", ["Translator", "SafeJS"], async () => {
    const bad = Object.assign({}, good, { js: "function run(input, params, h) {\n  fetch('https://example.com');\n  return {};\n}" });
    const r = await Translator.translate(gridJudge(), "send the data away {1}", fakeAdapter(JSON.stringify(bad)));
    return r.status === "error" && /safety rule/.test(r.error);
  });
  T.test("a refusal from the translator becomes a question for the learner", ["Translator"], async () => {
    const r = await Translator.translate(gridJudge(), "if it looks nice {0}", fakeAdapter(JSON.stringify({ js: "", lineMap: [], params: {}, slots: [], refusals: [{ line: 1, reason: "A program can't tell whether it looks nice. What could it count instead?" }] })));
    return r.status === "refused" && r.refusals.length === 1;
  });
  T.test("an unreadable translator answer is a visible error", ["Translator"], async () => (await Translator.translate(gridJudge(), "something new {9}", fakeAdapter("Sorry, I can't."))).status === "error");
  T.test("the translator's instructions follow Appendix B", ["Translator"], () => {
    const s = Translator.TRANSLATOR_SYSTEM;
    return /ONLY a JSON object/.test(s) && /function run\(input, params, h\)/.test(s) && /params\.name/.test(s) && /lineMap covers every/.test(s) && /refusal/.test(s) && /h\.tick\(\);/.test(s) && /No comments/.test(s);
  });
}
