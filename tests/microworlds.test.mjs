// The two microworlds, end to end in pretend mode, including the intended asymmetries.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Pretend, Library, Scenarios, Geometry } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const run = async (soc, spec) => { const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); r.start(spec); await r.play(); return r.run; };
  const texts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id).map(e => (e.response ? e.response.text : "ERROR " + e.error));
  const content = r => JSON.stringify(r.trace.filter(e => e.kind === "activation").map(e => [e.round, e.agentId, e.message.text, e.response && e.response.text, e.response && e.response.data]));
  const tel = text => run(Seeds.makeTelephone(), { to: "artist", text });

  for (const mk of [Seeds.makeTelephone, Seeds.makePebbles]) {
    const s = mk();
    T.test(s.title + ": look inside finds only ordinary agents and rules", ["Seeds", "Society"], () => {
      const errs = Society.validateSociety(s);
      if (errs.length) throw new Error(errs.join("; "));
      return s.agents.every(a => ["model", "program", "renderer"].indexOf(a.kind) >= 0);
    });
  }
  T.test("Telephone runs end to end in pretend mode", ["Seeds", "Engine", "Pretend"], async () => { const r = await tel("a red house"); return r.stopReason === "round-limit" && texts(r, "describer").length === 8 && !r.trace.some(e => e.error); });
  T.test("Telephone in pretend mode is fully deterministic", ["Seeds", "Engine", "Pretend"], async () => content(await tel("a red circle next to a blue square")) === content(await tel("a red circle next to a blue square")));
  T.test("Telephone: side-by-side shapes swap every round (a cycle)", ["Pretend"], async () => { const d = texts(await tel("a red circle next to a blue square"), "describer"); return d[0] === d[2] && d[1] === d[3] && d[0] !== d[1]; });
  T.test("Telephone: a house settles at once (a fixed point)", ["Pretend"], async () => { const d = texts(await tel("a red house"), "describer"); return d.every(x => x === d[0]) && /triangle on top of a red square/.test(d[0]); });
  T.test("Telephone: ten dots drift down to six, then settle", ["Pretend"], async () => { const d = texts(await tel("ten blue dots"), "describer"); return /^Nine/.test(d[0]) && /^Six/.test(d[3]) && d[4] === d[3]; });
  T.test("Telephone: a spiral never settles", ["Pretend"], async () => { const d = texts(await tel("a green spiral"), "describer"); return new Set(d).size === d.length; });
  T.test("Telephone: the Loop Spotter's threshold decides what counts as stuck", ["Pretend", "Engine", "Society"], async () => {
    const r1 = await tel("a green spiral");
    const s2 = Seeds.makeTelephone();
    Society.setParams(Society.agentById(s2, "loop-spotter"), { half: 0.95 });
    const r2 = await run(s2, { to: "artist", text: "a green spiral" });
    return texts(r1, "loop-spotter").some(t => /stuck/.test(t)) && !texts(r2, "loop-spotter").some(t => /stuck/.test(t));
  });
  T.test("Telephone: a drawing start goes straight to the Renderer", ["Seeds", "Engine"], async () => {
    const s = Seeds.makeTelephone();
    const r = await run(s, { to: "renderer", text: s.starts[1].value });
    return texts(r, "describer")[0] === "A green triangle." && r.trace.filter(e => e.kind === "activation")[0].agentId === "renderer";
  });
  T.test("Telephone: the Tally shows its counts every five rounds", ["Engine"], async () => texts(await tel("a red house"), "tally").some(t => /^After 5 rounds/.test(t)));
  for (const ch of ["row4", "grid3x5", "triangle10", "checker4", "colors73"]) {
    T.test("Pebble Challenge “" + ch + "” runs end to end in pretend mode", ["Seeds", "Engine", "Society", "Pretend"], async () => {
      const s = Seeds.makePebbles();
      Society.applyChallenge(s, ch);
      const c = s.challenges.find(x => x.id === ch);
      const r = await run(s, { to: "designer", text: c.task });
      const v = texts(r, c.judge);
      return r.stopReason === "done" && v[v.length - 1] === "done" && !r.trace.some(e => e.error);
    });
  }
  T.test("Pebble: the Critic's note reaches the Designer, who fixes the drawing", ["Pretend", "Engine"], async () => {
    const s = Seeds.makePebbles();
    const r = await run(s, { to: "designer", text: s.challenges[1].task });
    const v = texts(r, "grid-judge");
    return v.length === 2 && /You drew 5 by 3/.test(v[0]) && v[1] === "done" && texts(r, "critic").length === 1;
  });
  T.test("Pebble: one click swaps Eyes for Dot Counter", ["Society", "Engine"], async () => {
    const s = Seeds.makePebbles();
    Society.applyVariant(s, "dot-counter", true);
    const r = await run(s, { to: "designer", text: s.challenges[1].task });
    return texts(r, "eyes").length === 0 && texts(r, "dot-counter").length === 2;
  });
  const L = () => Library.LIB["dot-counter"];
  T.test("Dot Counter is not fooled by text labels (test)", ["Library", "Scenarios", "Runtime"], async () => {
    const res = await Scenarios.runScenario({ code: { js: L().js }, params: L().params }, { id: "x", program: "penUp();\nfor (let i = 0; i < 4; i++) {\n  goTo(196 + i * 40, 256);\n  dot(14, 'red');\n}\ngoTo(120, 120);\nlabel('3 by 5');\nlabel('15 dots');", expect: { rows: 1, cols: 4 } }, Runtime);
    return res.ok;
  });
  T.test("Dot Counter IS fooled by pebbles drawn without dot() (test; intended)", ["Library", "Scenarios", "Runtime"], async () => {
    const res = await Scenarios.runScenario({ code: { js: L().js }, params: L().params }, { id: "x", program: L().scenarios.find(s => s.id === "s3").program, expect: { rows: 0, cols: 0 } }, Runtime);
    return res.ok;
  });
  const pebbles = async (instr, dotCounter) => {
    const s = Seeds.makePebbles();
    if (dotCounter) Society.applyVariant(s, "dot-counter", true);
    Society.agentById(s, "designer").instructions += " " + instr;
    const r = await run(s, { to: "designer", text: s.challenges[1].task });
    return { r, v: texts(r, "grid-judge") };
  };
  T.test("Pebble: little circles defeat Dot Counter but not Eyes", ["Pretend", "Engine"], async () => {
    const dc = await pebbles("Draw the pebbles as little circles.", true), eyes = await pebbles("Draw the pebbles as little circles.", false);
    return dc.r.stopReason === "round-limit" && /0 by 0/.test(dc.v[0]) && eyes.v[eyes.v.length - 1] === "done";
  });
  T.test("Pebble: pebbles close together fool Eyes but not Dot Counter", ["Pretend", "Engine"], async () => {
    const eyes = await pebbles("Put the pebbles close together.", false), dc = await pebbles("Put the pebbles close together.", true);
    return eyes.r.stopReason === "round-limit" && dc.v[dc.v.length - 1] === "done";
  });
  T.test("Pebble: a label that says the answer games Eyes, so a wrong drawing wins", ["Pretend", "Engine"], async () => {
    const { r, v } = await pebbles("Add a label that says the answer.", false);
    const program = r.trace.find(e => e.kind === "activation" && e.agentId === "renderer").render.program;
    return v.length === 1 && v[0] === "done" && /row < 5/.test(program);
  });
  T.test("Pebble: a Designer that remembers nothing repeats its mistake", ["Pretend", "Engine"], async () => {
    const s = Seeds.makePebbles();
    Society.agentById(s, "designer").history = "stateless";
    const r = await run(s, { to: "designer", text: s.challenges[1].task });
    return r.stopReason === "round-limit" && texts(r, "grid-judge").every(t => /5 by 3/.test(t));
  });
  T.test("Pebble: choosing a challenge rewires the judge and sets its numbers", ["Society"], () => {
    const s = Seeds.makePebbles();
    Society.applyChallenge(s, "triangle10");
    return s.rules.find(r => r.id === "p5").to === "triangle-judge" && s.rules.find(r => r.id === "p7").from === "triangle-judge" && same(Society.agentById(s, "eyes").outputFields.map(f => f.name), ["rowList"]);
  });
  T.test("the pretend Describer names what the pretend Artist drew", ["Pretend", "Geometry"], async () => {
    const r = await Runtime.runTurtle(Pretend.artistProgram("a red circle", ""), {});
    return Pretend.describePicture(r.output) === "A red circle.";
  });
  T.test("geometry: a square, a triangle and a star are told apart", ["Geometry"], async () => {
    const kinds = [];
    for (const p of ["for (let i = 0; i < 4; i++) { forward(80); right(90); }", "for (let i = 0; i < 3; i++) { forward(80); left(120); }", "for (let i = 0; i < 5; i++) { forward(100); right(144); }"]) {
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
