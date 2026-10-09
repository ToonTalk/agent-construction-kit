// Films (1.13.0): Logo's WAIT keeps a frame, and the stage plays the film. Also: the start box grows with its lines.
export default function (T, { pageWindow }) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const FILM = "REPEAT 8 [CLEARSCREEN RIGHT 45 * REPCOUNT FORWARD 100 WAIT 6]";   // 8 frames of 100 ms
  // A society that is only a Renderer (and, with two, a second Renderer the start also goes to).
  const filmPage = async two => {
    const p = await pageWindow();
    const ak = p.w.__ak, { Seeds, Society } = ak.AK;
    ak.app.settings.connection = "pretend";
    const s = Seeds.makeBlank("Films");
    s.id = "films"; s.roundAgent = "renderer"; s.roundLimit = 2;
    s.agents = [{ id: "renderer", kind: "renderer", name: "Renderer", emoji: "🖼️", role: "draws" }];
    s.starts = [{ id: "start", label: "Start", kind: "text", to: "renderer", value: FILM }];
    if (two) { s.agents.push({ id: "second", kind: "renderer", name: "Second", emoji: "🖼️", role: "draws too" }); s.rules = [{ id: "r1", from: "you", when: "always", send: "text", to: "second", prefix: "", enabled: true }]; }
    const c = Society.sanitizeSociety(s);
    ak.app.societies[c.id] = c; ak.app.order.push(c.id); ak.app.activeId = c.id; ak.renderAll();
    return p;
  };
  const q = (w, sel) => w.document.querySelector(sel);

  T.test("films: the stage plays a film with ▶ / ⏸, a frame slider and “frame i of n”; a still has none", ["Engine"], async () => {
    const { w, errors } = await filmPage(false);
    const ak = w.__ak;
    ak.app.settings.speed = "instant";
    await ak.runNow();
    await sleep(30);
    const playing = ak.app.ui.film && ak.app.ui.film.playing && q(w, "#filmPlay").textContent === "⏸" && q(w, '[data-bind="film-frame"]').max === "8" && /^frame [12] of 8$/.test(q(w, "#filmAt").textContent) && / · 🎞️/.test(q(w, ".picture .tag").textContent);
    await sleep(900);
    const ended = !ak.app.ui.film.playing && q(w, "#filmAt").textContent === "frame 8 of 8" && q(w, "#filmPlay").textContent === "▶";
    q(w, "#filmPlay").click(); await sleep(20);
    const again = ak.app.ui.film.playing && ak.app.ui.film.i <= 1;
    q(w, "#filmPlay").click(); await sleep(20);
    const stopped = !ak.app.ui.film.playing && ak.app.ui.film.held === true;
    const slider = q(w, '[data-bind="film-frame"]'); slider.value = "5"; slider.dispatchEvent(new w.Event("input", { bubbles: true })); await sleep(20);
    const slid = ak.app.ui.film.i === 4 && q(w, "#filmAt").textContent === "frame 5 of 8";
    ak.app.activeId = "telephone"; ak.renderAll();
    await ak.runNow(); await sleep(30);
    const still = !!q(w, "#stageCanvas") && !q(w, ".filmbar");
    if (errors.length) throw new Error(errors.join(" | "));
    return playing && ended && again && stopped && slid && still;
  });
  T.test("films: drawing the stage again during a run doesn't restart the film", ["Engine"], async () => {
    const { w } = await filmPage(false);
    const ak = w.__ak;
    ak.app.settings.speed = "normal";
    const done = ak.runNow();
    await sleep(350);
    const f = ak.app.ui.film, before = f.i;
    ak.renderStage(); ak.renderAll(); ak.renderStage();
    const kept = ak.app.ui.film === f && f.playing && f.i === before && before >= 2 && q(w, '[data-bind="film-frame"]').value === String(before + 1);
    await done;
    return kept;
  });
  T.test("films: at slow and normal speed the run waits for each film; at fast, a film made while another plays waits its turn", ["Engine"], async () => {
    const { w } = await filmPage(true);
    const ak = w.__ak;
    ak.app.settings.speed = "normal";
    let t0 = Date.now();
    await ak.runNow();
    const waited = Date.now() - t0 >= 1500 && ak.filmsWait();
    ak.app.settings.speed = "fast";
    t0 = Date.now();
    await ak.runNow();
    const quick = Date.now() - t0 < 700 && !ak.filmsWait();
    const f = ak.app.ui.film, first = f.render.renderId, queued = f.queue.length === 1 && f.queue[0].render.renderId !== first;
    await sleep(950);
    const next = ak.app.ui.film.playing && ak.app.ui.film.render.renderId !== first && ak.app.ui.film.queue.length === 0;
    return waited && quick && queued && next;
  });
  T.test("films: round cards and the Renderer's trace entry show 🎞️, and “Play the film on the stage” plays an earlier one", ["Engine"], async () => {
    const { w } = await filmPage(true);
    const ak = w.__ak;
    ak.app.settings.speed = "instant";
    const rec = await ak.runNow();
    await sleep(30);
    const mark = q(w, ".rcard .film-mark");
    const entry = Array.from(w.document.querySelectorAll('[data-act="trace-toggle"]')).find(b => /Renderer ←/.test(b.textContent));
    const badge = entry.querySelector(".badge.plain");
    entry.click();
    const btn = q(w, '[data-act="film-show"]');
    const first = rec.api.run.trace.find(e => e.render && e.agentId === "renderer");
    ak.app.ui.film = null;
    btn.click(); await sleep(30);
    const f = ak.app.ui.film;
    const { Society } = ak.AK, back = Society.importSociety(Society.exportSociety(ak.soc(), rec.api.run.trace)).trace.find(e => e.render);
    if (!(back.render.frames === 8 && back.render.seconds === 0.8)) throw new Error("an imported trace lost its film: " + JSON.stringify(back.render).slice(0, 200));
    return !!mark && mark.title === "2 films" && badge && badge.textContent === "🎞️ film" && badge.title === "A film of 8 frames (0.8 seconds)" && !!btn && f && f.playing && f.held && f.render.renderId === first.render.renderId && !!q(w, ".filmbar");
  });
  T.test("the start box grows with its lines, up to 12", ["Seeds"], async () => {
    const { w } = await pageWindow();
    const ak = w.__ak;
    ak.app.activeId = "telephone"; ak.renderAll();
    const box = () => q(w, 'textarea[data-bind="start-value"]');
    const one = box().rows === 2;
    const lines = n => Array.from({ length: n }, (_, k) => "line " + (k + 1)).join("\n");
    box().value = lines(9); box().dispatchEvent(new w.Event("input", { bubbles: true })); await sleep(10);
    const nine = box().rows === 9;
    box().value = lines(20); box().dispatchEvent(new w.Event("input", { bubbles: true })); await sleep(10);
    ak.renderAll();
    return one && nine && box().rows === 12;
  });
}
