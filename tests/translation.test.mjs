// Checks that don't depend on the language, so they hold for this page and for a translated copy
// (AK_HTML=sv/index.html node tests/run.mjs translation): every society is still sound, every program still
// passes its own scenarios, every society runs, and every panel opens, with no errors on the page.
export default function (T, { pageWindow }) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // A stand-in model with no language: Logo when a program is wanted, every field filled, and a reply with a
  // score, a yes and a number, so rules that look for them can fire.
  const neutral = { id: "neutral", label: "Neutral stand-in", async call(req) {
    const data = {};
    for (const f of req.outputFields || []) data[f.name] = f.type === "number" ? 3 : f.type === "list" ? [] : f.type === "boolean" ? true : "x";
    const text = req.replyKind === "program" ? "REPEAT 4 [FORWARD 50 RIGHT 90]" : "7/10 ja yes 5";
    return { text, raw: text + (Object.keys(data).length ? "\n" + JSON.stringify(data) : ""), data, model: "neutral", ms: 1 };
  } };
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const everySociety = w => w.AK.Seeds.MICROWORLDS.map(m => m.make()).concat(w.AK.Seeds.EXAMPLES.map(x => x.make()));

  T.test("any language: the page boots with no errors, and every microworld and example is sound, with programs that pass their scenarios", ["Seeds", "Scenarios"], async () => {
    const { w, errors } = await boot();
    const { Society, Scenarios, Runtime } = w.AK;
    for (const s of everySociety(w)) {
      const errs = Society.validateSociety(s);
      if (errs.length) throw new Error(s.title + ": " + errs.join("; "));
      for (const a of s.agents.filter(x => x.kind === "program")) {
        const bad = (await Scenarios.runScenarios(a, Runtime)).filter(r => !r.ok);
        if (bad.length) throw new Error(s.title + " / " + a.name + ": " + JSON.stringify(bad[0]).slice(0, 300));
      }
    }
    if (errors.length) throw new Error(errors.join(" | "));
    return true;
  });
  T.test("any language: every microworld and example runs two rounds with a neutral model, with no program or engine errors", ["Engine"], async () => {
    const { w } = await boot();
    const { Engine, Runtime } = w.AK;
    for (const s of everySociety(w)) {
      s.roundLimit = 2;
      if (s.challenges && s.challenges.length) w.AK.Society.applyChallenge(s, s.challenge || s.challenges[0].id);
      const api = Engine.createRun(s, { adapter: neutral, runtime: Runtime, seed: 7 });
      api.start({ to: s.starts[0].to, text: s.starts[0].value || "x" });
      await api.play();
      for (let i = 0; i < 6 && api.run.status === "waiting"; i++) { api.answer("5"); await api.play(); }
      const bad = api.run.trace.filter(e => e.kind === "activation" && e.error && !(e.agentKind === "renderer"));
      if (bad.length) throw new Error(s.title + ": " + bad[0].agentName + ": " + bad[0].error);
      if (["done", "waiting"].indexOf(api.run.status) < 0) throw new Error(s.title + " ended as " + api.run.status);
    }
    return true;
  });
  T.test("any language: every agent editor, Settings, both guides, the Helper, ＋ New society, All yours and the trace page open with no errors", ["Seeds"], async () => {
    const { w, errors } = await boot();
    const ak = w.__ak, before = errors.length;
    const close = () => Array.from(w.document.querySelectorAll(".modal-back")).forEach(x => x.remove());
    for (const id of ak.app.order.slice()) {
      ak.app.activeId = id; ak.app.ui.lookInside = true; ak.renderAll();
      for (const a of ak.soc().agents) { ak.openAgent(a.id); await sleep(5); close(); }
    }
    ak.openSettings(); await sleep(5); close();
    for (const g of ["learner", "teacher"]) { const b = w.document.createElement("button"); b.dataset.act = "guide"; b.dataset.id = g; w.document.body.appendChild(b); b.click(); await sleep(5); close(); b.remove(); }
    w.document.querySelector('[data-act="helper"]').click(); await sleep(5);
    w.document.querySelector('[data-act="new-society"]').click(); await sleep(5);
    Array.from(w.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="example"]').click(); await sleep(30); close();
    ak.openYours(); await sleep(5); close();
    ak.app.activeId = ak.app.order[0]; ak.renderAll();
    const rec = await ak.runNow(); await sleep(20);
    const page = await ak.traceDocument(ak.soc(), rec.api.run.trace, null);
    if (errors.length > before) throw new Error(errors.slice(before).join(" | "));
    return /<html lang="/.test(page) && !/<script/i.test(page);
  });
  T.test("any language: the exported trace page has no script, and shows a film as its first, middle and last frames", ["Engine"], async () => {
    // jsdom has no canvas, so a stand-in counts the lines each picture draws, and that count is the picture.
    let strokes = 0;
    const ctx = new Proxy({}, { get: (o, k) => (k === "fillRect" ? () => { strokes = 0; } : k === "stroke" ? () => { strokes++; } : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
    const { w, errors } = await pageWindow({ before(win) { win.HTMLCanvasElement.prototype.getContext = () => ctx; win.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64," + win.btoa("lines " + strokes); } });
    const ak = w.__ak, { Seeds, Society } = ak.AK;
    ak.app.settings.connection = "pretend"; ak.app.settings.speed = "instant";
    const s = Seeds.makeBlank("x");
    s.id = "films"; s.roundAgent = "renderer";
    s.agents = [{ id: "renderer", kind: "renderer", name: "R", emoji: "🖼️", role: "" }];
    s.starts = [{ id: "start", label: "x", kind: "text", to: "renderer", value: "REPEAT 8 [FORWARD 20 RIGHT 45 WAIT 15]" }];
    const c = Society.sanitizeSociety(s);
    ak.app.societies[c.id] = c; ak.app.order.push(c.id); ak.app.activeId = c.id; ak.renderAll();
    const rec = await ak.runNow(); await sleep(20);
    const page = await ak.traceDocument(ak.soc(), rec.api.run.trace, null);   // no run in memory: the film is made again from its Logo
    const srcs = Array.from(page.matchAll(/<figure><img[^>]* src="([^"]+)"/g)).map(m => w.atob(m[1].split(",")[1]));
    if (errors.length) throw new Error(errors.join(" | "));
    return !/<script/i.test(page) && srcs.join() === "lines 1,lines 4,lines 8" && (page.match(/<figcaption>/g) || []).length === 3 && ak.app.ui.film.render.frames === 8;
  });
}
