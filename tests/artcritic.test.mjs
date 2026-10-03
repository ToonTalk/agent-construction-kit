// The Artist and Critic example (Ken's society), and the Logo help's new word on SETXY.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios, Prompts } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const draw = async setup => { const s = Seeds.makeArtCritic(); if (setup) setup(s); const api = Engine.createRun(s, { adapter: pretend, runtime: Runtime }); api.start({ to: s.starts[0].to, text: s.starts[0].value }); await api.play(); return api.run; };

  T.test("Artist and Critic: ordinary agents and rules, an example to start from, and a Scorekeeper out of 10 that passes its scenarios", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeArtCritic();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    const sk = s.agents.find(a => a.id === "scorekeeper");
    const bad = (await Scenarios.runScenarios(sk, Runtime)).filter(x => !x.ok);
    if (bad.length) throw new Error(JSON.stringify(bad[0]));
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return sk.params.highest === 10 && /from \{1\} to \{10\}/.test(sk.pseudocode) && sk.code.pseudocode === sk.pseudocode &&
      back.agents.find(a => a.id === "artist").emoji === "🧑‍🎨" && Seeds.EXAMPLES.some(x => x.id === "artcritic") && s.questions.length >= 4;
  });
  T.test("Artist and Critic: the Critic knows what was asked for, says Ready, and only its scored replies go on; one drawing per round", ["Engine", "Seeds"], async () => {
    const r = await draw();
    const critic = acts(r, "critic"), artist = acts(r, "artist");
    const scores = acts(r, "scorekeeper");
    return critic[0].response.text === "Ready." && critic[0].fired.length === 0 && /The Artist was asked to draw: lots of colorful flowers/.test(critic[0].message.text) &&
      critic.slice(1).every(e => e.message.renderId) && artist.length === 4 && artist.slice(1).every(e => e.message.from === "critic") &&
      acts(r, "renderer").length === 4 && scores.length === 4 && /Version 4: ★+ \(\d+\)/.test(scores[3].response.text);
  });
  T.test("Artist and Critic: the Renderer writes to the Artist only when a program fails", ["Seeds"], () => {
    const a4 = Seeds.makeArtCritic().rules.find(x => x.id === "a4");
    return a4.from === "renderer" && a4.to === "artist" && a4.when === "data" && a4.field === "pass" && a4.value === "false";
  });
  T.test("Artist and Critic: switched on, the Critic reads the program instead of seeing the picture", ["Engine", "Seeds"], async () => {
    const r = await draw(s => Society.applyVariant(s, "reads", true));
    const critic = acts(r, "critic").slice(1);
    return critic.length >= 3 && critic.every(e => !e.message.renderId && /^The Artist's Logo program:/.test(e.message.text)) && acts(r, "scorekeeper").length >= 3;
  });
  T.test("a joined emoji like 🧑‍🎨 survives saving, export and import", ["Import"], () => { const s = Seeds.makeBlank(); s.agents[0].emoji = "🧑‍🎨"; return Society.importSociety(Society.exportSociety(s, null)).society.agents[0].emoji === "🧑‍🎨"; });
  T.test("the Logo help says SETXY draws a line when the pen is down; older instructions are reworded", ["Prompts", "Import"], () => {
    const old = "SETXY 100 -50 (go straight to a point), SETHEADING 90 (SETH: 0 is up, 90 is right),";
    const s = Seeds.makeBlank();
    s.agents[0].instructions = "Draw.\n" + old;
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return /PENUP first to jump/.test(Prompts.LOGO_HELP) && /PENUP first to jump/.test(back.agents[0].instructions) && back.agents[0].instructions.indexOf(old) < 0;
  });
}
