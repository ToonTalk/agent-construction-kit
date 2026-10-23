// 1.20.0: Mini-Ani as a society of mind, agencies, and model calls that run at the same time.
// The Choice Points split into thirteen small choosers (one thing each) in agencies, and a Gatherer that chooses nothing:
// the same rules, one thing at a time, so the same story makes the same film.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Runtime, Scenarios, Adapters, Library } = w.AK;
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const agent = (s, id) => s.agents.find(a => a.id === id);
  const play = async (s, i, deps) => { const api = Engine.createRun(s, Object.assign({ runtime: Runtime, seed: 1 }, deps || {})); api.start({ to: s.starts[i || 0].to, text: s.starts[i || 0].value }); await api.play(); return api.run; };
  const wrap = body => "function run(input, params, h) {\n" + body + "\n}";
  const prog = (id, js) => ({ id, kind: "program", typeId: "custom", name: id.toUpperCase(), emoji: "⚙️", role: "", note: "", gate: false, pseudocode: "x", params: {}, slots: [], scenarios: [], code: { pseudocode: "x", js, lineMap: [], hash: "h" }, lastGood: null, status: "ok", statusDetail: null });
  const rule = (id, from, to, extra) => Object.assign({ id, from, to, when: "always", send: "text", prefix: "", enabled: true }, extra || {});
  const society = (agents, rules, extra) => Object.assign({ kind: "agent-kit-society", schema: 1, id: "t", title: "T", question: "", intro: "", questions: [], roundAgent: agents[0].id, roundLimit: 2, starts: [{ id: "s", label: "S", kind: "text", to: agents[0].id, value: "go" }], agents, rules }, extra || {});

  T.test("Mini-Ani as a society of mind: thirteen choosers in three agencies inside Choosers, the experts an agency too, a Gatherer, and ten rules, each program passing its own scenarios", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeMiniAniSoM();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    for (const a of s.agents.filter(x => x.kind === "program")) {
      const bad = (await Scenarios.runScenarios(a, Runtime)).filter(x => !x.ok);
      if (bad.length) throw new Error(a.id + ": " + JSON.stringify(bad[0]).slice(0, 400));
    }
    const choosers = s.agents.filter(a => a.typeId === "ani-quality");
    return Seeds.EXAMPLES.some(x => x.id === "miniani-som") && choosers.length === 13 && same(Society.agencyMembers(s, "choosers"), choosers.map(a => a.id)) &&
      same(Society.agencyById(s, "choosers").members, ["moving", "getting-on", "looking"]) && same(Society.agencyMembers(s, "getting-on"), ["friends", "strangers"]) &&
      Society.topAgencyOf(s, "speed").id === "choosers" && Society.agencyOf(s, "speed").id === "moving" && same(Society.agencyMembers(s, "experts"), ["personality", "looks", "relationships", "taste"]) &&
      s.rules.length === 10 && s.rules.some(r => r.from === "experts" && r.to === "choosers") && agent(s, "gatherer").typeId === "ani-gather" && !agent(s, "choice-points") &&
      agent(s, "friends").params.compare === "-" && agent(s, "height").params.words === "lower down/higher up" && !s.agents.some(a => a.kind === "model") && s.intro.length < 400 && s.questions.length === 5;
  });
  T.test("Mini-Ani as a society of mind: every story makes the same film as the Mini-Ani, the same choices and plans, with no Choice Points", ["Engine", "Seeds"], async () => {
    for (let i = 0; i < 3; i++) {
      const a = await play(Seeds.makeMiniAni(), i), b = await play(Seeds.makeMiniAniSoM(), i);
      const logo = r => acts(r, "director").map(e => e.response.data.program), ch = (r, id) => acts(r, id).map(e => e.response.data.choices);
      if (!(a.status === "done" && b.status === "done" && same(logo(a), logo(b)) && same(ch(a, "choice-points"), ch(b, "gatherer")) && same(acts(a, "methods").map(e => e.response.text), acts(b, "methods").map(e => e.response.text)) && !b.trace.some(e => e.error))) return false;
    }
    return true;
  });
  T.test("Mini-Ani as a society of mind: each chooser says only its own thing, with Ani's “deadly embrace” where it happened; the Gatherer chooses nothing and explains everyone", ["Engine", "Seeds"], async () => {
    const r = await play(Seeds.makeMiniAniSoM());
    const speed = acts(r, "speed")[0].response, size = acts(r, "size")[0].response, g = acts(r, "gatherer")[0].response;
    return /^\*\*Speed:\*\* Cinderella slow, without its comparison: two choices waited for each other \(Ani's “deadly embrace”\)/.test(speed.text) && !/small|big/.test(speed.text) && /^\*\*Size:\*\*/.test(size.text) &&
      /The 13 choosers chose for Cinderella, the Stepmother, the Godmother and the Prince; I only put their answers together/.test(g.text) && /^Cinderella is slow because of shy/.test(g.data.explain.Cinderella) &&
      Object.keys(g.data.explain).length === 4 && /No expert knows these words yet:\*\* helps \(the Godmother\)/.test(g.text) && acts(r, "renderer").length === 4;
  });
  T.test("agencies: a rule to an agency sends to every agent in it but the sender, and a rule from an agency fires when any of them responds", ["Engine", "Society"], async () => {
    const s = society([prog("a", wrap("return { say: 'go' };")), prog("b", wrap("return { say: 'b' };")), prog("c", wrap("return { say: 'c' };")), prog("d", wrap("return {};"))],
      [rule("r1", "a", "team"), rule("r2", "team", "d"), rule("r3", "b", "team")], { agencies: [{ id: "team", name: "Team", emoji: "🧩", about: "", members: ["b", "c"] }] });
    const errs = Society.validateSociety(s), r = await play(s);
    const a1 = acts(r, "a")[0], b1 = acts(r, "b")[0];
    return !errs.length && same(a1.fired.map(f => f.to), ["b", "c"]) && a1.fired.every(f => f.via === "Team") && same(b1.fired.map(f => f.to), ["d", "c"]) &&
      acts(r, "d").length === 3 && acts(r, "c").length === 2 && /SEND words TO Team/.test(a1.fired[0].rule);
  });
  T.test("agencies: checked, cleaned on import (unknown members, an agent in two, an agency inside itself), kept through export, and a deleted agent leaves its agency", ["Society", "Import"], () => {
    const s = Seeds.makeMiniAniSoM();
    const bad = JSON.parse(JSON.stringify(s));
    bad.agencies.push({ id: "loop", name: "Loop", emoji: "🔁", about: "", members: ["loop", "speed", "nobody"] });
    const errs = Society.validateSociety(bad);
    const back = Society.importSociety(JSON.stringify(bad)).society, loop = Society.agencyById(back, "loop");
    const kept = Society.importSociety(Society.exportSociety(s, null)).society;
    Society.deleteAgent(Object.assign(kept, { agents: kept.agents.map(a => Object.assign(a, { shipped: false })) }), "speed");
    return errs.some(e => /unknown member nobody/.test(e)) && errs.some(e => /speed is in two agencies/.test(e)) && loop && same(loop.members, []) && same(Society.agencyMembers(back, "moving"), ["speed", "liveliness", "curves", "jerkiness", "purpose"]) &&
      !Society.validateSociety(back).length && same(Society.agencyById(kept, "moving").members, ["liveliness", "curves", "jerkiness", "purpose"]) && kept.rules.some(r => r.to === "choosers");
  });
  T.test("model calls that don't depend on each other run at the same time, and the trace reads the same as one at a time", ["Engine", "Adapters"], async () => {
    let now = 0, most = 0, calls = 0;
    const slow = { id: "slow", label: "Slow", async call(req) { calls++; now++; most = Math.max(most, now); await new Promise(r => setTimeout(r, 30)); now--; return { text: "I am " + req.meta.agent.id + ": " + req.messages[req.messages.length - 1].content.slice(0, 20), data: {}, raw: "x", model: "slow" }; } };
    const model = id => ({ id, kind: "model", name: id.toUpperCase(), emoji: "🤖", role: "", instructions: "", outputFields: [], canSeeImages: false, history: "stateless", replyKind: "prose", pretend: "generic" });
    const mk = () => society([prog("a", wrap("return { say: 'go' };")), model("m1"), model("m2"), model("m3"), prog("z", wrap("return {};"))], [rule("r1", "a", "m1"), rule("r2", "a", "m2"), rule("r3", "a", "m3"), rule("r4", "m1", "z"), rule("r5", "m2", "z"), rule("r6", "m3", "z")], { roundLimit: 1 });
    const t0 = Date.now(), together = await play(mk(), 0, { adapter: slow }), fast = Date.now() - t0, peak = most;
    most = 0;
    const t1 = Date.now(), alone = await play(mk(), 0, { adapter: slow, parallel: false }), slowMs = Date.now() - t1;
    const view = r => r.trace.filter(e => e.kind === "activation").map(e => [e.agentId, e.response && e.response.text]);
    return peak === 3 && most === 1 && same(view(together), view(alone)) && acts(together, "m2")[0].call.early === true && fast < slowMs && calls === 6;
  });
  T.test("page: Look inside folds an agency into one line until it is opened, the stage shows it as one chip, the trace folds the choosers' answers, and an agent can be moved to another agency", ["Seeds"], async () => {
    const { w: pw, errors } = await pageWindow();
    const ak = pw.__ak, wait = ms => new Promise(r => setTimeout(r, ms)), $ = q => pw.document.querySelector(q), $$ = q => Array.from(pw.document.querySelectorAll(q));
    ak.app.settings.connection = "none"; ak.app.settings.speed = "instant";
    $('[data-act="new-society"]').click();
    $$(".modal-body").pop().querySelector('[data-new="example"][data-id="miniani-som"]').click();
    await wait(30);
    await ak.runNow();
    ak.app.ui.lookInside = true; ak.renderAll();
    const heads = () => $$('#colLeft [data-act="agency-toggle"]').map(b => b.textContent);
    const folded = heads().length === 2 && !$('#colLeft .acard[data-id="speed"]') && /Choosers13agents/.test(heads()[1].replace(/\s/g, ""));
    $$('#colLeft [data-act="agency-toggle"]')[1].click();
    const opened = heads().length === 5 && !$('#colLeft .acard[data-id="speed"]');
    $$('#colLeft [data-act="agency-toggle"]').find(b => /How they move/.test(b.textContent)).click();
    const cards = !!$('#colLeft .acard[data-id="speed"]');
    const chips = $$('.agent-strip .achip.agency').map(c => c.textContent.replace(/\s/g, ""));
    const fold = $$("#traceList .agency-fold").length, foldText = $$("#traceList .agency-fold").map(x => x.textContent).join(" | ");
    $("#traceList .agency-fold [data-act='trace-agency']").click();
    const unfolded = $$("#traceList .agency-fold").length === fold - 1 && !!$("#traceList .agency-unfold");
    ak.openAgent("speed");
    await wait(10);
    const pick = $("#agencyPick");
    const before = pick.value;
    pick.value = "looking";
    pick.dispatchEvent(new pw.Event("change", { bubbles: true }));
    await wait(10);
    const moved = ak.soc().agencies.find(g => g.id === "looking").members.indexOf("speed") >= 0 && ak.soc().agencies.find(g => g.id === "moving").members.indexOf("speed") < 0;
    return folded && opened && cards && chips.indexOf("🧠Experts4") >= 0 && chips.some(c => /Choosers13/.test(c)) && fold >= 4 && /Choosers: 13 agents answered/.test(foldText) && /Experts: 4 agents answered/.test(foldText) && unfolded && before === "moving" && moved && !errors.length;
  });
}
