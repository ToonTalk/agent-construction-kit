// The whole page in jsdom: boot, look inside, a pretend run, the trace, the editor, settings, imports, exports, saving.
export default function (T, { pageWindow }) {
  let P = null;
  const page = async () => (P = P || await pageWindow());
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const click = (w, sel) => { const el = w.document.querySelector(sel); if (!el) throw new Error("missing " + sel); el.click(); return el; };
  const entry = (w, re) => Array.from(w.document.querySelectorAll('[data-act="trace-toggle"]')).find(b => re.test(b.textContent));
  const open = (w, re) => { entry(w, re).click(); return entry(w, re).closest(".tentry"); };   // the trace is drawn again after a click

  T.test("the page boots with no errors", ["util"], async () => {
    const { w, errors } = await page();
    if (errors.length) throw new Error(errors.join(" | "));
    return w.__akReady === true && w.document.querySelectorAll(".world").length === 2;
  });
  T.test("the question card starts with a short introduction", ["Seeds"], async () => {
    const { w } = await page();
    const intro = w.document.querySelector(".qcard .intro");
    return !!intro && /party game/.test(intro.textContent) && /Round after round/.test(intro.textContent);
  });
  T.test("look inside shows the agents and rules", ["Society"], async () => {
    const { w } = await page();
    click(w, '[data-act="look"]');
    return w.document.querySelectorAll(".acard").length === 3 && w.document.querySelectorAll(".rule").length === 4 && !!w.document.querySelector('[data-act="add-agent"]');
  });
  T.test("the stage starts with four rounds and has no seed", ["Seeds"], async () => {
    const { w } = await page();
    const c = w.document.querySelector(".controls");
    return c.querySelector('[data-bind="roundLimit"]').value === "4" && !c.querySelector('[data-bind="seed"]') && !/Seed/.test(c.textContent);
  });
  T.test("a pretend run fills the stage and the trace", ["Engine"], async () => {
    const { w } = await page();
    w.__ak.app.settings.speed = "instant";
    const rec = await w.__ak.runNow();
    await sleep(60);
    return rec.api.run.status === "done" && w.document.querySelectorAll(".tentry").length === 14 && w.document.querySelectorAll(".rcard").length === 4;
  });
  T.test("a trace entry shows the response and rules first, and the exact prompt only when asked", ["Engine"], async () => {
    const { w } = await page();
    entry(w, /Describer/).click();
    let body = w.document.querySelector(".tbody");
    const plain = /Response/.test(body.textContent) && /Rules/.test(body.textContent) && /Artist gets text/.test(body.textContent) && !/System prompt/.test(body.textContent) && !/Message in/.test(body.textContent);
    click(w, '.tbody [data-act="tech-toggle"]');
    body = w.document.querySelector(".tbody");
    return plain && /System prompt/.test(body.textContent) && /Agent Kit/.test(body.textContent) && /Message in/.test(body.textContent) && /Hide the technical details/.test(body.textContent);
  });
  T.test("the Artist's reply is shown as Logo, with REPEAT", ["Engine", "Logo"], async () => {
    const { w } = await page();
    const t = open(w, /Artist ← You/);
    const pre = t.querySelector(".tbody pre.logo");
    return /wrote a Logo program/.test(t.textContent) && !!pre && /REPEAT 4/.test(pre.textContent) && !!pre.querySelector(".lg-k");
  });
  T.test("data with no words is said in plain words, marked as not the literal reply", ["Words", "Library"], async () => {
    const { w } = await pageWindow();
    w.AK.Society.addLibraryAgent(w.__ak.soc(), "tally");
    w.__ak.app.settings.speed = "instant";
    await w.__ak.runNow();
    const t = open(w, /Tally/);
    const said = t.querySelector(".said.data-only");
    return /sent data: counts: Artist 1/.test(t.querySelector(".th").textContent) && !!said && /It sent data, not words/.test(said.textContent) && /counts: Artist 1/.test(said.textContent) && !/[{}]/.test(said.textContent);
  });
  T.test("Markdown in a reply becomes formatting, safely", ["Engine"], async () => {
    const { w } = await page();
    const d = w.document.createElement("div");
    d.innerHTML = w.__ak.md("**Big** idea:\n- one\n- two <img src=x onerror=alert(1)>\n\n[a link](https://example.com)");
    return d.querySelector("b").textContent === "Big" && d.querySelectorAll("li").length === 2 && !d.querySelector("img") && !d.querySelector("a") && /a link/.test(d.textContent) && /<img/.test(d.textContent);
  });
  T.test("Pebble Challenge shows the levels, and the judge's pseudocode on the stage", ["Seeds", "Library"], async () => {
    const { w } = await page();
    click(w, '[data-act="world"][data-id="pebbles"]');
    const st = w.document.querySelector(".stage");
    const peek = st.querySelector(".judge-peek");
    return !!peek && /the secret is \{5, 2, 7\}/.test(peek.textContent) && st.querySelectorAll(".lvl3").length === 2 && /Mystery rows/.test(st.querySelector(".challenge.on").textContent) && /Eyes looks at the picture/.test(w.document.querySelector(".qcard .intro").textContent);
  });
  T.test("a judge's trace entry shows its pseudocode, not JavaScript", ["Engine"], async () => {
    const { w } = await page();
    w.__ak.app.settings.speed = "instant";
    await w.__ak.runNow();
    const body = open(w, /Mystery Judge/).querySelector(".tbody");
    return /the secret is/.test(body.textContent) && !/function run/.test(body.textContent) && /block: the work stops here/.test(body.textContent) && /row 1 needs more/.test(body.textContent);
  });
  T.test("when a live model passes on its first try, the stage suggests a harder challenge", ["Engine"], async () => {
    const { w } = await pageWindow();
    const app = w.__ak.app;
    click(w, '[data-act="world"][data-id="pebbles"]');
    click(w, '[data-act="challenge"][data-id="row4"]');
    app.settings.connection = "anthropic";
    app.adapter = Object.assign(w.AK.Adapters.makePretendAdapter(), { id: "anthropic", label: "a stand-in for a live model" });   // no calls leave the test
    app.adapterKey = JSON.stringify([app.settings.connection, app.settings.models, app.settings.keys]);
    app.settings.speed = "instant";
    const rec = await w.__ak.runNow();
    return rec.api.run.round === 1 && /Too easy\? Try a hard challenge/.test(w.document.querySelector(".status-line").textContent);
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
    w.__ak.openAgent("grid-judge");
    const m = w.document.querySelector(".modal-body");
    return !!m && m.querySelectorAll("input.slot").length === 4 && m.querySelectorAll(".scn.ok").length === 4;
  });
  T.test("peek under the hood lights up matching lines both ways", ["Engine"], async () => {
    const { w } = await page();
    w.__ak.openAgent("grid-judge");
    click(w, '[data-act="peek"]');
    const hover = el => el.dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true }));
    const lit = () => Array.from(w.document.querySelectorAll(".cl.hl")).map(x => x.dataset.side + x.dataset.line);
    hover(w.document.querySelector('.cl[data-side="pseudo"][data-line="1"]'));
    const a = lit();
    hover(w.document.querySelector('.cl[data-side="js"][data-line="7"]'));
    const b = lit();
    return a.indexOf("js2") >= 0 && a.indexOf("js4") >= 0 && a.indexOf("pseudo1") >= 0 && b.indexOf("pseudo4") >= 0;
  });
  T.test("changing a slot changes params without translating, and reruns scenarios", ["Slots", "Scenarios"], async () => {
    const { w } = await page();
    const a = w.__ak.soc().agents.find(x => x.id === "grid-judge");
    const js = a.code.js;
    await w.__ak.applyParamChange(a, { rowsNeeded: 4 });
    return a.params.rowsNeeded === 4 && /rows is \{4\}/.test(a.pseudocode) && a.code.js === js && a.results.some(r => !r.ok);
  });
  T.test("editing pseudocode in pretend mode reruns the scenarios and says it needs translation", ["Translator", "Scenarios"], async () => {
    const { w } = await page();
    w.__ak.openAgent("row-judge");
    const ed = w.__ak.app.ui.editor;
    const a = w.__ak.soc().agents.find(x => x.id === "row-judge");
    ed.mode = "edit";
    ed.draft = a.pseudocode.replace("pass, and say", "pass, then say");
    a.results = null;
    await w.__ak.savePseudo();
    return a.status === "needs-translation" && Array.isArray(a.results) && a.results.length === 5 && /pass, then say/.test(a.pseudocode) && /Needs translation/.test(w.document.querySelector(".modal-body").textContent);
  });
  T.test("+ Add an agent brings in a library agent, with a rule so it hears the right agent", ["Society", "Library"], async () => {
    const { w } = await page();
    if (w.__ak.app.ui.editorModal) w.__ak.app.ui.editorModal.close();
    click(w, '[data-act="world"][data-id="telephone"]');
    w.__ak.app.ui.lookInside = true;
    w.__ak.renderAll();
    click(w, '[data-act="add-agent"]');
    click(w, '[data-add-type="loop-spotter"]');
    await sleep(30);
    const s = w.__ak.soc();
    const a = s.agents.find(x => x.typeId === "loop-spotter");
    return !!a && !a.shipped && s.rules.some(r => r.from === "describer" && r.to === a.id) && w.document.querySelectorAll(".acard").length === 4 && !w.document.querySelector(".lib-list");
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
    return /<details/.test(html) && !/<script/i.test(html) && /System prompt/.test(html) && /The Logo program it drew/.test(html);
  });
  T.test("settings: one model field to type in, with models to pick", ["Adapters"], async () => {
    const { w } = await page();
    w.__ak.app.settings.connection = "openai";
    w.__ak.openSettings();
    const body = () => w.__ak.app.ui.settingsModal.body;
    const inp = body().querySelector("#modelIn");
    inp.value = "my-model-9";
    inp.dispatchEvent(new w.Event("change", { bubbles: true }));
    const typed = w.__ak.app.settings.models.openai === "my-model-9" && !/Or type a model id/.test(body().textContent) && body().querySelectorAll("#modelIn").length === 1;
    Array.from(body().querySelectorAll('[data-act="pick-model"]')).find(b => b.dataset.model === "gpt-5.4").click();
    const picked = w.__ak.app.settings.models.openai === "gpt-5.4" && body().querySelector("#modelIn").value === "gpt-5.4";
    w.__ak.app.settings.connection = "pretend";
    w.__ak.app.ui.settingsModal.close();
    return typed && picked;
  });
  T.test("settings show the fixed safety preamble and how programs run", ["Prompts", "Runtime"], async () => {
    const { w } = await page();
    w.__ak.openSettings();
    const t = w.__ak.app.ui.settingsModal.body.textContent;
    w.__ak.app.ui.settingsModal.close();
    return /aged 10 to 16/.test(t) && /step counter/.test(t) && /Drawings are Logo/.test(t);
  });
  T.test("the drawing pad writes Logo", ["Logo"], async () => {
    const { w } = await page();
    click(w, '[data-act="world"][data-id="telephone"]');
    click(w, '[data-act="start-kind"][data-id="drawing"]');
    click(w, '[data-act="pad-clear"]');
    for (const c of ["FORWARD 40", "RIGHT 90", "SETPENCOLOR \"red"]) Array.from(w.document.querySelectorAll('[data-act="pad"]')).find(b => b.dataset.cmd === c).click();
    const st = w.__ak.soc().starts.find(x => x.id === "drawing");
    const ok = st.value === "FORWARD 40\nRIGHT 90\nSETPENCOLOR \"red" && w.AK.Logo.run(st.value).ok;
    click(w, '[data-act="start-kind"][data-id="sentence"]');
    return ok;
  });
  T.test("work is saved and loads again", ["Store"], async () => {
    const { w } = await page();
    await w.__ak.saveNow();
    const raw = w.localStorage.getItem("agentkit.v1");
    const p2 = await pageWindow({ storage: { "agentkit.v1": raw } });
    const W = p2.w.__ak.app;
    return !!raw && W.order.length === w.__ak.app.order.length && p2.errors.length === 0 && !W.replaced.length && W.societies.pebbles.agents.find(a => a.id === "grid-judge").params.rowsNeeded === 4 && W.societies.telephone.agents.some(a => a.typeId === "loop-spotter");
  });
  T.test("an older saved Telephone is replaced by the new one, and can be kept as a copy", ["Store", "Seeds"], async () => {
    const { w } = await page();
    const old = w.AK.Seeds.makeTelephone();
    delete old.seedVersion;
    old.roundLimit = 8;
    old.starts[1].value = "penColor('green');\nfor (let i = 0; i < 3; i++) {\n  forward(120);\n  right(120);\n}";
    const data = { schema: 1, version: "1.0.0", settings: {}, order: ["telephone", "pebbles"], activeId: "telephone", societies: { telephone: old, pebbles: w.AK.Seeds.makePebbles() }, traces: {}, helperChat: {} };
    const p2 = await pageWindow({ storage: { "agentkit.v1": "js1:" + JSON.stringify(data) } });
    const W = p2.w;
    const fresh = W.__ak.app.societies.telephone.seedVersion === W.AK.Seeds.SEED_VERSION && W.__ak.app.societies.telephone.roundLimit === 4 && /Telephone has a new version/.test(W.document.querySelector("#banners").textContent);
    click(W, '[data-act="keep-old"]');
    await sleep(30);
    const copy = W.__ak.app.societies["telephone-old"];
    return fresh && !!copy && /old version/.test(copy.title) && copy.roundLimit === 8 && /^SETPENCOLOR "green\nREPEAT 3/.test(copy.starts.find(x => x.id === "drawing").value) && !/new version/.test(W.document.querySelector("#banners").textContent) && p2.errors.length === 0;
  });
}
