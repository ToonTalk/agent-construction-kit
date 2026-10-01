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
  T.test("Pebble: the challenges run from easy to hard, starting on Mystery rows", ["Seeds"], () => { const s = pebbles(); return same(s.challenges.map(c => c.level), [1, 1, 2, 2, 2, 3, 3]) && s.challenge === "mystery" && s.roundLimit === 4; });
  T.test("Pebble: the pretend Designer finds the secret rows by halving its guesses", ["Pretend", "Engine", "Library"], async () => {
    const s = pebbles();
    const r = await run(s, { to: "designer", text: task(s) });
    const rows = r.trace.filter(e => e.kind === "activation" && e.agentId === "eyes").map(e => e.response.data.rowList.map(x => x.colors.length).join(","));
    const v = texts(r, "mystery-judge");
    return same(rows, ["4,4,4", "6,2,6", "5,2,7"]) && v.length === 3 && v[2] === "done" && v[0] === "Not yet: row 1 needs more, row 2 needs fewer, row 3 needs more." && texts(r, "critic").length === 2;
  });
  T.test("Pebble: a Designer that remembers nothing can't find the secret", ["Pretend", "Engine"], async () => {
    const s = pebbles();
    Society.agentById(s, "designer").history = "stateless";
    const r = await run(s, { to: "designer", text: task(s) });
    return r.stopReason === "round-limit" && texts(r, "mystery-judge").every(t => t !== "done");
  });
  T.test("Pebble: the Critic's note reaches the Designer, who fixes the drawing", ["Pretend", "Engine"], async () => {
    const s = pebbles("grid3x5");
    const r = await run(s, { to: "designer", text: task(s) });
    const v = texts(r, "grid-judge");
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
    return { r, v: texts(r, "grid-judge") };
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
    return r.stopReason === "round-limit" && texts(r, "grid-judge").every(t => /5 by 3/.test(t));
  });
  T.test("Pebble: choosing a challenge rewires the judge and sets its numbers", ["Society"], () => {
    const s = pebbles();
    Society.applyChallenge(s, "triangle10");
    return s.rules.find(r => r.id === "p5").to === "triangle-judge" && s.rules.find(r => r.id === "p7").from === "triangle-judge" && same(Society.agentById(s, "eyes").outputFields.map(f => f.name), ["rowList"]);
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
