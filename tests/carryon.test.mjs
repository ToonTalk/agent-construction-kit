// Run and Step carry on from where a run was stopped or reached its round limit; ↺ Reset starts again.
export default function (T, { modelWindow, pageWindow }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const prog = (id, body) => ({ id, kind: "program", typeId: "custom", name: id.toUpperCase(), emoji: "🔧", role: "", note: "", gate: false, pseudocode: "say it", params: {}, slots: [], scenarios: [], code: { pseudocode: "say it", js: "function run(input, params, h) { " + body + " }", lineMap: [{ pseudo: [1, 1], js: [1, 1] }] }, status: "ok" });
  const rule = (id, from, to) => ({ id, from, when: "always", send: "text", to, prefix: "", enabled: true });
  // A and B pass a growing count back and forth forever; A starts each round.
  const pingPong = limit => ({ kind: "agent-kit-society", schema: 1, id: "pp", title: "Ping pong", roundAgent: "a", roundLimit: limit, starts: [{ id: "s", label: "Start", kind: "text", to: "a", value: "0" }],
    agents: [prog("a", "return { say: String(Number(input.text) + 1) };"), prog("b", "return { say: String(Number(input.text) + 1) };")], rules: [rule("r1", "a", "b"), rule("r2", "b", "a")] });
  const begin = soc => { const api = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); api.start({ to: soc.starts[0].to, text: soc.starts[0].value }); return api; };

  T.test("carry on: at the round limit the next message is kept, and carrying on gives the run more rounds", ["Engine"], async () => {
    const api = begin(pingPong(2));
    await api.play();
    const first = api.run.status === "done" && api.run.stopReason === "round-limit" && api.run.parked.length === 1 && acts(api.run, "a").length === 2;
    const ok = api.carryOn(3);
    await api.play();
    const a = acts(api.run, "a");
    return first && ok && api.run.round === 5 && a.length === 5 && a[2].message.text === "4" && a[2].round === 3 && api.run.trace.some(e => e.kind === "note" && /Carrying on from where the run reached its round limit, up to round 5/.test(e.text));
  });
  T.test("carry on: after Stop, the messages on their way go out again and the run ends as if never stopped", ["Engine"], async () => {
    const api = begin(pingPong(3));
    await api.step(); await api.step(); await api.step();
    api.stop();
    const stopped = api.run.status === "stopped" && api.run.parked.length === 1 && api.canCarryOn();
    api.carryOn(3);
    await api.play();
    const plain = begin(pingPong(3)); await plain.play();
    const said = r => acts(r, "a").concat(acts(r, "b")).map(e => e.response.text).sort().join();
    return stopped && api.run.status === "done" && said(api.run) === said(plain.run) && api.run.round === 3;
  });
  T.test("carry on: Stop during your turn, then carry on: it's your turn again, with the same message", ["Engine", "Seeds"], async () => {
    const s = Seeds.makeTicTacToe();
    const api = begin(s);
    await api.play();
    const asked = api.run.waiting.entry.message.text;
    api.stop();
    api.carryOn(s.roundLimit);
    await api.play();
    return api.run.status === "waiting" && api.run.waiting.entry.message.text === asked && api.run.round === 1;
  });
  T.test("carry on: a run with nothing left to deliver can't carry on", ["Engine"], async () => {
    const s = pingPong(2); s.rules = [];
    const api = begin(s);
    await api.play();
    return api.run.status === "done" && !api.canCarryOn() && api.carryOn(2) === false;
  });
  T.test("page: ▶ Run after the round limit carries on the same run; ↺ Reset then starts a new one", ["Engine"], async () => {
    const { w: pw } = await pageWindow();
    pw.__ak.app.settings.connection = "pretend"; pw.__ak.app.settings.speed = "instant";
    const s = pw.AK.Seeds.makeTicTacToe(); Society.applyVariant(s, "two-ais", true); s.roundLimit = 3;
    pw.__ak.app.societies[s.id] = s; pw.__ak.app.order.push(s.id); pw.__ak.app.activeId = s.id; pw.__ak.renderAll();
    const run = async () => { pw.document.querySelector('[data-act="run"]').click(); for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 20)); const st = pw.__ak.app.runs[s.id] && pw.__ak.app.runs[s.id].api.run.status; if (st === "done" || st === "waiting") break; } return pw.__ak.app.runs[s.id].api; };
    const api1 = await run();
    const hint = /Run or Step carries on for 3 more rounds/.test(pw.document.querySelector("#colCenter").textContent);
    const api2 = await run();
    const same = api2 === api1 && api2.run.round === 6;
    pw.document.querySelector('[data-act="reset"]').click();
    const api3 = await run();
    return hint && same && api3 !== api1 && api3.run.round === 3;
  });
}
