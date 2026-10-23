// The knowledge-writer (1.18.0): a model suggests a line for a Mini-Ani program's empty line, from the words its readers
// know; a person puts it in, or not, and the line remembers who suggested it.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Runtime, Scenarios, Teach, Adapters } = w.AK;
  const agent = (s, id) => s.agents.find(a => a.id === id);
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const play = async s => { const api = Engine.createRun(s, { runtime: Runtime, seed: 1 }); api.start({ to: s.starts[0].to, text: s.starts[0].value }); await api.play(); return api.run; };

  T.test("Teach: each kind of program is shown its own lines and may use only what its readers know", ["Teach"], () => {
    const s = Seeds.makeMiniAni(), v = id => Teach.teachVocab(agent(s, id), s).words;
    const req = Teach.teachRequest(agent(s, "relationships"), s, "helps");
    return Teach.teachKind(agent(s, "choice-points")) === "" && Teach.teachKind(agent(s, "looks")) === "expert" &&
      v("personality").indexOf("slow") >= 0 && v("personality").indexOf("big") < 0 && v("looks").indexOf("big") >= 0 && v("looks").indexOf("slow") < 0 &&
      v("relationships").indexOf("faster") >= 0 && v("relationships").indexOf("same speed") >= 0 && same(v("methods"), Teach.METHOD_WAYS) &&
      /dominates suggests faster, livelier, above, bigger than the other one/.test(req.system) && /for the word “helps”/.test(req.system) && req.meta.persona === "teacher" && req.replyKind === "prose";
  });
  T.test("Teach: a reply becomes a line for the first empty line; words its readers don't know are left out and named", ["Teach"], () => {
    const s = Seeds.makeMiniAni(), rel = agent(s, "relationships"), looks = agent(s, "looks"), m = agent(s, "methods");
    const a = Teach.parseTeach(rel, s, "helps", "Helps suggests a bit same speed, very drawn to friends, slower and higher up than the other one.\nHelpers stay close.");
    const b = Teach.parseTeach(looks, s, "brave", "**brave suggests very big, bright, heroic, warm, smooth, fancy**");
    const c = Teach.parseTeach(m, s, "obeys", "obeys: goes along, flies away");
    const d = Teach.parseTeach(looks, s, "brave", "Brave people are heroic.");
    return a.ok && same(a.values, { r3: "helps", c3: "a bit same speed, slower" }) && same(a.dropped, ["very drawn to friends", "higher up"]) && a.why === "Helpers stay close." &&
      b.ok && same(b.kept, ["very big", "bright", "warm", "smooth"]) && b.values.w10 === "brave" && c.ok && same(c.values, { other: "obeys", otherWays: "goes along" }) && same(c.dropped, ["flies away"]) &&
      !d.ok && /None of its suggestions/.test(d.why);
  });
  T.test("Teach: a word it knows, or no empty line left, is said before any model is asked; a known word with no way fills that way", ["Teach"], () => {
    const s = Seeds.makeMiniAni(), old = Seeds.makeMiniAni1978(), p = agent(s, "personality");
    Society.setParams(p, { w10: "brave", s10: "fast", w11: "calm", s11: "calm" });
    const m78 = agent(old, "methods");
    return /already knows “shy”/.test(Teach.teachSlot(p, "shy").why) && /no empty line left/.test(Teach.teachSlot(p, "bold").why) &&
      same(Teach.teachSlot(m78, "shy"), { word: null, ways: "shyWays" }) && same(Teach.teachSlot(m78, "obeys"), { word: "other", ways: "otherWays" }) &&
      /already has a way/.test(Teach.teachSlot(agent(s, "methods"), "meets").why);
  });
  T.test("Teach: the Pretend Teacher's line goes in, and it remembers who suggested it, through export and import, until it is changed by hand", ["Teach", "Pretend"], async () => {
    const s = Seeds.makeMiniAni(), rel = agent(s, "relationships");
    const r = await Adapters.makeAdapter({ connection: "pretend", models: {}, keys: {} }).call(Teach.teachRequest(rel, s, "helps"));
    const p = Teach.parseTeach(rel, s, "helps", r.text);
    Teach.acceptTeach(rel, p, "Pretend Teacher");
    const errs = Society.validateSociety(s), back = agent(Society.importSociety(Society.exportSociety(s, null)).society, "relationships");
    const kept = back.taught && back.taught[0].word === "helps" && back.taught[0].by === "Pretend Teacher" && back.params.r3 === "helps" && /\{helps\} suggests \{a bit faster\}/.test(back.pseudocode);
    const fresh = !Teach.taughtNow(back)[0].changed;
    Society.setParams(back, { c3: "same speed" });
    return p.ok && same(p.dropped, ["sparkly"]) && !errs.length && kept && fresh && Teach.taughtNow(back)[0].changed && (await Scenarios.runScenarios(back, Runtime)).every(x => x.ok);
  });
  T.test("Teach: words the last run didn't know are offered, only to the program that could hold them", ["Teach", "Engine"], async () => {
    const s = Seeds.makeMiniAni1978(), r = await play(s);
    return same(Teach.teachWordsFrom(agent(s, "relationships"), r.trace), ["helps"]) && same(Teach.teachWordsFrom(agent(s, "methods"), r.trace), ["shy", "dominates", "obeys"]) &&
      same(Teach.teachWordsFrom(agent(s, "personality"), r.trace), ["shabby", "selfish", "pretty", "magical"]);
  });
  T.test("Teach: in Mini-Ani, as in 1978, teaching the Method Chooser “obeys” and Relationships “helps” changes the film, and the invitations shrink", ["Teach", "Engine"], async () => {
    const s = Seeds.makeMiniAni1978(), m = agent(s, "methods"), rel = agent(s, "relationships");
    Teach.acceptTeach(m, Teach.parseTeach(m, s, "obeys", "obeys: goes along"), "a test");
    Teach.acceptTeach(rel, Teach.parseTeach(rel, s, "helps", "helps suggests a bit same speed"), "a test");
    const r = await play(s), m1 = acts(r, "methods").find(e => e.round === 1).response, cp = acts(r, "choice-points").find(e => e.round === 1).response.text;
    return /Cinderella goes along with the Stepmother \(obeys/.test(m1.text) && same(m1.data.untaught, ["shy", "dominates"]) && !/helps \(the Godmother\)/.test(cp) && /No expert knows these words yet/.test(cp) &&
      acts(r, "renderer").length === 5 && !r.trace.some(e => e.error);
  });
  T.test("page: an expert's editor offers the words the last run didn't know; the model's line is shown, and goes in only when asked", ["Teach"], async () => {
    const { w: pw, errors } = await pageWindow();
    const ak = pw.__ak, wait = ms => new Promise(r => setTimeout(r, ms));
    ak.app.settings.connection = "pretend"; ak.app.settings.speed = "instant";
    pw.document.querySelector('[data-act="new-society"]').click();
    Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="miniani-1978"]').click();
    await wait(30);
    await ak.runNow();
    ak.openAgent("relationships");
    await wait(10);
    const box = () => pw.document.querySelector(".teach");
    const chips = Array.from(box().querySelectorAll('[data-act="teach-word"]')).map(b => b.textContent);
    box().querySelector('[data-act="teach-word"]').click();
    for (let i = 0; i < 50 && !(box() && box().querySelector(".proposal")); i++) await wait(10);
    const shown = box().querySelector(".proposal").textContent, rel = ak.soc().agents.find(a => a.id === "relationships"), before = rel.params.r3;
    box().querySelector('[data-act="teach-accept"]').click();
    for (let i = 0; i < 50 && rel.params.r3 === "-"; i++) await wait(10);
    await wait(30);
    return same(chips, ["helps"]) && /^Scripted stand-ins suggests: helps suggests a bit faster than the other one/.test(shown) && /Left out, because the Choice Points don't know them: sparkly/.test(shown) && before === "-" &&
      rel.params.r3 === "helps" && rel.taught[0].by === "Scripted stand-ins" && /Taught with a model's help: helps \(suggested by Scripted stand-ins/.test(box().textContent) && !box().querySelector(".proposal") &&
      ak.app.log[ak.soc().id].some(x => x.kind === "teach" && x.status === "ok") && !errors.length;
  });
}
