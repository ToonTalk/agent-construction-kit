// The two microworlds, end to end in pretend mode, including the intended asymmetries.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Pretend, Library, Scenarios, Geometry } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const run = async (soc, spec) => { const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); r.start(spec); await r.play(); return r.run; };
  const texts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id).map(e => (e.response ? e.response.text : "ERROR " + e.error));
  const content = r => JSON.stringify(r.trace.filter(e => e.kind === "activation").map(e => [e.round, e.agentId, e.message.text, e.response && e.response.text, e.response && e.response.data]));
  const tel = (text, rounds) => { const s = Seeds.makeTelephone(); if (rounds) s.roundLimit = rounds; return run(s, { to: "artist", text }); };
  const pebbles = id => { const s = Seeds.makePebbles(); if (id) Society.applyChallenge(s, id); return s; };
  const task = s => s.challenges.find(c => c.id === s.challenge).task;

  for (const mk of [Seeds.makeTelephone, Seeds.makePebbles]) {
    const s = mk();
    T.test(s.title + ": look inside finds only ordinary agents and rules", ["Seeds", "Society"], () => {
      const errs = Society.validateSociety(s);
      if (errs.length) throw new Error(errs.join("; "));
      return s.agents.every(a => ["model", "program", "renderer"].indexOf(a.kind) >= 0);
    });
  }
  T.test("Telephone is three agents in a loop, four rounds, with an introduction", ["Seeds"], () => {
    const s = Seeds.makeTelephone();
    return same(s.agents.map(a => a.id), ["artist", "renderer", "describer"]) && s.rules.length === 4 && s.roundLimit === 4 && !("seed" in s) && /party game/.test(s.intro);
  });
  T.test("Telephone runs end to end in pretend mode", ["Seeds", "Engine", "Pretend"], async () => { const r = await tel("a red house"); return r.stopReason === "round-limit" && texts(r, "describer").length === 4 && !r.trace.some(e => e.error); });
  T.test("Telephone in pretend mode is fully deterministic", ["Seeds", "Engine", "Pretend"], async () => content(await tel("a red circle next to a blue square")) === content(await tel("a red circle next to a blue square")));
  T.test("Telephone: side-by-side shapes swap every round (a cycle)", ["Pretend"], async () => { const d = texts(await tel("a red circle next to a blue square"), "describer"); return d[0] === d[2] && d[1] === d[3] && d[0] !== d[1]; });
  T.test("Telephone: a house settles at once (a fixed point)", ["Pretend"], async () => { const d = texts(await tel("a red house"), "describer"); return d.every(x => x === d[0]) && /triangle on top of a red square/.test(d[0]); });
  T.test("Telephone: ten dots drift down to six, then settle", ["Pretend"], async () => { const d = texts(await tel("ten blue dots", 6), "describer"); return /^Nine/.test(d[0]) && /^Six/.test(d[3]) && d[4] === d[3]; });
  T.test("Telephone: a spiral never settles", ["Pretend"], async () => { const d = texts(await tel("a green spiral"), "describer"); return new Set(d).size === d.length; });
  T.test("Telephone: the pretend Artist writes Logo with REPEAT, not the same commands again and again", ["Pretend"], () => {
    const p = Pretend.artistProgram("three red squares", "");
    return /REPEAT 3 \[REPEAT 4 \[FORWARD 90 RIGHT 90\]/.test(p) && p.split("\n").length === 3;
  });
  T.test("Telephone: a Loop Spotter from the library hears the Describer, and its threshold decides what counts as stuck", ["Pretend", "Engine", "Society", "Library"], async () => {
    const s1 = Seeds.makeTelephone(), s2 = Seeds.makeTelephone();
    const a1 = Society.addLibraryAgent(s1, "loop-spotter"), a2 = Society.addLibraryAgent(s2, "loop-spotter");
    Society.setParams(a2.agent, { half: 0.95 });
    const r1 = await run(s1, { to: "artist", text: "a green spiral" }), r2 = await run(s2, { to: "artist", text: "a green spiral" });
    return a1.rules.length === 1 && a1.rules[0].from === "describer" && !a1.agent.shipped && texts(r1, "loop-spotter").some(t => /stuck/.test(t)) && !texts(r2, "loop-spotter").some(t => /stuck/.test(t));
  });
  T.test("Telephone: a Tally from the library hears everyone and shows its counts", ["Engine", "Society", "Library"], async () => {
    const s = Seeds.makeTelephone();
    s.roundLimit = 6;
    const t = Society.addLibraryAgent(s, "tally");
    const r = await run(s, { to: "artist", text: "a red house" });
    return t.rules[0].from === "*" && texts(r, "tally").some(x => /^After 5 rounds/.test(x));
  });
  T.test("the Renderer counts shapes, not the little lines inside a circle", ["Engine"], async () => {
    const r = await tel("a red circle next to a blue square");
    return r.trace.find(e => e.agentId === "renderer").response.text === "I drew 2 shapes and 0 dots.";
  });
  T.test("Telephone: a drawing start goes straight to the Renderer", ["Seeds", "Engine"], async () => {
    const s = Seeds.makeTelephone();
    const r = await run(s, { to: "renderer", text: s.starts[1].value });
    return /^SETPENCOLOR "green/.test(s.starts[1].value) && texts(r, "describer")[0] === "A green triangle." && r.trace.filter(e => e.kind === "activation")[0].agentId === "renderer";
  });
  for (const ch of ["row4", "grid3x5", "triangle10", "checker4", "colors73", "biggrid", "mystery"]) {
    T.test("Pebble Challenge “" + ch + "” runs end to end in pretend mode", ["Seeds", "Engine", "Society", "Pretend"], async () => {
      const s = pebbles(ch);
      const c = s.challenges.find(x => x.id === ch);
      const r = await run(s, { to: "designer", text: c.task });
      const v = texts(r, c.judge);
      return r.stopReason === "done" && v[v.length - 1] === "done" && !r.trace.some(e => e.error);
    });
  }
  T.test("Pebble: each challenge says what it tests, starting on Mystery rows", ["Seeds"], () => { const s = pebbles(); return s.challenges.every(c => c.tests && !("level" in c)) && s.challenge === "mystery" && s.roundLimit === 5 && s.challenges.find(c => c.id === "mystery").random.on === true; });
  T.test("Pebble: Mystery rows can draw a new secret, and the Judge's scenarios still pass", ["Society", "Scenarios"], async () => {
    const s = pebbles();
    let k = 0;
    const secret = Society.newSecret(s, () => [0.99, 0, 0.99][k++ % 3]);
    const j = Society.agentById(s, "judge");
    const res = await Scenarios.runScenarios(j, Runtime);
    return same(secret, [8, 1, 8]) && same(j.params.secret, [8, 1, 8]) && /\{8, 1, 8\}/.test(j.pseudocode) && same(s.challenges.find(c => c.id === "mystery").params.secret, [8, 1, 8]) && res.every(r => r.ok) && res.length === 8;
  });
  T.test("Pebble: the Mystery Judge passes on each row's count and verdict, for an agent a learner might add", ["Library", "Scenarios"], async () => {
    const r = await Scenarios.runScenario(Society.agentById(pebbles(), "judge"), { id: "x", input: { data: { rowList: [{ y: 1, colors: ["red", "red", "red", "red"] }, { y: 2, colors: ["red", "red"] }] } }, expect: {} }, Runtime);
    return same(r.output.counts, [4, 2, 0]) && same(r.output.verdicts, ["more", "right", "more"]);
  });
  T.test("Pebble: one Judge, whose program changes with the challenge, so the rules never move", ["Society", "Seeds"], () => {
    const s = pebbles();
    const judges = s.agents.filter(a => a.gate);
    const rules = JSON.stringify(s.rules);
    Society.applyChallenge(s, "triangle10");
    const j = Society.agentById(s, "judge");
    return judges.length === 1 && j.typeId === "triangle-judge" && /1, 2, 3, 4/.test(j.pseudocode) && JSON.stringify(s.rules) === rules && same(Society.agentById(s, "eyes").outputFields.map(f => f.name), ["rowList"]) && s.agents.length === 6;
  });
  T.test("Pebble: changes to the Judge stay with the challenge they were made for", ["Society"], () => {
    const s = pebbles("grid3x5");
    Society.setParams(Society.agentById(s, "judge"), { rowsNeeded: 4 });
    Society.applyChallenge(s, "mystery");
    const inMystery = Society.agentById(s, "judge").typeId;
    Society.applyChallenge(s, "grid3x5");
    const j = Society.agentById(s, "judge");
    return inMystery === "mystery-judge" && j.typeId === "grid-judge" && j.params.rowsNeeded === 4 && /rows is \{4\}/.test(j.pseudocode);
  });
  T.test("Pebble: without the Critic, the Judge's words go straight to the Designer", ["Society", "Engine", "Pretend"], async () => {
    const s = pebbles();
    Society.applyVariant(s, "no-critic", true);
    const r = await run(s, { to: "designer", text: task(s) });
    const v = texts(r, "judge");
    return texts(r, "critic").length === 0 && v[v.length - 1] === "done" && r.trace.some(e => e.agentId === "designer" && /^The judge said: Not yet/.test(e.message.text));
  });
  T.test("Pebble: a learner can play the Designer, and the Judge answers them", ["Engine"], async () => {
    const s = pebbles();
    const r = Engine.createRun(s, { adapter: pretend, runtime: Runtime, playAs: "designer" });
    r.start({ to: "designer", text: task(s) });
    await r.play();
    const waited = r.run.status === "waiting" && r.run.waiting.agent.id === "designer";
    r.answer(s.playTemplate);
    await r.play();
    const first = texts(r.run, "judge");
    r.answer("TO ROW :N\n  REPEAT :N [DOT 20 FORWARD 40]\nEND\nPENUP SETHEADING 90\nSETXY -140 60 ROW 5\nSETXY -140 0 ROW 2\nSETXY -140 -60 ROW 7");
    await r.play();
    const v = texts(r.run, "judge");
    return waited && /row 1 needs more/.test(first[0]) && v[v.length - 1] === "done" && r.run.status === "done" && r.run.trace.filter(e => e.byYou).length === 2;
  });
  T.test("Pebble: the pretend Designer finds the secret rows by halving its guesses", ["Pretend", "Engine", "Library"], async () => {
    const s = pebbles();
    const r = await run(s, { to: "designer", text: task(s) });
    const rows = r.trace.filter(e => e.kind === "activation" && e.agentId === "eyes").map(e => e.response.data.rowList.map(x => x.colors.length).join(","));
    const v = texts(r, "judge");
    return same(rows, ["4,4,4", "6,2,6", "5,2,7"]) && v.length === 3 && v[2] === "done" && v[0] === "Not yet: row 1 needs more, row 2 needs fewer, row 3 needs more." && texts(r, "critic").length === 2;
  });
  T.test("Pebble: a Designer that remembers nothing can't find the secret", ["Pretend", "Engine"], async () => {
    const s = pebbles();
    Society.agentById(s, "designer").history = "stateless";
    const r = await run(s, { to: "designer", text: task(s) });
    return r.stopReason === "round-limit" && texts(r, "judge").every(t => t !== "done");
  });
  T.test("Pebble: the Critic's note reaches the Designer, who fixes the drawing", ["Pretend", "Engine"], async () => {
    const s = pebbles("grid3x5");
    const r = await run(s, { to: "designer", text: task(s) });
    const v = texts(r, "judge");
    return v.length === 2 && /You drew 5 by 3/.test(v[0]) && v[1] === "done" && texts(r, "critic").length === 1;
  });
  T.test("Pebble: one click swaps Eyes for Dot Counter", ["Society", "Engine"], async () => {
    const s = pebbles("grid3x5");
    Society.applyVariant(s, "dot-counter", true);
    const r = await run(s, { to: "designer", text: task(s) });
    return texts(r, "eyes").length === 0 && texts(r, "dot-counter").length === 2;
  });
  const L = () => Library.LIB["dot-counter"];
  T.test("Dot Counter is not fooled by text labels (test)", ["Library", "Scenarios", "Runtime"], async () => {
    const res = await Scenarios.runScenario({ code: { js: L().js }, params: L().params }, { id: "x", program: "PENUP SETXY -60 0 SETHEADING 90 SETPENCOLOR \"red\nREPEAT 4 [DOT 14 FORWARD 40]\nSETXY -136 136 LABEL [3 by 5]\nSETXY -136 100 LABEL [15 dots]", expect: { rows: 1, cols: 4 } }, Runtime);
    return res.ok;
  });
  T.test("Dot Counter IS fooled by pebbles drawn without DOT (test; intended)", ["Library", "Scenarios", "Runtime"], async () => {
    const res = await Scenarios.runScenario({ code: { js: L().js }, params: L().params }, { id: "x", program: L().scenarios.find(s => s.id === "s3").program, expect: { rows: 0, cols: 0 } }, Runtime);
    return res.ok && /CIRCLE 7/.test(L().scenarios.find(s => s.id === "s3").program);
  });
  const tryDesigner = async (instr, dotCounter) => {
    const s = pebbles("grid3x5");
    if (dotCounter) Society.applyVariant(s, "dot-counter", true);
    Society.agentById(s, "designer").instructions += " " + instr;
    const r = await run(s, { to: "designer", text: task(s) });
    return { r, v: texts(r, "judge") };
  };
  T.test("Pebble: little circles defeat Dot Counter but not Eyes", ["Pretend", "Engine"], async () => {
    const dc = await tryDesigner("Draw the pebbles as little circles.", true), eyes = await tryDesigner("Draw the pebbles as little circles.", false);
    return dc.r.stopReason === "round-limit" && /0 by 0/.test(dc.v[0]) && eyes.v[eyes.v.length - 1] === "done";
  });
  T.test("Pebble: pebbles close together fool Eyes but not Dot Counter", ["Pretend", "Engine"], async () => {
    const eyes = await tryDesigner("Put the pebbles close together.", false), dc = await tryDesigner("Put the pebbles close together.", true);
    return eyes.r.stopReason === "round-limit" && dc.v[dc.v.length - 1] === "done";
  });
  T.test("Pebble: a label that says the answer games Eyes, so a wrong drawing wins", ["Pretend", "Engine"], async () => {
    const { r, v } = await tryDesigner("Add a label that says the answer.", false);
    const render = r.trace.find(e => e.kind === "activation" && e.agentId === "renderer").render;
    return v.length === 1 && v[0] === "done" && new Set(render.dots.map(d => Math.round(d.y))).size === 5 && /LABEL \[3 by 5\]/.test(render.program);
  });
  T.test("Pebble: a Designer that remembers nothing repeats its mistake", ["Pretend", "Engine"], async () => {
    const s = pebbles("grid3x5");
    Society.agentById(s, "designer").history = "stateless";
    const r = await run(s, { to: "designer", text: task(s) });
    return r.stopReason === "round-limit" && texts(r, "judge").every(t => /5 by 3/.test(t));
  });
  T.test("Pebble: an older society with a judge per challenge is still rewired", ["Society"], () => {
    const s = pebbles();
    s.agents.push(Object.assign({}, Society.agentById(s, "judge"), { id: "tri" }));
    s.challenges.push({ id: "old", title: "Old style", task: "x", judge: "tri", params: {}, eyesFields: [] });
    Society.applyChallenge(s, "old");
    return s.rules.find(r => r.id === "p5").to === "tri" && s.rules.find(r => r.id === "p7").from === "tri";
  });
  T.test("the pretend Describer names what the pretend Artist drew", ["Pretend", "Geometry"], async () => {
    const r = await Runtime.runTurtle(Pretend.artistProgram("a red circle", ""), {});
    return Pretend.describePicture(r.output) === "A red circle.";
  });
  T.test("geometry: a square, a triangle and a star are told apart", ["Geometry"], async () => {
    const kinds = [];
    for (const p of ["REPEAT 4 [FORWARD 80 RIGHT 90]", "REPEAT 3 [FORWARD 80 LEFT 120]", "REPEAT 5 [FORWARD 100 RIGHT 144]"]) {
      const r = await Runtime.runTurtle(p, {});
      kinds.push(Geometry.strokesOf(r.output.ops)[0].kind);
    }
    return same(kinds, ["square", "triangle", "star"]);
  });
  T.test("geometry: colors are simplified to plain names", ["Geometry"], () => {
    const n = Geometry.basicColorName;
    return n("crimson") === "red" && n("#0000ff") === "blue" && n("gold") === "yellow" && n("hsl(120, 60%, 40%)") === "green" && n("black") === "black";
  });
}
