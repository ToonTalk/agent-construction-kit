// The Evolution example (from the Logo Evolution Lab), and what it needed: AI agents that collect and see several
// pictures together, a Renderer that passes on the program it drew, and a stage and trace that show every picture.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const evolve = async rounds => { const s = Seeds.makeEvolution(); if (rounds) s.roundLimit = rounds; const api = Engine.createRun(s, { adapter: pretend, runtime: Runtime }); api.start({ to: "brief", text: s.starts[0].value }); await api.play(); return { s, r: api.run }; };

  T.test("Evolution: ordinary agents and rules, and every program passes its scenarios", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeEvolution();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    for (const a of s.agents.filter(x => x.kind === "program")) { const bad = (await Scenarios.runScenarios(a, Runtime)).filter(x => !x.ok); if (bad.length) throw new Error(a.name + ": " + JSON.stringify(bad[0])); }
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    const critic = back.agents.find(a => a.id === "critic");
    return critic.collect === true && critic.wait === 5 && back.rules.find(x => x.id === "v14").when === "end" && Seeds.EXAMPLES.some(x => x.id === "evolution");
  });
  T.test("the Renderer passes on the program it drew, and whose it was", ["Engine"], async () => {
    const { r } = await evolve(1);
    const d = acts(r, "renderer").map(e => e.response.data);
    return d.length === 4 && d[0].program === "REPEAT 36 [FORWARD 100 RIGHT 170]" && d[0].by === "Brief" && d.slice(1).map(x => x.by).join() === "Mutator 1,Mutator 2,Mutator 3";
  });
  T.test("an AI agent that collects waits for its number of messages, then sees all the pictures together, numbered", ["Engine"], async () => {
    const { r } = await evolve(1);
    const c = acts(r, "critic")[0];
    const waiting = r.trace.filter(e => e.agentId === "critic" && e.collecting).map(e => e.collecting.have);
    const text = c.call.messages[c.call.messages.length - 1].content;
    return same(waiting, [1, 2, 3, 4]) && c.message.renderIds.length === 4 && /picture 1, drawn from Brief’s program/.test(text) && /picture 4, drawn from Mutator 3’s program/.test(text) &&
      /The 4 pictures are attached in the same order/.test(text) && c.response.data.scores.length === 4 && c.call.messages[c.call.messages.length - 1].renderIds.length === 4;
  });
  T.test("Evolution: the Selector picks the best-scored picture, and its program is the next round's parent", ["Engine", "Seeds"], async () => {
    const { r } = await evolve(2);
    const sel = acts(r, "selector")[0].response.data, critic = acts(r, "critic")[0].response.data;
    const best = Math.max.apply(null, critic.scores);
    const brief2 = acts(r, "brief")[1];
    const parent2 = acts(r, "renderer").find(e => e.round === 2 && e.response.data.by === "Brief");
    return sel.score === best && critic.scores[sel.picture - 1] === best && brief2.message.data.winner === sel.winner && parent2.render.program === sel.winner && /The Critic suggests: Try more repetition/.test(brief2.response.text);
  });
  T.test("Evolution: roulette can choose any picture, but still one of them", ["Engine", "Seeds"], async () => {
    const s = Seeds.makeEvolution();
    s.roundLimit = 1;
    Society.setParams(s.agents.find(a => a.id === "selector"), { choosing: "roulette" });
    const api = Engine.createRun(s, { adapter: pretend, runtime: Runtime, seed: 7 });
    api.start({ to: "brief", text: s.starts[0].value });
    await api.play();
    const sel = acts(api.run, "selector")[0].response.data;
    const progs = acts(api.run, "renderer").map(e => e.render.program);
    return progs.indexOf(sel.winner) >= 0;
  });
  T.test("Evolution: the History keeps every round, and the Narrator gets it when the run ends", ["Engine", "Seeds"], async () => {
    const { r } = await evolve(3);
    const n = acts(r, "narrator");
    return n.length === 1 && (n[0].message.text.match(/wins with/g) || []).length === 3 && r.trace.some(e => e.kind === "ending");
  });

  // In the page
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const start = async pw => {
    pw.document.querySelector('[data-act="new-society"]').click();
    Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"][data-id="evolution"]').click();
    await sleep(30);
  };
  T.test("page: ＋ New society starts from the Evolution example", ["Seeds"], async () => {
    const { w: pw } = await boot();
    await start(pw);
    const s = pw.__ak.soc();
    return s.title === "Evolution" && s.id === "evolution" && s.agents.length === 9 && pw.__ak.app.order.indexOf(s.id) === 9;
  });
  T.test("page: each round card shows every picture, the winner starred and the parent marked; the Family tree shows who came from whom", ["Engine"], async () => {
    const { w: pw } = await boot();
    await start(pw);
    pw.__ak.soc().roundLimit = 2;
    const rec = await pw.__ak.runNow();
    await sleep(40);
    const cards = Array.from(pw.document.querySelectorAll(".rcard.multi"));
    const r2 = cards[1];
    const stars = cards.map(c => c.querySelectorAll(".rthumb.chosen").length);
    const tab = pw.document.querySelector('[data-act="trace-tab"][data-id="tree"]');
    tab.click();
    const tree = pw.document.querySelector(".ftree");
    const top = tree.querySelectorAll(":scope > li").length, kids = tree.querySelectorAll(":scope > li > ul > li").length;
    const winner1 = rec.api.run.trace.find(e => e.agentId === "selector" && e.response).response.data.winner;
    return cards.length === 2 && r2.querySelectorAll(".rthumb").length === 4 && !!r2.querySelector(".rthumb.again") && stars[0] === 1 && stars[1] >= 1 &&
      top === 1 && kids === 3 && pw.document.querySelectorAll(".ftree .tnode").length === 7 && !!winner1;
  });
  T.test("page: an AI agent's editor can make it collect", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="telephone"]').click();
    pw.__ak.openAgent("describer");
    const sel = pw.document.querySelector('[data-bind="agent"][data-field="collect"]');
    sel.value = "1"; sel.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const n = pw.document.querySelector('[data-bind="agent"][data-field="wait"]');
    n.value = "3"; n.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const a = pw.__ak.soc().agents.find(x => x.id === "describer");
    return a.collect === true && a.wait === 3 && /seeing their pictures side by side/.test(pw.document.querySelector(".modal-body").textContent);
  });
}
