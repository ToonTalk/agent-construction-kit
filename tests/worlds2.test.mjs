// Secret Number and Lost and Found, scenarios that follow an agent's settings, and the test bench for Eyes.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios, Bench, Helper } = w.AK;
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
  T.test("Secret Number: with no notebook and no memory, the Guesser wanders and never finds 83", ["Seeds", "Engine"], async () => {
    const r = await run(secret(), start(secret()));
    const g = texts(r, "guesser");
    return g.length === 10 && texts(r, "keeper").indexOf("yes!") < 0 && new Set(g).size < g.length;
  });
  T.test("Secret Number: with the Notebook on, the same Guesser finds it in at most 7 guesses", ["Seeds", "Engine", "Society"], async () => {
    const s = secret(["notebook"]);
    const r = await run(s, start(s));
    const k = texts(r, "keeper");
    return Society.agentById(s, "keeper").params.secret === 83 && k[k.length - 1] === "yes!" && k.length === 7 && k.length > 3 && /It is between 51 and 100\./.test(texts(r, "notebook")[0]);
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
    return keeper.scenarios.length === 7 && /^from round 1/.test(keeper.scenarios[6].name) && keeper.scenarios[6].expect.say === "higher" && keeper.results.every(r => r.ok) && !!m && m.querySelectorAll(".scn.ok").length === 7;
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

  // 1.0.6: Logo's day-one bug, a model for each agent, a stage without pictures
  T.test("Logo: a blank picture from a command that was taught but never used says so", ["Logo"], async () => {
    const a = await Runtime.runTurtle("TO DOG\n  REPEAT 4 [FORWARD 50 RIGHT 90]\nEND", { seed: 1 });
    const b = await Runtime.runTurtle("TO DOG\n  REPEAT 4 [FORWARD 50 RIGHT 90]\nEND\nDOG", { seed: 1 });
    const c = await Runtime.runTurtle("TO DOG\n  FORWARD 10\nEND\nTO CAT\n  FORWARD 10\nEND", { seed: 1 });
    const d = await Runtime.runTurtle("TO DOG\n  FORWARD 10\nEND\nFORWARD 50", { seed: 1 });
    return a.ok && a.note === "You taught the turtle DOG but never asked it to draw DOG. Add a line that says DOG after the END." && b.ok && !b.note && /DOG and CAT but never asked it to draw them/.test(c.note) && d.ok && !d.note;
  });
  T.test("Logo: the Renderer passes that hint on with its picture", ["Engine", "Logo"], async () => {
    const r = await run(Seeds.makeTelephone(), { to: "renderer", text: "TO DOG\n  FORWARD 50\nEND" });
    const e = r.trace.find(x => x.kind === "activation" && x.agentId === "renderer");
    return /never asked it to draw DOG/.test(e.response.text) && /never asked/.test(e.render.note) && e.response.data.pass === true;
  });
  T.test("models: an agent can have its own model, and the run uses it for that agent only", ["Engine", "Adapters"], async () => {
    const s = secret();
    s.roundLimit = 1;
    const fake = { id: "fake", label: "A fake model", call: async req => ({ text: "83", raw: "83", data: {}, model: "fake-1", system: req.system }) };
    const r = Engine.createRun(s, { adapter: pretend, adapterFor: a => (a.model === "fake:one" ? fake : null), runtime: Runtime });
    Society.agentById(s, "guesser").model = "fake:one";
    r.start(start(s));
    await r.play();
    const g = r.run.trace.find(e => e.kind === "activation" && e.agentId === "guesser");
    return g.call.adapter === "fake" && g.call.model === "fake-1" && texts(r.run, "keeper")[0] === "yes!";
  });
  T.test("models: short names for each model, and an agent's model survives export", ["Adapters", "Society"], () => {
    const L = Adapters.modelLabel;
    const s = Seeds.makeLostAndFound();
    Society.agentById(s, "finder").model = "gemini:gemini-3.8-flash";
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return L("gemini", "gemini-3.8-flash") === "Gemini 3.8 Flash" && L("nano", "") === "Gemini Nano" && L("keyless", "claude-sonnet-4-6") === "Claude Sonnet 4.6 (keyless)" && L("openai", "gpt-x") === "OpenAI gpt-x" &&
      !/strongest/.test(JSON.stringify(Adapters.MODEL_CHOICES.gemini)) && Society.agentById(back, "finder").model === "gemini:gemini-3.8-flash";
  });
  T.test("Lost and Found: the Finder may say “nothing”, and the Mystery Box leaves it alone; a toy robot still lands there", ["Seeds", "Engine"], async () => {
    const s = lost();
    const r = await run(s, { to: "renderer", text: "PENUP" });
    const t = await find("a toy robot");
    return same(texts(r, "finder"), ["nothing"]) && same(texts(r, "mystery-box"), [""]) && /nothing/.test(Society.agentById(s, "finder").instructions) &&
      t.said("toys").length === 0 && /Nobody else took it: a toy robot/.test(t.said("mystery-box")[0]) && s.questions.some(q => /toy robot/.test(q));
  });
  T.test("Pebble: the Critic is told it's about pebbles", ["Seeds"], () => /pebbles/.test(Society.agentById(Seeds.makePebbles(), "critic").instructions) && !/agents/.test(Society.agentById(Seeds.makePebbles(), "critic").instructions));

  T.test("page: with one model there's no model menu; add a second and each AI agent can choose", ["Adapters"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="lost"]').click();
    pw.__ak.openAgent("finder");
    const before = !pw.document.querySelector('[data-bind="agent-model"]') && !pw.document.querySelector(".achip .mdl");
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.app.settings.keys.gemini = "test-key";
    pw.__ak.openAgent("finder");
    const sel = pw.document.querySelector('[data-bind="agent-model"]');
    sel.value = "gemini:gemini-3.8-flash";
    sel.dispatchEvent(new pw.Event("change", { bubbles: true }));
    await sleep(20);
    const s = pw.__ak.soc();
    const finder = s.agents.find(a => a.id === "finder"), drawer = s.agents.find(a => a.id === "drawer");
    const chips = Array.from(pw.document.querySelectorAll(".achip .mdl")).map(x => x.textContent);
    return before && sel.options.length === 2 && finder.model === "gemini:gemini-3.8-flash" && pw.__ak.adapterFor(finder).id === "gemini" && pw.__ak.adapterFor(drawer).id === "pretend" && chips.indexOf("3.8 Flash") >= 0;
  });
  T.test("page: Settings lists the main model and adds another", ["Adapters"], async () => {
    const { w: pw } = await boot();
    pw.__ak.openSettings();
    const m = () => pw.document.querySelector(".modal-body");
    const pick = m().querySelector('[data-bind="add-conn"]');
    pick.value = "gemini";
    pick.dispatchEvent(new pw.Event("change", { bubbles: true }));
    m().querySelector('[data-act="pick-add-model"][data-model="gemini-3.8-flash"]').click();
    m().querySelector('[data-act="add-extra"]').click();
    const refs = pw.__ak.modelRefs();
    return refs.length === 2 && refs[1].key === "gemini:gemini-3.8-flash" && /More models/.test(m().textContent) && /Gemini 3.8 Flash/.test(m().textContent) && /needs a key/.test(m().textContent);
  });
  T.test("page: Secret Number shows the guesses round by round, with no empty picture, and a box for your own secret", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="secret"]').click();
    const s = pw.__ak.soc();
    s.roundLimit = 3;
    const cb = pw.document.querySelector('[data-bind="new-secret"]');
    cb.checked = false;
    cb.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const box = pw.document.querySelector('[data-bind="society-secret"]');
    box.value = "64";
    box.dispatchEvent(new pw.Event("change", { bubbles: true }));
    await sleep(40);
    await pw.__ak.runNow();
    await sleep(40);
    const st = pw.document.querySelector(".stage");
    const cards = Array.from(st.querySelectorAll(".rcard"));
    return s.agents.find(a => a.id === "keeper").params.secret === 64 && s.random.on === false && !st.querySelector("#stageCanvas") && !st.querySelector(".noimg") && cards.length === 3 && /🙋 50/.test(cards[0].textContent) && /higher/.test(cards[0].textContent);
  });
  T.test("page: the question card says which model suits the world, and warns when the Drawer and the Finder use Gemini Nano", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="lost"]').click();
    const ok = /Something stronger than Gemini Nano/.test(pw.document.querySelector(".qcard").textContent) && !pw.document.querySelector(".qcard .warnline");
    pw.__ak.app.settings.connection = "nano";
    pw.__ak.renderAll();
    const warn = pw.document.querySelector(".qcard .warnline");
    pw.__ak.app.settings.extra = [{ connection: "openai", model: "gpt-6-luna" }];
    for (const a of pw.__ak.soc().agents) if (a.id === "drawer" || a.id === "finder") a.model = "openai:gpt-6-luna";
    pw.__ak.renderAll();
    return ok && !!warn && /The Drawer and the Finder are using Gemini Nano/.test(warn.textContent) && !pw.document.querySelector(".qcard .warnline");
  });
  T.test("Pebble: Eyes is told to ignore lines, as the Judge and Dot Counter do", ["Seeds"], () => /Ignore any lines/.test(Society.agentById(Seeds.makePebbles(), "eyes").instructions));
  const startOver = async (pw, forget) => {
    pw.__ak.openSettings();
    pw.document.querySelector('[data-act="reset-all"]').click();
    await sleep(20);
    const dlg = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const box = dlg.querySelector("[data-check]");
    if (forget) { box.checked = true; box.dispatchEvent(new pw.Event("change", { bubbles: true })); }
    dlg.querySelector("[data-yes]").click();
    await sleep(80);
    return { box, text: dlg.textContent };
  };
  T.test("page: Start over keeps the settings unless you tick “Also forget my settings”", ["Store"], async () => {
    const { w: pw } = await boot();
    const st = pw.__ak.app.settings;
    st.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.app.societies.secret.roundLimit = 3;
    const a = await startOver(pw, false);
    const kept = pw.__ak.app.settings.connection === "pretend" && pw.__ak.app.settings.extra.length === 1 && pw.__ak.app.societies.secret.roundLimit === 10 && !!a.box && !a.box.checked && /forget my settings/.test(a.text);
    await startOver(pw, true);
    return kept && pw.__ak.app.settings.connection === "none" && pw.__ak.app.settings.extra.length === 0;
  });
  T.test("rules: send any of the words, the data and the picture; an old “both” means words and data", ["Engine", "Society"], async () => {
    const S = Society;
    const ok = S.normSend("both") === "text+data" && S.normSend("image+text") === "text+image" && S.normSend("") === null && S.sendWords("text+data+image") === "words, data and picture" && S.sendWords("data", true) === "the data";
    const s = Seeds.makeTelephone();
    s.rules.find(r => r.id === "t2").send = "text+data+image";
    s.roundLimit = 1;
    const r = await run(s, { to: "artist", text: "a red circle" });
    const d = r.trace.find(e => e.kind === "activation" && e.agentId === "describer");
    const old = Seeds.makeTelephone();
    old.rules.find(x => x.id === "t3").send = "both";
    const back = S.importSociety(JSON.stringify(old)).society;
    S.migrateSociety(old);
    return ok && /I drew/.test(d.message.text) && !!d.message.renderId && Array.isArray(d.message.data.dots) && back.rules.find(x => x.id === "t3").send === "text+data" && old.rules.find(x => x.id === "t3").send === "text+data" && S.validateSociety(Seeds.makePebbles()).length === 0;
  });
  T.test("page: a rule's SEND is three checkboxes, and it can't send nothing", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="telephone"]').click();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    const box = part => pw.document.querySelector('[data-bind="rule-send"][data-id="t2"][data-part="' + part + '"]');
    const set = (part, on) => { const b = box(part); b.checked = on; b.dispatchEvent(new pw.Event("change", { bubbles: true })); };
    const r = pw.__ak.soc().rules.find(x => x.id === "t2");
    pw.document.querySelector('[data-act="rule-edit"][data-id="t2"]').click();
    const before = box("image").checked && !box("text").checked && !pw.document.querySelector('select[data-field="send"]');
    set("text", true); set("data", true);
    const all = r.send === "text+data+image";
    set("text", false); set("data", false); set("image", false);
    return before && all && r.send === "image" && box("image").checked;
  });
  T.test("Helper: it is told which models are set up, who uses which, and that learners choose them on the stage", ["Helper"], () => {
    const s = Seeds.makeSecretNumber();
    s.agents.find(a => a.id === "guesser").model = "gemini:gemini-3.8-flash";
    const two = Helper.helperRequest(s, [], "how can I change which model powers the agents without using settings?", [], { available: ["Gemini Nano", "Gemini 3.8 Flash"], uses: { guesser: "Gemini 3.8 Flash" } }).messages[0].content;
    const one = Helper.describeModels(s, { available: ["Gemini Nano"], uses: {} });
    return /Models row on the stage/.test(two) && /Guesser uses Gemini 3\.8 Flash/.test(two) && /More models/.test(one) && /Models row on the stage/.test(Helper.HELPER_SYSTEM) && /Never say something can't be done/.test(Helper.HELPER_SYSTEM);
  });
  T.test("page: with two models, the stage has a Models row where each AI agent's model is chosen", ["Adapters"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="lost"]').click();
    const none = !pw.document.querySelector(".models-row");
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.renderAll();
    const picks = pw.document.querySelectorAll('.models-row [data-bind="stage-model"]');
    const finderPick = pw.document.querySelector('[data-bind="stage-model"][data-id="finder"]');
    finderPick.value = "gemini:gemini-3.8-flash";
    finderPick.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const finder = pw.__ak.soc().agents.find(a => a.id === "finder");
    const set = finder.model === "gemini:gemini-3.8-flash";
    const back = pw.document.querySelector('[data-bind="stage-model"][data-id="finder"]');
    back.value = back.options[0].value;
    back.dispatchEvent(new pw.Event("change", { bubbles: true }));
    return none && picks.length === 2 && set && !finder.model;
  });
  T.test("page: with a stronger model set up, the Nano warning points to the Models row, not Settings", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="lost"]').click();
    pw.__ak.app.settings.connection = "nano";
    pw.__ak.renderAll();
    const alone = pw.document.querySelector(".qcard .warnline").textContent;
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.renderAll();
    const two = pw.document.querySelector(".qcard .warnline").textContent;
    return /grown-up can add/.test(alone) && /Models row on the stage/.test(two) && !/Settings/.test(two);
  });
  T.test("page: an agent's editor shows who can send it messages, as agent buttons, and its own rules, editable there", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="telephone"]').click();
    pw.__ak.openAgent("artist");
    const m = () => pw.document.querySelector(".modal-body");
    const senders = Array.from(m().querySelectorAll(".conn-in .achip")).map(x => x.textContent);
    const buttons = m().querySelectorAll('.conn-in button.achip[data-act="open-agent"]').length;
    const ownRules = Array.from(m().querySelectorAll(".links .rule-read")).length;
    m().querySelector('.links [data-act="rule-edit"][data-id="t1"]').click();
    const s = pw.__ak.soc();
    // change its rule's SEND from the editor
    const box = m().querySelector('.links [data-bind="rule-send"][data-id="t1"][data-part="data"]');
    box.checked = true;
    box.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const changed = s.rules.find(r => r.id === "t1").send === "text+data" && m().querySelector('.links [data-bind="rule-send"][data-id="t1"][data-part="data"]').checked;
    m().querySelector('[data-act="add-rule-from"]').click();
    const added = s.rules.filter(r => r.from === "artist").length === 2 && m().querySelectorAll(".links .rule").length === 2;   // both open: t1 and the new one
    // the sender buttons open that agent
    m().querySelector('.conn-in button.achip[data-id="describer"]').click();
    const opened = /Describer/.test(pw.document.querySelector(".modal-head h2").textContent);
    return senders.some(x => /You, at the start/.test(x)) && senders.some(x => /Renderer/.test(x)) && senders.some(x => /Describer/.test(x)) && buttons === 2 && ownRules === 1 && changed && added && opened;
  });
  T.test("page: a rule reads as a sentence with agent buttons; ✎ Edit shows its controls and ✓ Done reads it again", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="pebbles"]').click();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    const row = id => pw.document.querySelector('[data-act="rule-edit"][data-id="' + id + '"]').closest(".rule-read");
    const p7 = row("p7").textContent.replace(/\s+/g, " ").trim();
    const buttons = Array.from(row("p7").querySelectorAll('button.achip[data-act="open-agent"]')).map(b => b.dataset.id);
    const off = row("p4").classList.contains("off") && /switched off/.test(row("p4").textContent);
    const plain = !row("p7").querySelector("select, input:not(.rule-on)");
    pw.document.querySelector('[data-act="rule-edit"][data-id="p7"]').click();
    const editing = !!pw.document.querySelector('.rule-editing [data-bind="rule"][data-id="p7"]');
    pw.document.querySelector('[data-act="rule-done"][data-id="p7"]').click();
    const back = !pw.document.querySelector(".rule-editing") && !!row("p7");
    const l = Seeds.makeLostAndFound();
    pw.__ak.app.societies.lost = l;
    return /^When .*Judge responds, if its data says pass is false, send its words to .*Critic, starting with “The judge said:”\.\s*✎ Edit$/.test(p7) && !row("p7").querySelector("select") && buttons.join() === "judge,critic" && off && plain && editing && back;
  });
  T.test("page: rules: one tick switches a rule off, “always” isn't said, the round agent and the gate note read plainly, and the switches sit by the rules", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="pebbles"]').click();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    const s = pw.__ak.soc();
    const left = () => pw.document.querySelector("#colLeft");
    const p8 = pw.document.querySelector('[data-act="rule-edit"][data-id="p8"]').closest(".rule-read").textContent.replace(/\s+/g, " ");
    const tick = pw.document.querySelector('.rule-read .rule-on[data-id="p8"]');
    tick.checked = false;
    tick.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const off = s.rules.find(r => r.id === "p8").enabled === false && pw.document.querySelector('.rule-on[data-id="p8"]').closest(".rule-read").classList.contains("off");
    const header = !left().querySelector('select[data-bind="roundAgent"]') && !!left().querySelector('.rules').previousElementSibling;
    pw.document.querySelector('[data-act="round-edit"]').click();
    const choosing = !!left().querySelector('select[data-bind="roundAgent"]');
    pw.document.querySelector('[data-act="round-done"]').click();
    const gate = left().querySelector(".gate-note").textContent;
    const sw = left().querySelector('.variants-inside [data-bind="variant"][data-id="dot-counter"]');
    sw.checked = true;
    sw.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const swapped = s.rules.find(r => r.id === "p4").enabled && s.rules.find(r => r.id === "p6").enabled && !s.rules.find(r => r.id === "p3").enabled && !s.rules.find(r => r.id === "p5").enabled;
    return /Critic responds, send its words to/.test(p8) && !/always/.test(p8) && off && header && choosing && !left().querySelector('select[data-bind="roundAgent"]') &&
      /if its data says pass is false/.test(gate) && !/ALWAYS|data\.pass/.test(gate) && swapped && /\(4 rules\)/.test(left().querySelector(".variants-inside").textContent);
  });
  T.test("page: unticking a rule's last SEND box says why, right there", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="telephone"]').click();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    pw.document.querySelector('[data-act="rule-edit"][data-id="t1"]').click();
    const b = pw.document.querySelector('[data-bind="rule-send"][data-id="t1"][data-part="text"]');
    b.checked = false;
    b.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const warn = pw.document.querySelector(".send-warn");
    return !!warn && /has to send something/.test(warn.textContent) && pw.__ak.soc().rules.find(r => r.id === "t1").send === "text" && pw.document.querySelector('[data-bind="rule-send"][data-id="t1"][data-part="text"]').checked;
  });
  T.test("page: with two models, the card asks which agent needs the strongest", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="lost"]').click();
    const before = /strongest model/.test(pw.document.querySelector(".qcard").textContent);
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.renderAll();
    return !before && /Which agent needs the strongest model\?/.test(pw.document.querySelector(".qcard").textContent);
  });
}
