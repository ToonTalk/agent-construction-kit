// The Trail Mix Barter example: AI traders talk their way into deals; the Ledger, a program, keeps the books.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime, Scenarios } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const market = async setup => { const s = Seeds.makeBarter(); if (setup) setup(s); const api = Engine.createRun(s, { adapter: pretend, runtime: Runtime }); api.start({ to: s.starts[0].to, text: s.starts[0].value }); await api.play(); return api.run; };

  T.test("Trail Mix Barter: ordinary agents and rules, an example to start from, and the Ledger passes its scenarios", ["Seeds", "Scenarios"], async () => {
    const s = Seeds.makeBarter();
    const errs = Society.validateSociety(s);
    if (errs.length) throw new Error(errs.join("; "));
    const ledger = s.agents.find(a => a.id === "ledger");
    const bad = (await Scenarios.runScenarios(ledger, Runtime)).filter(x => !x.ok);
    if (bad.length) throw new Error(JSON.stringify(bad[0]));
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return ledger.typeId === "ledger" && back.agents.find(a => a.id === "bob").outputFields.length === 5 && back.rules.find(x => x.id === "b4").send === "text+data" &&
      Seeds.EXAMPLES.some(x => x.id === "barter") && s.questions.length >= 4;
  });
  T.test("Trail Mix Barter: traders take turns, each trade waits for a yes, and the market closes when everyone has all three", ["Engine", "Seeds"], async () => {
    const r = await market();
    const led = acts(r, "ledger").map(e => e.response);
    const last = led[led.length - 1].data;
    const offers = led.filter(x => x.data.offer).map(x => x.data.offer.from + ">" + x.data.offer.partner);
    return r.status === "done" && same(offers, ["Alice>Bob", "Bob>Charley", "Charley>Alice"]) && last.over === true && last.trades === 3 &&
      same(last.have.Alice, { raisins: 40, cashews: 30, pretzels: 30 }) && /Altogether there are 300 g/.test(led[led.length - 1].text) &&
      acts(r, "bob").some(e => /offers you 30 g raisins/.test(e.message.text));
  });
  T.test("Trail Mix Barter: an offer of more than a trader has is refused, and the same trader is asked again", ["Engine"], async () => {
    const r = await market(s => { s.agents.find(a => a.id === "ledger").params.start = 20; });
    const refused = acts(r, "ledger").filter(e => e.response.data.refused);
    const again = refused.length && acts(r, "alice")[1];
    return refused.length >= 1 && /You only have 20 g raisins, so you can't give 30 g/.test(refused[0].response.text) && again && /Offer a trade again/.test(again.message.text);
  });
  T.test("Trail Mix Barter: with {no} on the Ledger's second line, traders aren't told what anyone has", ["Engine", "Slots"], async () => {
    const r = await market(s => { s.agents.find(a => a.id === "ledger").params.tell = false; });
    const told = acts(r, "alice").map(e => e.message.text);
    const last = acts(r, "ledger").pop().response;
    return told.length >= 1 && told.every(t => !/ has \d+ g/.test(t)) && last.data.over === true && /Everyone passed/.test(last.text);
  });
}
