// Secret Number and Lost and Found, scenarios that follow an agent's settings, and the test bench for Eyes.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios, Bench } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const run = async (soc, spec) => { const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); r.start(spec); await r.play(); return r.run; };
  const texts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id).map(e => (e.response ? e.response.text : "ERROR " + e.error));
  const secret = (variants) => { const s = Seeds.makeSecretNumber(); s.random.on = false; for (const v of variants || []) Society.applyVariant(s, v, true); return s; };
  const lost = () => Seeds.makeLostAndFound();
  const start = s => ({ to: s.starts[0].to, text: s.starts[0].value });

  for (const mk of [Seeds.makeSecretNumber, Seeds.makeLostAndFound]) {
    const s = mk();
    T.test(s.title + ": look inside finds only ordinary agents and rules, and every program passes its scenarios", ["Seeds", "Society", "Scenarios"], async () => {
      const errs = Society.validateSociety(s);
      if (errs.length) throw new Error(errs.join("; "));
      for (const a of s.agents.filter(x => x.kind === "program")) {
        const bad = (await Scenarios.runScenarios(a, Runtime)).filter(r => !r.ok);
        if (bad.length) throw new Error(a.name + ": " + JSON.stringify(bad[0]));
      }
      return s.intro.length > 40 && s.questions.length >= 3;
    });
  }

  // Scenarios written against the agent's settings
  T.test("scenarios: “=name” and “{=name}” stand for an agent's setting, with + and - too", ["Scenarios"], () => {
    const P = { secret: 37, counts: [1, 2] };
    const W = Scenarios.withParams;
    return W("=secret", P) === 37 && W("=secret+1", P) === 38 && W("=secret - 2", P) === 35 && same(W("=counts+1", P), [2, 3]) &&
      W("I think {=secret}!", P) === "I think 37!" && W("{=counts}", P) === "1, 2" && W("=nothing", P) === "=nothing" && same(W({ a: ["=secret"] }, P), { a: [37] });
  });
  T.test("scenarios: rows made from a setting can be flipped, grown, or given screen heights", ["Scenarios"], () => {
    const R = (spec) => Scenarios.rowsFromSecret(spec, { counts: [1, 2, 3], secret: [4] });
    const n = rows => rows.map(r => r.colors.length);
    return same(n(R({ param: "counts" })), [1, 2, 3]) && same(n(R({ param: "counts", flip: true })), [3, 2, 1]) && same(n(R({ add: 1 })), [5]) &&
      same(R({ param: "counts", y0: 216, yStep: 40 }).map(r => r.y), [216, 256, 296]);
  });
  T.test("scenarios: change the Row Judge's slots and its scenarios still mean the same and still pass", ["Scenarios", "Library"], async () => {
    const s = Seeds.makePebbles();
    Society.applyChallenge(s, "row4");
    const j = Society.agentById(s, "judge");
    Society.setParams(j, { rowsNeeded: 6, dotsNeeded: 9 });
    const res = await Scenarios.runScenarios(j, Runtime);
    return res.length === 5 && res.every(r => r.ok) && res[0].input.data.rows === 6 && res[0].input.data.cols === 9;
  });

  // Secret Number
  T.test("Secret Number: with no notebook and no memory, the Guesser wanders and never finds 37", ["Seeds", "Engine"], async () => {
    const r = await run(secret(), start(secret()));
    const g = texts(r, "guesser");
    return g.length === 10 && texts(r, "keeper").indexOf("yes!") < 0 && new Set(g).size < g.length;
  });
  T.test("Secret Number: with the Notebook on, the same Guesser finds it in at most 7 guesses", ["Seeds", "Engine", "Society"], async () => {
    const s = secret(["notebook"]);
    const r = await run(s, start(s));
    const k = texts(r, "keeper");
    return k[k.length - 1] === "yes!" && k.length <= 7 && /It is between 1 and 49\./.test(texts(r, "notebook")[0]);
  });
  T.test("Secret Number: “the Guesser remembers” switches its memory, and then it finds it too", ["Seeds", "Engine", "Society"], async () => {
    const s = secret(["remember"]);
    const was = Society.agentById(s, "guesser").history;
    const r = await run(s, start(s));
    const k = texts(r, "keeper");
    Society.applyVariant(s, "remember", false);
    return was === "full" && Society.agentById(s, "guesser").history === "stateless" && k[k.length - 1] === "yes!" && k.length <= 7;
  });
  T.test("Secret Number: a new secret every run, from 1 to 100, shown in the Keeper's pseudocode", ["Society", "Scenarios"], async () => {
    const s = Seeds.makeSecretNumber();
    const n = Society.newSecret(s, () => 0.5);
    const keeper = Society.agentById(s, "keeper");
    const res = await Scenarios.runScenarios(keeper, Runtime);
    s.random.on = false;
    return n === 51 && keeper.params.secret === 51 && /\{51\}/.test(keeper.pseudocode) && res.every(r => r.ok) && Society.newSecret(s, () => 0.1) === null;
  });
  T.test("Secret Number: the society's secret and its variants survive export and import", ["Society"], () => {
    const s = Seeds.makeSecretNumber();
    Society.applyVariant(s, "remember", true);
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return back.random.agent === "keeper" && back.random.hi === 100 && back.random.count === 1 && back.variants.find(v => v.id === "remember").set[0].on === "full" && Society.agentById(back, "guesser").history === "full";
  });

  // Lost and Found
  const find = async label => { const s = lost(); const r = await run(s, { to: "renderer", text: "PENUP LABEL [" + label + "]" }); return { r, said: id => texts(r, id) }; };
  T.test("Lost and Found: a rule can list several words, and any of them sends the thing to that shelf", ["Engine", "Seeds"], async () => {
    const { said } = await find("a red hat");
    return same(said("finder"), ["a red hat"]) && /^Got: a red hat\. This shelf has 1 thing now\.$/.test(said("clothes")[0]) && said("toys").length === 0 && same(said("mystery-box"), [""]);
  });
  T.test("Lost and Found: “a hat on a dog” goes to two shelves at once", ["Engine", "Seeds"], async () => {
    const { said } = await find("a hat on a dog");
    return said("clothes").length === 1 && said("animals").length === 1 && said("tools").length === 0;
  });
  T.test("Lost and Found: a teapot goes nowhere, so the Mystery Box takes it", ["Engine", "Seeds"], async () => {
    const { said } = await find("a teapot");
    return ["toys", "clothes", "animals", "tools"].every(id => said(id).length === 0) && same(said("mystery-box"), ["Nobody else took it: a teapot."]);
  });
  T.test("Lost and Found: “two dogs” goes to Animals AND the Mystery Box, because a rule finds “dog” inside “dogs” and the program doesn't", ["Engine", "Seeds"], async () => {
    const { said } = await find("two dogs");
    return said("animals").length === 1 && /Nobody else took it/.test(said("mystery-box")[0]);
  });

  // The test bench
  T.test("test bench: the five pictures draw exactly the dots their answers say", ["Runtime"], async () => {
    for (const pic of Bench.PICTURES) {
      const r = await Runtime.runTurtle(pic.program, { seed: 1 });
      const dots = r.ok ? r.output.dots.length : -1;
      if (dots !== pic.counts.reduce((a, b) => a + b, 0)) throw new Error(pic.id + " drew " + dots + " dots" + (r.ok ? "" : ": " + r.error));
    }
    return Bench.PICTURES.length === 5;
  });
  T.test("test bench: an answer is right when every field matches; rows listed bottom first are fine", ["Engine"], () => {
    const pic = Bench.PICTURES.find(p => p.id === "staggered");
    const rows = n => n.map(k => ({ y: 0, colors: Array(k).fill("black") }));
    return Bench.check(pic, { rowList: rows([5, 2, 7]) }, ["rowList"]).ok && Bench.check(pic, { rowList: rows([7, 2, 5]) }, ["rowList"]).ok &&
      !Bench.check(pic, { rowList: rows([5, 3, 7]) }, ["rowList"]).ok && Bench.check(pic, { rowList: rows([5, 2, 7]) }, ["rowList"]).answer === "3 rows: 5, 2, 7" &&
      Bench.check(Bench.PICTURES[0], { rows: 3, cols: 5 }, ["rows", "cols"]).ok && !Bench.check(Bench.PICTURES[0], { rows: 5, cols: 3 }, ["rows", "cols"]).ok;
  });
  T.test("test bench: Pebble's Eyes looks at every picture, as many times as asked", ["Engine", "Adapters"], async () => {
    const eyes = Society.agentById(Seeds.makePebbles(), "eyes");
    const seen = [];
    const res = await Bench.run(eyes, { adapter: pretend, runtime: Runtime, times: 2, onResult: r => seen.push(r) });
    return Bench.benchable(eyes) && !Bench.benchable(Society.agentById(Seeds.makePebbles(), "designer")) && res.length === 10 && seen.length === 10 &&
      res.every(r => !r.error && r.call && r.call.system) && res.find(r => r.picture === "grid-3x5").ok;
  });

  // In the page
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  T.test("page: Secret Number shows its secret switch and both variants on the stage", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="secret"]').click();
    const st = pw.document.querySelector(".stage");
    return st.querySelectorAll('[data-bind="variant"]').length === 2 && !!st.querySelector('[data-bind="new-secret"]') && /picks a new secret/.test(st.textContent);
  });
  T.test("page: ＋ Save as a scenario keeps a programmed agent's turn as a test, and it passes", ["Scenarios"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="secret"]').click();
    const s = pw.__ak.soc();
    s.random.on = false;
    s.roundLimit = 2;
    await pw.__ak.runNow();
    await sleep(40);
    const keeperEntry = Array.from(pw.document.querySelectorAll('[data-act="trace-toggle"]')).find(b => /Keeper/.test(b.textContent));
    keeperEntry.click();
    const btn = pw.document.querySelector('[data-act="save-scn-from"]');
    if (!btn) throw new Error("no Save as a scenario button");
    btn.click();
    await sleep(60);
    const keeper = s.agents.find(a => a.id === "keeper");
    const m = pw.document.querySelector(".modal-body");
    return keeper.scenarios.length === 7 && /^from round 1/.test(keeper.scenarios[6].name) && keeper.scenarios[6].expect.say === "lower" && keeper.results.every(r => r.ok) && !!m && m.querySelectorAll(".scn.ok").length === 7;
  });
  T.test("page: the Eyes editor has a test bench that runs and logs its calls in the Workshop", ["Engine"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="pebbles"]').click();
    pw.__ak.openAgent("eyes");
    const sel = pw.document.querySelector('[data-bind="bench-times"]');
    sel.value = "1";
    sel.dispatchEvent(new pw.Event("change", { bubbles: true }));
    pw.document.querySelector('[data-act="bench-run"]').click();
    for (let i = 0; i < 100 && !pw.document.querySelector('[data-act="bench-run"]'); i++) await sleep(30);
    const m = pw.document.querySelector(".modal-body");
    const log = pw.__ak.app.log.pebbles || [];
    if (!(/right \d of 5/.test(m.textContent) && m.querySelectorAll(".bench-ans").length === 5 && log.filter(x => x.kind === "bench").length === 5)) throw new Error(m.textContent.slice(0, 900) + " LOG " + JSON.stringify(log.map(x => [x.kind, x.status, x.error])));
    return true;
  });
}
