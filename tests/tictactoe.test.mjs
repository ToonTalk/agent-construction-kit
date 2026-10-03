// The Tic-Tac-Toe example: an AI only suggests moves; the Referee, a program, keeps the board and decides.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const begin = async s => { const api = Engine.createRun(s, { adapter: pretend, runtime: Runtime }); api.start({ to: s.starts[0].to, text: s.starts[0].value }); await api.play(); return api; };
  const twoAIs = () => { const s = Seeds.makeTicTacToe(); Society.applyVariant(s, "two-ais", true); return s; };

  T.test("Tic-Tac-Toe: ordinary agents and rules, an example to start from, and the Referee passes its scenarios", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeTicTacToe();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    const ref = s.agents.find(a => a.id === "referee");
    const bad = (await Scenarios.runScenarios(ref, Runtime)).filter(x => !x.ok);
    if (bad.length) throw new Error(JSON.stringify(bad[0]));
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return ref.typeId === "tictactoe" && ref.name === "Referee" && back.agents.find(a => a.id === "player-x").human === true &&
      back.rules.find(x => x.id === "g3").enabled === false && Seeds.EXAMPLES.some(x => x.id === "tictactoe") && s.questions.length >= 4;
  });
  T.test("Tic-Tac-Toe with two AIs: every taken square is refused and the same player asked again; the game ends on the Referee's word", ["Engine", "Seeds"], async () => {
    const { run } = await begin(twoAIs());
    const ref = acts(run, "referee").map(e => e.response.data);
    const refused = ref.filter(d => d.taken === true);
    const last = ref[ref.length - 1];
    const asked = acts(run, "rival").concat(acts(run, "rival-x")).filter(e => /already taken/.test(e.message.text));
    return run.status === "done" && refused.length === 8 && asked.length === 8 && last.over === true && last.winner === "nobody" &&
      acts(run, "player-x").length === 0 && acts(run, "referee").every(e => e.round <= 20);
  });
  T.test("Tic-Tac-Toe: a refused move isn't drawn; every legal one is, as a Logo board the Renderer can run", ["Engine"], async () => {
    const { run } = await begin(twoAIs());
    const legal = acts(run, "referee").filter(e => e.response.data.pass !== false).length;
    const pics = acts(run, "renderer");
    const held = acts(run, "referee").filter(e => e.response.data.taken).every(e => e.held.some(h => h.to === "renderer"));
    return pics.length === legal && pics.every(e => !e.render.error && e.render.segments > 0) && held &&
      /LABEL \[1\]/.test(pics[0].render.program) && /CIRCLE 38/.test(pics[pics.length - 1].render.program);
  });
  T.test("Tic-Tac-Toe: you play X, the run waits for your move, and the Referee refuses yours too when the square is taken", ["Engine", "Seeds"], async () => {
    const api = await begin(Seeds.makeTicTacToe());
    const asked = [];
    for (const move of ["5", "1", "9"]) {
      if (api.run.status !== "waiting") break;
      asked.push(api.run.waiting.entry.message.text);
      api.answer(move);
      await api.play();
    }
    const ref = acts(api.run, "referee").map(e => e.response.data);
    return asked.length === 3 && /New game! X goes first/.test(asked[0]) && /O takes square 1/.test(asked[1]) && /Square 1 is already taken by O/.test(asked[2]) &&
      ref[1].move === 5 && ref[3].move === 1 && ref[4].taken === true && ref[5].move === 9 && acts(api.run, "rival-x").length === 0;
  });
  T.test("Tic-Tac-Toe: with O going first ({O} in the Referee), the Rival opens", ["Engine", "Slots"], async () => {
    const s = Seeds.makeTicTacToe();
    const ref = s.agents.find(a => a.id === "referee");
    ref.params.first = "O";
    const api = await begin(s);
    const first = acts(api.run, "referee")[0].response;
    return first.data.next === "O" && acts(api.run, "rival").length >= 1 && api.run.status === "waiting";
  });
}
