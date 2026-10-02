// Free play (a new society, new AI agents, an editable card and start), rules from You,
// rules that wait for the end of the run, and the Book that keeps a whole story.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Engine, Adapters, Runtime } = w.AK;
  const pretend = Adapters.makePretendAdapter();
  const run = async (soc, spec) => { const r = Engine.createRun(soc, { adapter: pretend, runtime: Runtime }); r.start(spec); await r.play(); return r.run; };
  const acts = (r, id) => r.trace.filter(e => e.kind === "activation" && e.agentId === id && !e.collecting);
  const prog = (id, body) => ({ id, kind: "program", typeId: "custom", name: id.toUpperCase(), emoji: "🔧", role: "", note: "", gate: false, pseudocode: "say it", params: {}, slots: [], scenarios: [], code: { pseudocode: "say it", js: "function run(input, params, h) { " + body + " }", lineMap: [{ pseudo: [1, 1], js: [1, 1] }] }, status: "ok" });
  const tiny = rules => ({ kind: "agent-kit-society", schema: 1, id: "t", title: "Tiny", roundAgent: "a", roundLimit: 3, starts: [{ id: "s", label: "Start", kind: "text", to: "a", value: "go" }],
    agents: [prog("a", "return { say: 'a heard ' + input.text };"), prog("b", "return { say: 'b heard ' + input.text };"), prog("c", "return { say: 'c heard ' + input.text };")], rules });
  const rule = (id, from, to, extra) => Object.assign({ id, from, when: "always", send: "text", to, prefix: "", enabled: true }, extra || {});

  T.test("rules: a rule from You sends the start to a second agent", ["Engine", "Society"], async () => {
    const s = tiny([rule("r1", "you", "b")]);
    const r = await run(s, { to: "a", text: "go" });
    const start = r.trace.find(e => e.kind === "run-start");
    return Society.validateSociety(s).length === 0 && acts(r, "b")[0].message.text === "go" && acts(r, "b")[0].message.fromName === "You" && same(start.also, ["B"]) &&
      Engine.describeRule(s.rules[0], id => (id === "b" ? "B" : id)) === "WHEN You start the run SEND your words TO B";
  });
  T.test("rules: “when the run ends” sends an agent's last words on, once, after everything else", ["Engine", "Society"], async () => {
    const s = tiny([rule("r1", "a", "b"), rule("r2", "b", "a", { when: "data", field: "nothing", op: "=", value: "x" }), rule("r3", "b", "c", { when: "end" })]);
    const r = await run(s, { to: "a", text: "go" });
    const c = acts(r, "c");
    const ending = r.trace.find(e => e.kind === "ending");
    return c.length === 1 && c[0].message.text === "b heard a heard go" && !!ending && /B’s last words go to C/.test(ending.text) && r.trace.indexOf(ending) > r.trace.indexOf(acts(r, "b")[0]) && r.note === "Finished: no rule sent another message.";
  });
  T.test("rules: at the round limit the ending still happens, and the run says why it stopped", ["Engine"], async () => {
    const s = tiny([rule("r1", "a", "b"), rule("r2", "b", "a"), rule("r3", "b", "c", { when: "end" })]);
    s.roundLimit = 2;
    const r = await run(s, { to: "a", text: "go" });
    return acts(r, "c").length === 1 && /^b heard a heard b heard/.test(acts(r, "c")[0].message.text) && r.stopReason === "round-limit" && r.note === "Reached the round limit (2)." && acts(r, "a").length === 2;
  });
  T.test("rules: an end rule from an agent that never spoke sends nothing; a stopped run has no ending", ["Engine"], async () => {
    const s = tiny([rule("r3", "c", "b", { when: "end" })]);
    const r = await run(s, { to: "a", text: "go" });
    const s2 = tiny([rule("r1", "a", "b"), rule("r3", "a", "c", { when: "end" })]);
    const api = Engine.createRun(s2, { adapter: pretend, runtime: Runtime });
    api.start({ to: "a", text: "go" });
    await api.step();
    api.stop();
    return acts(r, "b").length === 0 && !r.trace.some(e => e.kind === "ending") && !api.run.trace.some(e => e.kind === "ending") && acts(api.run, "c").length === 0;
  });
  T.test("rules: from You and “when the run ends” survive export and import", ["Society"], () => {
    const s = Seeds.makeStoryChain();
    const back = Society.importSociety(Society.exportSociety(s, null)).society;
    return back.rules.find(r => r.id === "c0").from === "you" && back.rules.find(r => r.id === "c10").when === "end";
  });

  T.test("Story Chain: the Book gets the first sentence from You and every writer's sentence; when the run ends, the Editor gets the whole story", ["Seeds", "Engine"], async () => {
    const s = Seeds.makeStoryChain();
    const r = await run(s, { to: "writer-a", text: s.starts[0].value });
    const book = acts(r, "book"), ed = acts(r, "editor");
    const story = book[book.length - 1].response.text;
    return book[0].message.fromName === "You" && book.length === 12 && /^Once upon a time, a friendly dragon called Pip/.test(story) && /Then she flew home for tea\./.test(story) &&
      ed.length === 1 && ed[0].message.text === story && /^The whole story: Once upon a time/.test(ed[0].response.text) && r.note === "Reached the round limit (4).";
  });
  T.test("free play: a blank society is one AI agent and a start, and it validates", ["Seeds"], () => {
    const b = Seeds.makeBlank("Robots");
    return b.title === "Robots" && b.agents.length === 1 && b.agents[0].kind === "model" && b.starts[0].to === "agent" && Society.validateSociety(b).length === 0;
  });

  // In the page
  const boot = async () => { const p = await pageWindow(); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const change = (pw, el, v) => { el.value = v; el.dispatchEvent(new pw.Event("input", { bubbles: true })); el.dispatchEvent(new pw.Event("change", { bubbles: true })); };
  T.test("page: ＋ New society from scratch, then give it a question, an introduction and example starts", ["Seeds", "Store"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="new-society"]').click();
    const m = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    m.querySelector("#newSocName").value = "Robot Club";
    m.querySelector('[data-new="blank"]').click();
    await sleep(30);
    const s = pw.__ak.soc();
    const made = s.title === "Robot Club" && s.agents.length === 1 && !s.seedVersion && pw.__ak.app.order.indexOf(s.id) === 9 && pw.document.querySelector(".world.on").textContent.indexOf("Robot Club") === 0;
    change(pw, pw.document.querySelector('[data-bind="soc-field"][data-field="question"]'), "Can robots be friends?");
    change(pw, pw.document.querySelector('[data-bind="soc-field"][data-field="intro"]'), "Two robots talk.");
    change(pw, pw.document.querySelector('[data-bind="start-field"][data-field="examples"]'), "Hello robot\nWhat is your name?");
    await sleep(20);
    const card = pw.document.querySelector(".qcard").textContent;
    const ex = Array.from(pw.document.querySelectorAll(".examples .example")).map(b => b.textContent);
    return made && /Can robots be friends\?/.test(card) && /Two robots talk\./.test(card) && same(ex, ["Hello robot", "What is your name?"]);
  });
  T.test("page: ＋ New society can copy the current microworld, which is then yours to change", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="secret"]').click();
    pw.document.querySelector('[data-act="new-society"]').click();
    const m = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    m.querySelector("#newSocName").value = "My numbers";
    m.querySelector('[data-new="copy"]').click();
    await sleep(30);
    const s = pw.__ak.soc();
    return s.title === "My numbers" && s.agents.some(a => a.id === "keeper") && s.id !== "secret" && !!pw.document.querySelector('[data-bind="soc-field"][data-field="title"]');
  });
  T.test("page: a microworld's card can't be changed in place; it says how to make your own", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    return !pw.document.querySelector('[data-bind="soc-field"]') && /New society/.test(pw.document.querySelector("#colLeft").textContent);
  });
  T.test("page: + Add an agent offers a new AI agent, which opens for its instructions", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="telephone"]').click();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    pw.document.querySelector('[data-act="add-agent"]').click();
    const m = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const noRenderer = !m.querySelector('[data-add-new="renderer"]');
    m.querySelector('[data-add-new="model"]').click();
    await sleep(20);
    const s = pw.__ak.soc();
    const a = s.agents.find(x => x.id === "agent");
    return noRenderer && !!a && a.kind === "model" && /New agent/.test(pw.document.querySelector(".modal-head h2").textContent) && !!pw.document.querySelector('.modal-body [data-field="instructions"]');
  });
  T.test("page: Story Chain's rules read “When You start the run, …” and “When the run ends, …”", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    pw.__ak.app.ui.lookInside = true;
    pw.__ak.renderAll();
    const row = id => pw.document.querySelector('[data-act="rule-edit"][data-id="' + id + '"]').closest(".rule-read").textContent.replace(/\s+/g, " ");
    const c0 = row("c0"), c10 = row("c10");
    pw.document.querySelector('[data-act="rule-edit"][data-id="c10"]').click();
    const whenSel = pw.document.querySelector('.rule-editing [data-bind="rule"][data-id="c10"][data-field="when"]');
    return /When .*You start the run, send your words to .*Book\./.test(c0) && /When the run ends, send .*Book’s last words to .*Editor\./.test(c10) && whenSel.value === "end" &&
      !!pw.document.querySelector('.rule-editing [data-field="from"] option[value="you"]');
  });
  T.test("page: wherever text is cut short, its “…” is a button that shows all of it, even inside a trace entry's header", ["Engine"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    const rec = await pw.__ak.runNow();
    await sleep(40);
    const story = rec.api.run.trace.filter(e => e.kind === "activation" && e.agentId === "editor")[0].response.text;
    const bubble = Array.from(pw.document.querySelectorAll(".bubble")).find(b => /Editor/.test(b.textContent));
    const more = bubble.querySelector('.more[data-act="show-full"]');
    more.click();
    const modal = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const whole = modal.textContent.replace(/\s+/g, " ").trim() === story.replace(/\s+/g, " ").trim();
    pw.document.querySelector(".modal [data-close]").click();
    // inside a trace entry's header: the "…" opens the text, and doesn't open the entry
    const head = Array.from(pw.document.querySelectorAll('[data-act="trace-toggle"]')).find(b => /Editor/.test(b.textContent) && b.querySelector(".more"));
    const before = pw.__ak.app.ui.expanded.size;
    head.querySelector(".more").click();
    const opened = !!pw.document.querySelector(".modal .full-text") && pw.__ak.app.ui.expanded.size === before;
    pw.document.querySelector(".modal [data-close]").click();
    // and from the keyboard
    const k = pw.document.querySelector(".bubble .more");
    k.focus();
    k.dispatchEvent(new pw.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    return story.length > 420 && whole && opened && !!pw.document.querySelector(".modal .full-text") && k.getAttribute("role") === "button" && k.tabIndex === 0;
  });
}
