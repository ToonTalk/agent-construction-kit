// The "next changes" document (Chrome testing, the panel, GPT 6.1 Sol): evidence that can be trusted, and honest wording.
export default function (T, { modelWindow, pageWindow, same }) {
  const w = modelWindow();
  const { Seeds, Society, Library, Scenarios, Runtime, Translator } = w.AK;
  const boot = async opts => { const p = await pageWindow(opts); p.w.__ak.app.settings.connection = "pretend"; p.w.__ak.app.settings.speed = "instant"; return p; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const last = (pw, sel) => Array.from(pw.document.querySelectorAll(sel)).pop();
  const bookAgent = async () => { const s = Seeds.makeStoryChain(); const b = s.agents.find(a => a.id === "book"); b.results = await Scenarios.runScenarios(b, Runtime); return b; };

  // A1
  T.test("A1: an Expected that is a number, a list or an empty { } is refused, and says why", ["Scenarios"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    pw.__ak.openAgent("book");
    const tryExpect = async v => {
      pw.document.querySelector('[data-act="scn-add"]').click();
      pw.document.querySelector("#scnExpect").value = v;
      pw.document.querySelector('[data-act="scn-save"]').click();
      await sleep(20);
      const err = pw.document.querySelector("#scnErr");
      const msg = err && !err.classList.contains("hidden") ? err.textContent : "";
      if (pw.document.querySelector('[data-act="scn-cancel"]')) pw.document.querySelector('[data-act="scn-cancel"]').click();
      return msg;
    };
    const n0 = pw.__ak.soc().agents.find(a => a.id === "book").scenarios.length;
    const m3 = await tryExpect("3"), mList = await tryExpect("[1, 2]"), mEmpty = await tryExpect("{}");
    return /has nothing to check/.test(m3) && /A number/.test(m3) && /A list/.test(mList) && /An empty/.test(mEmpty) && pw.__ak.soc().agents.find(a => a.id === "book").scenarios.length === n0;
  });
  T.test("A1: a scenario that checks nothing is labelled, not shown green", ["Scenarios"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    const book = pw.__ak.soc().agents.find(a => a.id === "book");
    book.scenarios.push({ id: "empty", name: "it just runs", input: { text: "Hi." }, expect: {} });
    await pw.__ak.rerunScenarios(book);
    pw.__ak.openAgent("book");
    const b = Array.from(pw.document.querySelectorAll(".scn")).find(x => /it just runs/.test(x.textContent));
    return !!b && !b.classList.contains("ok") && /checks nothing/.test(b.textContent);
  });

  // A2
  T.test("A2: a society with only programs and You runs with no model chosen", ["Engine"], async () => {
    const { w: pw } = await boot();
    pw.__ak.app.settings.connection = "none";
    const soc = { kind: "agent-kit-society", schema: 1, id: "progs", title: "Programs only", roundAgent: "book", roundLimit: 1, starts: [{ id: "s", label: "Start", kind: "text", to: "book", value: "Once upon a time." }],
      agents: [Seeds.makeStoryChain().agents.find(a => a.id === "book")], rules: [] };
    await pw.__ak.importSocietyText(JSON.stringify(soc));
    const rec = await pw.__ak.runNow();
    return !!rec && rec.api.run.status === "done" && rec.api.run.trace.some(e => e.agentId === "book" && e.response);
  });

  // A3, A8, A10 were fixed in 1.2.3; their tests are in freeplay.test.mjs.

  // A4
  T.test("A4: the contract is worked out from the scenarios: Book gets words and its memory, says words, remembers a list", ["Scenarios"], async () => {
    const b = await bookAgent();
    const c = Scenarios.contractOf(b.results);
    return c === "Gets: words, its memory\nSays: words, sentences (a number)\nRemembers: a list";
  });
  T.test("A4: the translator is given the installed program and the contract, and told to change only what the edit needs", ["Translator"], async () => {
    const b = await bookAgent();
    const t = Translator.translatorUserText(b, b.pseudocode.replace("end of the story", "beginning of the story"));
    return /Its contract \(keep it/.test(t) && /Remembers: a list/.test(t) && /The program installed now/.test(t) && t.indexOf(b.code.js) >= 0 && /9\. If you are given the program installed now, change only what the new pseudocode needs/.test(Translator.TRANSLATOR_SYSTEM);
  });
  T.test("A4: the editor shows the contract above the pseudocode; editing only the header saves it as the agent's own", ["Translator"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    pw.__ak.openAgent("book");
    await sleep(20);
    const shown = /Remembers:\s*a list/.test(pw.document.querySelector(".modal-body .contract").textContent);
    pw.document.querySelector('[data-act="edit-pseudo"]').click();
    const box = pw.document.querySelector("#pseudoDraft");
    const starts = /^Gets: words, its memory\nSays: words, sentences \(a number\)\nRemembers: a list\n\n/.test(box.value);
    box.value = box.value.replace("Remembers: a list", "Remembers: a list of sentences");
    await pw.__ak.savePseudo();
    const a = pw.__ak.soc().agents.find(x => x.id === "book");
    return shown && starts && a.contract === "Gets: words, its memory\nSays: words, sentences (a number)\nRemembers: a list of sentences" && a.status === "ok" && a.pseudocode.indexOf("Gets:") < 0;
  });
  T.test("A4: if a translation changes what the agent remembers, the editor says so", ["Translator"], async () => {
    const { w: pw } = await boot();
    const app = pw.__ak.app;
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    const book = pw.__ak.soc().agents.find(a => a.id === "book");
    await pw.__ak.rerunScenarios(book);
    // a stand-in for a live model that translates carelessly: memory becomes text
    const js = ["function run(input, params, h) {", "  const story = (input.memory || \"\") + \" \" + input.text;", "  return { say: story.trim(), memory: story.trim() };", "}"].join("\n");
    app.settings.connection = "anthropic";
    app.adapter = { id: "anthropic", label: "a stand-in", call: async req => ({ raw: JSON.stringify({ js, lineMap: [{ pseudo: [1, 3], js: [2, 3] }], params: {}, slots: [], refusals: [] }), text: "", data: {}, model: "stand-in" }) };
    app.adapterKey = JSON.stringify([app.settings.connection, app.settings.models, app.settings.keys]);
    pw.__ak.openAgent("book");
    pw.document.querySelector('[data-act="edit-pseudo"]').click();
    const box = pw.document.querySelector("#pseudoDraft");
    box.value = box.value.replace("to the end of the story", "to the beginning of the story");
    await pw.__ak.savePseudo();
    await sleep(30);
    const note = pw.document.querySelector(".modal-body .warnline");
    return book.status === "ok" && !!book.contractNote && /Remembers: a list/.test(book.contractNote.before) && /Remembers: words/.test(book.contractNote.after) && !!note && /changed what it gets, says or remembers/.test(note.textContent);
  });

  // A5
  T.test("A5: after an edit that can't be translated, “Go back to the running version” returns to OK with no model call", ["Translator"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="story"]').click();
    const book = pw.__ak.soc().agents.find(a => a.id === "book");
    const installed = book.code.pseudocode;
    pw.__ak.openAgent("book");
    pw.__ak.app.ui.editor.mode = "edit";
    pw.__ak.app.ui.editor.draft = installed.replace("end of the story", "middle of the story");
    await pw.__ak.savePseudo();
    const stuck = book.status === "needs-translation";
    pw.document.querySelector('[data-act="back-to-running"]').click();
    await sleep(30);
    const back = book.status === "ok" && book.pseudocode === installed;
    // and typing the installed text back in does the same
    pw.__ak.app.ui.editor.mode = "edit";
    pw.__ak.app.ui.editor.draft = installed.replace("end of the story", "middle of the story");
    await pw.__ak.savePseudo();
    pw.__ak.app.ui.editor.mode = "edit";
    pw.__ak.app.ui.editor.draft = installed;
    await pw.__ak.savePseudo();
    return stuck && back && book.status === "ok" && book.pseudocode === installed;
  });

  // A6
  T.test("A6: playing the Joker, the rating box for You doesn't start with the joke you just wrote", ["Engine"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="jokes"]').click();
    const pa = pw.document.querySelector('[data-bind="play-as"]');
    pa.checked = true; pa.dispatchEvent(new pw.Event("change", { bubbles: true }));
    const rec = await pw.__ak.runNow();
    await sleep(20);
    const first = rec.api.run.waiting.agent.id;
    const box = pw.document.querySelector("#yourAnswer");
    box.value = "Why did the penguin bring a ladder? To reach the high notes!";
    box.dispatchEvent(new pw.Event("input", { bubbles: true }));
    pw.document.querySelector('[data-act="your-send"]').click();
    for (let i = 0; i < 100 && !(rec.api.run.waiting && rec.api.run.waiting.agent.id === "rater"); i++) await sleep(20);
    const box2 = pw.document.querySelector("#yourAnswer");
    return first === "joker" && rec.api.run.waiting.agent.id === "rater" && box2.value === "" && /Rate this joke/.test(pw.document.querySelector(".yourturn").textContent);
  });

  // A7
  T.test("A7: choosing another challenge moves the last run to “The run before”, named for its challenge", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.document.querySelector('[data-act="world"][data-id="pebbles"]').click();
    pw.__ak.app.societies.pebbles.challenges.find(c => c.id === "mystery").random.on = false;
    await pw.__ak.runNow();
    await sleep(30);
    pw.document.querySelector('[data-act="challenge"][data-id="row4"]').click();
    await sleep(20);
    const stage = pw.document.querySelector(".stage").textContent;
    return !pw.__ak.app.runs.pebbles && !(pw.__ak.app.traces.pebbles || []).length && /The run before, for “Mystery rows”/.test(stage) && !pw.document.querySelector(".picture .tag");
  });

  // A9
  T.test("A9: the connection chip says not tested, testing, working or not working; a failed test doesn't stay green", ["Adapters"], async () => {
    const { w: pw } = await boot();
    const app = pw.__ak.app;
    app.settings.connection = "openai"; app.settings.keys.openai = "o";
    pw.__ak.renderAll();
    const chip = () => pw.document.querySelector("#modeChip");
    const untested = chip().classList.contains("untested") && /not tested yet/.test(chip().textContent);
    app.adapter = { id: "openai", label: "stand-in", call: async () => { throw Object.assign(new Error("401 bad key"), { kind: "auth" }); } };
    app.adapterKey = JSON.stringify([app.settings.connection, app.settings.models, app.settings.keys]);
    await pw.__ak.testConnection();
    const failed = chip().classList.contains("failed") && /not working/.test(chip().textContent) && /isn't working/.test(pw.document.querySelector(".status-line").textContent);
    app.adapter = { id: "openai", label: "stand-in", call: async () => ({ raw: '{"ok": true}', text: "", data: {}, model: "gpt-x" }) };
    await pw.__ak.testConnection();
    return untested && failed && chip().classList.contains("live") && pw.__ak.connState() === "ok";
  });

  // B
  T.test("B: the wording claims only what the kit shows", ["Seeds"], async () => {
    const { w: pw } = await boot();
    pw.__ak.openSettings();
    last(pw, '[data-act="guide"][data-id="teacher"]').click();
    const g = last(pw, ".guide").textContent;
    const fool = Seeds.makeFoolTheEyes(), two = Seeds.makeContemplative();
    return !/knows only/.test(g) && /learned in training/.test(g) && !/no plan to deceive/.test(g) && /no evidence of a plan/.test(g) && /Scenarios are how you check/.test(g) && /reasonably good and their mistakes differ/.test(g) && /switch off the random secret/.test(g) &&
      !/knows the true number/.test(fool.intro) && /DOT commands/.test(fool.intro) && fool.questions.some(q => /different idea of a pebble/.test(q)) &&
      two.questions.some(q => /reflections the Contemplative agent wrote/.test(q)) && /not a window into how the model works/.test(two.intro) &&
      Seeds.makeStoryChain().questions.some(q => /What did the Editor leave out, or make up/.test(q));
  });
}
