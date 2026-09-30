// The whole page in jsdom: boot, look inside, a pretend run, the editor, imports, exports, saving.
export default function (T, { pageWindow }) {
  let P = null;
  const page = async () => (P = P || await pageWindow());
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  T.test("the page boots with no errors", ["util"], async () => {
    const { w, errors } = await page();
    if (errors.length) throw new Error(errors.join(" | "));
    return w.__akReady === true && w.document.querySelectorAll(".world").length === 2;
  });
  T.test("look inside shows the agents and rules", ["Society"], async () => {
    const { w } = await page();
    w.document.querySelector('[data-act="look"]').click();
    return w.document.querySelectorAll(".acard").length === 5 && w.document.querySelectorAll(".rule").length === 6;
  });
  T.test("a pretend run fills the stage and the trace", ["Engine"], async () => {
    const { w } = await page();
    w.__ak.app.settings.speed = "instant";
    const rec = await w.__ak.runNow();
    await sleep(60);
    return rec.api.run.status === "done" && w.document.querySelectorAll(".tentry").length > 20 && w.document.querySelectorAll(".rcard").length === 8;
  });
  T.test("a trace entry opens to show the exact prompt and reply", ["Engine"], async () => {
    const { w } = await page();
    const btn = Array.from(w.document.querySelectorAll('[data-act="trace-toggle"]')).find(b => /Describer/.test(b.textContent));
    btn.click();
    const body = w.document.querySelector(".tbody");
    return !!body && /System prompt/.test(body.textContent) && /Agent Kit/.test(body.textContent) && /Reply/.test(body.textContent);
  });
  T.test("replay steps through a finished run", ["Engine"], async () => {
    const { w } = await page();
    w.__ak.setReplay(3);
    const here = w.document.querySelector(".tentry.here");
    const ok = !!here && /\b4 \/ /.test(w.document.querySelector(".replay").textContent);
    w.__ak.setReplay(null);
    return ok;
  });
  T.test("a programmed agent opens with its pseudocode slots and scenarios", ["Library"], async () => {
    const { w } = await page();
    w.__ak.openAgent("loop-spotter");
    const m = w.document.querySelector(".modal-body");
    return !!m && m.querySelectorAll("input.slot").length === 2 && m.querySelectorAll(".scn.ok").length === 5;
  });
  T.test("peek under the hood lights up matching lines both ways", ["Engine"], async () => {
    const { w } = await page();
    w.__ak.openAgent("loop-spotter");
    w.document.querySelector('[data-act="peek"]').click();
    const hover = el => el.dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true }));
    hover(w.document.querySelector('.cl[data-side="pseudo"][data-line="2"]'));
    const lit = Array.from(w.document.querySelectorAll(".cl.hl")).map(x => x.dataset.side + x.dataset.line);
    hover(w.document.querySelector('.cl[data-side="js"][data-line="7"]'));
    const lit2 = Array.from(w.document.querySelectorAll(".cl.hl")).map(x => x.dataset.side + x.dataset.line);
    return lit.indexOf("js4") >= 0 && lit.indexOf("js6") >= 0 && lit.indexOf("pseudo2") >= 0 && lit2.indexOf("pseudo3") >= 0;
  });
  T.test("changing a slot changes params without translating, and reruns scenarios", ["Slots", "Scenarios"], async () => {
    const { w } = await page();
    const a = w.__ak.soc().agents.find(x => x.id === "loop-spotter");
    const js = a.code.js;
    await w.__ak.applyParamChange(a, { half: 0.2 });
    return a.params.half === 0.2 && /more than \{0\.2\} its words/.test(a.pseudocode) && a.code.js === js && a.results.some(r => !r.ok);
  });
  T.test("editing pseudocode in pretend mode reruns the scenarios and says it needs translation", ["Translator", "Scenarios"], async () => {
    const { w } = await page();
    w.__ak.openAgent("tally");
    const ed = w.__ak.app.ui.editor;
    ed.mode = "edit";
    ed.draft = "count how many times each agent talked\nevery {5} rounds, show the counts";
    const a = w.__ak.soc().agents.find(x => x.id === "tally");
    a.results = null;
    await w.__ak.savePseudo();
    return a.status === "needs-translation" && Array.isArray(a.results) && a.results.length === 5 && /talked/.test(a.pseudocode) && /Needs translation/.test(w.document.querySelector(".modal-body").textContent);
  });
  T.test("an imported file with a hostile name can't inject HTML", ["Society"], async () => {
    const { w } = await page();
    const d = JSON.parse(w.AK.Society.exportSociety(w.AK.Seeds.makeTelephone(), null));
    d.society.agents[0].name = '<img src=x onerror="window.hacked=1">';
    d.society.agents[0].role = '<img src=x onerror="window.hacked=2">';
    await w.__ak.importSocietyText(JSON.stringify(d));
    w.__ak.app.ui.lookInside = true;
    w.__ak.renderAll();
    return !w.document.querySelector("img[onerror]") && !w.hacked && w.__ak.soc().id === "telephone-imported";
  });
  T.test("the trace exports as a web page with no scripts in it", ["Engine"], async () => {
    const { w } = await page();
    const html = await w.__ak.traceDocument(w.__ak.app.societies.telephone, w.__ak.app.traces.telephone, null);
    return /<details/.test(html) && !/<script/i.test(html) && /System prompt/.test(html);
  });
  T.test("settings show the fixed safety preamble and how programs run", ["Prompts", "Runtime"], async () => {
    const { w } = await page();
    w.__ak.openSettings();
    const t = w.document.querySelector(".modal-back:last-child .modal-body").textContent;
    return /aged 10 to 16/.test(t) && /step counter/.test(t);
  });
  T.test("work is saved and loads again", ["Store"], async () => {
    const { w } = await page();
    await w.__ak.saveNow();
    const raw = w.localStorage.getItem("agentkit.v1");
    const p2 = await pageWindow({ storage: { "agentkit.v1": raw } });
    return !!raw && p2.w.__ak.app.order.length === w.__ak.app.order.length && p2.errors.length === 0 && p2.w.__ak.app.societies.telephone.agents.find(a => a.id === "loop-spotter").params.half === 0.2;
  });
}
