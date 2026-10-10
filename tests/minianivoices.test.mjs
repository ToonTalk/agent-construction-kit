// The Mini-Ani with AI voices (1.15.0): the same programs, with AI agents where words are needed. Language goes to
// models (the AI Animator, the Reader, the Narrator) and to You; weighing, planning and drawing stay with programs.
// These run on the scripted stand-ins: what live models do with it is still to be seen.
import { createHash } from "node:crypto";

export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Runtime, Scenarios, Adapters, Library } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const at = (r, id, round) => acts(r, id).find(e => e.round === round);
  const agent = (s, id) => s.agents.find(a => a.id === id);
  const story = async (setup, opts) => {
    const s = Seeds.makeMiniAniVoices();
    if (setup) setup(s);
    const o = opts || {};
    const api = Engine.createRun(s, { adapter: o.adapter || pretend, runtime: Runtime, seed: 1 });
    const st = s.starts[o.start || 0];
    api.start({ to: st.to, text: st.value });
    await api.play();
    for (let i = 0; i < 10 && api.run.status === "waiting"; i++) { api.answer(o.answer || ""); await api.play(); }
    return api.run;
  };
  let plain = null;
  const ran = () => (plain = plain || story());
  const cpRun = async (messages, params) => {   // the Choice Points program on its own, with some of its params changed
    const L = Library.LIB["ani-choice-points"];
    const r = await Runtime.runProgram(L.js, { from: "x", text: "", data: {}, messages }, { params: Object.assign({}, L.params, params || {}), seed: 1 });
    if (!r.ok) throw new Error(r.error);
    return r.output;
  };
  const scene = name => ({ from: "Cast", text: "", data: { scene: 1, of: 1, title: "A scene.", cast: [name], called: {}, choose: [{ name, words: [] }], onStage: [name], relations: [], friends: [], events: [] } });
  const shy = name => ({ from: "Personality", text: "", data: { suggestions: [{ who: name, word: "shy", kind: "own", from: "", says: "a bit slow" }] } });

  T.test("Mini-Ani with AI voices: a second example, the same eight programs and Renderer plus an AI Animator, You, a Narrator and a Reader, whose rule is on and whose start is “Your own story, in your own words”", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeMiniAniVoices();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    for (const a of s.agents.filter(x => x.kind === "program")) {
      const bad = (await Scenarios.runScenarios(a, Runtime)).filter(x => !x.ok);
      if (bad.length) throw new Error(a.id + ": " + JSON.stringify(bad[0]).slice(0, 400));
    }
    const rule = id => s.rules.find(r => r.id === id);
    const models = s.agents.filter(a => a.kind === "model").map(a => a.id);
    const plainOne = Seeds.makeMiniAni();
    return Seeds.EXAMPLES.some(x => x.id === "miniani-voices") && same(models, ["reader", "animator", "person", "narrator"]) && agent(s, "person").human === true &&
      agent(s, "animator").pretend === "animator" && agent(s, "animator").history === "stateless" && agent(s, "reader").pretend === "reader" && agent(s, "narrator").collect && agent(s, "narrator").wait === 20 &&
      rule("v6").from === "reader" && rule("v6").to === "cast" && rule("v6").enabled !== false && rule("v1").when === "text" && rule("v1").word === "suggest values" &&
      rule("v3").enabled === false && rule("v4").enabled === false && rule("v7").field === "understood" && rule("v7").value === "false" &&
      s.starts[1].to === "reader" && s.starts[1].label === "Your own story, in your own words" && s.variants.map(v => v.id).join() === "you,only-ai" && s.variants.every(v => !v.on) &&
      s.agents.filter(a => a.kind === "program").every(a => a.code.js === Library.LIB[a.typeId].js) && s.link.url === plainOne.link.url && s.intro.length < 420 &&
      !plainOne.agents.some(a => a.kind === "model") && plainOne.rules.every(r => /^m\d+$/.test(r.id));
  });
  T.test("Mini-Ani with AI voices: the programs-only Mini-Ani says exactly what it said in 1.15.1 (every agent's words, data and Logo in the default run)", ["Engine"], async () => {
    const s = Seeds.makeMiniAni();
    const api = Engine.createRun(s, { runtime: Runtime, seed: 5 });
    api.start({ to: s.starts[0].to, text: s.starts[0].value });
    await api.play();
    const all = JSON.stringify(api.run.trace.filter(e => e.kind === "activation" && !e.collecting).map(e => [e.agentId, e.round, e.response && e.response.text, e.response && e.response.data, e.render && e.render.program, e.error || null]));
    return createHash("sha256").update(all).digest("hex").slice(0, 12) === "a754d52e34a2";   // recorded from 1.15.1 (1.14.0 and 1.15.0 said 113b57f29d36: 1.15.1 says why first, names an unknown word once, and Relationships compares in other words)
  });
  T.test("Mini-Ani with AI voices: the AI Animator is asked only when someone's values are chosen (scenes 1, 3 and 4), and its lines are among the Choice Points' reasons", ["Engine"], async () => {
    const r = await ran();
    const anim = acts(r, "animator"), cp1 = at(r, "choice-points", 1).response.data;
    return r.status === "done" && same(anim.map(e => e.round), [1, 3, 4]) && /^Cinderella: very small, bright, drawn to friends, fast\nthe Stepmother: /.test(anim[0].response.text) &&
      /^Cinderella after: /.test(anim[1].response.text) && cp1.why.Cinderella.size.because.indexOf("AI Animator") >= 0 && cp1.why.Stepmother.warmth.because.indexOf("AI Animator") >= 0 &&
      acts(r, "renderer").length === 4 && acts(r, "cast").pop().response.text === "The end.";
  });
  T.test("Mini-Ani with AI voices: an AI line weighs {=ai} times its strength, so its “fast” against shy and graceful meets them in the middle; at 3 it would win", ["Engine"], async () => {
    const cp1 = at(await ran(), "choice-points", 1).response.data;
    const ai = { from: "AI Animator", text: "Ann: very fast", data: {} };
    const two = await cpRun([scene("Ann"), shy("Ann"), ai], { explain: "Ann" }), three = await cpRun([scene("Ann"), shy("Ann"), ai], { explain: "Ann", ai: 3 });
    return cp1.why.Cinderella.speed.value === "medium speed" && /slow and fast met in the middle/.test(cp1.why.Cinderella.speed.how) &&
      two.why.Ann.speed.value === "medium speed" && three.why.Ann.speed.value === "fast" && Library.LIB["ani-choice-points"].params.ai === 2;
  });
  T.test("Mini-Ani with AI voices: a word the AI Animator uses that the Choice Points don't know is named, and only a line's first 4 suggestions count", ["Engine"], async () => {
    const say = at(await ran(), "choice-points", 1).response.text;
    const five = await cpRun([scene("Ann"), { from: "AI Animator", text: "Ann: slow, small, dim, warm, fancy", data: {} }]);
    return /\*\*I couldn't read:\*\* “sparkly” \(AI Animator\)\./.test(say) && five.why.Ann.detail.value === "medium detail" && five.why.Ann.warmth.value === "warm" &&
      /\*\*Not used\*\* \(only lines about someone being chosen now count, and only their first 4 suggestions\): “fancy” \(AI Animator\)\./.test(five.say);
  });
  T.test("Mini-Ani with AI voices: “You suggest too” waits for your lines once for each choosing, and your line counts {=you}: “very fast” outvotes shy", ["Engine", "Seeds"], async () => {
    const r = await story(s => Society.applyVariant(s, "you", true), { answer: "Cinderella: very fast" });
    const yours = acts(r, "person"), cp1 = at(r, "choice-points", 1).response.data;
    return r.status === "done" && same(yours.map(e => e.round), [1, 3, 4]) && yours.every(e => e.byYou && e.fired[0].toName === "Choice Points") && /suggest values/.test(yours[0].message.text) &&
      cp1.why.Cinderella.speed.value === "fast" && cp1.why.Cinderella.speed.because.indexOf("You") >= 0 && at(r, "choice-points", 3).response.data.why["Cinderella after"].speed.because.indexOf("You") >= 0;
  });
  T.test("Mini-Ani with AI voices: the Narrator collects the Method Chooser's four plans and speaks once, after “The end.”", ["Engine"], async () => {
    const r = await ran();
    const n = acts(r, "narrator"), end = r.trace.indexOf(acts(r, "cast").pop());
    return n.length === 1 && n[0].message.messages.length === 4 && n[0].message.messages.every((m, i) => m.from === "Method Chooser" && m.text.indexOf("**Scene " + (i + 1) + "'s plan:**") === 0) &&
      r.trace.indexOf(n[0]) > end && /^I'm a pretend agent/.test(n[0].response.text);
  });
  T.test("Mini-Ani with AI voices: your own story goes to the Reader, whose sentences the Cast reads: three scenes, each a film", ["Engine"], async () => {
    const r = await story(null, { start: 1 });
    const reader = acts(r, "reader"), c1 = acts(r, "cast")[0];
    return r.status === "done" && reader.length === 1 && /^Pip is shy and kind\.\nTom is mean and grumpy\.\nOla is good and magical\.\nTom dominates Pip\. Ola helps Pip\.\nScene 1: Tom dominates Pip\./.test(reader[0].response.text) &&
      same(c1.response.data.cast, ["Pip", "Tom", "Ola"]) && c1.response.data.of === 3 && acts(r, "renderer").length === 3 && acts(r, "renderer").every(e => !e.render.error && e.render.frames > 1) &&
      same(acts(r, "animator").map(e => e.round), [2, 4]);
  });
  T.test("Mini-Ani with AI voices: a story the Cast can't read goes back to the Reader with the Cast's complaint, and the next try is read afresh", ["Engine"], async () => {
    let tries = 0;
    const clumsy = { id: "pretend", label: "Pretend, with a clumsy first Reader", async call(req) {
      if (req.meta && req.meta.persona === "reader" && tries++ === 0) return { text: "Here is the story about Pip.", raw: "Here is the story about Pip.", data: {}, model: "pretend", ms: 1 };
      return pretend.call(req);
    } };
    const r = await story(null, { start: 1, adapter: clumsy });
    const reader = acts(r, "reader"), cast = acts(r, "cast");
    return r.status === "done" && reader.length === 2 && cast[0].response.data.understood === false && cast[0].fired.length === 1 && cast[0].fired[0].ruleId === "v7" &&
      /There are no scenes in the story/.test(reader[1].message.text) && reader[1].call.messages.length === 3 && cast[1].response.data.scene === 1 && same(cast[1].response.data.cast, ["Pip", "Tom", "Ola"]) &&
      acts(r, "renderer").length === 3;
  });
  T.test("Mini-Ani with AI voices: “Only the AI Animator suggests” asks no Personality, Looks or Relationships, and the AI's looks count as looks, so no 1978 shapes", ["Engine", "Seeds"], async () => {
    const r = await story(s => Society.applyVariant(s, "only-ai", true));
    const cp1 = at(r, "choice-points", 1).response.data;
    return r.status === "done" && ["personality", "looks", "relationships"].every(id => acts(r, id).length === 0) && same(cp1.looksFrom, ["AI Animator"]) &&
      !/as Ken drew them in 1978/.test(at(r, "director", 1).response.text) && acts(r, "renderer").length === 4;
  });
  T.test("Mini-Ani with AI voices: it needs a model, so with none set up, Run asks for one first", ["Seeds"], async () => {
    const { w: pw } = await pageWindow();
    const ak = pw.__ak;
    ak.app.settings.connection = "none"; ak.app.settings.speed = "instant";
    pw.document.querySelector('[data-act="new-society"]').click();
    Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="miniani-voices"]').click();
    await new Promise(r => setTimeout(r, 30));
    const voices = ak.soc();
    const refused = (await ak.runNow()) == null && !ak.app.runs[voices.id];
    Array.from(pw.document.querySelectorAll(".modal-back")).forEach(x => x.remove());
    return voices.title === "Mini-Ani with AI voices" && voices.id === "miniani-voices" && refused;
  });
  T.test("＋ New society: making the Mini-Ani again doesn't count the Mini-Ani with AI voices as a copy of it", ["Seeds"], async () => {
    const { w: pw } = await pageWindow();
    const ak = pw.__ak;
    ak.app.settings.connection = "pretend"; ak.app.settings.speed = "instant";
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const choose = async id => { pw.document.querySelector('[data-act="new-society"]').click(); Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="' + id + '"]').click(); await sleep(30); };
    await choose("miniani");
    ak.soc().question = "Changed";
    await choose("miniani-voices");
    await choose("miniani");
    const m = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const q = m.querySelector(".confirm-text").textContent;
    Array.from(m.querySelectorAll("[data-choice]")).find(b => b.textContent === "Go back to my changed one").click();
    await sleep(30);
    return /You changed the Mini-Ani you made from this example/.test(q) && ak.soc().id === "miniani" && ak.app.order.filter(id => /^miniani/.test(id)).length === 2;
  });
}
