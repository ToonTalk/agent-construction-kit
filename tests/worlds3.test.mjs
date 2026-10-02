// The five microworlds from agent-kit-microworlds.md that came last, and the features they needed:
// collecting messages (Three Eyes, Fool the Eyes), You as an agent (Joke Workshop), the call counter (Small Helper, Big Helper).
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const run = async (soc, spec) => { const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); r.start(spec); await r.play(); return r.run; };
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const texts = (r, id) => acts(r, id).map(e => (e.response ? e.response.text : "ERROR " + e.error));
  const start = s => ({ to: s.starts[0].to, text: s.starts[0].value });

  for (const mk of [Seeds.makeStoryChain, Seeds.makeThreeEyes, Seeds.makeFoolTheEyes, Seeds.makeSmallBig, Seeds.makeJokeWorkshop]) {
    const s = mk();
    T.test(s.title + ": ordinary agents and rules, an intro and questions, and every program passes its scenarios", ["Seeds", "Scenarios"], async () => {
      const errs = Society.validateSociety(s);
      if (errs.length) throw new Error(errs.join("; "));
      for (const a of s.agents.filter(x => x.kind === "program")) {
        const bad = (await Scenarios.runScenarios(a, Runtime)).filter(r => !r.ok);
        if (bad.length) throw new Error(a.name + ": " + JSON.stringify(bad[0]));
      }
      const back = Society.importSociety(Society.exportSociety(s, null)).society;
      return s.intro.length > 40 && s.questions.length >= 3 && back.agents.length === s.agents.length && s.agents.every(a => ["model", "program", "renderer"].indexOf(a.kind) >= 0);
    });
  }

  // Story Chain
  T.test("Story Chain: with no memory the story loses Pip after Writer C says “she”; when Writer A remembers, Pip comes back", ["Seeds", "Engine"], async () => {
    const said = async on => {
      const s = Seeds.makeStoryChain();
      if (on) Society.applyVariant(s, "a-remembers", true);
      const r = await run(s, start(s));
      return acts(r, "name-keeper").map(e => e.message.fromName + ":" + e.response.data.pass);
    };
    const off = await said(false), on = await said(true);
    return off.slice(0, 4).join() === "Writer A:true,Writer B:true,Writer C:false,Writer A:false" && on[3] === "Writer A:true";
  });

  // Three Eyes: collecting
  T.test("Three Eyes: Vote waits for all four answers, then runs once on all of them", ["Engine", "Seeds"], async () => {
    const s = Seeds.makeThreeEyes();
    const r = await run(s, { to: "designer", text: "Draw a grid of pebbles with 3 rows and 5 columns." });
    const waiting = r.trace.filter(e => e.agentId === "vote" && e.collecting).map(e => e.collecting.have + "/" + e.collecting.want);
    const v = acts(r, "vote");
    return same(waiting, ["1/4", "2/4", "3/4"]) && v.length === 1 && v[0].program.input.messages.length === 4 && !v[0].program.input.missing && Number.isFinite(v[0].response.data.truth) && /Eyes|agree/.test(v[0].response.text);
  });
  T.test("Three Eyes: if one Eye never answers, Vote runs on what it has when nothing else is left", ["Engine", "Seeds"], async () => {
    const s = Seeds.makeThreeEyes();
    s.rules.find(x => x.id === "e9").enabled = false;
    const r = await run(s, { to: "designer", text: "Draw a big jumble of 30 pebbles." });
    const v = acts(r, "vote");
    return v.length === 1 && v[0].program.input.messages.length === 3 && v[0].program.input.missing === true && r.status === "done";
  });

  // Fool the Eyes
  T.test("Fool the Eyes: the Referee collects Eyes and Dot Counter each round and keeps the score", ["Engine", "Seeds"], async () => {
    const s = Seeds.makeFoolTheEyes();
    s.roundLimit = 3;
    const r = await run(s, start(s));
    const ref = acts(r, "referee");
    const last = ref[ref.length - 1].response.data.score;
    return ref.length === 3 && ref.every(e => e.program.input.messages.length === 2 && /Score: Eyes \d+, Trickster \d+/.test(e.response.text)) && last.eyes + last.trickster + last.broken === 3 && acts(r, "trickster").length === 3;
  });

  // Small Helper, Big Helper
  T.test("Small Helper, Big Helper: the Escalator gives the task to the small helper, and after its tries, to the big one", ["Engine", "Seeds"], async () => {
    const s = Seeds.makeSmallBig();
    const esc = s.agents.find(a => a.id === "escalator");
    Society.setParams(esc, { tries: 1 });
    const task = s.challenges.find(c => c.id === s.challenge).task;
    const r = await run(s, { to: "escalator", text: task });
    const small = acts(r, "small"), big = acts(r, "big");
    return s.challenge === "grid3x5" && s.agents.find(a => a.id === "judge").typeId === "grid-judge" && small.length >= 1 && small[0].message.text === task &&
      (big.length === 0 ? texts(r, "judge").some(t => t === "done") : /^The task: Draw a grid/.test(big[0].message.text));
  });

  // Joke Workshop: You as an agent
  const jokes = async (setup, answers) => {
    const s = Seeds.makeJokeWorkshop();
    if (setup) setup(s);
    const api = Engine.createRun(s, { adapter: pretend, runtime: Runtime });
    api.start(start(s));
    await api.play();
    const asked = [];
    for (const a of answers) {
      if (api.run.status !== "waiting") break;
      asked.push(api.run.waiting.entry.message.text);
      api.answer(a);
      await api.play();
    }
    return { r: api.run, asked };
  };
  T.test("Joke Workshop: the run waits for You to rate each joke; the Scorekeeper keeps every rating", ["Engine", "Seeds"], async () => {
    const { r, asked } = await jokes(null, ["4, the ending was funny", "5", "3"]);
    const score = texts(r, "scorekeeper");
    const notes = acts(r, "notes");
    return asked.length === 3 && /penguin/.test(asked[0]) && asked[0] !== asked[1] && r.status === "done" &&
      score[score.length - 1] === "Version 1: ★★★★ (4)\nVersion 2: ★★★★★ (5)\nVersion 3: ★★★ (3)" && notes.length >= 2 && /Critic: Clear: /.test(notes[0].response.text) && /Critic: Surprise: /.test(notes[0].response.text) &&
      acts(r, "joker").slice(1).every(e => /^Notes from the critics:/.test(e.message.text)) && acts(r, "rater").every(e => e.byYou);
  });
  T.test("Joke Workshop: with one Critic switched off, Notes passes on what it has", ["Engine", "Seeds"], async () => {
    const { r } = await jokes(s => { s.rules.find(x => x.id === "j4").enabled = false; s.roundLimit = 2; }, ["3", "4"]);
    const n = acts(r, "notes");
    return n.length >= 1 && n[0].program.input.missing === true && n[0].response.data.count === 1 && acts(r, "joker").length === 2;
  });
  T.test("Joke Workshop: “No critics” sends only your rating to the Joker", ["Engine", "Seeds"], async () => {
    const { r } = await jokes(s => { Society.applyVariant(s, "no-critics", true); s.roundLimit = 2; }, ["2", "4"]);
    return acts(r, "critic-clear").length === 0 && acts(r, "notes").length === 0 && /^Your joke got this rating: 2/.test(acts(r, "joker")[1].message.text);
  });

  // In the page
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  T.test("page: nine microworlds; only the chosen one shows its question, the others on hover", ["Seeds"], async () => {
    const { w: pw } = await boot();
    const ws = Array.from(pw.document.querySelectorAll(".world:not(.add)"));
    return ws.length === 9 && pw.document.querySelectorAll(".world .q").length === 1 && ws.every(b => b.title.length > 5) && ws.map(b => b.dataset.id).join() === "story,secret,lost,telephone,pebbles,eyes3,fool,jokes,helpers" && pw.__ak.app.activeId === "story";
  });
  T.test("page: Joke Workshop asks You on the stage, and the agent buttons count each AI agent's calls", ["Engine"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="jokes"]').click();
    const rec = await pw.__ak.runNow();
    await sleep(30);
    const yt = pw.document.querySelector(".yourturn");
    const ok1 = rec.api.run.status === "waiting" && /Your turn/.test(yt.textContent) && !/you are the You|the You’s/.test(yt.textContent) && !/you are the You/.test(pw.document.querySelector(".status-line").textContent) && /Rate this joke from 1/.test(yt.textContent) && /penguin/.test(yt.textContent);
    pw.document.querySelector("#yourAnswer").value = "4";
    pw.document.querySelector("#yourAnswer").dispatchEvent(new pw.Event("input", { bubbles: true }));
    pw.document.querySelector('[data-act="your-send"]').click();
    for (let i = 0; i < 100 && rec.api.run.status !== "waiting" && rec.api.run.status !== "done"; i++) await sleep(20);
    const calls = Array.from(pw.document.querySelectorAll(".agent-strip .achip .calls")).map(x => x.textContent);
    const you = pw.document.querySelector('.agent-strip .achip[data-id="rater"]');
    return ok1 && rec.api.run.status === "waiting" && calls.some(t => /^2 calls · /.test(t)) && !you.querySelector(".calls");
  });
  T.test("page: Small Helper, Big Helper starts from a challenge, sent to the Escalator", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];   // it needs two models
    pw.document.querySelector('[data-act="world"][data-id="helpers"]').click();
    const rec = await pw.__ak.runNow();
    await sleep(30);
    const first = rec.api.run.trace.find(e => e.kind === "activation");
    return first.agentId === "escalator" && /Draw a grid of pebbles with 3 rows and 5 columns/.test(first.message.text) && !!pw.document.querySelector(".challenges");
  });
  T.test("page: Small Helper, Big Helper is grayed, says why, and won't run until there are two models", ["Adapters", "Seeds"], async () => {
    const { w: pw } = await boot();
    const btn = () => pw.document.querySelector('.world[data-id="helpers"]');
    const grayed = btn().classList.contains("needs") && /two models/.test(btn().title) && /More models/.test(btn().title) && !pw.document.querySelector('.world[data-id="pebbles"]').classList.contains("needs");
    btn().click();
    const note = pw.document.querySelector(".needs-note");
    const run = pw.document.querySelector('.controls [data-act="run"]');
    const refused = (await pw.__ak.runNow()) === null && !pw.__ak.app.runs.helpers;
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.renderAll();
    return grayed && !!note && /can’t run yet/.test(note.textContent) && run.disabled && refused && !btn().classList.contains("needs") && !pw.document.querySelector(".needs-note") && !pw.document.querySelector('.controls [data-act="run"]').disabled;
  });
}
