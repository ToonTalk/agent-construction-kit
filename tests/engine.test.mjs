// The message bus, rule engine and round loop, on small hand-built societies.
export default function (T, { modelWindow, same }) {
  const w = modelWindow();
  const { Engine, Adapters, Runtime, Seeds, Prompts } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const wrap = body => "function run(input, params, h) {\n" + body + "\n}";
  const prog = (id, js) => ({ id, kind: "program", typeId: "custom", name: id, emoji: "🔧", pseudocode: "x", params: {}, slots: [], scenarios: [], code: { pseudocode: "x", js, lineMap: [], hash: "h" }, lastGood: null, status: "ok", statusDetail: null });
  const society = (agents, rules, extra) => Object.assign({ kind: "agent-kit-society", schema: 1, id: "t", title: "Test", roundAgent: agents[0].id, roundLimit: 5, seed: 1, starts: [], agents, rules }, extra || {});
  const rule = (id, from, to, extra) => Object.assign({ id, from, when: "always", send: "text", to, prefix: "", enabled: true }, extra || {});
  const runIt = async (soc, text) => { const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); r.start({ to: soc.agents[0].id, text: text || "go" }); await r.play(); return r.run; };
  const acts = run => run.trace.filter(e => e.kind === "activation");

  T.test("ALWAYS rules pass text along, with a prefix", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { say: 'hello' };")), prog("b", wrap("return { say: 'got: ' + input.text };"))], [rule("r1", "a", "b", { prefix: "A says:" })]));
    const b = acts(run).find(e => e.agentId === "b");
    return b.message.text === "A says: hello" && b.response.text === "got: A says: hello";
  });
  T.test("data rules compare numbers, words and true/false", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { n: 3, word: 'Yes', ok: false };")), prog("lt", wrap("return {};")), prog("eq", wrap("return {};")), prog("no", wrap("return {};")), prog("f", wrap("return {};"))], [
      rule("r1", "a", "lt", { when: "data", field: "n", op: "<", value: "4", send: "data" }),
      rule("r2", "a", "eq", { when: "data", field: "word", op: "=", value: "yes", send: "data" }),
      rule("r3", "a", "no", { when: "data", field: "n", op: ">", value: "10", send: "data" }),
      rule("r4", "a", "f", { when: "data", field: "ok", op: "=", value: "false", send: "data" })]));
    return same(acts(run).map(e => e.agentId), ["a", "lt", "eq", "f"]);
  });
  T.test("text rules fire when the words contain the word", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { say: 'I am STUCK here' };")), prog("b", wrap("return {};")), prog("c", wrap("return {};"))], [
      rule("r1", "a", "b", { when: "text", word: "stuck" }), rule("r2", "a", "c", { when: "text", word: "free" })]));
    return same(acts(run).map(e => e.agentId), ["a", "b"]);
  });
  T.test("a gate saying pass = false holds its ALWAYS rules and reroutes by rule", ["Engine"], async () => {
    const run = await runIt(society([prog("gate", wrap("return { pass: false, say: 'no' };")), prog("next", wrap("return {};")), prog("critic", wrap("return {};"))], [
      rule("r1", "gate", "next"), rule("r2", "gate", "critic", { when: "data", field: "pass", op: "=", value: "false" })]));
    const g = acts(run)[0];
    return same(acts(run).map(e => e.agentId), ["gate", "critic"]) && g.held.length === 1 && g.held[0].ruleId === "r1";
  });
  T.test("a switched-off rule does nothing", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return {};")), prog("b", wrap("return {};"))], [rule("r1", "a", "b", { enabled: false })]));
    return acts(run).length === 1;
  });
  T.test("an 'anyone' rule hears everyone except its own listener", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { say: 'x' };")), prog("b", wrap("return { say: 'y' };")), prog("ear", wrap("return {};"))], [rule("r1", "a", "b"), rule("r2", "*", "ear")]));
    return same(acts(run).filter(e => e.agentId === "ear").map(e => e.message.from), ["a", "b"]);
  });
  T.test("rounds count visits to the round agent, and the round limit stops a loop", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { say: 'again' };")), prog("b", wrap("return { say: 'back' };"))], [rule("r1", "a", "b"), rule("r2", "b", "a")], { roundLimit: 3 }));
    return same(acts(run).filter(e => e.agentId === "a").map(e => e.round), [1, 2, 3]) && run.stopReason === "round-limit";
  });
  T.test("a program gets back what it returned as memory", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("const n = (input.memory || 0) + 1;\nreturn { say: 'n=' + n, memory: n };")), prog("b", wrap("return {};"))], [rule("r1", "a", "b"), rule("r2", "b", "a")], { roundLimit: 3 }));
    return same(acts(run).filter(e => e.agentId === "a").map(e => e.response.text), ["n=1", "n=2", "n=3"]);
  });
  T.test("messages carry id, from, to, round, text, data and a timestamp", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { say: 'hi', k: 1 };")), prog("b", wrap("return {};"))], [rule("r1", "a", "b", { send: "both" })]));
    const m = acts(run)[1].message;
    return !!m.id && m.from === "a" && m.to === "b" && m.round === 1 && m.text === "hi" && m.data.k === 1 && typeof m.timestamp === "number";
  });
  T.test("messages sent around in circles are stopped", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return {};")), prog("b", wrap("return {};")), prog("c", wrap("return {};"))], [rule("r1", "b", "c"), rule("r2", "c", "b"), rule("r3", "a", "b")], { roundLimit: 2 }));
    return run.stopReason === "too-many";
  });
  T.test("a program that goes wrong leaves a visible error in the trace", ["Engine"], async () => {
    const run = await runIt(society([prog("a", wrap("return { v: input.data.nothing.deeper };"))], []));
    const e = acts(run)[0];
    return !!e.error && /isn't there/.test(e.error);
  });
  T.test("step delivers one message at a time; stop ends the run", ["Engine"], async () => {
    const soc = society([prog("a", wrap("return { say: 'x' };")), prog("b", wrap("return { say: 'y' };"))], [rule("r1", "a", "b"), rule("r2", "b", "a")], { roundLimit: 10 });
    const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime });
    r.start({ to: "a", text: "go" });
    await r.step();
    await r.step();
    const two = r.run.trace.filter(e => e.kind === "activation").length;
    r.stop();
    return two === 2 && r.run.status === "stopped";
  });
  T.test("model calls record the exact system prompt, messages, request and reply", ["Engine", "Adapters"], async () => {
    const r = Engine.createRun(Seeds.makeTelephone(), { adapter: pretend, runtime: Runtime });
    r.start({ to: "artist", text: "a red circle" });
    await r.play();
    const e = r.run.trace.find(x => x.kind === "activation" && x.agentId === "describer");
    return e.call.system.indexOf(Prompts.PREAMBLE) === 0 && e.call.messages.length === 1 && e.call.reply.length > 0 && !!e.call.request && e.call.pretend === true && e.call.messages[0].renderId === e.message.renderId;
  });
  // Films (1.13.0)
  const renderer = { id: "r", kind: "renderer", name: "Renderer", emoji: "🖼️", role: "draws" };
  const FILM = "REPEAT 4 [CLEARSCREEN FORWARD 20 * REPCOUNT WAIT 6]";   // 4 frames of 100 ms
  const shown = ops => JSON.stringify(ops.filter(o => o.t !== "M"));
  T.test("films: the Renderer says how many frames, keeps the film, and a model that sees pictures gets its last frame", ["Engine", "Logo"], async () => {
    const seen = [];
    const eyes = { id: "fake", label: "Fake", async call(req) { seen.push(req.images); return { text: "ok", raw: "ok", data: {}, model: "fake", ms: 1 }; } };
    const eye = { id: "eye", kind: "model", name: "Eye", emoji: "👁️", instructions: "Look.", outputFields: [], canSeeImages: true, history: "stateless", replyKind: "prose" };
    const soc = society([renderer, eye], [rule("r1", "r", "eye", { send: "image" })]);
    const api = Engine.createRun(soc, { adapter: eyes, runtime: Runtime, rasterize: shown });
    api.start({ to: "r", text: FILM });
    await api.play();
    const e = acts(api.run)[0], mem = api.run.renders[e.render.renderId];
    const still = await (async () => { const a = Engine.createRun(society([renderer], []), { adapter: eyes, runtime: Runtime }); a.start({ to: "r", text: "FORWARD 80" }); await a.play(); return acts(a.run)[0]; })();
    return e.render.frames === 4 && e.render.seconds === 0.4 && e.response.data.frames === 4 && /It is a film of 4 frames \(0\.4 seconds\)\./.test(e.response.text) &&
      mem.film.length === 4 && mem.image === shown(mem.film[3].ops) && seen[0][0] === shown(mem.film[3].ops) &&
      still.render.frames === undefined && still.response.data.frames === undefined && !/film/.test(still.response.text);
  });
  T.test("films: at slow and normal speed the run waits for a film to end before the next delivery; faster, it doesn't", ["Engine"], async () => {
    const soc = () => society([renderer, prog("b", wrap("return { say: 'seen' };"))], [rule("r1", "r", "b")]);
    const time = async filmsWait => { const api = Engine.createRun(soc(), { adapter: pretend, runtime: Runtime, delayMs: 5, filmsWait }); api.start({ to: "r", text: FILM }); const t0 = Date.now(); await api.play(); return { ms: Date.now() - t0, done: api.run.status === "done" && acts(api.run).length === 2 }; };
    const slow = await time(true), fast = await time(false);
    return slow.done && fast.done && slow.ms >= 380 && fast.ms < 300;
  });
  T.test("films: the run waits for one film at most filmWaitMax (30 seconds unless set), not at all for a film of blank frames, and stops waiting when the speed changes", ["Engine"], async () => {
    const soc = () => society([renderer, prog("b", wrap("return { say: 'seen' };"))], [rule("r1", "r", "b")]);
    const time = async (logo, deps, during) => { const api = Engine.createRun(soc(), Object.assign({ adapter: pretend, runtime: Runtime, delayMs: 5, filmsWait: true }, deps)); api.start({ to: "r", text: logo }); const t0 = Date.now(), p = api.play(); if (during) setTimeout(() => during(api), 100); await p; return { ms: Date.now() - t0, done: api.run.status === "done" && acts(api.run).length === 2 }; };
    const LONG = "REPEAT 3 [FORWARD 10 WAIT 300]";   // 3 frames of 5 seconds
    const capped = await time(LONG, { filmWaitMax: 250 }), blank = await time("REPEAT 3 [WAIT 300]", {}), faster = await time(LONG, {}, api => api.setDelay(5, false));
    return capped.done && capped.ms >= 240 && capped.ms < 1500 && blank.done && blank.ms < 1000 && faster.done && faster.ms < 1500;
  });
  T.test("Pause, then Run while the run is waiting between messages, doesn't deliver from two places at once", ["Engine"], async () => {
    const api = Engine.createRun(society([prog("a", wrap("return { say: 'x' };")), prog("b", wrap("return { say: 'y' };"))], [rule("r1", "a", "b"), rule("r2", "b", "a")], { roundLimit: 10 }), { adapter: pretend, runtime: Runtime, delayMs: 1000 });
    const pause = ms => new Promise(r => setTimeout(r, ms));
    api.start({ to: "a", text: "go" });
    const p1 = api.play();
    await pause(150);
    api.pause();
    const p2 = api.play();
    await pause(925);   // the first loop woke at 1000 ms; the second wakes at about 1150 ms
    const n = acts(api.run).length;
    api.stop();
    await Promise.all([p1, p2]);
    return n === 2;
  });
  // A model that takes a while to answer, for pressing Pause, Run, Step and Stop in the middle of its call.
  const slowModel = { id: "slow", kind: "model", name: "Slow", emoji: "🐢", instructions: "Answer.", outputFields: [], canSeeImages: false, history: "stateless", replyKind: "prose" };
  const slowAdapter = ms => ({ id: "fake", label: "Fake", async call(req) { await new Promise((ok, no) => { const t = setTimeout(ok, ms); if (req.signal) req.signal.addEventListener("abort", () => { clearTimeout(t); no(new Error("Stopped.")); }); }); return { text: "slow answer", raw: "slow answer", data: {}, model: "fake", ms }; } });
  const slowSociety = () => society([slowModel, prog("b", wrap("return { say: 'got ' + input.text };"))], [rule("r1", "slow", "b")]);
  T.test("Pause, then Run while a model is still answering: its answer is delivered and the run goes on, instead of ending with it lost", ["Engine"], async () => {
    const api = Engine.createRun(slowSociety(), { adapter: slowAdapter(200), runtime: Runtime });
    const pause = ms => new Promise(r => setTimeout(r, ms));
    api.start({ to: "slow", text: "go" });
    const p1 = api.play();
    await pause(50);
    api.pause();
    const p2 = api.play();
    await Promise.all([p1, p2]);
    const b = acts(api.run).find(e => e.agentId === "b");
    return api.run.status === "done" && api.run.stopReason === "done" && !!b && b.response.text === "got slow answer" && acts(api.run).length === 2 && api.run.queue.length === 0;
  });
  T.test("Pause, then Step while a model is still answering: the step is that answer; Stop in the middle of a call still stops it", ["Engine"], async () => {
    const pause = ms => new Promise(r => setTimeout(r, ms));
    const a = Engine.createRun(slowSociety(), { adapter: slowAdapter(200), runtime: Runtime });
    a.start({ to: "slow", text: "go" });
    const p1 = a.play();
    await pause(50);
    a.pause();
    const more = await a.step();
    await p1;
    const stepped = more === true && a.run.status === "paused" && acts(a.run).length === 1 && a.run.queue.length === 1;
    const b = Engine.createRun(slowSociety(), { adapter: slowAdapter(5000), runtime: Runtime });
    b.start({ to: "slow", text: "go" });
    const p2 = b.play();
    await pause(50);
    b.pause();
    const p3 = b.play();
    await pause(20);
    b.stop();
    await Promise.all([p2, p3]);
    const e = acts(b.run)[0];
    return stepped && b.run.status === "stopped" && e.stopped === true && b.run.parked.length === 1 && b.canCarryOn();
  });
  T.test("linked lines work both ways", ["Engine"], () => {
    const map = [{ pseudo: [1, 1], js: [2, 4] }, { pseudo: [2, 2], js: [5, 5] }];
    const a = Engine.linkedLines(map, "pseudo", 1), b = Engine.linkedLines(map, "js", 3);
    return same(a.js, [2, 3, 4]) && same(b.pseudo, [1]) && same(b.js, [2, 3, 4]);
  });
}
