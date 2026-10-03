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
    return book[0].message.fromName === "You" && book.length === 13 && book[12].message.fromName === "Writer C" && /^Once upon a time, a friendly dragon called Pip/.test(story) && /Then she flew home for tea\.$/.test(story) &&
      r.trace.some(e => e.kind === "note" && /won't start another/.test(e.text)) &&
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
  T.test("page: pictures in the trace (and elsewhere) open full size", ["Engine"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="telephone"]').click();
    await pw.__ak.runNow();
    await sleep(40);
    const head = Array.from(pw.document.querySelectorAll('[data-act="trace-toggle"]')).find(b => /Renderer/.test(b.textContent));
    head.click();
    await sleep(20);
    const img = pw.document.querySelector(".tbody img.zoomable");
    if (!img) throw new Error("no picture in the Renderer's entry");
    const all = Array.from(pw.document.querySelectorAll("img[alt]")).filter(x => !x.closest(".modal"));
    img.src = "data:image/png;base64,iVBORw0KGgo=";   // jsdom draws nothing, so give it a picture
    img.click();
    const big = pw.document.querySelector(".modal .zoom img");
    return all.every(x => x.classList.contains("zoomable") && x.dataset.act === "zoom-img" && x.tabIndex === 0) && !!big && big.src === img.src;
  });
  T.test("library: no description shows a raw {placeholder}", ["Library"], () => Object.values(w.AK.Library.LIB).every(L => !/[{}]/.test(L.about || "")));
  T.test("page: the trace's start line names the models the agents used, not just the main one", ["Engine", "Adapters"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="secret"]').click();
    const one = (await pw.__ak.runNow()).api.run.trace[0].adapter;
    pw.__ak.app.settings.extra = [{ connection: "gemini", model: "gemini-3.8-flash" }];
    pw.__ak.soc().agents.find(a => a.id === "guesser").model = "gemini:gemini-3.8-flash";
    pw.__ak.soc().roundLimit = 1;
    await pw.__ak.runNow();
    const two = pw.__ak.app.runs.secret.api.run.trace[0].adapter;
    return one === "Scripted stand-ins" && two === "Gemini 3.8 Flash";
  });
  T.test("page: the learner guide is a first 15 minutes (try, change one thing, make it yours), with the reference folded below", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.__ak.app.ui.helperOpen = false;
    pw.document.querySelector('[data-act="guide"][data-id="learner"]') ? pw.document.querySelector('[data-act="guide"][data-id="learner"]').click() : pw.__ak.openSettings();
    if (!pw.document.querySelector(".guide")) Array.from(pw.document.querySelectorAll('[data-act="guide"][data-id="learner"]')).pop().click();
    const g = Array.from(pw.document.querySelectorAll(".guide")).pop();
    const steps = Array.from(g.querySelectorAll(".steps > li")).map(li => li.querySelector("b").textContent);
    const ref = g.querySelector("details.ref");
    return /Your first 15 minutes/.test(g.textContent) && same(steps, ["Try one.", "Change one thing.", "Make it yours."]) && /Story Chain/.test(g.querySelector(".steps").textContent) && !!ref && !ref.open && /Models row|Models<\/b> row/.test(ref.innerHTML) && !/choose.{0,20}in Settings/i.test(g.querySelector(".steps").textContent);
  });
  T.test("page: the teacher guide has the big idea, a model table for all nine, sessions to try, prompts, misconceptions and the privacy point", ["Seeds", "Adapters"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector(".modal [data-close]") && pw.document.querySelector(".modal [data-close]").click();
    pw.__ak.openSettings();
    Array.from(pw.document.querySelectorAll('[data-act="guide"][data-id="teacher"]')).pop().click();
    const g = Array.from(pw.document.querySelectorAll(".guide")).pop();
    const rows = g.querySelectorAll(".guide-table tr").length - 1;
    const text = g.textContent;
    return /The big idea:/.test(g.querySelector(".big-idea").textContent) && rows === 9 && g.querySelectorAll(".worlds-list > li").length === 9 && /Sessions to try/.test(text) && !/Sessions that work/.test(text) &&
      /What learners type is sent to the model's provider/.test(text) && /“What did it actually get sent\?”/.test(text) && /The AI knows/.test(text) && text.indexOf(pw.AK.Adapters.modelLabel("gemini", pw.AK.Adapters.DEFAULT_MODELS.gemini)) >= 0 &&
      g.querySelectorAll(".worlds-list > li").length === Array.from(g.querySelectorAll(".worlds-list > li")).filter(li => /Powerful idea/.test(li.textContent)).length;
  });
  T.test("rounds: when the round agent gets two messages in a row, each reply stays in the round of the work it answers", ["Engine"], async () => {
    const s = Seeds.makeTelephone();
    s.agents.push({ id: "agent", kind: "model", name: "New agent", emoji: "🤖", role: "", instructions: "Comment.", outputFields: [], canSeeImages: true, history: "stateless", replyKind: "prose", pretend: "describer" });
    s.rules.push(rule("x1", "renderer", "agent", { send: "image" }), rule("x2", "agent", "artist"));
    const r = await run(s, { to: "artist", text: "a red circle" });
    const pics = acts(r, "renderer").map(e => e.round);
    const comments = acts(r, "describer").concat(acts(r, "agent"));
    // every comment is in the same round as the picture it was sent, and each picture has its comments
    return comments.every(e => { const pic = r.trace.find(x => x.render && x.render.renderId === e.message.renderId); return pic && pic.round === e.round; }) &&
      pics.every(n => acts(r, "describer").some(e => e.round === n)) && acts(r, "artist").length > acts(r, "describer").length - 1;
  });
  T.test("page: an agent's emoji is a button that opens a picker; a pick or your own emoji is used at once", ["Society"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    pw.__ak.openAgent("writer-a");
    pw.document.querySelector('.ed-head [data-act="emoji-pick"]').click();
    let picker = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const many = picker.querySelectorAll(".emoji-pick").length >= 60;
    picker.querySelector('[data-emoji="🦉"]').click();
    const a = pw.__ak.soc().agents.find(x => x.id === "writer-a");
    const picked = a.emoji === "🦉" && pw.document.querySelector('.ed-head .emoji-btn').textContent === "🦉" && /🦉/.test(pw.document.querySelector('.agent-strip [data-id="writer-a"]').textContent);
    pw.document.querySelector('.ed-head [data-act="emoji-pick"]').click();
    picker = Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    picker.querySelector("#emojiOwn").value = "🧑‍🎨";
    picker.querySelector("[data-emoji-own]").click();
    return many && picked && a.emoji === "🧑‍🎨";
  });
  T.test("page: Export and Import are always at the top, not only in Look inside", ["Store"], async () => {
    const { w: pw } = await boot();
    pw.__ak.app.ui.lookInside = false;
    pw.__ak.renderAll();
    const top = pw.document.querySelector(".top-actions");
    return !!top.querySelector('[data-act="export-society"]') && !!top.querySelector('[data-act="import-society"]');
  });
  T.test("page: Settings explains saving, and saving can be switched off (deleting what was saved) and on again", ["Store"], async () => {
    const { w: pw } = await boot();
    await pw.__ak.saveNow();
    const before = !!pw.localStorage.getItem("agentkit.v1");
    pw.__ak.openSettings();
    const body = () => Array.from(pw.document.querySelectorAll(".modal-body")).pop();
    const explains = /Refreshing the tab keeps it all/.test(body().textContent) && body().querySelector('[data-bind="saving"]').checked;
    const box = body().querySelector('[data-bind="saving"]');
    box.checked = false; box.dispatchEvent(new pw.Event("change", { bubbles: true }));
    await sleep(20);
    Array.from(pw.document.querySelectorAll(".modal [data-yes]")).pop().click();
    await sleep(40);
    const off = pw.localStorage.getItem("agentkit.v1") === null && pw.localStorage.getItem("agentkit.v1.nosave") === "1" && (await pw.__ak.saveNow()) === false && pw.localStorage.getItem("agentkit.v1") === null && /Saving is off/.test(body().textContent);
    const box2 = body().querySelector('[data-bind="saving"]');
    box2.checked = true; box2.dispatchEvent(new pw.Event("change", { bubbles: true }));
    await sleep(40);
    return before && explains && off && pw.localStorage.getItem("agentkit.v1.nosave") === null && !!pw.localStorage.getItem("agentkit.v1");
  });
  T.test("page: with saving off, a fresh page starts clean and keeps nothing", ["Store"], async () => {
    const p2 = await pageWindow({ storage: { "agentkit.v1.nosave": "1" } });
    const W = p2.w;
    W.__ak.app.societies.story.roundLimit = 9;
    const saved = await W.__ak.saveNow();
    return saved === false && W.localStorage.getItem("agentkit.v1") === null && p2.errors.length === 0;
  });
  T.test("page: your own society has “Delete this society (from this browser)”, and it asks first", ["Store"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="new-society"]').click();
    Array.from(pw.document.querySelectorAll(".modal-body")).pop().querySelector('[data-new="blank"]').click();
    await sleep(30);
    const id = pw.__ak.soc().id;
    const btn = pw.document.querySelector('[data-act="remove-world"]');
    const label = btn.textContent;
    btn.click();
    await sleep(20);
    const ask = Array.from(pw.document.querySelectorAll(".modal")).pop().textContent;
    Array.from(pw.document.querySelectorAll(".modal [data-yes]")).pop().click();
    await sleep(30);
    return label === "Delete this society (from this browser)" && /can't be undone/.test(ask) && !pw.__ak.app.societies[id];
  });
}
